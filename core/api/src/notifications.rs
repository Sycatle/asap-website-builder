//! Notifications API endpoints

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

use crate::Claims;


// Helper function to parse account ID from claims
fn get_account_id(claims: &Claims) -> Result<Uuid, StatusCode> {
    Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
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

#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    pub title: String,
    pub message: String,
    #[serde(default)]
    pub notification_type: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub action_url: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
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

// ============================================================================
// Handlers
// ============================================================================

/// List notifications for the authenticated user
pub async fn list_notifications(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(filters): Query<NotificationFilters>,
) -> Result<Json<NotificationListResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let limit = filters.limit.unwrap_or(50).min(100);
    let offset = filters.offset.unwrap_or(0);

    let notifications = sqlx::query_as!(
        Notification,
        r#"
        SELECT 
            id, account_id, title, message, notification_type,
            category, priority, read, action_url, icon, 
            metadata, created_at, read_at
        FROM notifications
        WHERE account_id = $1
            AND ($2::TEXT IS NULL OR category = $2)
            AND ($3::BOOLEAN IS NULL OR read = $3)
            AND ($4::TEXT IS NULL OR priority = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
        account_id,
        filters.category,
        filters.read,
        filters.priority,
        limit,
        offset
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notifications: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Get total count with same filters
    let total: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)::BIGINT
        FROM notifications
        WHERE account_id = $1
            AND ($2::TEXT IS NULL OR category = $2)
            AND ($3::BOOLEAN IS NULL OR read = $3)
            AND ($4::TEXT IS NULL OR priority = $4)
        "#,
    )
    .bind(account_id)
    .bind(&filters.category)
    .bind(filters.read)
    .bind(&filters.priority)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get unread count
    let unread: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT FROM notifications WHERE account_id = $1 AND read = false"
    )
    .bind(account_id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(NotificationListResponse {
        notifications,
        total: total.0,
        unread_count: unread.0,
    }))
}

/// Get unread notification count
pub async fn get_unread_count(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<UnreadCountResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT FROM notifications WHERE account_id = $1 AND read = false"
    )
    .bind(account_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get unread count: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(UnreadCountResponse { count: count.0 }))
}

