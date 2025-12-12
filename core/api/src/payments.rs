use axum::{
    extract::{State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use reqwest;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex;

use asap_core_shared::Claims;
use asap_core_domain::{UserBalance, PaymentTransaction};

type HmacSha256 = Hmac<Sha256>;

/// Maximum payment amount in cents (100,000 EUR)
const MAX_PAYMENT_AMOUNT_CENTS: i64 = 100_000_00;
/// Minimum payment amount in cents (1 EUR)
const MIN_PAYMENT_AMOUNT_CENTS: i64 = 100;
/// Maximum webhook age in seconds (5 minutes)
const MAX_WEBHOOK_AGE_SECONDS: i64 = 300;

/// Response for balance query
#[derive(Debug, Serialize)]
pub struct BalanceResponse {
    pub balance_cents: i64,
    pub balance_euros: f64,
    pub currency: String,
}

/// Request to create a payment intent
#[derive(Debug, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub amount_cents: i64,
}

/// Response with payment intent details
#[derive(Debug, Serialize)]
pub struct PaymentIntentResponse {
    pub client_secret: String,
    pub payment_intent_id: String,
    pub amount_cents: i64,
}

/// Transaction response for history
#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: String,
    pub transaction_type: String,
    pub amount_cents: i64,
    pub amount_euros: f64,
    pub currency: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

/// Get user balance
pub async fn get_balance(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID"
            }))).into_response();
        }
    };

    // Get balance from database
    let balance = match sqlx::query_as!(
        UserBalance,
        r#"
        SELECT user_id, balance_cents, currency, created_at, updated_at
        FROM user_balances
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(balance)) => balance,
        Ok(None) => {
            // Create balance if it doesn't exist
            let new_balance = UserBalance::new(user_id);
            match sqlx::query!(
                r#"
                INSERT INTO user_balances (user_id, balance_cents, currency)
                VALUES ($1, $2, $3)
                RETURNING user_id
                "#,
                user_id,
                new_balance.balance_cents,
                new_balance.currency
            )
            .fetch_one(&pool)
            .await
            {
                Ok(_) => new_balance,
                Err(e) => {
                    tracing::error!("Failed to create balance: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "error": "Failed to initialize balance"
                    }))).into_response();
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to fetch balance: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to fetch balance"
            }))).into_response();
        }
    };

    (StatusCode::OK, Json(BalanceResponse {
        balance_cents: balance.balance_cents,
        balance_euros: balance.balance_euros(),
        currency: balance.currency,
    })).into_response()
}

/// Create a payment intent for adding credits
pub async fn create_payment_intent(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreatePaymentIntentRequest>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID"
            }))).into_response();
        }
    };

    // Validate amount
    if payload.amount_cents < MIN_PAYMENT_AMOUNT_CENTS {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Minimum amount is 1 EUR (100 cents)"
        }))).into_response();
    }

    if payload.amount_cents > MAX_PAYMENT_AMOUNT_CENTS {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Maximum amount is 100,000 EUR"
        }))).into_response();
    }

    // Get Stripe secret key from environment
    let stripe_secret_key = match std::env::var("STRIPE_SECRET_KEY") {
        Ok(key) if !key.is_empty() => key,
        _ => {
            tracing::error!("STRIPE_SECRET_KEY is not configured");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Payment system not configured"
            }))).into_response();
        }
    };

    // Get user email from database
    let user_email = match sqlx::query!(
        r#"SELECT email FROM users WHERE id = $1"#,
        user_id
    )
    .fetch_one(&pool)
    .await
    {
        Ok(user) => user.email,
        Err(e) => {
            tracing::error!("Failed to fetch user email: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to fetch user information"
            }))).into_response();
        }
    };

    // Get or create Stripe customer
    let stripe_customer_id = match get_or_create_stripe_customer(&pool, &stripe_secret_key, user_id, &user_email).await {
        Ok(customer_id) => customer_id,
        Err(e) => {
            tracing::error!("Failed to get/create Stripe customer: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to initialize payment"
            }))).into_response();
        }
    };

    // Create payment intent via Stripe API
    let payment_intent = match create_stripe_payment_intent(
        &stripe_secret_key,
        payload.amount_cents,
        &stripe_customer_id,
        &user_id.to_string(),
    ).await {
        Ok(intent) => intent,
        Err(e) => {
            tracing::error!("Failed to create payment intent: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to create payment intent"
            }))).into_response();
        }
    };

    // Store transaction in database
    let transaction = PaymentTransaction::new_deposit(
        user_id,
        payload.amount_cents,
        payment_intent.id.clone(),
    );

    if let Err(e) = sqlx::query!(
        r#"
        INSERT INTO payment_transactions 
        (id, user_id, transaction_type, amount_cents, currency, status, stripe_payment_intent_id, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        transaction.id,
        transaction.user_id,
        transaction.transaction_type.to_string(),
        transaction.amount_cents,
        transaction.currency,
        transaction.status.to_string(),
        transaction.stripe_payment_intent_id,
        transaction.description,
        transaction.metadata
    )
    .execute(&pool)
    .await
    {
        tracing::error!("Failed to store transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to store transaction"
        }))).into_response();
    }

    (StatusCode::OK, Json(PaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id,
        amount_cents: payload.amount_cents,
    })).into_response()
}

