use sqlx::PgPool;
use uuid::Uuid;

/// Check if account needs payment reconciliation on login
pub async fn check_account_payment_status(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let account = sqlx::query!(
        r#"
        SELECT plan_status, current_period_end
        FROM accounts 
        WHERE id = $1 AND stripe_customer_id IS NOT NULL
        "#,
        account_id
    )
    .fetch_optional(pool)
    .await?;

    let Some(account) = account else {
        return Ok(false);
    };

    // Check for dubious statuses that need immediate reconciliation
    let dubious_statuses = ["incomplete", "past_due", "unpaid"];
    if let Some(status) = account.plan_status {
        if dubious_statuses.contains(&status.as_str()) {
            tracing::warn!(
                "Account {} has dubious payment status: {}",
                account_id,
                status
            );
            return Ok(true);
        }
    }

    // Check if subscription is expired
    if let Some(period_end) = account.current_period_end {
        if period_end < chrono::Utc::now() {
            tracing::warn!("Account {} subscription has expired", account_id);
            return Ok(true);
        }
    }

    Ok(false)
}

/// Get account payment status information
pub async fn get_account_subscription_info(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<Option<SubscriptionInfo>, sqlx::Error> {
    let account = sqlx::query!(
        r#"
        SELECT 
            stripe_customer_id,
            plan,
            plan_status,
            current_period_end
        FROM accounts 
        WHERE id = $1
        "#,
        account_id
    )
    .fetch_optional(pool)
    .await?;

    Ok(account.map(|t| SubscriptionInfo {
        customer_id: t.stripe_customer_id,
        plan: t.plan,
        status: t.plan_status,
        current_period_end: t.current_period_end,
    }))
}

#[derive(Debug, Clone)]
pub struct SubscriptionInfo {
    pub customer_id: Option<String>,
    pub plan: String,
    pub status: Option<String>,
    pub current_period_end: Option<chrono::DateTime<chrono::Utc>>,
}

impl SubscriptionInfo {
    pub fn is_active(&self) -> bool {
        self.status.as_deref() == Some("active")
    }

    pub fn is_expired(&self) -> bool {
        if let Some(period_end) = self.current_period_end {
            period_end < chrono::Utc::now()
        } else {
            false
        }
    }

    pub fn needs_attention(&self) -> bool {
        let dubious_statuses = ["incomplete", "past_due", "unpaid"];
        if let Some(status) = &self.status {
            if dubious_statuses.contains(&status.as_str()) {
                return true;
            }
        }
        self.is_expired()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subscription_info_is_active() {
        let info = SubscriptionInfo {
            customer_id: Some("cus_123".to_string()),
            plan: "pro".to_string(),
            status: Some("active".to_string()),
            current_period_end: None,
        };

        assert!(info.is_active());
        assert!(!info.is_expired());
    }

    #[test]
    fn test_subscription_info_needs_attention() {
        let info = SubscriptionInfo {
            customer_id: Some("cus_123".to_string()),
            plan: "pro".to_string(),
            status: Some("past_due".to_string()),
            current_period_end: None,
        };

        assert!(info.needs_attention());
        assert!(!info.is_active());
    }

    #[test]
    fn test_subscription_info_expired() {
        let past_date = chrono::Utc::now() - chrono::Duration::days(1);
        let info = SubscriptionInfo {
            customer_id: Some("cus_123".to_string()),
            plan: "pro".to_string(),
            status: Some("active".to_string()),
            current_period_end: Some(past_date),
        };

        assert!(info.is_expired());
        assert!(info.needs_attention());
    }
}
