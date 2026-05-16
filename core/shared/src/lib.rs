pub mod auth;
pub mod config;
pub mod cookies;
pub mod csrf;
pub mod errors;
pub mod extension_registry;
pub mod password_reset;
pub mod pubsub;
pub mod refresh_token;
pub mod websocket;

// Re-export commonly used types
pub use auth::{generate_token, generate_token_with_jti, validate_token, Claims};
pub use config::SharedConfig;
pub use cookies::{
    clear_cookie, AuthCookies, CookieBuilder, CookieConfig, AUTH_ACCESS_TOKEN_COOKIE,
    AUTH_REFRESH_TOKEN_COOKIE,
};
pub use csrf::{generate_csrf_token, validate_csrf_token, CsrfToken, CSRF_COOKIE, CSRF_HEADER};
pub use errors::SharedError;
pub use password_reset::{
    generate_password_reset_token, hash_token, validate_password_reset_token, PasswordResetToken,
    PASSWORD_RESET_TOKEN_LIFETIME_SECS,
};
pub use refresh_token::{
    generate_jti, generate_refresh_token, hash_refresh_token, validate_refresh_token, RefreshToken,
    ValidatedRefreshToken, ACCESS_TOKEN_LIFETIME_SECS, REFRESH_TOKEN_LIFETIME_SECS,
    REFRESH_TOKEN_SHORT_LIFETIME_SECS,
};
// Extension system - now uses TOML-based registry only
pub use extension_registry::{ExtensionDefinition, ExtensionRegistry};
pub use pubsub::{
    NoOpPublisher,
    NoOpSyncPublisher,
    NotificationPubSubEvent,
    NotificationPublisher,
    SharedNotificationPublisher,
    SharedSyncPublisher,
    // Sync events (Phase 4)
    SyncPubSubEvent,
    SyncPublisher,
    CHANNEL_NOTIFICATIONS,
    CHANNEL_PRESENCE,
    CHANNEL_SYNC_EXTENSION,
    CHANNEL_SYNC_FILE,
    CHANNEL_SYNC_WEBSITE,
};
pub use websocket::{NoOpBroadcaster, SharedWsBroadcaster, WsBroadcastMessage, WsBroadcaster};
