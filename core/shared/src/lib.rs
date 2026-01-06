pub mod auth;
pub mod config;
pub mod cookies;
pub mod errors;
pub mod extension_registry;
pub mod websocket;
pub mod pubsub;
pub mod csrf;
pub mod password_reset;
pub mod refresh_token;

// Re-export commonly used types
pub use auth::{generate_token, generate_token_with_jti, validate_token, Claims};
pub use config::SharedConfig;
pub use cookies::{
    CookieBuilder, CookieConfig, AuthCookies,
    AUTH_ACCESS_TOKEN_COOKIE, AUTH_REFRESH_TOKEN_COOKIE,
    clear_cookie,
};
pub use errors::SharedError;
pub use csrf::{generate_csrf_token, validate_csrf_token, CsrfToken, CSRF_HEADER, CSRF_COOKIE};
pub use password_reset::{
    generate_password_reset_token, 
    validate_password_reset_token, 
    hash_token,
    PasswordResetToken, 
    PASSWORD_RESET_TOKEN_LIFETIME_SECS
};
pub use refresh_token::{
    generate_refresh_token,
    validate_refresh_token,
    hash_refresh_token,
    generate_jti,
    RefreshToken,
    ValidatedRefreshToken,
    REFRESH_TOKEN_LIFETIME_SECS,
    REFRESH_TOKEN_SHORT_LIFETIME_SECS,
    ACCESS_TOKEN_LIFETIME_SECS,
};
// Extension system - now uses TOML-based registry only
pub use extension_registry::{ExtensionRegistry, ExtensionDefinition};
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
