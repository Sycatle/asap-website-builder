//! Internal helpers for creating notifications from other modules.
//!
//! - `create_notification_internal` writes a notification immediately.
//! - `queue_notification` enqueues one for the consolidator (welcome → cancel
//!   → re-welcome inside a 30s window collapses to a single notification).
//! - The `create_*_notification` helpers are the public API other modules
//!   call into. They wrap the two primitives with localized copy.

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use super::Notification;

/// Bundled input for the immediate-write [`create_notification_internal`].
pub(super) struct NotificationInput<'a> {
    pub account_id: Uuid,
    pub title: &'a str,
    pub message: &'a str,
    pub notification_type: &'a str,
    pub category: &'a str,
    pub priority: &'a str,
    pub action_url: Option<&'a str>,
    pub icon: Option<&'a str>,
}

/// Bundled input for the queued [`queue_notification`] primitive.
pub(super) struct QueuedNotificationInput<'a> {
    pub account_id: Uuid,
    pub title: &'a str,
    pub message: &'a str,
    pub notification_type: &'a str,
    pub category: &'a str,
    pub priority: &'a str,
    pub action_url: Option<&'a str>,
    pub icon: Option<&'a str>,
    pub dedup_key: &'a str,
}

/// Create a notification (for internal use by other modules) - IMMEDIATE, no queue
async fn create_notification_internal(
    pool: &PgPool,
    input: NotificationInput<'_>,
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
        input.account_id,
        input.title,
        input.message,
        input.notification_type,
        input.category,
        input.priority,
        input.action_url,
        input.icon,
        now
    )
    .fetch_one(pool)
    .await
}

/// Queue a notification for deferred processing with consolidation
async fn queue_notification(
    pool: &PgPool,
    input: QueuedNotificationInput<'_>,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let metadata = serde_json::json!({});

    let result: (Uuid,) = sqlx::query_as(
        r#"
        INSERT INTO notification_queue (
            id, account_id, title, message, notification_type,
            category, priority, action_url, icon, metadata, dedup_key, queued_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        "#,
    )
    .bind(id)
    .bind(input.account_id)
    .bind(input.title)
    .bind(input.message)
    .bind(input.notification_type)
    .bind(input.category)
    .bind(input.priority)
    .bind(input.action_url)
    .bind(input.icon)
    .bind(metadata)
    .bind(input.dedup_key)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(result.0)
}

// `process_notification_queue` and `cleanup_notification_queue` previously
// lived here as public helpers for a periodic task that now runs entirely
// inside `apps/worker` (see `apps/worker/src/main.rs::process_notification_queue_task`).
// Dropped from core/api — no caller in this crate referenced them.

// ============================================================================
// Welcome / Onboarding
// ============================================================================

/// Create a welcome notification for new users
pub async fn create_welcome_notification(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Bienvenue sur ASAP ! 🎉",
            message: "Créez votre site web professionnel en quelques minutes. Explorez les extensions disponibles pour personnaliser votre site.",
            notification_type: "welcome_message",
            category: "system",
            priority: "normal",
            action_url: Some("/app/extensions"),
            icon: Some("sparkles"),
        },
    )
    .await?;
    Ok(())
}

// ============================================================================
// Billing Notifications
// ============================================================================

/// Notification for successful payment
pub async fn create_payment_success_notification(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Paiement reçu 💳",
            message: "Votre paiement a été traité avec succès. Merci pour votre confiance !",
            notification_type: "payment_successful",
            category: "billing",
            priority: "normal",
            action_url: Some("/app/settings?tab=billing"),
            icon: Some("credit-card"),
        },
    )
    .await?;
    Ok(())
}

/// Notification for failed payment
pub async fn create_payment_failed_notification(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Échec de paiement ⚠️",
            message: "Votre dernier paiement a échoué. Veuillez mettre à jour vos informations de paiement pour éviter une interruption de service.",
            notification_type: "payment_failed",
            category: "billing",
            priority: "urgent",
            action_url: Some("/app/settings?tab=billing"),
            icon: Some("alert-triangle"),
        },
    )
    .await?;
    Ok(())
}

/// Notification for new subscription
pub async fn create_subscription_created_notification(
    pool: &PgPool,
    account_id: Uuid,
    plan_name: &str,
) -> Result<(), sqlx::Error> {
    let title = format!("Bienvenue dans le plan {} ! 🚀", plan_name);
    let message = format!(
        "Votre abonnement {} est maintenant actif. Profitez de toutes les fonctionnalités premium !",
        plan_name
    );
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: &title,
            message: &message,
            notification_type: "subscription_created",
            category: "billing",
            priority: "high",
            action_url: Some("/app/settings?tab=billing"),
            icon: Some("rocket"),
        },
    )
    .await?;
    Ok(())
}

