use asap_core_shared::{
    generate_jti, generate_password_reset_token, generate_refresh_token, generate_token,
    generate_token_with_jti, hash_refresh_token, hash_token, validate_password_reset_token,
    validate_refresh_token, AuthCookies, Claims, CookieConfig, SharedConfig,
    PASSWORD_RESET_TOKEN_LIFETIME_SECS,
};
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    http::{header, HeaderMap},
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

mod account;
mod cookies;
mod logout;
mod password;
mod password_reset;
mod refresh;
mod types;
pub use account::{change_password, me};
use cookies::{build_auth_response_with_cookies, build_logout_response};
pub use logout::{is_token_blacklisted, logout, logout_all};
use password::{hash_password, validate_password_strength, verify_password};
pub use password_reset::{forgot_password, reset_password};
pub use refresh::refresh_token;
pub use types::{
    AccountResponse, ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, LoginResponse,
    LoginResponseV2, MeResponse, RefreshTokenRequest, ResetPasswordRequest, SignupRequest,
    SignupResponse, TokenPairResponse,
};

/// Default creation mode for websites created during signup
const DEFAULT_CREATION_MODE: &str = "from_scratch";

/// Default tagline for new websites
const DEFAULT_TAGLINE: &str = "";

/// JWT issuer constant for token validation
pub const JWT_ISSUER: &str = "asap-auth";
pub const JWT_AUDIENCE: &str = "asap-api";

pub async fn signup(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<SignupRequest>,
) -> impl IntoResponse {
    // Validate email format
    if !payload.email.contains('@') {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid email format"
            })),
        )
            .into_response();
    }

    // Validate password strength
    if let Err(e) = validate_password_strength(&payload.password) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": e
            })),
        )
            .into_response();
    }

    // Validate and sanitize slug if provided (website creation is optional for V1)
    let validated_slug = if let Some(ref slug_input) = payload.website_slug {
        let slug = slug_input.trim().to_lowercase();
        if !slug.is_empty() {
            // Validate slug format (strict security rules)
            if slug.len() < 3 || slug.len() > 50 {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "Website slug must be between 3 and 50 characters"
                    })),
                )
                    .into_response();
            }
            if !slug
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
            {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "Website slug can only contain lowercase letters, numbers, and hyphens"
                }))).into_response();
            }
            if slug.starts_with('-') || slug.ends_with('-') || slug.contains("--") {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "Website slug cannot start/end with hyphen or contain consecutive hyphens"
                }))).into_response();
            }
            // Reserved slugs that could conflict with routes
            let reserved_slugs = [
                "api", "admin", "auth", "login", "signup", "public", "private", "health", "static",
                "assets", "www", "app",
            ];
            if reserved_slugs.contains(&slug.as_str()) {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "This website slug is reserved"
                    })),
                )
                    .into_response();
            }
            Some(slug)
        } else {
            None
        }
    } else {
        None
    };

    // Hash password
    let password_hash = match hash_password(&payload.password) {
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

    // Start a transaction
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

    // Create account
    let account_id = Uuid::new_v4();

    // Create account
    let account_result = sqlx::query!(
        "INSERT INTO accounts (id, email, password_hash, plan) VALUES ($1, $2, $3, 'free')",
        account_id,
        payload.email,
        password_hash
    )
    .execute(&mut *tx)
    .await;

    if let Err(e) = account_result {
        tracing::error!("Failed to create account: {}", e);
        let _ = tx.rollback().await;
        // SECURITY: Generic error to prevent account enumeration
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Unable to create account. Please try a different email or contact support."
        }))).into_response();
    }

    // Create account_data entry
    if let Err(e) = sqlx::query!(
        "INSERT INTO account_data (account_id, data) VALUES ($1, '{}'::jsonb)",
        account_id
    )
    .execute(&mut *tx)
    .await
    {
        tracing::error!("Failed to create account_data: {}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Create website only if slug was provided (optional for V1 onboarding flow)
    if let Some(ref slug) = validated_slug {
        let website_id = Uuid::new_v4();
        let default_title = payload.email.split('@').next().unwrap_or("Account");
        if let Err(e) = sqlx::query(
            "INSERT INTO websites (id, account_id, slug, title, tagline, status, creation_mode) VALUES ($1, $2, $3, $4, $5, 'draft', $6)"
        )
        .bind(website_id)
        .bind(account_id)
        .bind(slug)
        .bind(default_title)
        .bind(DEFAULT_TAGLINE)
        .bind(DEFAULT_CREATION_MODE)
        .execute(&mut *tx)
        .await {
            tracing::error!("Failed to create website: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }

        // Create website_data entry
        if let Err(e) =
            sqlx::query("INSERT INTO website_data (website_id, data) VALUES ($1, '{}'::jsonb)")
                .bind(website_id)
                .execute(&mut *tx)
                .await
        {
            tracing::error!("Failed to create website_data: {}", e);
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }

        tracing::info!("Website {} created for account {}", slug, account_id);
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

    // Create welcome notification (fire and forget)
    tokio::spawn({
        let pool = pool.clone();
        async move {
            if let Err(e) =
                crate::notifications::create_welcome_notification(&pool, account_id).await
            {
                tracing::warn!("Failed to create welcome notification: {}", e);
            }
        }
    });

    // Generate refresh token (new family) - use long session for new signups
    let refresh = match generate_refresh_token(&config.jwt_secret, None, true) {
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

    // Store refresh token
    let expires_at = chrono::DateTime::from_timestamp(refresh.expires_at, 0)
        .unwrap_or_else(|| Utc::now() + Duration::days(7));

    // Convert family_id String to Uuid for database
    let signup_family_uuid = match uuid::Uuid::parse_str(&refresh.family_id) {
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
        INSERT INTO refresh_tokens (account_id, token_hash, family_id, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
        account_id,
        refresh.token_hash,
        signup_family_uuid,
        expires_at
    )
    .execute(&pool)
    .await
    {
        tracing::error!("Failed to store refresh token: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
    }

    // Generate JWT access token with JTI
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

    // Also generate legacy token for backward compatibility
    let legacy_token: String = match generate_token(&account_id.to_string(), &config) {
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

    tracing::info!("Account created successfully: {}", payload.email);

    // Calculate refresh token expiry based on default (not remember_me for signup)
    let refresh_expires_secs = asap_core_shared::REFRESH_TOKEN_SHORT_LIFETIME_SECS as u64;

    // Return SignupResponse with legacy token field + new fields + secure cookies
    build_auth_response_with_cookies(
        StatusCode::CREATED,
        serde_json::json!({
            "token": legacy_token,
            "access_token": access_token,
            "refresh_token": refresh.token,
            "expires_in": asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
            "account": {
                "id": account_id.to_string(),
                "email": payload.email
            }
        }),
        &access_token,
        &refresh.token,
        asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS as u64,
        refresh_expires_secs,
    )
}

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


mod sessions;

pub use sessions::{list_sessions, revoke_session};
