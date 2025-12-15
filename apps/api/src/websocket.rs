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

/// Shared state for WebSocket connections
#[derive(Clone)]
pub struct WsState {
    pub tx: broadcast::Sender<WsMessage>,
    pub config: Arc<SharedConfig>,
    /// Map of authenticated clients: account_id -> Vec<ClientInfo>
    pub authenticated_clients: Arc<RwLock<HashMap<String, Vec<ClientInfo>>>>,
}

impl WsState {
    pub fn new(config: SharedConfig) -> Self {
        let (tx, _) = broadcast::channel(100);
        Self {
            tx,
            config: Arc::new(config),
            authenticated_clients: Arc::new(RwLock::new(HashMap::new())),
        }
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
    pub async fn unregister_client(&self, account_id: &str, client_id: uuid::Uuid) {
        let mut clients = self.authenticated_clients.write().await;
        if let Some(account_clients) = clients.get_mut(account_id) {
            account_clients.retain(|c| c.client_id != client_id);
            if account_clients.is_empty() {
                clients.remove(account_id);
            }
        }
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

/// WebSocket handler - upgrades HTTP connection to WebSocket
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<WsState>>,
) -> Response {
    info!("WebSocket connection upgrade requested");
    ws.on_upgrade(|socket| handle_socket(socket, state))
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

    // Task to send messages to this client (both direct and broadcast)
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
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
                    if let Some(account_id) = auth_clone.read().await.as_ref() {
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
                                    if let Ok(payload) = serde_json::from_value::<AuthPayload>(ws_msg.data) {
                                        // Verify JWT token and extract account ID
                                        if let Some(claims) = verify_token_and_get_claims(&payload.token, &state.config) {
                                            let account_id = claims.sub.clone();
                                            *authenticated_account.write().await = Some(account_id.clone());
                                            
                                            // Register this client
                                            state.register_client(account_id.clone(), client_id).await;
                                            
                                            info!("Client {} authenticated successfully for account: {}", client_id, account_id);
                                            
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
                    info!("Received WebSocket ping from client {}", client_id);
                }
                Message::Pong(_) => {
                    // Client responded to our ping
                    info!("Received WebSocket pong from client {}", client_id);
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
    if let Some(account_id) = auth_for_cleanup.read().await.as_ref() {
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
    fn test_ws_state_creation() {
        let state = WsState::new();
        // Should not panic
        state.broadcast(WsMessage {
            msg_type: "test".to_string(),
            data: serde_json::json!({}),
        });
    }

    #[test]
    fn test_verify_token() {
        assert!(verify_token("valid-token"));
        assert!(!verify_token(""));
    }
}
