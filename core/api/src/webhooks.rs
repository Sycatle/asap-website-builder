use axum::{
    extract::{State, Json},
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Response},
    Extension,
    body::Bytes,
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;
use asap_core_payments::PaymentGateway;

#[derive(Debug, Serialize)]
pub struct WebhookResponse {
    pub received: bool,
}

/// POST /api/payments/webhook/stripe
/// Handle Stripe webhook events with signature verification
pub async fn stripe_webhook(
    State(pool): State<PgPool>,
    Extension(payment_gateway): Extension<std::sync::Arc<dyn PaymentGateway>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<WebhookResponse>, Response> {
    tracing::info!("Received Stripe webhook");

    let payload = String::from_utf8(body.to_vec())
        .map_err(|e| {
            tracing::error!("Invalid UTF-8 payload: {}", e);
            (StatusCode::BAD_REQUEST, "Invalid payload encoding").into_response()
        })?;

    // Get signature from headers
    let signature = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| {
            tracing::error!("Missing stripe-signature header");
            (StatusCode::BAD_REQUEST, "Missing signature").into_response()
        })?;

    // Verify webhook signature
    payment_gateway
        .verify_webhook_signature(&payload, signature)
        .await
        .map_err(|e| {
            tracing::error!("Invalid webhook signature: {}", e);
            (StatusCode::UNAUTHORIZED, "Invalid signature").into_response()
        })?;

    // Parse event
    let event = payment_gateway
        .parse_webhook_event(&payload)
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse webhook event: {}", e);
            (StatusCode::BAD_REQUEST, "Failed to parse event").into_response()
        })?;

    let event_id = event["id"].as_str().unwrap_or("unknown");
    let event_type = event["type"].as_str().unwrap_or("unknown");
    // Use event_id as unique identifier (Stripe guarantees uniqueness)
    let payload_hash = event_id.to_string();

    // Check if event already processed (idempotency)
    let existing = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM payment_events WHERE event_id = $1"
    )
    .bind(event_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error checking event: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
    })?;

    if existing.is_some() {
        tracing::info!("Event {} already processed, skipping", event_id);
        return Ok(Json(WebhookResponse { received: true }));
    }

    // Extract customer ID to find account
    // For most events, customer ID is in data.object.customer
    // For customer events, it's in data.object.id
    let customer_id = if event_type.starts_with("customer.") {
        event["data"]["object"]["id"].as_str()
    } else {
        event["data"]["object"]["customer"].as_str()
    };

    let Some(customer_id) = customer_id else {
        tracing::error!("No customer ID in event type: {}", event_type);
        return Err((StatusCode::BAD_REQUEST, "No customer ID").into_response());
    };

    // Find tenant by customer ID
    let account_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM accounts WHERE stripe_customer_id = $1"
    )
    .bind(customer_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error fetching account: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
    })?;

    // Store event for idempotency
    sqlx::query(
        "INSERT INTO payment_events (event_id, event_type, payload_hash, account_id, processed_at) 
         VALUES ($1, $2, $3, $4, now())"
    )
    .bind(event_id)
    .bind(event_type)
    .bind(payload_hash)
    .bind(account_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store payment event: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to store event").into_response()
    })?;

    // Process event based on type
    match event_type {
        "customer.subscription.created" | "customer.subscription.updated" => {
            if let Some(tid) = account_id {
                process_subscription_event(&pool, tid, &event).await?;
            }
        }
        "customer.subscription.deleted" => {
            if let Some(tid) = account_id {
                process_subscription_deleted(&pool, tid).await?;
            }
        }
        "invoice.payment_succeeded" => {
            tracing::info!("Payment succeeded for customer {}", customer_id);
        }
        "invoice.payment_failed" => {
            tracing::warn!("Payment failed for customer {}", customer_id);
            if let Some(tid) = account_id {
                update_plan_status(&pool, tid, "past_due").await?;
            }
        }
        _ => {
            tracing::info!("Unhandled event type: {}", event_type);
        }
    }

    Ok(Json(WebhookResponse { received: true }))
}

async fn process_subscription_event(
    pool: &PgPool,
    account_id: Uuid,
    event: &serde_json::Value,
) -> Result<(), Response> {
    let subscription = &event["data"]["object"];
    
    let status = subscription["status"].as_str().unwrap_or("inactive");
    let current_period_end = subscription["current_period_end"]
        .as_i64()
        .and_then(|ts| chrono::DateTime::from_timestamp(ts, 0));

    sqlx::query(
        "UPDATE accounts 
         SET plan_status = $1, current_period_end = $2 
         WHERE id = $3"
    )
    .bind(status)
    .bind(current_period_end)
    .bind(account_id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update subscription status: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to update status").into_response()
    })?;

    tracing::info!("Updated subscription status for account {} to {}", account_id, status);
    Ok(())
}

async fn process_subscription_deleted(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<(), Response> {
    update_plan_status(pool, account_id, "canceled").await
}

async fn update_plan_status(
    pool: &PgPool,
    account_id: Uuid,
    status: &str,
) -> Result<(), Response> {
    sqlx::query(
        "UPDATE accounts SET plan_status = $1 WHERE id = $2"
    )
    .bind(status)
    .bind(account_id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update plan status: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to update status").into_response()
    })?;

    tracing::info!("Updated plan status for account {} to {}", account_id, status);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_payload_hash() {
        let payload1 = r#"{"type":"test","data":{}}"#;
        let hash1 = compute_payload_hash(payload1);
        
        // Same payload should produce same hash
        let hash2 = compute_payload_hash(payload1);
        assert_eq!(hash1, hash2);
        
        // Different payload should produce different hash
        let payload2 = r#"{"type":"different","data":{}}"#;
        let hash3 = compute_payload_hash(payload2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_webhook_response_serialize() {
        let response = WebhookResponse { received: true };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("received"));
        assert!(json.contains("true"));
    }
}
