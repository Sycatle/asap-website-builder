use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Plan status for subscriptions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PlanStatus {
    Active,
    Canceled,
    Incomplete,
    IncompleteExpired,
    PastDue,
    Trialing,
    Unpaid,
    Inactive,
}

impl PlanStatus {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "active" => PlanStatus::Active,
            "canceled" => PlanStatus::Canceled,
            "incomplete" => PlanStatus::Incomplete,
            "incomplete_expired" => PlanStatus::IncompleteExpired,
            "past_due" => PlanStatus::PastDue,
            "trialing" => PlanStatus::Trialing,
            "unpaid" => PlanStatus::Unpaid,
            "inactive" => PlanStatus::Inactive,
            _ => PlanStatus::Inactive,
        }
    }
    
    pub fn as_str(&self) -> &str {
        match self {
            PlanStatus::Active => "active",
            PlanStatus::Canceled => "canceled",
            PlanStatus::Incomplete => "incomplete",
            PlanStatus::IncompleteExpired => "incomplete_expired",
            PlanStatus::PastDue => "past_due",
            PlanStatus::Trialing => "trialing",
            PlanStatus::Unpaid => "unpaid",
            PlanStatus::Inactive => "inactive",
        }
    }
}

/// Payment event stored for idempotency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentEvent {
    pub id: Uuid,
    pub event_id: String,
    pub event_type: String,
    pub payload_hash: String,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl PaymentEvent {
    pub fn new(event_id: String, event_type: String, payload_hash: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_id,
            event_type,
            payload_hash,
            processed_at: None,
            created_at: Utc::now(),
        }
    }
}

/// Checkout session request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSessionRequest {
    pub account_id: Uuid,
    pub price_id: String,
    pub success_url: String,
    pub cancel_url: String,
}

/// Checkout session response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSessionResponse {
    pub session_id: String,
    pub url: String,
}

/// Subscription info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionInfo {
    pub subscription_id: String,
    pub customer_id: String,
    pub status: PlanStatus,
    pub current_period_end: DateTime<Utc>,
    pub plan_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plan_status_from_str() {
        assert_eq!(PlanStatus::from_str("active"), PlanStatus::Active);
        assert_eq!(PlanStatus::from_str("canceled"), PlanStatus::Canceled);
        assert_eq!(PlanStatus::from_str("trialing"), PlanStatus::Trialing);
        assert_eq!(PlanStatus::from_str("inactive"), PlanStatus::Inactive);
        assert_eq!(PlanStatus::from_str("unknown"), PlanStatus::Inactive);
    }

    #[test]
    fn test_plan_status_as_str() {
        assert_eq!(PlanStatus::Active.as_str(), "active");
        assert_eq!(PlanStatus::Canceled.as_str(), "canceled");
        assert_eq!(PlanStatus::Trialing.as_str(), "trialing");
        assert_eq!(PlanStatus::Inactive.as_str(), "inactive");
    }

    #[test]
    fn test_payment_event_creation() {
        let event = PaymentEvent::new(
            "evt_test_123".to_string(),
            "customer.subscription.created".to_string(),
            "hash123".to_string(),
        );
        
        assert_eq!(event.event_id, "evt_test_123");
        assert_eq!(event.event_type, "customer.subscription.created");
        assert_eq!(event.payload_hash, "hash123");
        assert!(event.processed_at.is_none());
    }

    #[test]
    fn test_checkout_session_request() {
        let request = CheckoutSessionRequest {
            tenant_id: Uuid::new_v4(),
            price_id: "price_123".to_string(),
            success_url: "https://example.com/success".to_string(),
            cancel_url: "https://example.com/cancel".to_string(),
        };
        
        assert_eq!(request.price_id, "price_123");
        assert!(request.success_url.contains("success"));
    }
}
