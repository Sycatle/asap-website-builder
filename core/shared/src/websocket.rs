//! WebSocket broadcast trait for notification and sync events
//!
//! This module provides an abstraction layer for broadcasting WebSocket messages,
//! allowing core/api to emit events without depending on apps/api implementation.
//!
//! ## Event Types
//!
//! ### Notification Events
//! - `notification:new` - New notification received
//! - `notification:read` - Notification marked as read
//! - `notification:deleted` - Notification deleted
//! - `notification:count` - Unread count update
//! - `notification:batch-read` - Multiple notifications marked as read
//!
//! ### Sync Events (Real-time updates)
//! - `sync:website:created` - Website created
//! - `sync:website:updated` - Website updated
//! - `sync:website:deleted` - Website deleted
//! - `sync:website:published` - Website published
//! - `sync:page:created` - Page created
//! - `sync:page:updated` - Page updated
//! - `sync:page:deleted` - Page deleted
//! - `sync:page:reordered` - Pages reordered
//! - `sync:element:created` - Element created
//! - `sync:element:updated` - Element updated
//! - `sync:element:deleted` - Element deleted
//! - `sync:element:reordered` - Elements reordered
//! - `sync:extension:activated` - Extension activated
//! - `sync:extension:deactivated` - Extension deactivated
//! - `sync:extension:configured` - Extension configuration updated
//! - `sync:file:uploaded` - File uploaded
//! - `sync:file:deleted` - File deleted

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
    fn notify_new_notification(
        &self,
        account_id: &str,
        notification: serde_json::Value,
        unread_count: i64,
    ) {
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
    fn notify_notification_deleted(
        &self,
        account_id: &str,
        notification_id: &str,
        unread_count: i64,
    ) {
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

    // ========================================
    // Website Sync Events
    // ========================================

    /// Broadcast website created event
    fn sync_website_created(&self, account_id: &str, website: serde_json::Value) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:website:created".to_string(),
            data: serde_json::json!({
                "website": website
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast website updated event
    fn sync_website_updated(&self, account_id: &str, website_id: &str, website: serde_json::Value) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:website:updated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "website": website
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast website deleted event
    fn sync_website_deleted(&self, account_id: &str, website_id: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:website:deleted".to_string(),
            data: serde_json::json!({
                "website_id": website_id
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast website published event
    fn sync_website_published(&self, account_id: &str, website_id: &str, status: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:website:published".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "status": status
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast website data updated event
    fn sync_website_data_updated(
        &self,
        account_id: &str,
        website_id: &str,
        data: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:website:data-updated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "data": data
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    // ========================================
    // Page Sync Events
    // ========================================

    /// Broadcast page created event
    fn sync_page_created(&self, account_id: &str, website_id: &str, page: serde_json::Value) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:page:created".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "page": page
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast page updated event
    fn sync_page_updated(
        &self,
        account_id: &str,
        website_id: &str,
        page_id: &str,
        page: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:page:updated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "page_id": page_id,
                "page": page
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast page deleted event
    fn sync_page_deleted(&self, account_id: &str, website_id: &str, page_id: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:page:deleted".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "page_id": page_id
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast pages reordered event
    fn sync_pages_reordered(&self, account_id: &str, website_id: &str, page_ids: &[String]) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:page:reordered".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "page_ids": page_ids
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    // ========================================
    // Element Sync Events
    // ========================================

    /// Broadcast element created event
    fn sync_element_created(&self, account_id: &str, website_id: &str, element: serde_json::Value) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:element:created".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "element": element
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast element updated event
    fn sync_element_updated(
        &self,
        account_id: &str,
        website_id: &str,
        element_id: &str,
        element: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:element:updated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "element_id": element_id,
                "element": element
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast element deleted event
    fn sync_element_deleted(&self, account_id: &str, website_id: &str, element_id: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:element:deleted".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "element_id": element_id
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast elements reordered event
    fn sync_elements_reordered(&self, account_id: &str, website_id: &str, element_ids: &[String]) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:element:reordered".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "element_ids": element_ids
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    // ========================================
    // Extension Sync Events
    // ========================================

    /// Broadcast extension activated event
    fn sync_extension_activated(
        &self,
        account_id: &str,
        website_id: &str,
        extension_slug: &str,
        extension: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:extension:activated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "extension_slug": extension_slug,
                "extension": extension
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast extension deactivated event
    fn sync_extension_deactivated(&self, account_id: &str, website_id: &str, extension_slug: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:extension:deactivated".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "extension_slug": extension_slug
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast extension configured event
    fn sync_extension_configured(
        &self,
        account_id: &str,
        website_id: &str,
        extension_slug: &str,
        config: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:extension:configured".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "extension_slug": extension_slug,
                "config": config
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    // ========================================
    // File Sync Events
    // ========================================

    /// Broadcast file uploaded event
    fn sync_file_uploaded(
        &self,
        account_id: &str,
        website_id: Option<&str>,
        file: serde_json::Value,
    ) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:file:uploaded".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "file": file
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }

    /// Broadcast file deleted event
    fn sync_file_deleted(&self, account_id: &str, website_id: Option<&str>, file_id: &str) {
        let msg = WsBroadcastMessage {
            msg_type: "sync:file:deleted".to_string(),
            data: serde_json::json!({
                "website_id": website_id,
                "file_id": file_id
            }),
        };
        self.broadcast_to_user(account_id, msg);
    }
}

/// Type alias for the shared broadcaster
pub type SharedWsBroadcaster = Arc<dyn WsBroadcaster>;

/// Implementation of WsBroadcaster for Arc<dyn WsBroadcaster>
/// This allows calling trait methods on the shared broadcaster type
impl WsBroadcaster for Arc<dyn WsBroadcaster> {
    fn broadcast_to_user(&self, account_id: &str, msg: WsBroadcastMessage) {
        (**self).broadcast_to_user(account_id, msg);
    }
}

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
