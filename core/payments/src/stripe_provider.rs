use async_trait::async_trait;
use reqwest::Client;
use uuid::Uuid;
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use crate::{
    PaymentGateway, CheckoutSessionRequest, CheckoutSessionResponse,
    SubscriptionInfo, PaymentError, PlanStatus,
};

type HmacSha256 = Hmac<Sha256>;

pub struct StripeProvider {
    client: Client,
    api_key: String,
    webhook_secret: String,
    customer_cache: tokio::sync::RwLock<HashMap<Uuid, String>>,
}

impl StripeProvider {
    pub fn new(api_key: String, webhook_secret: String) -> Result<Self, PaymentError> {
        let client = Client::new();
        
        Ok(Self {
            client,
            api_key,
            webhook_secret,
            customer_cache: tokio::sync::RwLock::new(HashMap::new()),
        })
    }

    fn compute_payload_hash(payload: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(payload.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn verify_signature(&self, payload: &str, signature_header: &str) -> Result<(), PaymentError> {
        // Stripe signature format: t=timestamp,v1=signature
        let parts: HashMap<_, _> = signature_header
            .split(',')
            .filter_map(|part| {
                let mut split = part.split('=');
                Some((split.next()?, split.next()?))
            })
            .collect();

        let timestamp = parts.get("t").ok_or(PaymentError::InvalidSignature)?;
        let signature = parts.get("v1").ok_or(PaymentError::InvalidSignature)?;

        // Create signed payload
        let signed_payload = format!("{}.{}", timestamp, payload);

        // Compute HMAC
        let mut mac = HmacSha256::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|_| PaymentError::InvalidSignature)?;
        mac.update(signed_payload.as_bytes());
        
        // Compare signatures
        let expected_sig = hex::encode(mac.finalize().into_bytes());
        
        if &expected_sig != signature {
            return Err(PaymentError::InvalidSignature);
        }

        Ok(())
    }
}

#[async_trait]
impl PaymentGateway for StripeProvider {
    async fn create_checkout_session(
        &self,
        request: CheckoutSessionRequest,
    ) -> Result<CheckoutSessionResponse, PaymentError> {
        tracing::info!("Creating Stripe checkout session for tenant {}", request.tenant_id);

        // Ensure customer exists
        let customer_id = self.get_customer_id(request.tenant_id).await?
            .ok_or_else(|| PaymentError::CustomerNotFound(request.tenant_id.to_string()))?;

        // Create checkout session via Stripe API
        let mut params = HashMap::new();
        params.insert("customer", customer_id);
        params.insert("mode", "subscription".to_string());
        params.insert("success_url", request.success_url.clone());
        params.insert("cancel_url", request.cancel_url.clone());
        params.insert("line_items[0][price]", request.price_id.clone());
        params.insert("line_items[0][quantity]", "1".to_string());

        let response = self.client
            .post("https://api.stripe.com/v1/checkout/sessions")
            .bearer_auth(&self.api_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("Stripe API error: {}", error_text);
            return Err(PaymentError::Unknown(format!("Stripe API error: {}", error_text)));
        }

        let session: serde_json::Value = response.json().await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        Ok(CheckoutSessionResponse {
            session_id: session["id"].as_str().unwrap_or_default().to_string(),
            url: session["url"].as_str().unwrap_or_default().to_string(),
        })
    }

    async fn get_subscription(
        &self,
        subscription_id: &str,
    ) -> Result<SubscriptionInfo, PaymentError> {
        tracing::info!("Fetching subscription: {}", subscription_id);

        let response = self.client
            .get(&format!("https://api.stripe.com/v1/subscriptions/{}", subscription_id))
            .bearer_auth(&self.api_key)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            return Err(PaymentError::SubscriptionNotFound(subscription_id.to_string()));
        }

        let subscription: serde_json::Value = response.json().await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        let status_str = subscription["status"].as_str().unwrap_or("canceled");
        let status = PlanStatus::from_str(status_str);