/// Notification for subscription cancelled
pub async fn create_subscription_cancelled_notification(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Abonnement annulé",
            message: "Votre abonnement a été annulé. Vous pouvez vous réabonner à tout moment pour retrouver les fonctionnalités premium.",
            notification_type: "subscription_cancelled",
            category: "billing",
            priority: "high",
            action_url: Some("/app/settings?tab=billing"),
            icon: Some("x-circle"),
        },
    )
    .await?;
    Ok(())
}

// ============================================================================
// Website Notifications
// ============================================================================

/// Notification for website published
pub async fn create_website_published_notification(
    pool: &PgPool,
    account_id: Uuid,
    website_slug: &str,
) -> Result<(), sqlx::Error> {
    let message = format!(
        "Votre site {} est maintenant en ligne et accessible à tous.",
        website_slug
    );
    let action_url = format!("/{}", website_slug);
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Site publié ! 🎉",
            message: &message,
            notification_type: "website_published",
            category: "website",
            priority: "normal",
            action_url: Some(&action_url),
            icon: Some("globe"),
        },
    )
    .await?;
    Ok(())
}

// ============================================================================
// Account/Security Notifications
// ============================================================================

/// Notification for password changed
pub async fn create_password_changed_notification(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), sqlx::Error> {
    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Mot de passe modifié 🔒",
            message: "Votre mot de passe a été modifié avec succès. Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
            notification_type: "password_changed",
            category: "security",
            priority: "high",
            action_url: Some("/app/settings?tab=security"),
            icon: Some("lock"),
        },
    )
    .await?;
    Ok(())
}

/// Notification for new login detected
pub async fn create_new_login_notification(
    pool: &PgPool,
    account_id: Uuid,
    device_info: Option<&str>,
) -> Result<(), sqlx::Error> {
    let message = match device_info {
        Some(info) => format!("Nouvelle connexion détectée depuis : {}. Si ce n'était pas vous, changez votre mot de passe immédiatement.", info),
        None => "Nouvelle connexion détectée sur votre compte. Si ce n'était pas vous, changez votre mot de passe immédiatement.".to_string(),
    };

    create_notification_internal(
        pool,
        NotificationInput {
            account_id,
            title: "Nouvelle connexion détectée 🔔",
            message: &message,
            notification_type: "new_login",
            category: "security",
            priority: "high",
            action_url: Some("/app/settings?tab=security"),
            icon: Some("log-in"),
        },
    )
    .await?;
    Ok(())
}

// ============================================================================
// Extension Notifications (queued for consolidation)
// ============================================================================

/// Queue notification for extension activated (uses queue for consolidation)
pub async fn create_extension_activated_notification(
    pool: &PgPool,
    account_id: Uuid,
    extension_name: &str,
) -> Result<(), sqlx::Error> {
    let dedup_key = format!("extension:{}", extension_name.to_lowercase());
    let title = format!("Extension {} activée ✓", extension_name);
    let message = format!(
        "L'extension {} a été activée sur votre site. Configurez-la pour commencer à l'utiliser.",
        extension_name
    );
    queue_notification(
        pool,
        QueuedNotificationInput {
            account_id,
            title: &title,
            message: &message,
            notification_type: "extension_activated",
            category: "extension",
            priority: "normal",
            action_url: Some("/app/extensions"),
            icon: Some("puzzle"),
            dedup_key: &dedup_key,
        },
    )
    .await?;
    Ok(())
}

/// Queue notification for extension deactivated (uses queue for consolidation)
pub async fn create_extension_deactivated_notification(
    pool: &PgPool,
    account_id: Uuid,
    extension_name: &str,
) -> Result<(), sqlx::Error> {
    let dedup_key = format!("extension:{}", extension_name.to_lowercase());
    let title = format!("Extension {} désactivée", extension_name);
    let message = format!(
        "L'extension {} a été désactivée de votre site.",
        extension_name
    );
    queue_notification(
        pool,
        QueuedNotificationInput {
            account_id,
            title: &title,
            message: &message,
            notification_type: "extension_deactivated",
            category: "extension",
            priority: "low",
            action_url: Some("/app/extensions"),
            icon: Some("puzzle"),
            dedup_key: &dedup_key,
        },
    )
    .await?;
    Ok(())
}
