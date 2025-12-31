use async_trait::async_trait;
use uuid::Uuid;
use crate::{
    CheckoutSessionRequest, CheckoutSessionResponse, SubscriptionInfo, PaymentError,
};

/// Payment gateway abstraction - allows swapping payment providers
#[async_trait]
pub trait PaymentGateway: Send + Sync {
    /// Create a checkout session for subscription
    async fn create_checkout_session(
        &self,
        request: CheckoutSessionRequest,
    ) -> Result<CheckoutSessionResponse, PaymentError>;

    /// Get subscription information
    async fn get_subscription(
        &self,
        subscription_id: &str,
    ) -> Result<SubscriptionInfo, PaymentError>;

    /// Get customer by ID
    async fn get_customer_id(&self, account_id: Uuid) -> Result<Option<String>, PaymentError>;

    /// Create or get customer for account
    async fn ensure_customer(
        &self,
        account_id: Uuid,
        email: String,
    ) -> Result<String, PaymentError>;

    /// Verify webhook signature
    async fn verify_webhook_signature(
        &self,
        payload: &str,
        signature: &str,
    ) -> Result<(), PaymentError>;

    /// Parse webhook event
    async fn parse_webhook_event(&self, payload: &str) -> Result<serde_json::Value, PaymentError>;
}

/// No-op payment gateway for when Stripe initialization fails
/// Returns errors for all operations - used as fallback
pub struct NoOpPaymentGateway;

impl NoOpPaymentGateway {
    pub fn new() -> Self {
        Self
    }
}

impl Default for NoOpPaymentGateway {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PaymentGateway for NoOpPaymentGateway {
    async fn create_checkout_session(
        &self,
        _request: CheckoutSessionRequest,
    ) -> Result<CheckoutSessionResponse, PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }

    async fn get_subscription(
        &self,
        _subscription_id: &str,
    ) -> Result<SubscriptionInfo, PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }

    async fn get_customer_id(&self, _account_id: Uuid) -> Result<Option<String>, PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }

    async fn ensure_customer(
        &self,
        _account_id: Uuid,
        _email: String,
    ) -> Result<String, PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }

    async fn verify_webhook_signature(
        &self,
        _payload: &str,
        _signature: &str,
    ) -> Result<(), PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }

    async fn parse_webhook_event(&self, _payload: &str) -> Result<serde_json::Value, PaymentError> {
        Err(PaymentError::Configuration("Payment provider not configured".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;

    // Mock implementation for testing
    mock! {
        pub PaymentGatewayImpl {}

        #[async_trait]
        impl PaymentGateway for PaymentGatewayImpl {
            async fn create_checkout_session(
                &self,
                request: CheckoutSessionRequest,
            ) -> Result<CheckoutSessionResponse, PaymentError>;

            async fn get_subscription(
                &self,
                subscription_id: &str,
            ) -> Result<SubscriptionInfo, PaymentError>;

            async fn get_customer_id(&self, account_id: Uuid) -> Result<Option<String>, PaymentError>;

            async fn ensure_customer(
                &self,
                account_id: Uuid,
                email: String,
            ) -> Result<String, PaymentError>;

            async fn verify_webhook_signature(
                &self,
                payload: &str,
                signature: &str,
            ) -> Result<(), PaymentError>;

            async fn parse_webhook_event(&self, payload: &str) -> Result<serde_json::Value, PaymentError>;
        }
    }

    #[tokio::test]
    async fn test_mock_payment_gateway() {
        let mut mock = MockPaymentGatewayImpl::new();
        let account_id = Uuid::new_v4();

        mock.expect_ensure_customer()
            .returning(|_, _| Ok("cus_test123".to_string()));

        let result = mock.ensure_customer(account_id, "test@example.com".to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "cus_test123");
    }
}
