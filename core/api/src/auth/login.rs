//! Login endpoint: email/password authentication issuing a JWT pair.

use axum::{
    extract::{Extension, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use sqlx::PgPool;

use asap_core_shared::{
    generate_jti, generate_refresh_token, generate_token, generate_token_with_jti, SharedConfig,
};

use super::password::verify_password;
use super::{build_auth_response_with_cookies, LoginRequest, LoginResponseV2};

pub async fn login(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    headers: HeaderMap,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // Extract client info for session tracking
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .or_else(|| headers.get("x-real-ip").and_then(|v| v.to_str().ok()))
        .map(|s| s.trim().to_string());

    // Query account by email
    let account = match sqlx::query!(
        "SELECT id, email, password_hash FROM accounts WHERE email = $1",
        payload.email
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(account)) => account,
        Ok(None) => {
            // SECURITY: Perform dummy hash to prevent timing attack
            // This ensures response time is similar whether email exists or not
            let _ = verify_password(
                &payload.password,
                "$2b$12$K4qSkN5vBnQK7mPjFn5Oau2WmWfOmVkhXJGpY9LJsMEbJwH4J9mqe",
            );
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid email or password"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error during login: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Verify password
    match verify_password(&payload.password, &account.password_hash) {
        Ok(true) => {}
        Ok(false) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid email or password"
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

    // Generate refresh token (new family) - use remember_me preference
    let refresh = match generate_refresh_token(&config.jwt_secret, None, payload.remember_me) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate refresh token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Store refresh token - duration depends on remember_me
    let expires_at = chrono::DateTime::from_timestamp(refresh.expires_at, 0).unwrap_or_else(|| {
        if payload.remember_me {
            Utc::now() + Duration::days(7)
        } else {
            Utc::now() + Duration::days(1)
        }
    });

    // Convert family_id String to Uuid for database
    let family_uuid = match uuid::Uuid::parse_str(&refresh.family_id) {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("Invalid family_id UUID format: {}", e);
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
        INSERT INTO refresh_tokens (account_id, token_hash, family_id, expires_at, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        account.id,
        refresh.token_hash,
        family_uuid,
        expires_at,
        user_agent,
        ip_address
    )
    .execute(&pool)
    .await {
        tracing::error!("Failed to store refresh token: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Generate JWT access token with JTI
    let jti = generate_jti();
    let access_token: String = match generate_token_with_jti(&account.id.to_string(), &jti, &config)
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

    // Also generate legacy token for backward compatibility
    let legacy_token = match generate_token(&account.id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate legacy token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Create notification for new login
    if let Err(e) =
        crate::notifications::create_new_login_notification(&pool, account.id, None).await
    {
        tracing::error!("Failed to create login notification: {}", e);
    }

    tracing::info!("Account logged in successfully: {}", payload.email);

    // Calculate refresh token expiry based on remember_me
    let refresh_expires_secs = if payload.remember_me {
        asap_core_shared::REFRESH_TOKEN_LIFETIME_SECS as u64
    } else {
        asap_core_shared::REFRESH_TOKEN_SHORT_LIFETIME_SECS as u64
    };

    // Return login response with secure HttpOnly cookies
    build_auth_response_with_cookies(
        StatusCode::OK,
        LoginResponseV2 {
            access_token: access_token.clone(),
            refresh_token: refresh.token.clone(),
            expires_in: asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
            token: legacy_token,
        },
        &access_token,
        &refresh.token,
        asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS as u64,
        refresh_expires_secs,
    )
}