/// Get a single notification
pub async fn get_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(notification_id): Path<Uuid>,
) -> Result<Json<Notification>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let notification = sqlx::query_as!(
        Notification,
        r#"
        SELECT 
            id, account_id, title, message, notification_type,
            category, priority, read, action_url, icon, 
            metadata, created_at, read_at
        FROM notifications
        WHERE id = $1 AND account_id = $2
        "#,
        notification_id,
        account_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notification: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match notification {
        Some(n) => Ok(Json(n)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// Mark notifications as read
pub async fn mark_as_read(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Json<MarkReadResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let now = Utc::now();
    
    let updated = if req.all.unwrap_or(false) {
        // Mark all as read
        let result = sqlx::query!(
            r#"
            UPDATE notifications 
            SET read = true, read_at = $1
            WHERE account_id = $2 AND read = false
            "#,
            now,
            account_id
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to mark all as read: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        result.rows_affected() as i64
    } else if let Some(ids) = req.notification_ids {
        // Mark specific notifications as read
        let result = sqlx::query!(
            r#"
            UPDATE notifications 
            SET read = true, read_at = $1
            WHERE account_id = $2 AND id = ANY($3) AND read = false
            "#,
            now,
            account_id,
            &ids
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to mark notifications as read: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        result.rows_affected() as i64
    } else {
        return Err(StatusCode::BAD_REQUEST);
    };

    Ok(Json(MarkReadResponse { updated }))
}

/// Mark a single notification as read
pub async fn mark_notification_read(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(notification_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let result = sqlx::query!(
        r#"
        UPDATE notifications 
        SET read = true, read_at = $1
        WHERE id = $2 AND account_id = $3 AND read = false
        "#,
        Utc::now(),
        notification_id,
        account_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to mark notification as read: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        Ok(StatusCode::OK)
    } else {
        Ok(StatusCode::NOT_MODIFIED)
    }
}

/// Delete a notification
pub async fn delete_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(notification_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let result = sqlx::query!(
        "DELETE FROM notifications WHERE id = $1 AND account_id = $2",
        notification_id,
        account_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to delete notification: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

// ============================================================================
// Push Subscription Handlers
// ============================================================================

/// Subscribe to push notifications
pub async fn subscribe_push(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PushSubscriptionRequest>,
) -> Result<Json<PushSubscription>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let id = Uuid::new_v4();
    let now = Utc::now();

    let subscription = sqlx::query_as!(
        PushSubscription,
        r#"
        INSERT INTO push_subscriptions (
            id, account_id, endpoint, p256dh_key, auth_key, user_agent, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (account_id, endpoint) DO UPDATE SET
            p256dh_key = EXCLUDED.p256dh_key,
            auth_key = EXCLUDED.auth_key,
            user_agent = EXCLUDED.user_agent,
            last_used_at = NOW()
        RETURNING id, endpoint, created_at
        "#,
        id,
        account_id,
        req.endpoint,
        req.keys.p256dh,
        req.keys.auth,
        req.user_agent,
        now
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to subscribe to push: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(subscription))
}

/// Unsubscribe from push notifications
pub async fn unsubscribe_push(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PushUnsubscribeRequest>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let result = sqlx::query!(
        "DELETE FROM push_subscriptions WHERE account_id = $1 AND endpoint = $2",
        account_id,
        req.endpoint
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to unsubscribe from push: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[derive(Debug, Deserialize)]
pub struct PushUnsubscribeRequest {
    pub endpoint: String,
}

/// Get VAPID public key for push subscription
pub async fn get_vapid_public_key(
    State(pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> Result<Json<VapidPublicKeyResponse>, StatusCode> {
    // Get global VAPID key from database
    let global_key = sqlx::query_scalar!(
        "SELECT public_key FROM vapid_keys WHERE name = 'default' LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match global_key {
        Some(key) => Ok(Json(VapidPublicKeyResponse { public_key: key })),
        None => {
            // Return env var if no database key
            let key = std::env::var("VAPID_PUBLIC_KEY")
                .unwrap_or_else(|_| "".to_string());
            
            if key.is_empty() {
                Err(StatusCode::NOT_FOUND)
            } else {
                Ok(Json(VapidPublicKeyResponse { public_key: key }))
            }
        }
    }
}

// ============================================================================
// Notification Settings Handlers
// ============================================================================

/// Get notification settings
pub async fn get_notification_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<NotificationSettings>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let settings = sqlx::query!(
        r#"
        SELECT push_enabled, email_enabled, enabled_categories, 
               quiet_hours_start, quiet_hours_end
        FROM notification_settings
        WHERE account_id = $1
        "#,
        account_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notification settings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match settings {
        Some(row) => Ok(Json(NotificationSettings {
            push_enabled: row.push_enabled,
            email_enabled: row.email_enabled,
            enabled_categories: serde_json::from_value(row.enabled_categories)
                .unwrap_or_default(),
            quiet_hours_start: row.quiet_hours_start,
            quiet_hours_end: row.quiet_hours_end,
        })),
        None => Ok(Json(NotificationSettings::default())),
    }
}

/// Update notification settings
pub async fn update_notification_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(settings): Json<NotificationSettings>,
) -> Result<Json<NotificationSettings>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let categories_json = serde_json::to_value(&settings.enabled_categories)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        r#"
        INSERT INTO notification_settings (
            account_id, push_enabled, email_enabled, enabled_categories,
            quiet_hours_start, quiet_hours_end
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (account_id) DO UPDATE SET
            push_enabled = EXCLUDED.push_enabled,
            email_enabled = EXCLUDED.email_enabled,
            enabled_categories = EXCLUDED.enabled_categories,
            quiet_hours_start = EXCLUDED.quiet_hours_start,
            quiet_hours_end = EXCLUDED.quiet_hours_end,
            updated_at = NOW()
        "#,
        account_id,
        settings.push_enabled,
        settings.email_enabled,
        categories_json,
        settings.quiet_hours_start,
        settings.quiet_hours_end
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update notification settings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(settings))
}

// ============================================================================
// Internal helpers for creating notifications from other modules
// ============================================================================

/// Queue consolidation window in seconds (notifications within this window are consolidated)
const QUEUE_CONSOLIDATION_SECONDS: i32 = 30;

/// Create a notification (for internal use by other modules) - IMMEDIATE, no queue
pub async fn create_notification_internal(
    pool: &PgPool,
    account_id: Uuid,
    title: &str,
    message: &str,
    notification_type: &str,
    category: &str,
    priority: &str,
    action_url: Option<&str>,
    icon: Option<&str>,
) -> Result<Notification, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query_as!(
        Notification,
        r#"
        INSERT INTO notifications (
            id, account_id, title, message, notification_type, 
            category, priority, action_url, icon, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
            id, account_id, title, message, notification_type,
            category, priority, read, action_url, icon, 
            metadata, created_at, read_at
        "#,
        id,
        account_id,
        title,
        message,
        notification_type,
        category,
        priority,
        action_url,
        icon,
        now
    )
    .fetch_one(pool)
    .await
}

/// Queue a notification for deferred processing with consolidation
/// 
/// Instead of creating notifications immediately, this adds them to a queue.
/// A background process consolidates similar notifications (same dedup_key)
/// and only creates the final relevant notification.
/// 
/// Example: activate → deactivate → activate within 30s = 1 notification "activated"
pub async fn queue_notification(
    pool: &PgPool,
    account_id: Uuid,
    title: &str,
    message: &str,
    notification_type: &str,
    category: &str,
    priority: &str,
    action_url: Option<&str>,
    icon: Option<&str>,
    dedup_key: &str,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let metadata = serde_json::json!({});

    sqlx::query_scalar!(
        r#"
        INSERT INTO notification_queue (
            id, account_id, title, message, notification_type,
            category, priority, action_url, icon, metadata, dedup_key, queued_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        "#,
        id,
        account_id,
        title,
        message,
        notification_type,
        category,
        priority,
        action_url,
        icon,
        metadata,
        dedup_key,
        now
    )
    .fetch_one(pool)
    .await
}

/// Process the notification queue - consolidate and create final notifications
/// 
/// This should be called periodically (e.g., every 10-30 seconds) by a background worker.
/// It processes notifications older than QUEUE_CONSOLIDATION_SECONDS and consolidates them.
pub async fn process_notification_queue(pool: &PgPool) -> Result<(i32, i32), sqlx::Error> {
    let result = sqlx::query!(
        "SELECT * FROM process_notification_queue($1)",
        QUEUE_CONSOLIDATION_SECONDS
    )
    .fetch_one(pool)
    .await?;
    
    let processed = result.processed_count.unwrap_or(0);
    let created = result.created_count.unwrap_or(0);
    
    if processed > 0 {
        tracing::info!(
            "Notification queue processed: {} queued → {} created",
            processed,
            created
        );
    }
    
    Ok((processed, created))
}

/// Cleanup old processed queue entries
pub async fn cleanup_notification_queue(pool: &PgPool, hours_to_keep: i32) -> Result<i32, sqlx::Error> {
    let deleted = sqlx::query_scalar!(
        "SELECT cleanup_notification_queue($1)",
        hours_to_keep
    )
    .fetch_one(pool)
    .await?;
    
    Ok(deleted.unwrap_or(0))
}

/// Create a welcome notification for new users
pub async fn create_welcome_notification(pool: &PgPool, account_id: Uuid) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Bienvenue sur ASAP ! 🎉",
        "Créez votre site web professionnel en quelques minutes. Explorez les modules disponibles pour personnaliser votre site.",
        "welcome_message",
        "system",
        "normal",
        Some("/app/modules"),
        Some("sparkles"),
    ).await?;
    
    Ok(())
}

// ============================================================================
// Billing Notifications
// ============================================================================

/// Notification for successful payment
pub async fn create_payment_success_notification(pool: &PgPool, account_id: Uuid) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Paiement reçu 💳",
        "Votre paiement a été traité avec succès. Merci pour votre confiance !",
        "payment_successful",
        "billing",
        "normal",
        Some("/app/settings?tab=billing"),
        Some("credit-card"),
    ).await?;
    
    Ok(())
}

/// Notification for failed payment
pub async fn create_payment_failed_notification(pool: &PgPool, account_id: Uuid) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Échec de paiement ⚠️",
        "Votre dernier paiement a échoué. Veuillez mettre à jour vos informations de paiement pour éviter une interruption de service.",
        "payment_failed",
        "billing",
        "urgent",
        Some("/app/settings?tab=billing"),
        Some("alert-triangle"),
    ).await?;
    
    Ok(())
}

/// Notification for new subscription
pub async fn create_subscription_created_notification(pool: &PgPool, account_id: Uuid, plan_name: &str) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        &format!("Bienvenue dans le plan {} ! 🚀", plan_name),
        &format!("Votre abonnement {} est maintenant actif. Profitez de toutes les fonctionnalités premium !", plan_name),
        "subscription_created",
        "billing",
        "high",
        Some("/app/settings?tab=billing"),
        Some("rocket"),
    ).await?;
    
    Ok(())
}

/// Notification for subscription cancelled
pub async fn create_subscription_cancelled_notification(pool: &PgPool, account_id: Uuid) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Abonnement annulé",
        "Votre abonnement a été annulé. Vous pouvez vous réabonner à tout moment pour retrouver les fonctionnalités premium.",
        "subscription_cancelled",
        "billing",
        "high",
        Some("/app/settings?tab=billing"),
        Some("x-circle"),
    ).await?;
    
    Ok(())
}

// ============================================================================
// Website Notifications
// ============================================================================

/// Notification for website published
pub async fn create_website_published_notification(pool: &PgPool, account_id: Uuid, website_slug: &str) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Site publié ! 🎉",
        &format!("Votre site {} est maintenant en ligne et accessible à tous.", website_slug),
        "website_published",
        "website",
        "normal",
        Some(&format!("/{}", website_slug)),
        Some("globe"),
    ).await?;
    
    Ok(())
}

