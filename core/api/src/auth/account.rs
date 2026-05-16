//! Authenticated-account endpoints: read current user and change password.

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

use super::password::{hash_password, validate_password_strength, verify_password};
use super::{ChangePasswordRequest, MeResponse};

pub async fn me(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Query account information
    let result = sqlx::query!(
        "SELECT id, email, plan FROM accounts WHERE id = $1",
        account_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(account)) => (
            StatusCode::OK,
            Json(MeResponse {
                id: account.id.to_string(),
                email: account.email,
                plan: account.plan,
            }),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Account not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error fetching account: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response()
        }
    }
}

pub async fn change_password(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    // Parse account ID from claims
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Validate new password strength
    if let Err(e) = validate_password_strength(&payload.new_password) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": e
            })),
        )
            .into_response();
    }

    // Get current password hash
    let account_result =
        sqlx::query_scalar::<_, String>("SELECT password_hash FROM accounts WHERE id = $1")
            .bind(account_id)
            .fetch_optional(&pool)
            .await;

    let password_hash = match account_result {
        Ok(Some(hash)) => hash,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Account not found"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error fetching account: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Verify current password
    match verify_password(&payload.current_password, &password_hash) {
        Ok(true) => {}
        Ok(false) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Current password is incorrect"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Failed to verify password: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    }

    // Hash new password
    let new_password_hash = match hash_password(&payload.new_password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Update password
    let update_result = sqlx::query("UPDATE accounts SET password_hash = $1 WHERE id = $2")
        .bind(&new_password_hash)
        .bind(account_id)
        .execute(&pool)
        .await;

    match update_result {
        Ok(_) => {
            // Invalidate all existing refresh tokens (security: forces re-login on all devices)
            if let Err(e) = sqlx::query!(
                "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'password_changed' WHERE account_id = $1 AND revoked_at IS NULL",
                account_id
            )
            .execute(&pool)
            .await {
                tracing::error!("Failed to revoke refresh tokens on password change: {}", e);
            }

            // Create notification for password change
            if let Err(e) =
                crate::notifications::create_password_changed_notification(&pool, account_id).await
            {
                tracing::error!("Failed to create password change notification: {}", e);
            }

            tracing::debug!("Password changed successfully for account: {}", account_id);
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "message": "Password changed successfully"
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating password: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response()
        }
    }
}
