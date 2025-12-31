use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use chrono::Utc;
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{broadcast, mpsc, RwLock};
use tracing::{info, warn, error};

// Import the broadcaster trait from core-api (which re-exports from core-shared)
use asap_core_api::{WsBroadcaster, WsBroadcastMessage, SharedConfig, validate_token, Claims};

/// WebSocket message structure
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub data: serde_json::Value,
}

/// WebSocket authentication payload
#[derive(Debug, Deserialize)]
struct AuthPayload {
    token: String,
}

/// Connected client information
#[derive(Clone, Debug)]
struct ClientInfo {
    account_id: String,
    client_id: uuid::Uuid,
}

/// User presence information for a website
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WebsitePresenceUser {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub joined_at: String,
    pub current_page: Option<String>,
}

/// Cache entry for website access checks
#[derive(Clone)]
struct AccessCacheEntry {
    has_access: bool,
    cached_at: std::time::Instant,
}

/// TTL for access cache entries (5 minutes)
const ACCESS_CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(300);

/// Shared state for WebSocket connections
#[derive(Clone)]
pub struct WsState {
    pub tx: broadcast::Sender<WsMessage>,
    pub config: Arc<SharedConfig>,
    pub pool: sqlx::PgPool,
    /// Map of authenticated clients: account_id -> Vec<ClientInfo>
    pub authenticated_clients: Arc<RwLock<HashMap<String, Vec<ClientInfo>>>>,
    /// Map of website presence: website_id -> Vec<WebsitePresenceUser>
    pub website_presence: Arc<RwLock<HashMap<String, Vec<WebsitePresenceUser>>>>,
    /// Map of client to website: client_id -> website_id
    pub client_websites: Arc<RwLock<HashMap<uuid::Uuid, String>>>,
    /// Cache for website access checks: (account_id, website_id) -> AccessCacheEntry
    access_cache: Arc<RwLock<HashMap<(String, String), AccessCacheEntry>>>,
}

/// Broadcast channel capacity - sized for peak load
/// At 1000 concurrent users with 1 msg/sec each, this gives 1 second buffer
const BROADCAST_CHANNEL_CAPACITY: usize = 1024;

