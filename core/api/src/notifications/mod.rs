//! Notifications API endpoints
//!
//! Split into:
//! - `list`   — list / get / mark-read / delete handlers
//! - `push`   — push subscription endpoints (web-push / VAPID)
//! - `settings` — notification settings CRUD
//! - `factory` — internal helpers used by other modules to create notifications
//!   (welcome, payment, subscription, website, security, extension)

use axum::http::StatusCode;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::Claims;

mod factory;
mod list;
mod push;
mod settings;

pub use factory::{
    create_extension_activated_notification, create_extension_deactivated_notification,
    create_new_login_notification, create_password_changed_notification,
    create_payment_failed_notification, create_payment_success_notification,
    create_subscription_cancelled_notification, create_subscription_created_notification,
    create_website_published_notification, create_welcome_notification,
};
pub use list::{
    delete_notification, get_notification, get_unread_count, list_notifications, mark_as_read,
    mark_notification_read,
};
pub use push::{get_vapid_public_key, subscribe_push, unsubscribe_push};
pub use settings::{get_notification_settings, update_notification_settings};

// ============================================================================
// Shared helpers
// ============================================================================

/// Parse the account UUID out of the JWT claims.
pub(super) fn get_account_id(claims: &Claims) -> Result<Uuid, StatusCode> {
    Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
}

/// Count unread notifications for an account.
pub(super) async fn get_unread_count_for_account(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<i64, StatusCode> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT FROM notifications WHERE account_id = $1 AND read = false",
    )
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get unread count: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(count.0)
}

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub account_id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub category: String,
    pub priority: String,
    pub read: bool,
    pub action_url: Option<String>,
    pub icon: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<Utc>,
    pub read_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationFilters {
    pub category: Option<String>,
    pub read: Option<bool>,
    pub priority: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub unread_count: i64,
}

#[derive(Debug, Serialize)]
pub struct UnreadCountResponse {
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct MarkReadRequest {
    pub notification_ids: Option<Vec<Uuid>>,
    pub all: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct MarkReadResponse {
    pub updated: i64,
}

// Push subscription types
#[derive(Debug, Deserialize)]
pub struct PushSubscriptionRequest {
    pub endpoint: String,
    pub keys: PushSubscriptionKeys,
    pub user_agent: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PushSubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Serialize)]
pub struct PushSubscription {
    pub id: Uuid,
    pub endpoint: String,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct PushUnsubscribeRequest {
    pub endpoint: String,
}

// Notification settings types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub push_enabled: bool,
    pub email_enabled: bool,
    pub enabled_categories: Vec<String>,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            push_enabled: true,
            email_enabled: false,
            enabled_categories: vec![
                "system".to_string(),
                "account".to_string(),
                "website".to_string(),
                "billing".to_string(),
                "security".to_string(),
            ],
            quiet_hours_start: None,
            quiet_hours_end: None,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct VapidPublicKeyResponse {
    pub public_key: String,
}