// ============================================================================
// Account/Security Notifications
// ============================================================================

/// Notification for password changed
pub async fn create_password_changed_notification(pool: &PgPool, account_id: Uuid) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        account_id,
        "Mot de passe modifié 🔒",
        "Votre mot de passe a été modifié avec succès. Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
        "password_changed",
        "security",
        "high",
        Some("/app/settings?tab=security"),
        Some("lock"),
    ).await?;
    
    Ok(())
}

/// Notification for new login detected
pub async fn create_new_login_notification(pool: &PgPool, account_id: Uuid, device_info: Option<&str>) -> Result<(), sqlx::Error> {
    let message = match device_info {
        Some(info) => format!("Nouvelle connexion détectée depuis : {}. Si ce n'était pas vous, changez votre mot de passe immédiatement.", info),
        None => "Nouvelle connexion détectée sur votre compte. Si ce n'était pas vous, changez votre mot de passe immédiatement.".to_string(),
    };
    
    create_notification_internal(
        pool,
        account_id,
        "Nouvelle connexion détectée 🔔",
        &message,
        "new_login",
        "security",
        "high",
        Some("/app/settings?tab=security"),
        Some("log-in"),
    ).await?;
    
    Ok(())
}

// ============================================================================
// Module Notifications
// ============================================================================