impl WsState {
    pub fn new(config: SharedConfig, pool: sqlx::PgPool) -> Self {
        let (tx, _) = broadcast::channel(BROADCAST_CHANNEL_CAPACITY);
        Self {
            tx,
            config: Arc::new(config),
            pool,
            authenticated_clients: Arc::new(RwLock::new(HashMap::new())),
            website_presence: Arc::new(RwLock::new(HashMap::new())),
            client_websites: Arc::new(RwLock::new(HashMap::new())),
            access_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Check if user has access to website (with caching)
    pub async fn check_website_access(&self, account_id: &str, website_id: &str) -> bool {
        let cache_key = (account_id.to_string(), website_id.to_string());
        
        // Check cache first
        {
            let cache = self.access_cache.read().await;
            if let Some(entry) = cache.get(&cache_key) {
                if entry.cached_at.elapsed() < ACCESS_CACHE_TTL {
                    return entry.has_access;
                }
            }
        }
        
        // Cache miss or expired - query database
        let has_access = match (uuid::Uuid::parse_str(website_id), uuid::Uuid::parse_str(account_id)) {
            (Ok(website_uuid), Ok(account_uuid)) => {
                sqlx::query_scalar::<_, bool>(
                    r#"
                    SELECT EXISTS (
                        SELECT 1 
                        FROM websites w
                        WHERE w.id = $1 
                          AND (w.account_id = $2 
                               OR EXISTS (
                                   SELECT 1 
                                   FROM website_administrators wa 
                                   WHERE wa.website_id = w.id 
                                     AND wa.account_id = $2 
                                     AND wa.status = 'active'
                               ))
                    )
                    "#
                )
                .bind(website_uuid)
                .bind(account_uuid)
                .fetch_one(&self.pool)
                .await
                .unwrap_or(false)
            }
            _ => false,
        };
        
        // Update cache
        {
            let mut cache = self.access_cache.write().await;
            cache.insert(cache_key, AccessCacheEntry {
                has_access,
                cached_at: std::time::Instant::now(),
            });
            
            // Cleanup old entries periodically (if cache > 1000 entries)
            if cache.len() > 1000 {
                let now = std::time::Instant::now();
                cache.retain(|_, entry| entry.cached_at.elapsed() < ACCESS_CACHE_TTL);
            }
        }
        
        has_access
    }
    
    /// Invalidate access cache for a website (call when permissions change)
    #[allow(dead_code)]
    pub async fn invalidate_website_access_cache(&self, website_id: &str) {
        let mut cache = self.access_cache.write().await;
        cache.retain(|(_, wid), _| wid != website_id);
    }
    
    /// Register an authenticated client
    pub async fn register_client(&self, account_id: String, client_id: uuid::Uuid) {
        let mut clients = self.authenticated_clients.write().await;
        clients
            .entry(account_id.clone())
            .or_insert_with(Vec::new)
            .push(ClientInfo {
                account_id,
                client_id,
            });
    }
    
    /// Unregister a client
    /// 
    /// IMPORTANT: Must leave website presence BEFORE removing from authenticated_clients.
    /// This prevents a race condition where leave_website() would fail to find the user_id
    /// (needed to broadcast the user-left event) because the client was already removed.
    pub async fn unregister_client(&self, account_id: &str, client_id: uuid::Uuid) {
        // First, leave the website presence while we still have the account_id
        // This ensures the user-left event is properly broadcast
        self.leave_website_with_account(client_id, account_id).await;
        
        // Then, release the client from authenticated_clients
        let mut clients = self.authenticated_clients.write().await;
        if let Some(account_clients) = clients.get_mut(account_id) {
            account_clients.retain(|c| c.client_id != client_id);
            if account_clients.is_empty() {
                clients.remove(account_id);
            }
        }
    }
    
    /// Join a website presence room
    pub async fn join_website(&self, client_id: uuid::Uuid, website_id: String, user: WebsitePresenceUser) {
        // Track which website this client is in
        let mut client_websites = self.client_websites.write().await;
        
        // Leave previous website if any
        if let Some(old_website_id) = client_websites.get(&client_id).cloned() {
            drop(client_websites);
            self.leave_website_internal(client_id, &old_website_id, &user.id).await;
            client_websites = self.client_websites.write().await;
        }
        
        client_websites.insert(client_id, website_id.clone());
        drop(client_websites);
        
        // Add to website presence
        let mut presence = self.website_presence.write().await;
        let users = presence.entry(website_id.clone()).or_insert_with(Vec::new);
        
        // Don't add if already present
        if !users.iter().any(|u| u.id == user.id) {
            users.push(user.clone());
        }
        
        // Broadcast user joined
        let users_clone = users.clone();
        drop(presence);
        
        self.broadcast_website_presence(&website_id, "presence:website:user-joined", serde_json::json!({
            "website_id": website_id,
            "user": user
        }));
        
        info!("User {} joined website {} presence ({} users)", user.id, website_id, users_clone.len());
    }
    
    /// Leave a website presence room
    pub async fn leave_website(&self, client_id: uuid::Uuid) {
        let mut client_websites = self.client_websites.write().await;
        if let Some(website_id) = client_websites.remove(&client_id) {
            drop(client_websites);
            
            // Find user_id from authenticated clients
            let clients = self.authenticated_clients.read().await;
            let user_id = clients.values()
                .flat_map(|v| v.iter())
                .find(|c| c.client_id == client_id)
                .map(|c| c.account_id.clone());
            drop(clients);
            
            if let Some(user_id) = user_id {
                self.leave_website_internal(client_id, &website_id, &user_id).await;
            }
        }
    }
    
    /// Leave a website presence room with known account_id
    /// Used when unregistering a client where we already know the account_id
    pub async fn leave_website_with_account(&self, client_id: uuid::Uuid, account_id: &str) {
        let mut client_websites = self.client_websites.write().await;
        if let Some(website_id) = client_websites.remove(&client_id) {
            drop(client_websites);
            self.leave_website_internal(client_id, &website_id, account_id).await;
        }
    }
    
    async fn leave_website_internal(&self, _client_id: uuid::Uuid, website_id: &str, user_id: &str) {
        let mut presence = self.website_presence.write().await;
        if let Some(users) = presence.get_mut(website_id) {
            users.retain(|u| u.id != user_id);
            
            let remaining = users.len();
            if users.is_empty() {
                presence.remove(website_id);
            }
            drop(presence);
            
            // Broadcast user left
            self.broadcast_website_presence(website_id, "presence:website:user-left", serde_json::json!({
                "website_id": website_id,
                "user_id": user_id
            }));
            
            info!("User {} left website {} presence ({} users remaining)", user_id, website_id, remaining);
        }
    }
    
    /// Get users present on a website
    pub async fn get_website_users(&self, website_id: &str) -> Vec<WebsitePresenceUser> {
        let presence = self.website_presence.read().await;
        presence.get(website_id).cloned().unwrap_or_default()
    }
    
    /// Update the current page for a user on a website
    pub async fn update_user_page(&self, client_id: uuid::Uuid, user_id: &str, current_page: &str) {
        // Get the website this client is on
        let client_websites = self.client_websites.read().await;
        let website_id = client_websites.get(&client_id).cloned();
        drop(client_websites);
        
        if let Some(website_id) = website_id {
            let mut presence = self.website_presence.write().await;
            if let Some(users) = presence.get_mut(&website_id) {
                if let Some(user) = users.iter_mut().find(|u| u.id == user_id) {
                    user.current_page = Some(current_page.to_string());
                    let user_clone = user.clone();
                    drop(presence);
                    
                    // Broadcast the page update
                    self.broadcast_website_presence(&website_id, "presence:website:user-page-updated", serde_json::json!({
                        "website_id": website_id,
                        "user_id": user_id,
                        "current_page": current_page,
                        "user": user_clone
                    }));
                    
                    info!("User {} updated page to {} on website {}", user_id, current_page, website_id);
                }
            }
        }
    }
    
    /// Broadcast presence message to all clients on a website
    fn broadcast_website_presence(&self, website_id: &str, msg_type: &str, data: serde_json::Value) {
        let msg = WsMessage {
            msg_type: msg_type.to_string(),
            data,
        };
        // Broadcast to all - clients will filter by website_id
        self.broadcast(msg);
    }
    
    /// Check if an account has any connected clients
    pub async fn has_connected_clients(&self, account_id: &str) -> bool {
        let clients = self.authenticated_clients.read().await;
        clients.get(account_id).map_or(false, |c| !c.is_empty())
    }

    /// Broadcast a message to all connected clients
    pub fn broadcast(&self, msg: WsMessage) {
        if let Err(e) = self.tx.send(msg) {
            warn!("Failed to broadcast message: {}", e);
        }
    }
    
    /// Broadcast a message to all clients of a specific account (Phase 4)
    /// Note: Currently uses the broadcast channel with account_id metadata
    /// The actual filtering happens in the WebSocket receiver task
    pub async fn broadcast_to_account(&self, account_id: &str, mut msg: WsMessage) {
        // Add account_id metadata to the message for filtering
        if let Some(data) = msg.data.as_object_mut() {
            data.insert("__account_id".to_string(), serde_json::json!(account_id));
        }
        
        // Check if account has connected clients before broadcasting
        if self.has_connected_clients(account_id).await {
            self.broadcast(msg);
        } else {
            tracing::debug!("No clients connected for account: {}, skipping broadcast", account_id);
        }
    }

    /// Send a new notification event to all connected clients
    pub fn send_notification(&self, notification: serde_json::Value, unread_count: i64) {
        let msg = WsMessage {
            msg_type: "notification:new".to_string(),
            data: serde_json::json!({
                "notification": notification,
                "unread_count": unread_count
            }),
        };
        self.broadcast(msg);
    }

    /// Send notification read event
    pub fn send_notification_read(&self, notification_id: &str, unread_count: i64) {
        let msg = WsMessage {
            msg_type: "notification:read".to_string(),
            data: serde_json::json!({
                "notification_id": notification_id,
                "unread_count": unread_count
            }),
        };
        self.broadcast(msg);
    }

    /// Send notification deleted event
    pub fn send_notification_deleted(&self, notification_id: &str, unread_count: i64) {
        let msg = WsMessage {
            msg_type: "notification:deleted".to_string(),
            data: serde_json::json!({
                "notification_id": notification_id,
                "unread_count": unread_count
            }),
        };
        self.broadcast(msg);
    }

    /// Send unread count update
    pub fn send_unread_count(&self, unread_count: i64) {
        let msg = WsMessage {
            msg_type: "notification:count".to_string(),
            data: serde_json::json!({
                "unread_count": unread_count
            }),
        };
        self.broadcast(msg);
    }

    /// Send batch read event
    pub fn send_batch_read(&self, notification_ids: &[String], unread_count: i64) {
        let msg = WsMessage {
            msg_type: "notification:batch-read".to_string(),
            data: serde_json::json!({
                "notification_ids": notification_ids,
                "unread_count": unread_count
            }),
        };
        self.broadcast(msg);
    }
}

/// Implement the WsBroadcaster trait for WsState
/// This allows core/api to send notifications through WebSocket without direct dependency
impl WsBroadcaster for WsState {
    fn broadcast_to_user(&self, account_id: &str, msg: WsBroadcastMessage) {
        // Convert WsBroadcastMessage to our internal WsMessage format
        let mut ws_msg = WsMessage {
            msg_type: msg.msg_type,
            data: msg.data,
        };
        
        // Add account_id for filtering (Phase 4 - account-based access control)
        if let Some(data) = ws_msg.data.as_object_mut() {
            data.insert("__account_id".to_string(), serde_json::json!(account_id));
        }
        
        self.broadcast(ws_msg);
    }
}

/// Maximum concurrent WebSocket connections per IP
const MAX_CONNECTIONS_PER_IP: usize = 10;

/// Maximum total concurrent WebSocket connections
const MAX_TOTAL_CONNECTIONS: usize = 10_000;

/// Connection tracking for rate limiting
static CONNECTION_COUNTS: std::sync::LazyLock<tokio::sync::RwLock<std::collections::HashMap<std::net::IpAddr, usize>>> = 
    std::sync::LazyLock::new(|| tokio::sync::RwLock::new(std::collections::HashMap::new()));

static TOTAL_CONNECTIONS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

/// WebSocket handler - upgrades HTTP connection to WebSocket
/// Includes rate limiting to prevent DoS attacks
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<std::net::SocketAddr>,
    State(state): State<Arc<WsState>>,
) -> Response {
    let client_ip = addr.ip();
    
    // Check total connection limit
    let total = TOTAL_CONNECTIONS.load(std::sync::atomic::Ordering::Relaxed);
    if total >= MAX_TOTAL_CONNECTIONS {
        warn!("WebSocket connection rejected: server at capacity ({} connections)", total);
        return axum::response::Response::builder()
            .status(axum::http::StatusCode::SERVICE_UNAVAILABLE)
            .body(axum::body::Body::from("Server at capacity"))
            .unwrap();
    }
    
    // Check per-IP connection limit
    {
        let counts = CONNECTION_COUNTS.read().await;
        if let Some(&count) = counts.get(&client_ip) {
            if count >= MAX_CONNECTIONS_PER_IP {
                warn!("WebSocket connection rejected: IP {} has {} connections (max {})", 
                      client_ip, count, MAX_CONNECTIONS_PER_IP);
                return axum::response::Response::builder()
                    .status(axum::http::StatusCode::TOO_MANY_REQUESTS)
                    .body(axum::body::Body::from("Too many connections from this IP"))
                    .unwrap();
            }
        }
    }
    
    // Increment counters
    {
        let mut counts = CONNECTION_COUNTS.write().await;
        *counts.entry(client_ip).or_insert(0) += 1;
    }
    TOTAL_CONNECTIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    
    info!("WebSocket connection upgrade requested from {}", client_ip);
    ws.on_upgrade(move |socket| handle_socket_with_cleanup(socket, state, client_ip))
}

/// Handle socket with connection cleanup on disconnect
async fn handle_socket_with_cleanup(socket: WebSocket, state: Arc<WsState>, client_ip: std::net::IpAddr) {
    handle_socket(socket, state).await;
    
    // Decrement counters on disconnect
    {
        let mut counts = CONNECTION_COUNTS.write().await;
        if let Some(count) = counts.get_mut(&client_ip) {
            *count = count.saturating_sub(1);
            if *count == 0 {
                counts.remove(&client_ip);
            }
        }
    }
    TOTAL_CONNECTIONS.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
}

/// Handle individual WebSocket connection
async fn handle_socket(socket: WebSocket, state: Arc<WsState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut broadcast_rx = state.tx.subscribe();
    
    let client_id = uuid::Uuid::new_v4();
    info!("New WebSocket client connected: {}", client_id);

    // Channel for direct messages to this client
    let (direct_tx, mut direct_rx) = mpsc::channel::<WsMessage>(32);

    // Track authenticated account ID
    let authenticated_account = Arc::new(tokio::sync::RwLock::new(Option::<String>::None));
    let auth_clone = authenticated_account.clone();
    let auth_for_cleanup = authenticated_account.clone();

    // Connection timeout configuration
    const PING_INTERVAL: std::time::Duration = std::time::Duration::from_secs(30);
    const PONG_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);
    const AUTH_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);
    
    // Track last pong received
    let last_pong = Arc::new(tokio::sync::RwLock::new(std::time::Instant::now()));
    let last_pong_clone = last_pong.clone();

    // Task to send messages to this client (both direct and broadcast)
    // Also handles ping/pong for connection health
    let mut send_task = tokio::spawn(async move {
        let mut ping_interval = tokio::time::interval(PING_INTERVAL);
        ping_interval.tick().await; // Skip first immediate tick
        
        loop {
            tokio::select! {
                // Send periodic pings to check connection health
                _ = ping_interval.tick() => {
                    // Check if we received a pong recently
                    let last = *last_pong_clone.read().await;
                    if last.elapsed() > PING_INTERVAL + PONG_TIMEOUT {
                        warn!("WebSocket client {} timed out (no pong received)", client_id);
                        break;
                    }
                    
                    // Send ping
                    if sender.send(Message::Ping(vec![])).await.is_err() {
                        break;
                    }
                }
                // Handle direct messages (always sent)
                Some(msg) = direct_rx.recv() => {
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
                // Handle broadcast messages (only if authenticated)
                Ok(mut msg) = broadcast_rx.recv() => {
                    // Copy account_id to avoid holding read lock during message send
                    let account_id = {
                        let auth = auth_clone.read().await;
                        auth.clone()
                    };
                    
                    if let Some(account_id) = account_id.as_ref() {
                        // Check if message is targeted for this account
                        let should_send = if let Some(target_account) = msg.data.get("__account_id") {
                            // Message is account-specific, only send if it matches
                            target_account.as_str() == Some(account_id)
                        } else {
                            // No account filter, send to all authenticated clients
                            true
                        };
                        
                        if should_send {
                            // Remove internal metadata before sending
                            if let Some(data) = msg.data.as_object_mut() {
                                data.remove("__account_id");
                            }
                            
                            if let Ok(json) = serde_json::to_string(&msg) {
                                if sender.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Task to receive messages from this client
    let broadcast_tx = state.tx.clone();
    let state_for_cleanup = state.clone();  // Clone for cleanup after tasks complete
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    match serde_json::from_str::<WsMessage>(&text) {
                        Ok(ws_msg) => {
                            info!("Received message from client {}: {}", client_id, ws_msg.msg_type);
                            
                            match ws_msg.msg_type.as_str() {
                                "auth" => {
                                    // Handle authentication
                                    if let Ok(payload) = serde_json::from_value::<AuthPayload>(ws_msg.data.clone()) {
                                        // Verify JWT token and extract account ID
                                        if let Some(claims) = verify_token_and_get_claims(&payload.token, &state.config) {
                                            let account_id = claims.sub.clone();
                                            {
                                                let mut auth = authenticated_account.write().await;
                                                *auth = Some(account_id.clone());
                                            }
                                            
                                            // Register this client
                                            state.register_client(account_id.clone(), client_id).await;
                                            
                                            info!("Client {} authenticated for account: {}", client_id, account_id);
                                            
                                            // Send auth success message directly to this client
                                            let auth_success = WsMessage {
                                                msg_type: "auth-success".to_string(),
                                                data: serde_json::json!({
                                                    "authenticated": true,
                                                    "client_id": client_id.to_string(),
                                                    "account_id": account_id
                                                }),
                                            };
                                            let _ = direct_tx.send(auth_success).await;
                                        } else {
                                            warn!("Client {} authentication failed: invalid token", client_id);
                                            // Send auth failed message directly to this client
                                            let auth_failed = WsMessage {
                                                msg_type: "auth-failed".to_string(),
                                                data: serde_json::json!({
                                                    "error": "Invalid or expired token"
                                                }),
                                            };
                                            let _ = direct_tx.send(auth_failed).await;
                                        }
                                    }
                                }
                                "ping" => {
                                    // Respond to ping with pong (always, no auth required for ping)
                                    let pong = WsMessage {
                                        msg_type: "pong".to_string(),
                                        data: serde_json::json!({
                                            "timestamp": Utc::now().timestamp_millis()
                                        }),
                                    };
                                    let _ = direct_tx.send(pong).await;
                                }
                                "action" => {
                                    // Broadcast action to other clients only if authenticated
                                    if authenticated_account.read().await.is_some() {
                                        let _ = broadcast_tx.send(ws_msg);
                                    } else {
                                        warn!("Client {} attempted to send action without authentication", client_id);
                                    }
                                }
                                // ========================================
                                // Presence handlers
                                // ========================================
                                "presence:join-website" => {
                                    if let Some(account_id) = authenticated_account.read().await.as_ref() {
                                        if let (Some(website_id), Some(user_data)) = (
                                            ws_msg.data.get("website_id").and_then(|v| v.as_str()),
                                            ws_msg.data.get("user")
                                        ) {
                                            // Verify user has access to this website (cached)
                                            let has_access = state.check_website_access(account_id, website_id).await;
                                                            
                                            if !has_access {
                                                warn!("User {} attempted to join website {} without access", account_id, website_id);
                                                let error_msg = WsMessage {
                                                    msg_type: "error".to_string(),
                                                    data: serde_json::json!({
                                                        "message": "You don't have access to this website"
                                                    }),
                                                };
                                                let _ = direct_tx.send(error_msg).await;
                                                continue;
                                            }
                                            
                                            // User has access, proceed with joining
                                            let user = WebsitePresenceUser {
                                                id: account_id.clone(),
                                                email: user_data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                                name: user_data.get("name").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                                avatar: user_data.get("avatar").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                                joined_at: Utc::now().to_rfc3339(),
                                                current_page: user_data.get("current_page").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                            };
                                            state.join_website(client_id, website_id.to_string(), user).await;
                                            info!("User {} joined website {} presence", account_id, website_id);
                                                            
                                            // Note: We don't send the users list here anymore
                                            // The client will request it explicitly via presence:get-website-users
                                            // when it's ready to receive it (after setting up listeners)
                                        }
                                    }
                                }
                                "presence:leave-website" => {
                                    if authenticated_account.read().await.is_some() {
                                        state.leave_website(client_id).await;
                                    }
                                }
                                "presence:get-website-users" => {
                                    if let Some(account_id) = authenticated_account.read().await.as_ref() {
                                        if let Some(website_id) = ws_msg.data.get("website_id").and_then(|v| v.as_str()) {
                                            // Verify user has access to this website (cached)
                                            let has_access = state.check_website_access(account_id, website_id).await;
                                                    
                                            if has_access {
                                                let users = state.get_website_users(website_id).await;
                                                let users_msg = WsMessage {
                                                    msg_type: "presence:website:users".to_string(),
                                                    data: serde_json::json!({
                                                        "website_id": website_id,
                                                        "users": users
                                                    }),
                                                };
                                                let _ = direct_tx.send(users_msg).await;
                                            }
                                        }
                                    }
                                }
                                "presence:update-page" => {
                                    if let Some(account_id) = authenticated_account.read().await.as_ref() {
                                        if let Some(current_page) = ws_msg.data.get("current_page").and_then(|v| v.as_str()) {
                                            state.update_user_page(client_id, account_id, current_page).await;
                                        }
                                    }
                                }
                                _ => {
                                    warn!("Unknown message type from client {}: {}", client_id, ws_msg.msg_type);
                                }
                            }
                        }
                        Err(e) => {
                            error!("Failed to parse message from client {}: {}", client_id, e);
                        }
                    }
                }
                Message::Close(_) => {
                    info!("Client {} sent close message", client_id);
                    break;
                }
                Message::Ping(_data) => {
                    // WebSocket protocol ping - Axum handles pong automatically
                    tracing::trace!("Received WebSocket ping from client {}", client_id);
                }
                Message::Pong(_) => {
                    // Client responded to our ping - update last_pong timestamp
                    *last_pong.write().await = std::time::Instant::now();
                    tracing::trace!("Received WebSocket pong from client {}", client_id);
                }
                _ => {}
            }
        }
        
        info!("Client {} disconnected", client_id);
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => {
            recv_task.abort();
        },
        _ = (&mut recv_task) => {
            send_task.abort();
        },
    }
    
    // Cleanup: Unregister client if authenticated
    let account_id = {
        let auth = auth_for_cleanup.read().await;
        auth.clone()
    };
    
    if let Some(account_id) = account_id.as_ref() {
        state_for_cleanup.unregister_client(account_id, client_id).await;
        info!("Unregistered client {} for account {}", client_id, account_id);
    }
    
    info!("WebSocket connection closed for client {}", client_id);
}

/// Verify JWT token and extract claims
fn verify_token_and_get_claims(token: &str, config: &SharedConfig) -> Option<Claims> {
    match validate_token(token, config) {
        Ok(claims) => {
            info!("Token validated successfully for account: {}", claims.sub);
            Some(claims)
        }
        Err(e) => {
            warn!("Token validation failed: {}", e);
            None
        }
    }
}

/// Cleanup interval for stale connection tracking data
const CLEANUP_INTERVAL: std::time::Duration = std::time::Duration::from_secs(300); // 5 minutes

/// Spawn a background task to periodically cleanup stale data
/// - Removes stale IP entries from CONNECTION_COUNTS
/// - Cleans expired access cache entries from WsState
pub fn spawn_cleanup_task(state: Arc<WsState>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(CLEANUP_INTERVAL);
        interval.tick().await; // Skip first immediate tick
        
        loop {
            interval.tick().await;
            
            // Cleanup stale IP connection counts (IPs with 0 connections)
            {
                let mut counts = CONNECTION_COUNTS.write().await;
                let before = counts.len();
                counts.retain(|_, &mut count| count > 0);
                let after = counts.len();
                if before != after {
                    info!("Cleaned up {} stale IP entries from connection counts", before - after);
                }
            }
            
            // Cleanup expired access cache entries
            {
                let mut cache = state.access_cache.write().await;
                let before = cache.len();
                let now = std::time::Instant::now();
                cache.retain(|_, entry| entry.cached_at.elapsed() < ACCESS_CACHE_TTL);
                let after = cache.len();
                if before != after {
                    info!("Cleaned up {} expired access cache entries", before - after);
                }
            }
            
            // Log current stats
            let total_connections = TOTAL_CONNECTIONS.load(std::sync::atomic::Ordering::Relaxed);
            let ip_count = CONNECTION_COUNTS.read().await.len();
            let cache_size = state.access_cache.read().await.len();
            let presence_rooms = state.website_presence.read().await.len();
            
            tracing::debug!(
                "WebSocket stats: {} total connections, {} unique IPs, {} cache entries, {} presence rooms",
                total_connections, ip_count, cache_size, presence_rooms
            );
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_message_serialization() {
        let msg = WsMessage {
            msg_type: "test".to_string(),
            data: serde_json::json!({ "key": "value" }),
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"test\""));
        assert!(json.contains("\"key\":\"value\""));
    }

    #[test]
    fn test_ws_message_deserialization() {
        let json = r#"{"type":"test","data":{"key":"value"}}"#;
        let msg: WsMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.msg_type, "test");
        assert_eq!(msg.data["key"], "value");
    }

    #[test]
    fn test_website_presence_user_serialization() {
        let user = WebsitePresenceUser {
            id: "user-123".to_string(),
            email: "test@example.com".to_string(),
            name: Some("Test User".to_string()),
            avatar: None,
            joined_at: "2024-01-01T00:00:00Z".to_string(),
            current_page: Some("dashboard".to_string()),
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("\"id\":\"user-123\""));
        assert!(json.contains("\"email\":\"test@example.com\""));
    }
}
