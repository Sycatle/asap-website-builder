use crate::{
    CheckoutSessionRequest, CheckoutSessionResponse, PaymentError, PaymentGateway, PlanStatus,
    SubscriptionInfo,
};
use async_trait::async_trait;
use hmac::{Hmac, Mac};
use reqwest::{Client, Url};
use sha2::Sha256;
use std::collections::HashMap;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

/// Validate that a redirect URL is on an allowed domain (prevents open redirect attacks)
fn validate_redirect_url(url: &str) -> Result<(), &'static str> {
    let allowed_domains: &[&str] = &["asap.cool", "localhost", "127.0.0.1"];

    let parsed = Url::parse(url).map_err(|_| "Invalid URL format")?;

    // Only allow https in production (http allowed for localhost)
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("URL must use http or https scheme");
    }

    let host = parsed.host_str().ok_or("URL must have a host")?;

    // Check if host matches allowed domains
    let is_allowed = allowed_domains
        .iter()
        .any(|allowed| host == *allowed || host.ends_with(&format!(".{}", allowed)));

    if !is_allowed {
        return Err("Redirect URL must be on an allowed domain");
    }

    Ok(())
}

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

        // Decode the provided signature from hex
        let sig_bytes = hex::decode(signature).map_err(|_| PaymentError::InvalidSignature)?;

        // Use constant-time comparison to prevent timing attacks
        mac.verify_slice(&sig_bytes)
            .map_err(|_| PaymentError::InvalidSignature)?;

        Ok(())
    }
}

#[async_trait]
impl PaymentGateway for StripeProvider {
    async fn create_checkout_session(
        &self,
        request: CheckoutSessionRequest,
    ) -> Result<CheckoutSessionResponse, PaymentError> {
        tracing::info!(
            "Creating Stripe checkout session for account {}",
            request.account_id
        );

        // Validate redirect URLs to prevent open redirect attacks
        if let Err(e) = validate_redirect_url(&request.success_url) {
            return Err(PaymentError::Unknown(format!("Invalid success_url: {}", e)));
        }
        if let Err(e) = validate_redirect_url(&request.cancel_url) {
            return Err(PaymentError::Unknown(format!("Invalid cancel_url: {}", e)));
        }

        // Ensure customer exists
        let customer_id = self
            .get_customer_id(request.account_id)
            .await?
            .ok_or_else(|| PaymentError::CustomerNotFound(request.account_id.to_string()))?;

        // Create checkout session via Stripe API
        let mut params = HashMap::new();
        params.insert("customer", customer_id);
        params.insert("mode", "subscription".to_string());
        params.insert("success_url", request.success_url.clone());
        params.insert("cancel_url", request.cancel_url.clone());
        params.insert("line_items[0][price]", request.price_id.clone());
        params.insert("line_items[0][quantity]", "1".to_string());

        let response = self
            .client
            .post("https://api.stripe.com/v1/checkout/sessions")
            .bearer_auth(&self.api_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("Stripe API error: {}", error_text);
            return Err(PaymentError::Unknown(format!(
                "Stripe API error: {}",
                error_text
            )));
        }

        let session: serde_json::Value = response
            .json()
            .await
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

        let response = self
            .client
            .get(format!(
                "https://api.stripe.com/v1/subscriptions/{}",
                subscription_id
            ))
            .bearer_auth(&self.api_key)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            return Err(PaymentError::SubscriptionNotFound(
                subscription_id.to_string(),
            ));
        }

        let subscription: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        let status_str = subscription["status"].as_str().unwrap_or("canceled");
        let status = PlanStatus::parse(status_str);

        let customer_id = subscription["customer"]
            .as_str()
            .unwrap_or_default()
            .to_string();

        // Safely get plan_id from first item if available
        let plan_id = subscription["items"]["data"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|item| item["price"]["id"].as_str())
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

    async fn get_customer_id(&self, account_id: Uuid) -> Result<Option<String>, PaymentError> {
        // Check cache first
        let cache = self.customer_cache.read().await;
        if let Some(customer_id) = cache.get(&account_id) {
            return Ok(Some(customer_id.clone()));
        }
        drop(cache);

        // In a real implementation, we'd query the database here
        // For now, return None and rely on ensure_customer
        Ok(None)
    }

    async fn ensure_customer(
        &self,
        account_id: Uuid,
        email: String,
    ) -> Result<String, PaymentError> {
        tracing::info!(
            "Ensuring Stripe customer for account {} ({})",
            account_id,
            email
        );

        // Check if we already have a customer
        if let Some(customer_id) = self.get_customer_id(account_id).await? {
            return Ok(customer_id);
        }

        // Create new customer via Stripe API
        let mut params = HashMap::new();
        params.insert("email", email);
        params.insert("metadata[account_id]", account_id.to_string());

        let response = self
            .client
            .post("https://api.stripe.com/v1/customers")
            .bearer_auth(&self.api_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("Failed to create customer: {}", error_text);
            return Err(PaymentError::Unknown(format!(
                "Failed to create customer: {}",
                error_text
            )));
        }

        let customer: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::Unknown(e.to_string()))?;

        let customer_id = customer["id"].as_str().unwrap_or_default().to_string();

        // Cache the customer ID
        let mut cache = self.customer_cache.write().await;
        cache.insert(account_id, customer_id.clone());

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
    fn test_stripe_provider_creation() {
        let provider = StripeProvider::new("sk_test_123".to_string(), "whsec_test_123".to_string());

        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_customer_cache() {
        let provider =
            StripeProvider::new("sk_test_123".to_string(), "whsec_test_123".to_string()).unwrap();

        let account_id = Uuid::new_v4();

        // Initially should return None
        let result = provider.get_customer_id(account_id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);

        // Add to cache
        {
            let mut cache = provider.customer_cache.write().await;
            cache.insert(account_id, "cus_test123".to_string());
        }

        // Should now return cached value
        let result = provider.get_customer_id(account_id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some("cus_test123".to_string()));
    }
}