/// Get transaction history
pub async fn get_transactions(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID"
            }))).into_response();
        }
    };

    let transactions = match sqlx::query!(
        r#"
        SELECT id, user_id, transaction_type, amount_cents, currency, status,
               stripe_payment_intent_id, stripe_charge_id, description, metadata,
               created_at, completed_at
        FROM payment_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        "#,
        user_id
    )
    .fetch_all(&pool)
    .await
    {
        Ok(txs) => txs,
        Err(e) => {
            tracing::error!("Failed to fetch transactions: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to fetch transactions"
            }))).into_response();
        }
    };

    let response: Vec<TransactionResponse> = transactions.iter().map(|tx| {
        TransactionResponse {
            id: tx.id.to_string(),
            transaction_type: tx.transaction_type.clone(),
            amount_cents: tx.amount_cents,
            amount_euros: tx.amount_cents as f64 / 100.0,
            currency: tx.currency.clone(),
            status: tx.status.clone(),
            description: tx.description.clone(),
            created_at: tx.created_at.to_rfc3339(),
            completed_at: tx.completed_at.map(|dt| dt.to_rfc3339()),
        }
    }).collect();

    (StatusCode::OK, Json(response)).into_response()
}

/// Stripe webhook response
#[derive(Debug, Deserialize)]
struct StripeWebhookEvent {
    #[serde(rename = "type")]
    event_type: String,
    data: StripeEventData,
}

#[derive(Debug, Deserialize)]
struct StripeEventData {
    object: serde_json::Value,
}

/// Stripe webhook handler
pub async fn stripe_webhook(
    State(pool): State<PgPool>,
    headers: axum::http::HeaderMap,
    body: String,
) -> impl IntoResponse {
    // Get webhook secret from environment
    let webhook_secret = match std::env::var("STRIPE_WEBHOOK_SECRET") {
        Ok(secret) if !secret.is_empty() => secret,
        _ => {
            tracing::error!("STRIPE_WEBHOOK_SECRET is not configured");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Webhook secret not configured"
            }))).into_response();
        }
    };

    // Get signature from headers
    let signature = match headers.get("stripe-signature") {
        Some(sig) => sig.to_str().unwrap_or(""),
        None => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Missing signature"
            }))).into_response();
        }
    };

    // Verify webhook signature
    if !verify_stripe_signature(&body, signature, &webhook_secret) {
        tracing::error!("Webhook signature verification failed");
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid signature"
        }))).into_response();
    }

    // Parse event
    let event: StripeWebhookEvent = match serde_json::from_str(&body) {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to parse webhook event: {}", e);
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid event format"
            }))).into_response();
        }
    };

    // Handle payment_intent.succeeded event
    if event.event_type == "payment_intent.succeeded" {
        if let Some(payment_intent_id) = event.data.object.get("id").and_then(|v| v.as_str()) {
            // Find transaction
            let transaction = match sqlx::query!(
                r#"
                SELECT id, user_id, amount_cents
                FROM payment_transactions
                WHERE stripe_payment_intent_id = $1
                "#,
                payment_intent_id
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(tx)) => tx,
                Ok(None) => {
                    tracing::warn!("Transaction not found for payment intent: {}", payment_intent_id);
                    return (StatusCode::OK, Json(serde_json::json!({
                        "message": "Transaction not found"
                    }))).into_response();
                }
                Err(e) => {
                    tracing::error!("Failed to fetch transaction: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "error": "Database error"
                    }))).into_response();
                }
            };

            // Use a transaction to ensure atomicity
            let mut tx = match pool.begin().await {
                Ok(t) => t,
                Err(e) => {
                    tracing::error!("Failed to begin transaction: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "error": "Database error"
                    }))).into_response();
                }
            };

            // Update transaction status
            if let Err(e) = sqlx::query!(
                r#"
                UPDATE payment_transactions
                SET status = 'completed', completed_at = now()
                WHERE id = $1
                "#,
                transaction.id
            )
            .execute(&mut *tx)
            .await
            {
                let _ = tx.rollback().await;
                tracing::error!("Failed to update transaction: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Failed to update transaction"
                }))).into_response();
            }

            // Update user balance
            if let Err(e) = sqlx::query!(
                r#"
                UPDATE user_balances
                SET balance_cents = balance_cents + $1, updated_at = now()
                WHERE user_id = $2
                "#,
                transaction.amount_cents,
                transaction.user_id
            )
            .execute(&mut *tx)
            .await
            {
                let _ = tx.rollback().await;
                tracing::error!("Failed to update balance: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Failed to update balance"
                }))).into_response();
            }

            // Commit the transaction
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit transaction: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Failed to commit transaction"
                }))).into_response();
            }

            tracing::info!("Payment succeeded for transaction {}", transaction.id);
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Webhook processed"
    }))).into_response()
}

