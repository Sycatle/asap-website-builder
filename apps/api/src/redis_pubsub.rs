//! Redis Pub/Sub implementation for real-time notifications
//!
//! This module provides:
//! - RedisNotificationPublisher: publishes events to Redis
//! - RedisNotificationSubscriber: subscribes to Redis and forwards to WebSocket

use asap_core_api::{
    NotificationPubSubEvent, 
    NotificationPublisher, 
    CHANNEL_NOTIFICATIONS
};
use redis::AsyncCommands;
use std::sync::Arc;
use tracing::{info, warn, error};

use crate::websocket::WsState;

// ============================================
// Redis Publisher
// ============================================

/// Redis-based notification publisher
pub struct RedisNotificationPublisher {
    redis: redis::aio::ConnectionManager,
}

impl RedisNotificationPublisher {
    pub fn new(redis: redis::aio::ConnectionManager) -> Arc<Self> {
        Arc::new(Self { redis })
    }
}

#[async_trait::async_trait]
impl NotificationPublisher for RedisNotificationPublisher {
    async fn publish(&self, event: NotificationPubSubEvent) -> anyhow::Result<()> {
        let payload = serde_json::to_string(&event)?;
        
        let mut conn = self.redis.clone();
        let _: () = conn.publish(CHANNEL_NOTIFICATIONS, &payload).await?;
        
        tracing::debug!("Published notification event to Redis");
        Ok(())
    }
}

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
        let mut conn = client.get_async_connection().await?;
        
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
        let ws_msg = event.to_ws_message();
        
        // Convert to WsMessage and broadcast
        let msg = crate::websocket::WsMessage {
            msg_type: ws_msg["type"].as_str().unwrap_or("unknown").to_string(),
            data: ws_msg["data"].clone(),
        };
        
        // TODO: In the future, filter by account_id to send only to relevant clients
        // For now, broadcast to all authenticated clients
        self.ws_state.broadcast(msg);
        
        tracing::debug!("Forwarded notification event to WebSocket");
    }
}

/// Start the Redis subscriber as a background task
pub fn spawn_redis_subscriber(ws_state: Arc<WsState>, redis_url: String) {
    tokio::spawn(async move {
        loop {
            let subscriber = RedisNotificationSubscriber::new(ws_state.clone());
            
            if let Err(e) = subscriber.run(&redis_url).await {
                error!("Redis subscriber error: {}. Reconnecting in 5s...", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
    });
}
// Redis Futures Stream Import
// ============================================

use futures::StreamExt;
