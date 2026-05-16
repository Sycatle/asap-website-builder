//! Logout and refresh-token blacklist endpoints.

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{hash_refresh_token, Claims};

use super::{build_logout_response, RefreshTokenRequest};

pub async fn logout_all(
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

    // Revoke all refresh tokens for this account
    match sqlx::query!(
        "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE account_id = $1 AND revoked_at IS NULL",
        account_id
    )
    .execute(&pool)
    .await {
        Ok(result) => {
            tracing::info!("Logged out account {} - revoked {} refresh tokens", account_id, result.rows_affected());
        }
        Err(e) => {
            tracing::error!("Failed to revoke refresh tokens: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Optionally blacklist current access token if it has JTI
    if let Some(jti) = &claims.jti {
        let expires_at = chrono::DateTime::from_timestamp(claims.exp, 0)
            .unwrap_or_else(|| Utc::now() + Duration::hours(1));

        let _ = sqlx::query!(
            r#"
            INSERT INTO revoked_access_tokens (jti, account_id, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (jti) DO NOTHING
            "#,
            jti,
            account_id,
            expires_at
        )
        .execute(&pool)
        .await;
    }

    // Return success with cookies cleared
    build_logout_response()
}

/// Logout from single session - revoke specific refresh token
pub async fn logout(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RefreshTokenRequest>,
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

    // Hash the provided refresh token
    let token_hash = hash_refresh_token(&payload.refresh_token);

    // Revoke the specific refresh token (only if it belongs to this account)
    match sqlx::query!(
        r#"
        UPDATE refresh_tokens 
        SET revoked_at = NOW(), revoked_reason = 'logout' 
        WHERE token_hash = $1 AND account_id = $2 AND revoked_at IS NULL
        "#,
        token_hash,
        account_id
    )
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                tracing::warn!("Logout attempted with invalid or already revoked token");
            } else {
                tracing::info!("Account {} logged out from single session", account_id);
            }
        }
        Err(e) => {
            tracing::error!("Failed to revoke refresh token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    }

    // Blacklist current access token if it has JTI
    if let Some(jti) = &claims.jti {
        let expires_at = chrono::DateTime::from_timestamp(claims.exp, 0)
            .unwrap_or_else(|| Utc::now() + Duration::hours(1));

        let _ = sqlx::query!(
            r#"
            INSERT INTO revoked_access_tokens (jti, account_id, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (jti) DO NOTHING
            "#,
            jti,
            account_id,
            expires_at
        )
        .execute(&pool)
        .await;
    }

    // Return success with cookies cleared
    build_logout_response()
}

/// Check if an access token is blacklisted
/// This is used by the auth middleware for immediate token revocation
pub async fn is_token_blacklisted(pool: &PgPool, jti: &str) -> bool {
    match sqlx::query!(
        "SELECT id FROM revoked_access_tokens WHERE jti = $1 AND expires_at > NOW()",
        jti
    )
    .fetch_optional(pool)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("Error checking token blacklist: {}", e);
            false // Fail open to not break auth if DB has issues
        }
    }
}
