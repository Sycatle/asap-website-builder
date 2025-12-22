pub mod auth;
pub mod config;
pub mod errors;
pub mod extension_catalog;
pub mod websocket;
pub mod pubsub;
pub mod csrf;

// Re-export commonly used types
pub use auth::{generate_token, validate_token, Claims};
pub use config::SharedConfig;
pub use errors::SharedError;
pub use csrf::{generate_csrf_token, validate_csrf_token, CsrfToken, CSRF_HEADER, CSRF_COOKIE};
pub use extension_catalog::{
    ExtensionDefinition, 
    get_extension_catalog, 
    get_extension_by_slug,
    get_user_extensions,
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
    CHANNEL_SYNC_EXTENSION,
    CHANNEL_SYNC_FILE,
    CHANNEL_PRESENCE,
};
