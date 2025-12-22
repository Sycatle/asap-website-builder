//! Notification service implementation

use crate::types::*;
use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

/// Notification service for managing user notifications
pub struct NotificationService {
    pool: PgPool,
}

impl NotificationService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new notification
    pub async fn create(&self, req: CreateNotificationRequest) -> Result<Notification> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let category = req.category.unwrap_or_default();
        let priority = req.priority.unwrap_or_default();
        let notification_type = req.notification_type.unwrap_or_else(|| "custom".to_string());

        let notification = sqlx::query_as!(
            NotificationRow,
            r#"
            INSERT INTO notifications (
                id, account_id, title, message, notification_type, 
                category, priority, action_url, icon, metadata, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING 
                id, account_id, title, message, notification_type,
                category, priority, read, action_url, icon, 
                metadata, created_at, read_at
            "#,
            id,
            req.account_id,
            req.title,
            req.message,
            notification_type,
            category_to_string(&category),
            priority_to_string(&priority),
            req.action_url,
            req.icon,
            req.metadata,
            now
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(notification.into())
    }

    /// Get notifications for a user with optional filters
    pub async fn list(
        &self,
        account_id: Uuid,
        filters: NotificationFilters,
    ) -> Result<NotificationListResponse> {
        let limit = filters.limit.unwrap_or(50);
        let offset = filters.offset.unwrap_or(0);

        // Build dynamic query based on filters
        let notifications = sqlx::query_as!(
            NotificationRow,
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
            filters.category.map(|c| category_to_string(&c)),
            filters.read,
            filters.priority.map(|p| priority_to_string(&p)),
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        // Get total count
        let total: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) as count
            FROM notifications
            WHERE account_id = $1
                AND ($2::TEXT IS NULL OR category = $2)
                AND ($3::BOOLEAN IS NULL OR read = $3)
                AND ($4::TEXT IS NULL OR priority = $4)
            "#,
        )
        .bind(account_id)
        .bind(filters.category.map(|c| category_to_string(&c)))
        .bind(filters.read)
        .bind(filters.priority.map(|p| priority_to_string(&p)))
        .fetch_one(&self.pool)
        .await?;

        // Get unread count
        let unread_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE account_id = $1 AND read = false",
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(NotificationListResponse {
            notifications: notifications.into_iter().map(Into::into).collect(),
            total: total.0,
            unread_count: unread_count.0,
        })
    }

    /// Get a single notification
    pub async fn get(&self, notification_id: Uuid, account_id: Uuid) -> Result<Option<Notification>> {
        let notification = sqlx::query_as!(
            NotificationRow,
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
        .fetch_optional(&self.pool)
        .await?;

        Ok(notification.map(Into::into))
    }

    /// Mark a notification as read
    pub async fn mark_as_read(&self, notification_id: Uuid, account_id: Uuid) -> Result<bool> {
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
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Mark all notifications as read for a user
    pub async fn mark_all_as_read(&self, account_id: Uuid) -> Result<i64> {
        let result = sqlx::query!(
            r#"
            UPDATE notifications 
            SET read = true, read_at = $1
            WHERE account_id = $2 AND read = false
            "#,
            Utc::now(),
            account_id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() as i64)
    }

    /// Delete a notification
    pub async fn delete(&self, notification_id: Uuid, account_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(
            "DELETE FROM notifications WHERE id = $1 AND account_id = $2",
            notification_id,
            account_id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete all read notifications older than specified days
    pub async fn cleanup_old_notifications(&self, days: i32) -> Result<i64> {
        let result = sqlx::query!(
            r#"
            DELETE FROM notifications 
            WHERE read = true 
            AND created_at < NOW() - INTERVAL '1 day' * $1
            "#,
            days as f64
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() as i64)
    }

    /// Get unread count for a user
    pub async fn get_unread_count(&self, account_id: Uuid) -> Result<i64> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE account_id = $1 AND read = false",
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count.0)
    }

    // === Push Subscription Management ===

    /// Subscribe to push notifications
    pub async fn subscribe_push(
        &self,
        account_id: Uuid,
        req: PushSubscriptionRequest,
    ) -> Result<PushSubscription> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        // Upsert subscription (update if same endpoint exists)
        let subscription = sqlx::query_as!(
            PushSubscriptionRow,
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
            RETURNING id, account_id, endpoint, p256dh_key, auth_key, user_agent, created_at, last_used_at
            "#,
            id,
            account_id,
            req.endpoint,
            req.keys.p256dh,
            req.keys.auth,
            req.user_agent,
            now
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(subscription.into())
    }

    /// Unsubscribe from push notifications
    pub async fn unsubscribe_push(&self, account_id: Uuid, endpoint: &str) -> Result<bool> {
        let result = sqlx::query!(
            "DELETE FROM push_subscriptions WHERE account_id = $1 AND endpoint = $2",
            account_id,
            endpoint
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get push subscriptions for a user
    pub async fn get_push_subscriptions(&self, account_id: Uuid) -> Result<Vec<PushSubscription>> {
        let subscriptions = sqlx::query_as!(
            PushSubscriptionRow,
            r#"
            SELECT id, account_id, endpoint, p256dh_key, auth_key, user_agent, created_at, last_used_at
            FROM push_subscriptions
            WHERE account_id = $1
            "#,
            account_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(subscriptions.into_iter().map(Into::into).collect())
    }

    // === Notification Settings ===

    /// Get notification settings for a user
    pub async fn get_settings(&self, account_id: Uuid) -> Result<NotificationSettings> {
        let settings = sqlx::query!(
            r#"
            SELECT push_enabled, email_enabled, enabled_categories, 
                   quiet_hours_start, quiet_hours_end
            FROM notification_settings
            WHERE account_id = $1
            "#,
            account_id
        )
        .fetch_optional(&self.pool)
        .await?;

        match settings {
            Some(row) => Ok(NotificationSettings {
                account_id,
                push_enabled: row.push_enabled,
                email_enabled: row.email_enabled,
                enabled_categories: serde_json::from_value(row.enabled_categories)
                    .unwrap_or_default(),
                quiet_hours_start: row.quiet_hours_start,
                quiet_hours_end: row.quiet_hours_end,
            }),
            None => Ok(NotificationSettings {
                account_id,
                ..Default::default()
            }),
        }
    }

    /// Update notification settings for a user
    pub async fn update_settings(&self, settings: NotificationSettings) -> Result<()> {
        let categories_json = serde_json::to_value(&settings.enabled_categories)?;

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
            settings.account_id,
            settings.push_enabled,
            settings.email_enabled,
            categories_json,
            settings.quiet_hours_start,
            settings.quiet_hours_end
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

// === Helper Types and Functions ===

/// Database row type for notifications
#[derive(Debug)]
struct NotificationRow {
    id: Uuid,
    account_id: Uuid,
    title: String,
    message: String,
    notification_type: String,
    category: String,
    priority: String,
    read: bool,
    action_url: Option<String>,
    icon: Option<String>,
    metadata: Option<serde_json::Value>,
    created_at: chrono::DateTime<Utc>,
    read_at: Option<chrono::DateTime<Utc>>,
}

impl From<NotificationRow> for Notification {
    fn from(row: NotificationRow) -> Self {
        Self {
            id: row.id,
            account_id: row.account_id,
            title: row.title,
            message: row.message,
            notification_type: row.notification_type,
            category: string_to_category(&row.category),
            priority: string_to_priority(&row.priority),
            read: row.read,
            action_url: row.action_url,
            icon: row.icon,
            metadata: row.metadata,
            created_at: row.created_at,
            read_at: row.read_at,
        }
    }
}

/// Database row type for push subscriptions
#[derive(Debug)]
struct PushSubscriptionRow {
    id: Uuid,
    account_id: Uuid,
    endpoint: String,
    p256dh_key: String,
    auth_key: String,
    user_agent: Option<String>,
    created_at: chrono::DateTime<Utc>,
    last_used_at: Option<chrono::DateTime<Utc>>,
}

impl From<PushSubscriptionRow> for PushSubscription {
    fn from(row: PushSubscriptionRow) -> Self {
        Self {
            id: row.id,
            account_id: row.account_id,
            endpoint: row.endpoint,
            p256dh_key: row.p256dh_key,
            auth_key: row.auth_key,
            user_agent: row.user_agent,
            created_at: row.created_at,
            last_used_at: row.last_used_at,
        }
    }
}

fn category_to_string(category: &NotificationCategory) -> String {
    match category {
        NotificationCategory::System => "system".to_string(),
        NotificationCategory::Account => "account".to_string(),
        NotificationCategory::Website => "website".to_string(),
        NotificationCategory::Extension => "extension".to_string(),
        NotificationCategory::Billing => "billing".to_string(),
        NotificationCategory::Analytics => "analytics".to_string(),
        NotificationCategory::Security => "security".to_string(),
    }
}

fn string_to_category(s: &str) -> NotificationCategory {
    match s {
        "system" => NotificationCategory::System,
        "account" => NotificationCategory::Account,
        "website" => NotificationCategory::Website,
        "extension" => NotificationCategory::Extension,
        "billing" => NotificationCategory::Billing,
        "analytics" => NotificationCategory::Analytics,
        "security" => NotificationCategory::Security,
        _ => NotificationCategory::System,
    }
}

fn priority_to_string(priority: &NotificationPriority) -> String {
    match priority {
        NotificationPriority::Low => "low".to_string(),
        NotificationPriority::Normal => "normal".to_string(),
        NotificationPriority::High => "high".to_string(),
        NotificationPriority::Urgent => "urgent".to_string(),
    }
}

fn string_to_priority(s: &str) -> NotificationPriority {
    match s {
        "low" => NotificationPriority::Low,
        "normal" => NotificationPriority::Normal,
        "high" => NotificationPriority::High,
        "urgent" => NotificationPriority::Urgent,
        _ => NotificationPriority::Normal,
    }
}

/// Helper function to create common notifications
pub mod helpers {
    use super::*;

    /// Create a welcome notification for a new user
    pub fn welcome_notification(account_id: Uuid) -> CreateNotificationRequest {
        CreateNotificationRequest {
            account_id,
            title: "Bienvenue sur ASAP ! 🎉".to_string(),
            message: "Créez votre site web professionnel en quelques minutes. Explorez les extensions disponibles pour personnaliser votre site.".to_string(),
            notification_type: Some(NotificationType::WelcomeMessage.to_string()),
            category: Some(NotificationCategory::System),
            priority: Some(NotificationPriority::Normal),
            action_url: Some("/app/extensions".to_string()),
            icon: Some("sparkles".to_string()),
            metadata: None,
        }
    }

    /// Create a website published notification
    pub fn website_published_notification(account_id: Uuid, website_slug: &str) -> CreateNotificationRequest {
        CreateNotificationRequest {
            account_id,
            title: "Site publié ! 🚀".to_string(),
            message: format!("Votre site est maintenant accessible à l'adresse {}.asap.cool", website_slug),
            notification_type: Some(NotificationType::WebsitePublished.to_string()),
            category: Some(NotificationCategory::Website),
            priority: Some(NotificationPriority::High),
            action_url: Some(format!("https://{}.asap.cool", website_slug)),
            icon: Some("globe".to_string()),
            metadata: None,
        }
    }

    /// Create a payment successful notification
    pub fn payment_successful_notification(account_id: Uuid, plan: &str) -> CreateNotificationRequest {
        CreateNotificationRequest {
            account_id,
            title: "Paiement confirmé ✅".to_string(),
            message: format!("Votre abonnement {} a été activé avec succès.", plan),
            notification_type: Some(NotificationType::PaymentSuccessful.to_string()),
            category: Some(NotificationCategory::Billing),
            priority: Some(NotificationPriority::High),
            action_url: Some("/app/settings?tab=billing".to_string()),
            icon: Some("credit-card".to_string()),
            metadata: None,
        }
    }

    /// Create an extension activated notification
    pub fn extension_activated_notification(account_id: Uuid, extension_name: &str) -> CreateNotificationRequest {
        CreateNotificationRequest {
            account_id,
            title: format!("Extension {} activée", extension_name),
            message: format!("L'extension {} a été activée sur votre site.", extension_name),
            notification_type: Some(NotificationType::ExtensionActivated.to_string()),
            category: Some(NotificationCategory::Extension),
            priority: Some(NotificationPriority::Normal),
            action_url: Some("/app/extensions".to_string()),
            icon: Some("puzzle".to_string()),
            metadata: None,
        }
    }

    /// Create a security notification for new login
    pub fn new_login_notification(account_id: Uuid, device_info: Option<&str>) -> CreateNotificationRequest {
        let message = match device_info {
            Some(info) => format!("Nouvelle connexion détectée depuis: {}", info),
            None => "Nouvelle connexion détectée à votre compte.".to_string(),
        };
        
        CreateNotificationRequest {
            account_id,
            title: "Nouvelle connexion 🔐".to_string(),
            message,
            notification_type: Some(NotificationType::NewLoginDetected.to_string()),
            category: Some(NotificationCategory::Security),
            priority: Some(NotificationPriority::High),
            action_url: Some("/app/settings?tab=account".to_string()),
            icon: Some("shield".to_string()),
            metadata: None,
        }
    }
}
