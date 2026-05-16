//! Redis Pub/Sub subscribers for real-time notifications and sync events
//!
//! Forwards events published by the worker (apps/worker/src/notification_publisher.rs)
//! to connected WebSocket clients. The API service does not publish; it only subscribes.

use asap_core_api::{NotificationPubSubEvent, CHANNEL_NOTIFICATIONS};
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::websocket::WsState;

// ============================================
// Redis Subscriber
// ============================================

/// Subscribes to Redis and forwards notification events to WebSocket
pub struct RedisNotificationSubscriber {
    ws_state: Arc<WsState>,
}

impl RedisNotificationSubscriber {
    pub fn new(ws_state: Arc<WsState>) -> Self {
        Self { ws_state }
    }

    /// Start the subscriber loop
    /// This should be spawned as a background task
    pub async fn run(&self, redis_url: &str) -> anyhow::Result<()> {
        info!("Starting Redis notification subscriber...");

        let client = redis::Client::open(redis_url)?;
        // Use standard connection for pub/sub
        let conn = client.get_async_connection().await?;

        // Subscribe using the sync pubsub approach with async polling
        let mut pubsub = conn.into_pubsub();
        pubsub.subscribe(CHANNEL_NOTIFICATIONS).await?;
        info!("Subscribed to Redis channel: {}", CHANNEL_NOTIFICATIONS);

        // Process messages
        loop {
            match pubsub.on_message().next().await {
                Some(msg) => {
                    let payload: String = match msg.get_payload() {
                        Ok(p) => p,
                        Err(e) => {
                            warn!("Failed to get message payload: {}", e);
                            continue;
                        }
                    };

                    match serde_json::from_str::<NotificationPubSubEvent>(&payload) {
                        Ok(event) => {
                            self.handle_event(event);
                        }
                        Err(e) => {
                            warn!("Failed to parse notification event: {}", e);
                        }
                    }
                }
                None => {
                    warn!("Redis pubsub stream ended");
                    break;
                }
            }
        }

        Ok(())
    }

    /// Handle a notification event from Redis
    fn handle_event(&self, event: NotificationPubSubEvent) {
        let account_id = event.account_id().to_string();
        let ws_msg = event.to_ws_message();

        // Convert to WsMessage and broadcast to specific account
        let msg = crate::websocket::WsMessage {
            msg_type: ws_msg["type"].as_str().unwrap_or("unknown").to_string(),
            data: ws_msg["data"].clone(),
        };

        // Send only to the target account's connected clients
        let ws_state = self.ws_state.clone();
        let account_id_clone = account_id.clone();
        tokio::spawn(async move {
            ws_state.broadcast_to_account(&account_id_clone, msg).await;
        });

        tracing::debug!("Forwarded notification event to account {}", account_id);
    }
}

/// Start the Redis subscriber as a background task
/// Uses exponential backoff for reconnection attempts
pub fn spawn_redis_subscriber(ws_state: Arc<WsState>, redis_url: String) {
    tokio::spawn(async move {
        let mut backoff_secs = 1u64;
        const MAX_BACKOFF_SECS: u64 = 60;

        loop {
            let subscriber = RedisNotificationSubscriber::new(ws_state.clone());

            match subscriber.run(&redis_url).await {
                Ok(_) => {
                    // Clean exit, reset backoff
                    backoff_secs = 1;
                }
                Err(e) => {
                    error!(
                        "Redis subscriber error: {}. Reconnecting in {}s...",
                        e, backoff_secs
                    );
                    tokio::time::sleep(tokio::time::Duration::from_secs(backoff_secs)).await;

                    // Exponential backoff with cap
                    backoff_secs = (backoff_secs * 2).min(MAX_BACKOFF_SECS);
                }
            }
        }
    });
}
// Redis Futures Stream Import
// ============================================

use futures::StreamExt;

// ============================================
// Redis Sync Subscriber (Phase 4)
// ============================================

use asap_core_api::{
    SyncPubSubEvent, CHANNEL_PRESENCE, CHANNEL_SYNC_EXTENSION, CHANNEL_SYNC_FILE,
    CHANNEL_SYNC_WEBSITE,
};

/// Subscribes to Redis sync channels and forwards to WebSocket
pub struct RedisSyncSubscriber {
    ws_state: Arc<WsState>,
}

impl RedisSyncSubscriber {
    pub fn new(ws_state: Arc<WsState>) -> Self {
        Self { ws_state }
    }

    /// Start the subscriber loop for all sync channels
    /// This should be spawned as a background task
    pub async fn run(&self, redis_url: &str) -> anyhow::Result<()> {
        info!("Starting Redis sync subscriber...");

        let client = redis::Client::open(redis_url)?;
        let conn = client.get_async_connection().await?;

        // Subscribe to all sync channels
        let mut pubsub = conn.into_pubsub();
        pubsub.subscribe(CHANNEL_SYNC_WEBSITE).await?;
        pubsub.subscribe(CHANNEL_SYNC_EXTENSION).await?;
        pubsub.subscribe(CHANNEL_SYNC_FILE).await?;
        pubsub.subscribe(CHANNEL_PRESENCE).await?;

        info!("Subscribed to sync channels: website, extension, file, presence");

        // Process messages
        loop {
            match pubsub.on_message().next().await {
                Some(msg) => {
                    let payload: String = match msg.get_payload() {
                        Ok(p) => p,
                        Err(e) => {
                            warn!("Failed to get message payload: {}", e);
                            continue;
                        }
                    };

                    match serde_json::from_str::<SyncPubSubEvent>(&payload) {
                        Ok(event) => {
                            self.handle_event(event).await;
                        }
                        Err(e) => {
                            warn!("Failed to parse sync event: {}", e);
                        }
                    }
                }
                None => {
                    warn!("Redis sync pubsub stream ended");
                    break;
                }
            }
        }

        Ok(())
    }

    /// Handle a sync event from Redis - with account-based filtering
    async fn handle_event(&self, event: SyncPubSubEvent) {
        let account_id = event.account_id().to_string();
        let ws_msg = event.to_ws_message();

        // Convert to WsMessage
        let msg = crate::websocket::WsMessage {
            msg_type: ws_msg["type"].as_str().unwrap_or("unknown").to_string(),
            data: ws_msg["data"].clone(),
        };

        // Broadcast only to clients of this account
        self.ws_state.broadcast_to_account(&account_id, msg).await;

        tracing::debug!("Forwarded sync event to account: {}", account_id);
    }
}

/// Start the Redis sync subscriber as a background task
/// Uses exponential backoff for reconnection attempts
pub fn spawn_redis_sync_subscriber(ws_state: Arc<WsState>, redis_url: String) {
    tokio::spawn(async move {
        let mut backoff_secs = 1u64;
        const MAX_BACKOFF_SECS: u64 = 60;

        loop {
            let subscriber = RedisSyncSubscriber::new(ws_state.clone());

            match subscriber.run(&redis_url).await {
                Ok(_) => {
                    // Clean exit, reset backoff
                    backoff_secs = 1;
                }
                Err(e) => {
                    error!(
                        "Redis sync subscriber error: {}. Reconnecting in {}s...",
                        e, backoff_secs
                    );
                    tokio::time::sleep(tokio::time::Duration::from_secs(backoff_secs)).await;

                    // Exponential backoff with cap
                    backoff_secs = (backoff_secs * 2).min(MAX_BACKOFF_SECS);
                }
            }
        }
    });
}