/// Stripe customer response
#[derive(Debug, Deserialize)]
struct StripeCustomer {
    id: String,
}

/// Stripe payment intent response
#[derive(Debug, Deserialize)]
struct StripePaymentIntent {
    id: String,
    client_secret: String,
}

/// Helper function to get or create a Stripe customer
async fn get_or_create_stripe_customer(
    pool: &PgPool,
    stripe_secret_key: &str,
    user_id: Uuid,
    email: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    // Check if customer already exists
    if let Some(customer) = sqlx::query!(
        r#"
        SELECT stripe_customer_id
        FROM stripe_customers
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await?
    {
        return Ok(customer.stripe_customer_id);
    }

    // Create new Stripe customer via API
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.stripe.com/v1/customers")
        .basic_auth(stripe_secret_key, Some(""))
        .form(&[
            ("email", email),
            ("metadata[user_id]", &user_id.to_string()),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("Stripe API error: {}", response.status()).into());
    }

    let customer: StripeCustomer = response.json().await?;
    let stripe_customer_id = customer.id;

    // Store in database
    sqlx::query!(
        r#"
        INSERT INTO stripe_customers (user_id, stripe_customer_id)
        VALUES ($1, $2)
        "#,
        user_id,
        stripe_customer_id
    )
    .execute(pool)
    .await?;

    Ok(stripe_customer_id)
}

/// Create a Stripe payment intent
async fn create_stripe_payment_intent(
    stripe_secret_key: &str,
    amount_cents: i64,
    customer_id: &str,
    user_id: &str,
) -> Result<StripePaymentIntent, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.stripe.com/v1/payment_intents")
        .basic_auth(stripe_secret_key, Some(""))
        .form(&[
            ("amount", amount_cents.to_string().as_str()),
            ("currency", "eur"),
            ("customer", customer_id),
            ("metadata[user_id]", user_id),
            ("automatic_payment_methods[enabled]", "true"),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Stripe API error: {}", error_text).into());
    }

    let payment_intent: StripePaymentIntent = response.json().await?;
    Ok(payment_intent)
}

/// Verify Stripe webhook signature
fn verify_stripe_signature(payload: &str, signature: &str, secret: &str) -> bool {
    // Parse signature header
    let mut timestamp = "";
    let mut signatures = Vec::new();

    for part in signature.split(',') {
        let kv: Vec<&str> = part.splitn(2, '=').collect();
        if kv.len() == 2 {
            match kv[0] {
                "t" => timestamp = kv[1],
                "v1" => signatures.push(kv[1]),
                _ => {}
            }
        }
    }

    if timestamp.is_empty() || signatures.is_empty() {
        return false;
    }

    // Validate timestamp (reject webhooks older than 5 minutes to prevent replay attacks)
    if let Ok(timestamp_secs) = timestamp.parse::<i64>() {
        let current_time = chrono::Utc::now().timestamp();
        let age = current_time - timestamp_secs;
        
        if age > MAX_WEBHOOK_AGE_SECONDS || age < -60 {
            tracing::warn!("Webhook timestamp outside acceptable range: {} seconds old", age);
            return false;
        }
    } else {
        tracing::error!("Failed to parse webhook timestamp");
        return false;
    }

    // Construct signed payload
    let signed_payload = format!("{}.{}", timestamp, payload);

    // Compute expected signature
    let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(signed_payload.as_bytes());
    let expected_sig = hex::encode(mac.finalize().into_bytes());

    // Compare signatures
    signatures.iter().any(|sig| sig == &expected_sig)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_balance_response() {
        let response = BalanceResponse {
            balance_cents: 1500,
            balance_euros: 15.0,
            currency: "EUR".to_string(),
        };
        
        assert_eq!(response.balance_cents, 1500);
        assert_eq!(response.balance_euros, 15.0);
    }

    #[test]
    fn test_payment_intent_request_validation() {
        let req = CreatePaymentIntentRequest {
            amount_cents: 1000,
        };
        
        assert!(req.amount_cents >= 100);
    }
}
