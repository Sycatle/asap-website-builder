//! Redis Pub/Sub module for real-time event distribution
//!
//! This module provides a unified interface for publishing and subscribing to events
//! across different services (API, Worker) using Redis Pub/Sub.

use serde::{Deserialize, Serialize};
use std::sync::Arc;

// ============================================
// Channel Names
// ============================================

pub const CHANNEL_NOTIFICATIONS: &str = "asap:notifications";
pub const CHANNEL_SYNC_WEBSITE: &str = "asap:sync:website";
pub const CHANNEL_SYNC_EXTENSION: &str = "asap:sync:module";
pub const CHANNEL_SYNC_FILE: &str = "asap:sync:file";
pub const CHANNEL_PRESENCE: &str = "asap:presence";

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

// ============================================
// Sync Event Types (Phase 4)
// ============================================

/// Sync events for real-time resource updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SyncPubSubEvent {
    // Website Events
    #[serde(rename = "sync:website:updated")]
    WebsiteUpdated {
        account_id: String,
        website_id: String,
        website: serde_json::Value,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:website:deleted")]
    WebsiteDeleted {
        account_id: String,
        website_id: String,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:website:published")]
    WebsitePublished {
        account_id: String,
        website_id: String,
        public_url: String,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:website:unpublished")]
    WebsiteUnpublished {
        account_id: String,
        website_id: String,
        user_name: Option<String>,
    },
    
    // Module Events
    #[serde(rename = "sync:extension:activated")]
    ExtensionActivated {
        account_id: String,
        website_id: String,
        extension_slug: String,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:extension:deactivated")]
    ExtensionDeactivated {
        account_id: String,
        website_id: String,
        extension_slug: String,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:extension:configured")]
    ExtensionConfigured {
        account_id: String,
        website_id: String,
        extension_slug: String,
        config: serde_json::Value,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:extension:catalog:updated")]
    ExtensionCatalogUpdated {
        account_id: String,
        extensions_count: usize,
    },
    
    // File Events
    #[serde(rename = "sync:file:uploaded")]
    FileUploaded {
        account_id: String,
        website_id: String,
        file_id: String,
        file_name: String,
        file_size: u64,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:file:deleted")]
    FileDeleted {
        account_id: String,
        website_id: String,
        file_id: String,
        user_name: Option<String>,
    },
    
    #[serde(rename = "sync:upload:progress")]
    UploadProgress {
        account_id: String,
        website_id: String,
        upload_id: String,
        progress: f32,
        bytes_uploaded: u64,
        total_bytes: u64,
    },
    
    #[serde(rename = "sync:upload:complete")]
    UploadComplete {
        account_id: String,
        website_id: String,
        upload_id: String,
        file_id: String,
        file_url: String,
    },
    
    #[serde(rename = "sync:upload:failed")]
    UploadFailed {
        account_id: String,
        website_id: String,
        upload_id: String,
        error: String,
    },
    
    // Presence Events
    #[serde(rename = "presence:user:online")]
    UserOnline {
        account_id: String,
        user_id: String,
        user_name: String,
        user_avatar: Option<String>,
    },
    
    #[serde(rename = "presence:user:offline")]
    UserOffline {
        account_id: String,
        user_id: String,
    },
    
    #[serde(rename = "presence:user:editing")]
    UserStartedEditing {
        account_id: String,
        user_id: String,
        user_name: String,
        resource_type: String,
        resource_id: String,
    },
    
    #[serde(rename = "presence:user:stopped-editing")]
    UserStoppedEditing {
        account_id: String,
        user_id: String,
        resource_type: String,
        resource_id: String,
    },
    
    #[serde(rename = "presence:users:list")]
    OnlineUsersList {
        account_id: String,
        users: Vec<serde_json::Value>,
    },
}

impl SyncPubSubEvent {
    /// Get the account_id from any event variant
    pub fn account_id(&self) -> &str {
        match self {
            Self::WebsiteUpdated { account_id, .. } => account_id,
            Self::WebsiteDeleted { account_id, .. } => account_id,
            Self::WebsitePublished { account_id, .. } => account_id,
            Self::WebsiteUnpublished { account_id, .. } => account_id,
            Self::ExtensionActivated { account_id, .. } => account_id,
            Self::ExtensionDeactivated { account_id, .. } => account_id,
            Self::ExtensionConfigured { account_id, .. } => account_id,
            Self::ExtensionCatalogUpdated { account_id, .. } => account_id,
            Self::FileUploaded { account_id, .. } => account_id,
            Self::FileDeleted { account_id, .. } => account_id,
            Self::UploadProgress { account_id, .. } => account_id,
            Self::UploadComplete { account_id, .. } => account_id,
            Self::UploadFailed { account_id, .. } => account_id,
            Self::UserOnline { account_id, .. } => account_id,
            Self::UserOffline { account_id, .. } => account_id,
            Self::UserStartedEditing { account_id, .. } => account_id,
            Self::UserStoppedEditing { account_id, .. } => account_id,
            Self::OnlineUsersList { account_id, .. } => account_id,
        }
    }
    
    /// Get the channel this event should be published to
    pub fn channel(&self) -> &'static str {
        match self {
            Self::WebsiteUpdated { .. } | 
            Self::WebsiteDeleted { .. } | 
            Self::WebsitePublished { .. } | 
            Self::WebsiteUnpublished { .. } => CHANNEL_SYNC_WEBSITE,
            
            Self::ExtensionActivated { .. } | 
            Self::ExtensionDeactivated { .. } | 
            Self::ExtensionConfigured { .. } | 
            Self::ExtensionCatalogUpdated { .. } => CHANNEL_SYNC_EXTENSION,
            
            Self::FileUploaded { .. } | 
            Self::FileDeleted { .. } | 
            Self::UploadProgress { .. } | 
            Self::UploadComplete { .. } | 
            Self::UploadFailed { .. } => CHANNEL_SYNC_FILE,
            
            Self::UserOnline { .. } | 
            Self::UserOffline { .. } | 
            Self::UserStartedEditing { .. } | 
            Self::UserStoppedEditing { .. } | 
            Self::OnlineUsersList { .. } => CHANNEL_PRESENCE,
        }
    }
    
    /// Convert to WebSocket message format
    pub fn to_ws_message(&self) -> serde_json::Value {
        serde_json::to_value(self).unwrap_or_else(|_| serde_json::json!({}))
    }
}

// ============================================
// Sync Publisher Trait (Phase 4)
// ============================================

/// Trait for publishing sync events
#[async_trait::async_trait]
pub trait SyncPublisher: Send + Sync {
    /// Publish a sync event
    async fn publish(&self, event: SyncPubSubEvent) -> anyhow::Result<()>;
    
    /// Publish website updated event
    async fn publish_website_updated(
        &self,
        account_id: &str,
        website_id: &str,
        website: serde_json::Value,
        user_name: Option<String>,
    ) -> anyhow::Result<()> {
        self.publish(SyncPubSubEvent::WebsiteUpdated {
            account_id: account_id.to_string(),
            website_id: website_id.to_string(),
            website,
            user_name,
        }).await
    }
    
    /// Publish website deleted event
    async fn publish_website_deleted(
        &self,
        account_id: &str,
        website_id: &str,
        user_name: Option<String>,
    ) -> anyhow::Result<()> {
        self.publish(SyncPubSubEvent::WebsiteDeleted {
            account_id: account_id.to_string(),
            website_id: website_id.to_string(),
            user_name,
        }).await
    }
    
    /// Publish module activated event
    async fn publish_module_activated(
        &self,
        account_id: &str,
        website_id: &str,
        extension_slug: &str,
        user_name: Option<String>,
    ) -> anyhow::Result<()> {
        self.publish(SyncPubSubEvent::ExtensionActivated {
            account_id: account_id.to_string(),
            website_id: website_id.to_string(),
            extension_slug: extension_slug.to_string(),
            user_name,
        }).await
    }
    
    /// Publish file uploaded event
    async fn publish_file_uploaded(
        &self,
        account_id: &str,
        website_id: &str,
        file_id: &str,
        file_name: String,
        file_size: u64,
        user_name: Option<String>,
    ) -> anyhow::Result<()> {
        self.publish(SyncPubSubEvent::FileUploaded {
            account_id: account_id.to_string(),
            website_id: website_id.to_string(),
            file_id: file_id.to_string(),
            file_name,
            file_size,
            user_name,
        }).await
    }
    
    /// Publish user online event
    async fn publish_user_online(
        &self,
        account_id: &str,
        user_id: &str,
        user_name: String,
        user_avatar: Option<String>,
    ) -> anyhow::Result<()> {
        self.publish(SyncPubSubEvent::UserOnline {
            account_id: account_id.to_string(),
            user_id: user_id.to_string(),
            user_name,
            user_avatar,
        }).await
    }
}

/// Type alias for shared sync publisher
pub type SharedSyncPublisher = Arc<dyn SyncPublisher>;

// ============================================
// No-op Sync Publisher (for testing/fallback)
// ============================================

/// No-op sync publisher that does nothing (for when Redis is not available)
#[derive(Clone, Default)]
pub struct NoOpSyncPublisher;

#[async_trait::async_trait]
impl SyncPublisher for NoOpSyncPublisher {
    async fn publish(&self, _event: SyncPubSubEvent) -> anyhow::Result<()> {
        // Silently ignore - no Redis available
        Ok(())
    }
}

impl NoOpSyncPublisher {
    pub fn new() -> Arc<Self> {
        Arc::new(Self)
    }
}
