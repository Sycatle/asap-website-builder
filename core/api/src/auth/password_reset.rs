//! Password-reset request and confirmation endpoints.

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{
    generate_password_reset_token, hash_token, validate_password_reset_token, SharedConfig,
    PASSWORD_RESET_TOKEN_LIFETIME_SECS,
};

use super::password::{hash_password, validate_password_strength};
use super::{ForgotPasswordRequest, ResetPasswordRequest};

/// Request a password reset email
///
/// This endpoint always returns success to prevent email enumeration attacks.
/// If the email exists, a reset token is generated and stored.
/// In production, this would send an email with a reset link.
pub async fn forgot_password(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> impl IntoResponse {
    // Validate email format
    if !payload.email.contains('@') {
        // Still return success to prevent enumeration
        return (StatusCode::OK, Json(serde_json::json!({
            "message": "If an account with this email exists, a password reset link has been sent."
        }))).into_response();
    }

    let email = payload.email.to_lowercase().trim().to_string();

    // Check if account exists
    let account = match sqlx::query!(
        "SELECT id, email FROM accounts WHERE LOWER(email) = $1",
        email
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(account)) => account,
        Ok(None) => {
            // Account not found - return success anyway to prevent enumeration
            tracing::debug!("Password reset requested for non-existent email: {}", email);
            return (StatusCode::OK, Json(serde_json::json!({
                "message": "If an account with this email exists, a password reset link has been sent."
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error during password reset: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Generate reset token
    let reset_token = match generate_password_reset_token(&config.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate reset token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Calculate expiration time
    let expires_at = Utc::now() + Duration::seconds(PASSWORD_RESET_TOKEN_LIFETIME_SECS as i64);

    // Invalidate any existing tokens for this account
    if let Err(e) = sqlx::query!(
        "DELETE FROM password_reset_tokens WHERE account_id = $1",
        account.id
    )
    .execute(&pool)
    .await
    {
        tracing::warn!("Failed to delete old reset tokens: {}", e);
    }

    // Store new token hash in database
    let token_id = Uuid::new_v4();
    if let Err(e) = sqlx::query!(
        "INSERT INTO password_reset_tokens (id, account_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
        token_id,
        account.id,
        reset_token.token_hash,
        expires_at
    )
    .execute(&pool)
    .await {
        tracing::error!("Failed to store reset token: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // TODO: In production, send email with reset link
    // For now, log the token for development/testing only
    let reset_url = format!(
        "{}/reset-password?token={}",
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:4321".to_string()),
        reset_token.token
    );

    // SECURITY: Only log reset URL in debug builds - never in production
    #[cfg(debug_assertions)]
    tracing::debug!("[DEV ONLY] Password reset URL: {}", reset_url);

    tracing::info!("Password reset requested for {}", account.email);

    // Create notification (optional - can be used for email sending)
    // In the future, this could trigger an email notification

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "If an account with this email exists, a password reset link has been sent."
        })),
    )
        .into_response()
}

/// Reset password using a valid token
pub async fn reset_password(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<ResetPasswordRequest>,
) -> impl IntoResponse {
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

    // Validate token signature and expiration
    let is_valid = match validate_password_reset_token(&payload.token, &config.jwt_secret) {
        Ok(valid) => valid,
        Err(e) => {
            tracing::warn!("Invalid reset token format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid or expired reset token"
                })),
            )
                .into_response();
        }
    };

    if !is_valid {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid or expired reset token"
            })),
        )
            .into_response();
    }

    // Hash the token to look up in database
    let token_hash = hash_token(&payload.token);

    // Find the token in database and get associated account
    let token_record = match sqlx::query!(
        r#"
        SELECT prt.id, prt.account_id, prt.expires_at, prt.used_at, a.email
        FROM password_reset_tokens prt
        JOIN accounts a ON a.id = prt.account_id
        WHERE prt.token_hash = $1
        "#,
        token_hash
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(record)) => record,
        Ok(None) => {
            tracing::warn!("Reset token not found in database");
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid or expired reset token"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error looking up reset token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Check if token was already used
    if token_record.used_at.is_some() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "This reset link has already been used"
            })),
        )
            .into_response();
    }

    // Check if token has expired (database-side check)
    if token_record.expires_at < Utc::now() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "This reset link has expired"
            })),
        )
            .into_response();
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

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
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
    if let Err(e) = sqlx::query!(
        "UPDATE accounts SET password_hash = $1 WHERE id = $2",
        new_password_hash,
        token_record.account_id
    )
    .execute(&mut *tx)
    .await
    {
        tracing::error!("Failed to update password: {}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Mark token as used
    if let Err(e) = sqlx::query!(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
        token_record.id
    )
    .execute(&mut *tx)
    .await
    {
        tracing::error!("Failed to mark token as used: {}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Invalidate all existing refresh tokens (security: forces re-login on all devices)
    if let Err(e) = sqlx::query!(
        "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'password_reset' WHERE account_id = $1 AND revoked_at IS NULL",
        token_record.account_id
    )
    .execute(&pool)
    .await {
        tracing::error!("Failed to revoke refresh tokens on password reset: {}", e);
    }

    // Create notification for password change
    if let Err(e) =
        crate::notifications::create_password_changed_notification(&pool, token_record.account_id)
            .await
    {
        tracing::error!("Failed to create password change notification: {}", e);
    }

    tracing::info!(
        "Password reset successfully for account: {}",
        token_record.email
    );

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Password has been reset successfully. You can now log in with your new password."
    }))).into_response()
}
