use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Account represents a user account with authentication and billing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    // Plan and payment fields
    pub plan: String,
    pub stripe_customer_id: Option<String>,
    pub plan_status: Option<String>,
    pub current_period_end: Option<DateTime<Utc>>,
}

/// AccountData stores extended account information in JSONB format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountData {
    pub account_id: Uuid,
    pub data: serde_json::Value,
    pub updated_at: DateTime<Utc>,
}

impl AccountData {
    pub fn new(account_id: Uuid) -> Self {
        Self {
            account_id,
            data: serde_json::json!({}),
            updated_at: Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_account_creation() {
        let id = Uuid::new_v4();
        let email = "test@example.com".to_string();
        let password_hash = "hash123".to_string();
        let plan = "free".to_string();

        let account = Account {
            id,
            email: email.clone(),
            password_hash: password_hash.clone(),
            created_at: Utc::now(),
            plan: plan.clone(),
            stripe_customer_id: None,
            plan_status: None,
            current_period_end: None,
        };

        assert_eq!(account.id, id);
        assert_eq!(account.email, email);
        assert_eq!(account.password_hash, password_hash);
        assert_eq!(account.plan, plan);
    }

    #[test]
    fn test_account_clone() {
        let account = Account {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash123".to_string(),
            created_at: Utc::now(),
            plan: "pro".to_string(),
            stripe_customer_id: Some("cus_123".to_string()),
            plan_status: Some("active".to_string()),
            current_period_end: None,
        };

        let cloned = account.clone();
        assert_eq!(account.id, cloned.id);
        assert_eq!(account.email, cloned.email);
        assert_eq!(account.plan, cloned.plan);
    }

    #[test]
    fn test_account_with_payment_info() {
        let account = Account {
            id: Uuid::new_v4(),
            email: "paid@example.com".to_string(),
            password_hash: "hash123".to_string(),
            created_at: Utc::now(),
            plan: "pro".to_string(),
            stripe_customer_id: Some("cus_abc123".to_string()),
            plan_status: Some("active".to_string()),
            current_period_end: Some(Utc::now()),
        };

        assert_eq!(account.plan, "pro");
        assert!(account.stripe_customer_id.is_some());
        assert!(account.plan_status.is_some());
        assert!(account.current_period_end.is_some());
    }

    #[test]
    fn test_account_data_creation() {
        let account_id = Uuid::new_v4();
        let account_data = AccountData::new(account_id);

        assert_eq!(account_data.account_id, account_id);
        assert_eq!(account_data.data, serde_json::json!({}));
    }

    #[test]
    fn test_account_data_serialization() {
        let account_id = Uuid::new_v4();
        let mut account_data = AccountData::new(account_id);
        account_data.data = serde_json::json!({
            "name": "John Doe",
            "bio": "Software Developer"
        });

        let serialized = serde_json::to_string(&account_data).unwrap();
        let deserialized: AccountData = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.account_id, account_id);
        assert_eq!(deserialized.data["name"], "John Doe");
    }
}