        let customer_id = subscription["customer"].as_str().unwrap_or_default().to_string();
        let plan_id = subscription["items"]["data"][0]["price"]["id"]
            .as_str()
            .unwrap_or_default()
            .to_string();
        let current_period_end_ts = subscription["current_period_end"].as_i64().unwrap_or(0);

        Ok(SubscriptionInfo {
            subscription_id: subscription_id.to_string(),
            customer_id,
            status,
            current_period_end: chrono::DateTime::from_timestamp(current_period_end_ts, 0)
                .unwrap_or_else(chrono::Utc::now),
            plan_id,
        })
    }

    async fn get_customer_id(&self, tenant_id: Uuid) -> Result<Option<String>, PaymentError> {
        // Check cache first
        let cache = self.customer_cache.read().await;
        if let Some(customer_id) = cache.get(&tenant_id) {
            return Ok(Some(customer_id.clone()));
        }
        drop(cache);

        // In a real implementation, we'd query the database here
        // For now, return None and rely on ensure_customer
        Ok(None)
    }

    async fn ensure_customer(
        &self,
        tenant_id: Uuid,
        email: String,
    ) -> Result<String, PaymentError> {
        tracing::info!("Ensuring Stripe customer for tenant {} ({})", tenant_id, email);

        // Check if we already have a customer
        if let Some(customer_id) = self.get_customer_id(tenant_id).await? {
            return Ok(customer_id);
        }

        // Create new customer via Stripe API
        let mut params = HashMap::new();
        params.insert("email", email);
        params.insert("metadata[tenant_id]", tenant_id.to_string());

        let response = self.client
            .post("https://api.stripe.com/v1/customers")
            .bearer_auth(&self.api_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("Failed to create customer: {}", error_text);
            return Err(PaymentError::Unknown(format!("Failed to create customer: {}", error_text)));
        }

        let customer: serde_json::Value = response.json().await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        let customer_id = customer["id"].as_str().unwrap_or_default().to_string();

        // Cache the customer ID
        let mut cache = self.customer_cache.write().await;
        cache.insert(tenant_id, customer_id.clone());

        Ok(customer_id)
    }

    async fn verify_webhook_signature(
        &self,
        payload: &str,
        signature: &str,
    ) -> Result<(), PaymentError> {
        tracing::debug!("Verifying webhook signature");
        self.verify_signature(payload, signature)
    }

    async fn parse_webhook_event(&self, payload: &str) -> Result<serde_json::Value, PaymentError> {
        let event: serde_json::Value = serde_json::from_str(payload)
            .map_err(|e| PaymentError::EventProcessingFailed(e.to_string()))?;

        Ok(event)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_payload_hash() {
        let payload = r#"{"type":"test","data":{}}"#;
        let hash1 = StripeProvider::compute_payload_hash(payload);
        let hash2 = StripeProvider::compute_payload_hash(payload);
        
        // Same input should produce same hash
        assert_eq!(hash1, hash2);
        
        // Different input should produce different hash
        let different_payload = r#"{"type":"different","data":{}}"#;
        let hash3 = StripeProvider::compute_payload_hash(different_payload);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_stripe_provider_creation() {
        let provider = StripeProvider::new(
            "sk_test_123".to_string(),
            "whsec_test_123".to_string(),
        );
        
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_customer_cache() {
        let provider = StripeProvider::new(
            "sk_test_123".to_string(),
            "whsec_test_123".to_string(),
        ).unwrap();

        let tenant_id = Uuid::new_v4();
        
        // Initially should return None
        let result = provider.get_customer_id(tenant_id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);

        // Add to cache
        {
            let mut cache = provider.customer_cache.write().await;
            cache.insert(tenant_id, "cus_test123".to_string());
        }

        // Should now return cached value
        let result = provider.get_customer_id(tenant_id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some("cus_test123".to_string()));
    }
}
