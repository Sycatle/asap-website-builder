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
    async fn get_customer_id(&self, tenant_id: Uuid) -> Result<Option<String>, PaymentError>;

    /// Create or get customer for tenant
    async fn ensure_customer(
        &self,
        tenant_id: Uuid,
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

            async fn get_customer_id(&self, tenant_id: Uuid) -> Result<Option<String>, PaymentError>;

            async fn ensure_customer(
                &self,
                tenant_id: Uuid,
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
        let tenant_id = Uuid::new_v4();

        mock.expect_ensure_customer()
            .returning(|_, _| Ok("cus_test123".to_string()));

        let result = mock.ensure_customer(tenant_id, "test@example.com".to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "cus_test123");
    }
}
