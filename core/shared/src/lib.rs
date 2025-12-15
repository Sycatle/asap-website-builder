pub mod auth;
pub mod config;
pub mod errors;
pub mod module_catalog;
pub mod websocket;
pub mod pubsub;

// Re-export commonly used types
pub use auth::{generate_token, validate_token, Claims};
pub use config::SharedConfig;
pub use errors::SharedError;
pub use module_catalog::{
    ModuleDefinition, 
    get_module_catalog, 
    get_module_by_slug,
    get_user_modules,
};
pub use websocket::{WsBroadcaster, WsBroadcastMessage, SharedWsBroadcaster, NoOpBroadcaster};
pub use pubsub::{
    NotificationPubSubEvent, 
    NotificationPublisher, 
    SharedNotificationPublisher,
    NoOpPublisher,
    CHANNEL_NOTIFICATIONS,
    // Sync events (Phase 4)
    SyncPubSubEvent,
    SyncPublisher,
    SharedSyncPublisher,
    NoOpSyncPublisher,
    CHANNEL_SYNC_WEBSITE,
    CHANNEL_SYNC_MODULE,
    CHANNEL_SYNC_FILE,
    CHANNEL_PRESENCE,
};
