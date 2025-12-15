//! Redis Pub/Sub module for real-time event distribution
//!
//! This module provides a unified interface for publishing and subscribing to events
//! across different services (API, Worker) using Redis Pub/Sub.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;

// ============================================
// Channel Names
// ============================================

pub const CHANNEL_NOTIFICATIONS: &str = "asap:notifications";

// ============================================
// Event Types
// ============================================

/// Notification event types that can be published via Redis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum NotificationPubSubEvent {
    /// New notification created
    #[serde(rename = "notification:new")]
    New {
        account_id: String,
        notification: serde_json::Value,
        unread_count: i64,
    },
    
    /// Notification marked as read
    #[serde(rename = "notification:read")]
    Read {
        account_id: String,
        notification_id: String,
        unread_count: i64,
    },
    
    /// Notification deleted
    #[serde(rename = "notification:deleted")]
    Deleted {
        account_id: String,
        notification_id: String,
        unread_count: i64,
    },
    
    /// Unread count update
    #[serde(rename = "notification:count")]
    Count {
        account_id: String,
        unread_count: i64,
    },
    
    /// Batch read
    #[serde(rename = "notification:batch-read")]
    BatchRead {
        account_id: String,
        notification_ids: Vec<String>,
        unread_count: i64,
    },
}

impl NotificationPubSubEvent {
    /// Get the account_id from any event variant
    pub fn account_id(&self) -> &str {
        match self {
            Self::New { account_id, .. } => account_id,
            Self::Read { account_id, .. } => account_id,
            Self::Deleted { account_id, .. } => account_id,
            Self::Count { account_id, .. } => account_id,
            Self::BatchRead { account_id, .. } => account_id,
        }
    }
    
    /// Convert to WebSocket message format
    pub fn to_ws_message(&self) -> serde_json::Value {
        match self {
            Self::New { notification, unread_count, .. } => {
                serde_json::json!({
                    "type": "notification:new",
                    "data": {
                        "notification": notification,
                        "unread_count": unread_count
                    }
                })
            }
            Self::Read { notification_id, unread_count, .. } => {
                serde_json::json!({
                    "type": "notification:read",
                    "data": {
                        "notification_id": notification_id,
                        "unread_count": unread_count
                    }
                })
            }
            Self::Deleted { notification_id, unread_count, .. } => {
                serde_json::json!({
                    "type": "notification:deleted",
                    "data": {
                        "notification_id": notification_id,
                        "unread_count": unread_count
                    }
                })
            }
            Self::Count { unread_count, .. } => {
                serde_json::json!({
                    "type": "notification:count",
                    "data": {
                        "unread_count": unread_count
                    }
                })
            }
            Self::BatchRead { notification_ids, unread_count, .. } => {
                serde_json::json!({
                    "type": "notification:batch-read",
                    "data": {
                        "notification_ids": notification_ids,
                        "unread_count": unread_count
                    }
                })
            }
        }
    }
}

// ============================================
// Publisher Trait
// ============================================

/// Trait for publishing notification events
#[async_trait::async_trait]
pub trait NotificationPublisher: Send + Sync {
    /// Publish a notification event
    async fn publish(&self, event: NotificationPubSubEvent) -> anyhow::Result<()>;
    
    /// Publish new notification
    async fn publish_new(
        &self,
        account_id: &str,
        notification: serde_json::Value,
        unread_count: i64,
    ) -> anyhow::Result<()> {
        self.publish(NotificationPubSubEvent::New {
            account_id: account_id.to_string(),
            notification,
            unread_count,
        }).await
    }
    
    /// Publish notification read
    async fn publish_read(
        &self,
        account_id: &str,
        notification_id: &str,
        unread_count: i64,
    ) -> anyhow::Result<()> {
        self.publish(NotificationPubSubEvent::Read {
            account_id: account_id.to_string(),
            notification_id: notification_id.to_string(),
            unread_count,
        }).await
    }
    
    /// Publish notification deleted
    async fn publish_deleted(
        &self,
        account_id: &str,
        notification_id: &str,
        unread_count: i64,
    ) -> anyhow::Result<()> {
        self.publish(NotificationPubSubEvent::Deleted {
            account_id: account_id.to_string(),
            notification_id: notification_id.to_string(),
            unread_count,
        }).await
    }
    
    /// Publish unread count update
    async fn publish_count(
        &self,
        account_id: &str,
        unread_count: i64,
    ) -> anyhow::Result<()> {
        self.publish(NotificationPubSubEvent::Count {
            account_id: account_id.to_string(),
            unread_count,
        }).await
    }
    
    /// Publish batch read
    async fn publish_batch_read(
        &self,
        account_id: &str,
        notification_ids: Vec<String>,
        unread_count: i64,
    ) -> anyhow::Result<()> {
        self.publish(NotificationPubSubEvent::BatchRead {
            account_id: account_id.to_string(),
            notification_ids,
            unread_count,
        }).await
    }
}

/// Type alias for shared publisher
pub type SharedNotificationPublisher = Arc<dyn NotificationPublisher>;

// ============================================
// No-op Publisher (for testing/fallback)
// ============================================

/// No-op publisher that does nothing (for when Redis is not available)
#[derive(Clone, Default)]
pub struct NoOpPublisher;

#[async_trait::async_trait]
impl NotificationPublisher for NoOpPublisher {
    async fn publish(&self, _event: NotificationPubSubEvent) -> anyhow::Result<()> {
        // Silently ignore - no Redis available
        Ok(())
    }
}

impl NoOpPublisher {
    pub fn new() -> Arc<Self> {
        Arc::new(Self)
    }
}
