//! Web Push notifications sender for the worker
//!
//! This module handles sending push notifications to subscribed devices
//! using the Web Push protocol with VAPID authentication.

use anyhow::{Context, Result};
use sqlx::PgPool;
use uuid::Uuid;
use web_push::{
    ContentEncoding, IsahcWebPushClient, SubscriptionInfo, VapidSignatureBuilder,
    WebPushClient, WebPushMessageBuilder,
};

/// VAPID keys loaded from database or environment
#[derive(Debug, Clone)]
pub struct VapidKeys {
    pub public_key: String,
    pub private_key: String,
}

/// Push subscription from database
#[derive(Debug, Clone)]
pub struct PushSubscription {
    pub id: Uuid,
    pub account_id: Uuid,
    pub endpoint: String,
    pub p256dh_key: String,
    pub auth_key: String,
}

/// Notification payload to send via push
#[derive(Debug, Clone, serde::Serialize)]
pub struct PushPayload {
    pub id: String,
    pub title: String,
    pub body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    pub tag: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_url: Option<String>,
    pub category: String,
    pub priority: String,
}

/// Web Push sender
pub struct WebPushSender {
    client: IsahcWebPushClient,
    vapid_keys: VapidKeys,
    subject: String,
}

impl WebPushSender {
    /// Create a new WebPushSender
    pub fn new(vapid_keys: VapidKeys, subject: String) -> Result<Self> {
        let client = IsahcWebPushClient::new()?;
        Ok(Self {
            client,
            vapid_keys,
            subject,
        })
    }

    /// Load VAPID keys from database or environment
    pub async fn load_vapid_keys(pool: &PgPool) -> Result<VapidKeys> {
        // Try database first
        let result: Option<(String, String)> = sqlx::query_as(
            "SELECT public_key, private_key FROM vapid_keys WHERE name = 'default' LIMIT 1",
        )
        .fetch_optional(pool)
        .await?;

        if let Some((public_key, private_key)) = result {
            tracing::info!("Loaded VAPID keys from database");
            return Ok(VapidKeys {
                public_key,
                private_key,
            });
        }

        // Fallback to environment variables
        let public_key = std::env::var("VAPID_PUBLIC_KEY")
            .context("VAPID_PUBLIC_KEY not set and not found in database")?;
        let private_key = std::env::var("VAPID_PRIVATE_KEY")
            .context("VAPID_PRIVATE_KEY not set and not found in database")?;

        tracing::info!("Loaded VAPID keys from environment");
        Ok(VapidKeys {
            public_key,
            private_key,
        })
    }

    /// Get all push subscriptions for an account
    pub async fn get_subscriptions_for_account(
        pool: &PgPool,
        account_id: Uuid,
    ) -> Result<Vec<PushSubscription>> {
        let subscriptions = sqlx::query_as!(
            PushSubscription,
            r#"
            SELECT id, account_id, endpoint, p256dh_key, auth_key
            FROM push_subscriptions
            WHERE account_id = $1
            "#,
            account_id
        )
        .fetch_all(pool)
        .await?;

        Ok(subscriptions)
    }

    /// Send a push notification to a single subscription
    pub async fn send_push(
        &self,
        subscription: &PushSubscription,
        payload: &PushPayload,
    ) -> Result<()> {
        let payload_json = serde_json::to_string(payload)?;

        // Create subscription info for web-push
        let subscription_info = SubscriptionInfo::new(
            &subscription.endpoint,
            &subscription.p256dh_key,
            &subscription.auth_key,
        );

        // Build VAPID signature
        let sig_builder = VapidSignatureBuilder::from_base64(
            &self.vapid_keys.private_key,
            web_push::URL_SAFE_NO_PAD,
            &subscription_info,
        )?
        .build()?;

        // Build the push message
        let mut builder = WebPushMessageBuilder::new(&subscription_info);
        builder.set_payload(ContentEncoding::Aes128Gcm, payload_json.as_bytes());
        builder.set_vapid_signature(sig_builder);

        let message = builder.build()?;

        // Send the push notification
        self.client.send(message).await?;

        tracing::debug!(
            "Sent push notification {} to subscription {}",
            payload.id,
            subscription.id
        );

        Ok(())
    }

