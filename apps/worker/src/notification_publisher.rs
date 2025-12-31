//! Redis notification publisher for the worker
//!
//! This module publishes notification events to Redis when new notifications are created.

use asap_core_shared::{
    NotificationPublisher,
    NotificationPubSubEvent,
    CHANNEL_NOTIFICATIONS,
};
use redis::aio::ConnectionManager;
use std::sync::Arc;
use uuid::Uuid;

/// Redis-based notification publisher for the worker
pub struct WorkerNotificationPublisher {
    redis: ConnectionManager,
}

impl WorkerNotificationPublisher {
    pub async fn new(redis_url: &str) -> anyhow::Result<Arc<Self>> {
        let client = redis::Client::open(redis_url)?;
        let redis = ConnectionManager::new(client).await?;
        Ok(Arc::new(Self { redis }))
    }
}

#[async_trait::async_trait]
impl NotificationPublisher for WorkerNotificationPublisher {
    async fn publish(&self, event: NotificationPubSubEvent) -> anyhow::Result<()> {
        let payload = serde_json::to_string(&event)?;
        
        let mut conn = self.redis.clone();
        let _: i64 = redis::cmd("PUBLISH")
            .arg(CHANNEL_NOTIFICATIONS)
            .arg(&payload)
            .query_async(&mut conn)
            .await?;
        
        tracing::debug!("Published notification event to Redis");
        Ok(())
    }
}

/// Notification data structure for querying created notifications
#[derive(Debug, Clone)]
pub struct CreatedNotification {
    pub id: Uuid,
    pub account_id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub category: String,
    pub priority: String,
    pub action_url: Option<String>,
    pub icon: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Get notifications created since a timestamp
pub async fn get_notifications_created_since(
    pool: &sqlx::PgPool,
    since: chrono::DateTime<chrono::Utc>,
) -> anyhow::Result<Vec<CreatedNotification>> {
    let notifications: Vec<CreatedNotification> = sqlx::query_as!(
        CreatedNotification,
        r#"
        SELECT 
            id, account_id, title, message, notification_type,
            category, priority, action_url, icon, metadata, created_at
        FROM notifications
        WHERE created_at > $1
        ORDER BY created_at ASC
        "#,
        since
    )
    .fetch_all(pool)
    .await?;
    
    Ok(notifications)
}

/// Get unread count for an account
pub async fn get_unread_count(pool: &sqlx::PgPool, account_id: Uuid) -> anyhow::Result<i64> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT FROM notifications WHERE account_id = $1 AND read = false"
    )
    .bind(account_id)
    .fetch_one(pool)
    .await?;
    
    Ok(count.0)
}

/// Publish newly created notifications to Redis
pub async fn publish_new_notifications(
    publisher: &Arc<WorkerNotificationPublisher>,
    pool: &sqlx::PgPool,
    notifications: Vec<CreatedNotification>,
) -> anyhow::Result<usize> {
    let mut published = 0;
    
    for notification in notifications {
        // Get current unread count for this account
        let unread_count = get_unread_count(pool, notification.account_id).await?;
        
        // Convert to JSON for the event
        let notification_json = serde_json::json!({
            "id": notification.id.to_string(),
            "account_id": notification.account_id.to_string(),
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "category": notification.category,
            "priority": notification.priority,
            "action_url": notification.action_url,
            "icon": notification.icon,
            "metadata": notification.metadata,
            "read": false,
            "created_at": notification.created_at.to_rfc3339(),
            "read_at": serde_json::Value::Null
        });
        
        // Publish to Redis
        publisher.publish_new(
            &notification.account_id.to_string(),
            notification_json,
            unread_count,
        ).await?;
        
        published += 1;
        tracing::debug!(
            "Published notification {} for account {}",
            notification.id,
            notification.account_id
        );
    }
    
    Ok(published)
}
