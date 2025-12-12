use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// User balance in cents for precision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserBalance {
    pub user_id: Uuid,
    pub balance_cents: i64,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserBalance {
    /// Creates a new user balance with zero balance
    pub fn new(user_id: Uuid) -> Self {
        Self {
            user_id,
            balance_cents: 0,
            currency: "EUR".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    /// Gets balance in euros (as float)
    pub fn balance_euros(&self) -> f64 {
        self.balance_cents as f64 / 100.0
    }

    /// Checks if user has sufficient balance
    pub fn has_sufficient_balance(&self, amount_cents: i64) -> bool {
        self.balance_cents >= amount_cents
    }
}

/// Stripe customer mapping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeCustomer {
    pub id: Uuid,
    pub user_id: Uuid,
    pub stripe_customer_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Transaction type enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionType {
    Deposit,
    Withdrawal,
    Refund,
}

impl std::fmt::Display for TransactionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransactionType::Deposit => write!(f, "deposit"),
            TransactionType::Withdrawal => write!(f, "withdrawal"),
            TransactionType::Refund => write!(f, "refund"),
        }
    }
}

/// Transaction status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for TransactionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransactionStatus::Pending => write!(f, "pending"),
            TransactionStatus::Completed => write!(f, "completed"),
            TransactionStatus::Failed => write!(f, "failed"),
            TransactionStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Payment transaction record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentTransaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub transaction_type: TransactionType,
    pub amount_cents: i64,
    pub currency: String,
    pub status: TransactionStatus,
    pub stripe_payment_intent_id: Option<String>,
    pub stripe_charge_id: Option<String>,
    pub description: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl PaymentTransaction {
    /// Creates a new deposit transaction
    pub fn new_deposit(
        user_id: Uuid,
        amount_cents: i64,
        stripe_payment_intent_id: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            user_id,
            transaction_type: TransactionType::Deposit,
            amount_cents,
            currency: "EUR".to_string(),
            status: TransactionStatus::Pending,
            stripe_payment_intent_id: Some(stripe_payment_intent_id),
            stripe_charge_id: None,
            description: Some("Credit deposit".to_string()),
            metadata: serde_json::json!({}),
            created_at: Utc::now(),
            completed_at: None,
        }
    }

    /// Gets amount in euros (as float)
    pub fn amount_euros(&self) -> f64 {
        self.amount_cents as f64 / 100.0
    }

    /// Checks if transaction is completed
    pub fn is_completed(&self) -> bool {
        self.status == TransactionStatus::Completed
    }

    /// Marks transaction as completed
    pub fn complete(&mut self) {
        self.status = TransactionStatus::Completed;
        self.completed_at = Some(Utc::now());
    }

    /// Marks transaction as failed
    pub fn fail(&mut self) {
        self.status = TransactionStatus::Failed;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_balance_creation() {
        let user_id = Uuid::new_v4();
        let balance = UserBalance::new(user_id);
        
        assert_eq!(balance.user_id, user_id);
        assert_eq!(balance.balance_cents, 0);
        assert_eq!(balance.currency, "EUR");
        assert_eq!(balance.balance_euros(), 0.0);
    }

    #[test]
    fn test_balance_euros_conversion() {
        let mut balance = UserBalance::new(Uuid::new_v4());
        balance.balance_cents = 1500;
        
        assert_eq!(balance.balance_euros(), 15.0);
    }

    #[test]
    fn test_sufficient_balance() {
        let mut balance = UserBalance::new(Uuid::new_v4());
        balance.balance_cents = 1000;
        
        assert!(balance.has_sufficient_balance(500));
        assert!(balance.has_sufficient_balance(1000));
        assert!(!balance.has_sufficient_balance(1001));
    }

    #[test]
    fn test_transaction_creation() {
        let user_id = Uuid::new_v4();
        let payment_intent_id = "pi_test123".to_string();
        
        let transaction = PaymentTransaction::new_deposit(
            user_id,
            2000,
            payment_intent_id.clone(),
        );
        
        assert_eq!(transaction.user_id, user_id);
        assert_eq!(transaction.amount_cents, 2000);
        assert_eq!(transaction.amount_euros(), 20.0);
        assert_eq!(transaction.transaction_type, TransactionType::Deposit);
        assert_eq!(transaction.status, TransactionStatus::Pending);
        assert!(!transaction.is_completed());
    }

    #[test]
    fn test_transaction_completion() {
        let user_id = Uuid::new_v4();
        let mut transaction = PaymentTransaction::new_deposit(
            user_id,
            1000,
            "pi_test".to_string(),
        );
        
        assert!(!transaction.is_completed());
        assert!(transaction.completed_at.is_none());
        
        transaction.complete();
        
        assert!(transaction.is_completed());
        assert!(transaction.completed_at.is_some());
        assert_eq!(transaction.status, TransactionStatus::Completed);
    }

    #[test]
    fn test_transaction_type_display() {
        assert_eq!(TransactionType::Deposit.to_string(), "deposit");
        assert_eq!(TransactionType::Withdrawal.to_string(), "withdrawal");
        assert_eq!(TransactionType::Refund.to_string(), "refund");
    }

    #[test]
    fn test_transaction_status_display() {
        assert_eq!(TransactionStatus::Pending.to_string(), "pending");
        assert_eq!(TransactionStatus::Completed.to_string(), "completed");
        assert_eq!(TransactionStatus::Failed.to_string(), "failed");
        assert_eq!(TransactionStatus::Cancelled.to_string(), "cancelled");
    }
}
