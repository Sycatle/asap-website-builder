//! WebSocket broadcast trait for notification events
//!
//! This module provides an abstraction layer for broadcasting WebSocket messages,
//! allowing core/api to emit events without depending on apps/api implementation.

use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// WebSocket message structure
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WsBroadcastMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub data: serde_json::Value,
}

/// Trait for broadcasting WebSocket messages
/// 
/// Implementations should handle broadcasting to connected clients,
/// potentially filtering by user/account ID.
pub trait WsBroadcaster: Send + Sync {
    /// Broadcast a notification to a specific user
    fn broadcast_to_user(&self, account_id: &str, msg: WsBroadcastMessage);
    
    /// Broadcast a new notification event
    fn notify_new_notification(&self, account_id: &str, notification: serde_json::Value, unread_count: i64) {
        let msg = WsBroadcastMessage {
            msg_type: "notification:new".to_string(),
            data: serde_json::json!({
                "notification": notification,
                "unread_count": unread_count
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast notification read event
    fn notify_notification_read(&self, account_id: &str, notification_id: &str, unread_count: i64) {
        let msg = WsBroadcastMessage {
            msg_type: "notification:read".to_string(),
            data: serde_json::json!({
                "notification_id": notification_id,
                "unread_count": unread_count
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast notification deleted event
    fn notify_notification_deleted(&self, account_id: &str, notification_id: &str, unread_count: i64) {
        let msg = WsBroadcastMessage {
            msg_type: "notification:deleted".to_string(),
            data: serde_json::json!({
                "notification_id": notification_id,
                "unread_count": unread_count
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast unread count update
    fn notify_unread_count(&self, account_id: &str, unread_count: i64) {
        let msg = WsBroadcastMessage {
            msg_type: "notification:count".to_string(),
            data: serde_json::json!({
                "unread_count": unread_count
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast batch read event
    fn notify_batch_read(&self, account_id: &str, notification_ids: &[String], unread_count: i64) {
        let msg = WsBroadcastMessage {
            msg_type: "notification:batch-read".to_string(),
            data: serde_json::json!({
                "notification_ids": notification_ids,
                "unread_count": unread_count
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }
}

/// Type alias for the shared broadcaster
pub type SharedWsBroadcaster = Arc<dyn WsBroadcaster>;

/// No-op implementation for when WebSocket is not available
#[derive(Clone)]
pub struct NoOpBroadcaster;

impl WsBroadcaster for NoOpBroadcaster {
    fn broadcast_to_user(&self, _account_id: &str, _msg: WsBroadcastMessage) {
        // No-op: silently ignore broadcasts when WebSocket is not available
    }
}

impl NoOpBroadcaster {
    pub fn new() -> Arc<Self> {
        Arc::new(Self)
    }
}

impl Default for NoOpBroadcaster {
    fn default() -> Self {
        Self
    }
}
