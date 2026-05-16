//! Push subscription endpoints (web-push / VAPID).

use axum::{extract::State, http::StatusCode, Extension, Json};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::Claims;

use super::{
    get_account_id, PushSubscription, PushSubscriptionRequest, PushUnsubscribeRequest,
    VapidPublicKeyResponse,
};

/// Subscribe to push notifications
pub async fn subscribe_push(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PushSubscriptionRequest>,
) -> Result<Json<PushSubscription>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let id = Uuid::new_v4();
    let now = Utc::now();

    let subscription = sqlx::query_as!(
        PushSubscription,
        r#"
        INSERT INTO push_subscriptions (
            id, account_id, endpoint, p256dh_key, auth_key, user_agent, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (account_id, endpoint) DO UPDATE SET
            p256dh_key = EXCLUDED.p256dh_key,
            auth_key = EXCLUDED.auth_key,
            user_agent = EXCLUDED.user_agent,
            last_used_at = NOW()
        RETURNING id, endpoint, created_at
        "#,
        id,
        account_id,
        req.endpoint,
        req.keys.p256dh,
        req.keys.auth,
        req.user_agent,
        now
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to subscribe to push: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(subscription))
}

/// Unsubscribe from push notifications
pub async fn unsubscribe_push(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PushUnsubscribeRequest>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let result = sqlx::query!(
        "DELETE FROM push_subscriptions WHERE account_id = $1 AND endpoint = $2",
        account_id,
        req.endpoint
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to unsubscribe from push: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

/// Get VAPID public key for push subscription
pub async fn get_vapid_public_key(
    State(pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> Result<Json<VapidPublicKeyResponse>, StatusCode> {
    // Get global VAPID key from database
    let global_key =
        sqlx::query_scalar!("SELECT public_key FROM vapid_keys WHERE name = 'default' LIMIT 1")
            .fetch_optional(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match global_key {
        Some(key) => Ok(Json(VapidPublicKeyResponse { public_key: key })),
        None => {
            // Return env var if no database key
            let key = std::env::var("VAPID_PUBLIC_KEY").unwrap_or_else(|_| "".to_string());

            if key.is_empty() {
                Err(StatusCode::NOT_FOUND)
            } else {
                Ok(Json(VapidPublicKeyResponse { public_key: key }))
            }
        }
    }
}