    /// Send push notifications to all subscriptions for an account
    pub async fn send_to_account(
        &self,
        pool: &PgPool,
        account_id: Uuid,
        payload: &PushPayload,
    ) -> Result<SendResult> {
        let subscriptions = Self::get_subscriptions_for_account(pool, account_id).await?;

        if subscriptions.is_empty() {
            tracing::debug!("No push subscriptions for account {}", account_id);
            return Ok(SendResult {
                sent: 0,
                failed: 0,
                expired: vec![],
            });
        }

        let mut sent = 0;
        let mut failed = 0;
        let mut expired = Vec::new();
        let mut successful_ids = Vec::new();

        for subscription in &subscriptions {
            match self.send_push(subscription, payload).await {
                Ok(_) => {
                    sent += 1;
                    successful_ids.push(subscription.id);
                }
                Err(e) => {
                    // Check if subscription expired (410 Gone)
                    let error_str = e.to_string();
                    if error_str.contains("410") || error_str.contains("Gone") {
                        tracing::info!(
                            "Push subscription {} expired, marking for removal",
                            subscription.id
                        );
                        expired.push(subscription.id);
                    } else {
                        tracing::warn!(
                            "Failed to send push to subscription {}: {}",
                            subscription.id,
                            e
                        );
                        failed += 1;
                    }
                }
            }
        }

        // Batch UPDATE for successful sends (instead of N individual queries)
        if !successful_ids.is_empty() {
            let _ = sqlx::query(
                "UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ANY($1)",
            )
            .bind(&successful_ids)
            .execute(pool)
            .await;
        }

        // Batch DELETE for expired subscriptions (instead of N individual queries)
        if !expired.is_empty() {
            let _ = sqlx::query("DELETE FROM push_subscriptions WHERE id = ANY($1)")
                .bind(&expired)
                .execute(pool)
                .await;
            tracing::info!("Removed {} expired push subscriptions", expired.len());
        }

        Ok(SendResult {
            sent,
            failed,
            expired,
        })
    }
}

/// Result of sending push notifications
#[derive(Debug)]
pub struct SendResult {
    pub sent: usize,
    pub failed: usize,
    pub expired: Vec<Uuid>,
}

/// Convert a notification to a push payload
pub fn notification_to_push_payload(notification: &serde_json::Value) -> PushPayload {
    PushPayload {
        id: notification["id"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        title: notification["title"]
            .as_str()
            .unwrap_or("ASAP")
            .to_string(),
        body: notification["message"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        icon: notification["icon"].as_str().map(|s| s.to_string()),
        image: None,
        tag: format!(
            "asap-{}",
            notification["id"].as_str().unwrap_or("notification")
        ),
        action_url: notification["action_url"].as_str().map(|s| s.to_string()),
        category: notification["category"]
            .as_str()
            .unwrap_or("system")
            .to_string(),
        priority: notification["priority"]
            .as_str()
            .unwrap_or("normal")
            .to_string(),
    }
}

/// Check if push notifications are enabled for an account
pub async fn is_push_enabled(pool: &PgPool, account_id: Uuid) -> Result<bool> {
    let result: Option<(bool,)> = sqlx::query_as(
        "SELECT push_enabled FROM notification_settings WHERE account_id = $1",
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await?;

    // Default to true if no settings exist
    Ok(result.map(|(enabled,)| enabled).unwrap_or(true))
}

/// Check if a notification category is enabled for an account
pub async fn is_category_enabled(pool: &PgPool, account_id: Uuid, category: &str) -> Result<bool> {
    let result: Option<(serde_json::Value,)> = sqlx::query_as(
        "SELECT enabled_categories FROM notification_settings WHERE account_id = $1",
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await?;

    if let Some((categories,)) = result {
        if let Some(arr) = categories.as_array() {
            return Ok(arr.iter().any(|c| c.as_str() == Some(category)));
        }
    }

    // Default categories if no settings
    let default_categories = ["system", "account", "website", "billing", "security"];
    Ok(default_categories.contains(&category))
}
