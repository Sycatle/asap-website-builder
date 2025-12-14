use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
    Extension,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use asap_core_shared::Claims;
use asap_core_payments::{
    PaymentGateway, CheckoutSessionRequest,
};

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutSessionRequest {
    pub price_id: String,
    pub success_url: String,
    pub cancel_url: String,
}

#[derive(Debug, Serialize)]
pub struct CreateCheckoutSessionResponse {
    pub session_id: String,
    pub url: String,
}

/// POST /api/billing/checkout-session
/// Create a Stripe Checkout session for subscription
pub async fn create_checkout_session(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(payment_gateway): Extension<std::sync::Arc<dyn PaymentGateway>>,
    Json(req): Json<CreateCheckoutSessionRequest>,
) -> Result<Json<CreateCheckoutSessionResponse>, Response> {
    tracing::info!("Creating checkout session for account: {}", claims.sub);

    // Parse account_id from string to Uuid
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (StatusCode::BAD_REQUEST, "Invalid account ID").into_response()
    })?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (StatusCode::BAD_REQUEST, "Invalid account ID").into_response()
    })?;

    // Get account email for customer creation
    let email = sqlx::query_scalar::<_, String>(
        "SELECT email FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch account: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch account").into_response()
    })?;

    // Ensure customer exists in Stripe
    payment_gateway
        .ensure_customer(account_id, email)
        .await
        .map_err(|e| {
            tracing::error!("Failed to ensure customer: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create customer").into_response()
        })?;

    // Create checkout session
    let checkout_request = CheckoutSessionRequest {
        account_id,
        price_id: req.price_id,
        success_url: req.success_url,
        cancel_url: req.cancel_url,
    };

    let session = payment_gateway
        .create_checkout_session(checkout_request)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create checkout session: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create checkout session").into_response()
        })?;

    Ok(Json(CreateCheckoutSessionResponse {
        session_id: session.session_id,
        url: session.url,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_checkout_session_request_deserialize() {
        let json = r#"{
            "price_id": "price_123",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        }"#;

        let req: CreateCheckoutSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.price_id, "price_123");
        assert_eq!(req.success_url, "https://example.com/success");
        assert_eq!(req.cancel_url, "https://example.com/cancel");
    }

    #[test]
    fn test_create_checkout_session_response_serialize() {
        let response = CreateCheckoutSessionResponse {
            session_id: "cs_test_123".to_string(),
            url: "https://checkout.stripe.com/pay/cs_test_123".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("cs_test_123"));
        assert!(json.contains("checkout.stripe.com"));
    }
}
