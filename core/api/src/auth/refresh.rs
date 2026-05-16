//! Refresh-token rotation endpoint.

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use sqlx::PgPool;

use asap_core_shared::{
    generate_jti, generate_refresh_token, generate_token_with_jti, validate_refresh_token,
    SharedConfig,
};

use super::{build_auth_response_with_cookies, RefreshTokenRequest, TokenPairResponse};

/// Refresh access token using a refresh token
///
/// This implements token rotation: a new refresh token is issued with each refresh.
/// If a refresh token is reused, all tokens in the family are revoked (stolen token detection).
pub async fn refresh_token(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<RefreshTokenRequest>,
) -> impl IntoResponse {
    // Validate refresh token signature and expiration
    let validated = match validate_refresh_token(&payload.refresh_token, &config.jwt_secret) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Invalid refresh token: {}", e);
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid or expired refresh token"
                })),
            )
                .into_response();
        }
    };

    // Look up refresh token in database
    let token_record = match sqlx::query!(
        r#"
        SELECT id, account_id, family_id, revoked_at
        FROM refresh_tokens
        WHERE token_hash = $1
        "#,
        validated.token_hash
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(record)) => record,
        Ok(None) => {
            // Token not found - might be reuse of old rotated token
            // Check if family exists and revoke all tokens in that family
            tracing::warn!(
                "Refresh token not found, possible token reuse - revoking family {}",
                validated.family_id
            );
            // Convert family_id String to Uuid for database query
            let family_uuid = match uuid::Uuid::parse_str(&validated.family_id) {
                Ok(u) => u,
                Err(_) => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({
                            "error": "Invalid refresh token"
                        })),
                    )
                        .into_response();
                }
            };
            let _ = sqlx::query!(
                "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'token_reuse_detected' WHERE family_id = $1",
                family_uuid
            )
            .execute(&pool)
            .await;

            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid refresh token. Please log in again."
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error looking up refresh token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Check if token was revoked
    if token_record.revoked_at.is_some() {
        tracing::warn!("Attempted use of revoked refresh token");
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Refresh token has been revoked. Please log in again."
            })),
        )
            .into_response();
    }

    let account_id = token_record.account_id;

    // Start transaction for token rotation
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

    // Revoke old refresh token (rotation)
    if let Err(e) = sqlx::query!(
        "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'rotated' WHERE id = $1",
        token_record.id
    )
    .execute(&mut *tx)
    .await
    {
        tracing::error!("Failed to revoke old refresh token: {}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Generate new refresh token (same family for rotation chain)
    // Preserve original session duration (use long session on rotation)
    let family_str = token_record.family_id.to_string();
    let new_refresh = match generate_refresh_token(&config.jwt_secret, Some(&family_str), true) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate refresh token: {}", e);
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Store new refresh token
    let expires_at = chrono::DateTime::from_timestamp(new_refresh.expires_at, 0)
        .unwrap_or_else(|| Utc::now() + Duration::days(7));

    // Convert family_id String to Uuid for database
    let new_family_uuid = match uuid::Uuid::parse_str(&new_refresh.family_id) {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("Invalid family_id UUID format: {}", e);
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    if let Err(e) = sqlx::query!(
        r#"
        INSERT INTO refresh_tokens (account_id, token_hash, family_id, parent_id, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        account_id,
        new_refresh.token_hash,
        new_family_uuid,
        token_record.id,
        expires_at
    )
    .execute(&mut *tx)
    .await
    {
        tracing::error!("Failed to store new refresh token: {}", e);
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

    // Generate new access token with JTI
    let jti = generate_jti();
    let access_token: String = match generate_token_with_jti(&account_id.to_string(), &jti, &config)
    {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate access token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    tracing::info!("Token refreshed for account: {}", account_id);

    // Return refreshed tokens with secure cookies
    build_auth_response_with_cookies(
        StatusCode::OK,
        TokenPairResponse {
            access_token: access_token.clone(),
            refresh_token: new_refresh.token.clone(),
            expires_in: asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
        },
        &access_token,
        &new_refresh.token,
        asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS as u64,
        asap_core_shared::REFRESH_TOKEN_LIFETIME_SECS as u64,
    )
}