/// Queue notification for module activated (uses queue for consolidation)
pub async fn create_module_activated_notification(pool: &PgPool, account_id: Uuid, module_name: &str) -> Result<(), sqlx::Error> {
    let dedup_key = format!("module:{}", module_name.to_lowercase());
    
    queue_notification(
        pool,
        account_id,
        &format!("Module {} activé ✓", module_name),
        &format!("Le module {} a été activé sur votre site. Configurez-le pour commencer à l'utiliser.", module_name),
        "module_activated",
        "module",
        "normal",
        Some("/app/modules"),
        Some("puzzle"),
        &dedup_key,
    ).await?;
    
    Ok(())
}

/// Queue notification for module deactivated (uses queue for consolidation)
pub async fn create_module_deactivated_notification(pool: &PgPool, account_id: Uuid, module_name: &str) -> Result<(), sqlx::Error> {
    let dedup_key = format!("module:{}", module_name.to_lowercase());
    
    queue_notification(
        pool,
        account_id,
        &format!("Module {} désactivé", module_name),
        &format!("Le module {} a été désactivé de votre site.", module_name),
        "module_deactivated",
        "module",
        "low",
        Some("/app/modules"),
        Some("puzzle"),
        &dedup_key,
    ).await?;
    
    Ok(())
}
