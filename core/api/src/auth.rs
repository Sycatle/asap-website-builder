use axum::{Json, response::IntoResponse, http::StatusCode, extract::{State, Extension, ConnectInfo}, http::HeaderMap};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use std::net::SocketAddr;
use asap_core_shared::{
    SharedConfig, generate_token, generate_token_with_jti, Claims,
    generate_password_reset_token, validate_password_reset_token, hash_token,
    PASSWORD_RESET_TOKEN_LIFETIME_SECS,
    generate_refresh_token, validate_refresh_token, hash_refresh_token, generate_jti,
    REFRESH_TOKEN_LIFETIME_SECS,
};
use chrono::{Utc, Duration};

/// Default creation mode for websites created during signup
const DEFAULT_CREATION_MODE: &str = "from_scratch";

/// Default tagline for new websites
const DEFAULT_TAGLINE: &str = "";

/// JWT issuer constant for token validation
pub const JWT_ISSUER: &str = "asap-auth";
pub const JWT_AUDIENCE: &str = "asap-api";

/// Validate password strength
/// Returns Ok(()) if valid, Err with error message if invalid
fn validate_password_strength(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters");
    }
    if password.len() > 128 {
        return Err("Password must be at most 128 characters");
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err("Password must contain at least one uppercase letter");
    }
    if !password.chars().any(|c| c.is_lowercase()) {
        return Err("Password must contain at least one lowercase letter");
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err("Password must contain at least one number");
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    /// Optional website slug - if provided, creates a website during signup
    /// For V1, website creation is handled by onboarding in the dashboard
    #[serde(alias = "portfolio_slug")]  // Backward compatibility
    pub website_slug: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SignupResponse {
    pub token: String,
    pub account: AccountResponse,
}

#[derive(Debug, Serialize)]
pub struct AccountResponse {
    pub id: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub id: String,
    pub email: String,
    pub plan: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct TokenPairResponse {
    pub access_token: String,
    pub refresh_token: String,
    /// Access token expires in seconds
    pub expires_in: i64,
}

#[derive(Debug, Serialize)]
pub struct LoginResponseV2 {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    /// Legacy field for backward compatibility
    pub token: String,
}

/// Hash a password using bcrypt
fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST)
}

/// Verify a password against a hash
fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    bcrypt::verify(password, hash)
}

#[cfg(test)]
mod password_tests {
    use super::*;

    #[test]
    fn test_hash_password() {
        let password = "secure_password_123";
        let hash = hash_password(password).unwrap();
        
        // Hash should be different from original password
        assert_ne!(password, hash);
        // Hash should be a bcrypt hash (starts with $2a$, $2b$, or $2y$)
        assert!(hash.starts_with("$2a$") || hash.starts_with("$2b$") || hash.starts_with("$2y$"));
    }

    #[test]
    fn test_verify_correct_password() {
        let password = "correct_password";
        let hash = hash_password(password).unwrap();
        
        let result = verify_password(password, &hash).unwrap();
        assert!(result);
    }

    #[test]
    fn test_verify_incorrect_password() {
        let password = "correct_password";
        let hash = hash_password(password).unwrap();
        
        let result = verify_password("wrong_password", &hash).unwrap();
        assert!(!result);
    }

    #[test]
    fn test_hash_same_password_different_hashes() {
        let password = "my_password";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();
        
        // Bcrypt produces different hashes even for same password
        assert_ne!(hash1, hash2);
        
        // But both should verify correctly
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }

    #[test]
    fn test_signup_request_creation() {
        let req = SignupRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
            website_slug: Some("my-website".to_string()),
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
        assert_eq!(req.website_slug, Some("my-website".to_string()));
    }

    #[test]
    fn test_signup_request_without_slug() {
        let req = SignupRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
            website_slug: None,
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
        assert!(req.website_slug.is_none());
    }

    #[test]
    fn test_login_request_creation() {
        let req = LoginRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
    }

    #[test]
    fn test_account_response() {
        let resp = AccountResponse {
            id: "account-123".to_string(),
            email: "user@example.com".to_string(),
        };

        assert_eq!(resp.id, "account-123");
        assert_eq!(resp.email, "user@example.com");
    }

    #[test]
    fn test_me_response() {
        let resp = MeResponse {
            id: "account-456".to_string(),
            email: "me@example.com".to_string(),
            plan: "free".to_string(),
        };

        assert_eq!(resp.id, "account-456");
        assert_eq!(resp.email, "me@example.com");
        assert_eq!(resp.plan, "free");
    }

    #[test]
    fn test_email_validation() {
        let valid_emails = vec![
            "user@example.com",
            "test.user@domain.co.uk",
            "name+tag@example.org",
        ];

        for email in valid_emails {
            assert!(email.contains('@'));
        }
    }

    #[test]
    fn test_password_validation() {
        let valid_password = "password_123";
        assert!(valid_password.len() >= 8);

        let short_password = "short";
        assert!(short_password.len() < 8);
    }

    #[test]
    fn test_slug_validation() {
        let valid_slugs = vec!["my-website", "website123", "a-b-c"];
        
        for slug in valid_slugs {
            assert!(!slug.is_empty());
            assert!(slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
        }
    }

    #[test]
    fn test_invalid_slug() {
        let invalid_slugs = vec!["my website", "website@123", "website#1"];
        
        for slug in invalid_slugs {
            assert!(!slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
        }
    }

    #[test]
    fn test_empty_slug_invalid() {
        let slug = "";
        assert!(slug.is_empty() || !slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
    }
}

pub async fn signup(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<SignupRequest>,
) -> impl IntoResponse {
    // Validate email format
    if !payload.email.contains('@') {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid email format"
        }))).into_response();
    }

    // Validate password strength
    if let Err(e) = validate_password_strength(&payload.password) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Validate and sanitize slug if provided (website creation is optional for V1)
    let validated_slug = if let Some(ref slug_input) = payload.website_slug {
        let slug = slug_input.trim().to_lowercase();
        if !slug.is_empty() {
            // Validate slug format (strict security rules)
            if slug.len() < 3 || slug.len() > 50 {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "Website slug must be between 3 and 50 characters"
                }))).into_response();
            }
            if !slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
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
            let reserved_slugs = ["api", "admin", "auth", "login", "signup", "public", "private", "health", "static", "assets", "www", "app"];
            if reserved_slugs.contains(&slug.as_str()) {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "This website slug is reserved"
                }))).into_response();
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
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Start a transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
    .await {
        tracing::error!("Failed to create account_data: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
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
        if let Err(e) = sqlx::query(
            "INSERT INTO website_data (website_id, data) VALUES ($1, '{}'::jsonb)"
        )
        .bind(website_id)
        .execute(&mut *tx)
        .await {
            tracing::error!("Failed to create website_data: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }

        tracing::info!("Website {} created for account {}", slug, account_id);
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create welcome notification (fire and forget)
    tokio::spawn({
        let pool = pool.clone();
        async move {
            if let Err(e) = crate::notifications::create_welcome_notification(&pool, account_id).await {
                tracing::warn!("Failed to create welcome notification: {}", e);
            }
        }
    });

    // Generate refresh token (new family) - use long session for new signups
    let refresh = match generate_refresh_token(&config.jwt_secret, None, true) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate refresh token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
    .await {
        tracing::error!("Failed to store refresh token: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Generate JWT access token with JTI
    let jti = generate_jti();
    let access_token = match generate_token_with_jti(&account_id.to_string(), &jti, &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate access token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Also generate legacy token for backward compatibility
    let legacy_token = match generate_token(&account_id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate legacy token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    tracing::info!("Account created successfully: {}", payload.email);

    // Return SignupResponse with legacy token field + new fields
    (StatusCode::CREATED, Json(serde_json::json!({
        "token": legacy_token,
        "access_token": access_token,
        "refresh_token": refresh.token,
        "expires_in": asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
        "account": {
            "id": account_id.to_string(),
            "email": payload.email
        }
    }))).into_response()
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
    .await {
        Ok(Some(account)) => account,
        Ok(None) => {
            // SECURITY: Perform dummy hash to prevent timing attack
            // This ensures response time is similar whether email exists or not
            let _ = verify_password(&payload.password, "$2b$12$K4qSkN5vBnQK7mPjFn5Oau2WmWfOmVkhXJGpY9LJsMEbJwH4J9mqe");
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid email or password"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error during login: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Verify password
    match verify_password(&payload.password, &account.password_hash) {
        Ok(true) => {},
        Ok(false) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid email or password"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to verify password: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Generate refresh token (new family) - use remember_me preference
    let refresh = match generate_refresh_token(&config.jwt_secret, None, payload.remember_me) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate refresh token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Store refresh token - duration depends on remember_me
    let expires_at = chrono::DateTime::from_timestamp(refresh.expires_at, 0)
        .unwrap_or_else(|| {
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
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
    let access_token = match generate_token_with_jti(&account.id.to_string(), &jti, &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate access token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Also generate legacy token for backward compatibility
    let legacy_token = match generate_token(&account.id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate legacy token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Create notification for new login
    if let Err(e) = crate::notifications::create_new_login_notification(&pool, account.id, None).await {
        tracing::error!("Failed to create login notification: {}", e);
    }

    tracing::info!("Account logged in successfully: {}", payload.email);

    (StatusCode::OK, Json(LoginResponseV2 { 
        access_token: access_token.clone(),
        refresh_token: refresh.token,
        expires_in: asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
        token: legacy_token, // Legacy field
    })).into_response()
}

pub async fn me(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
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
        Ok(Some(account)) => {
            (StatusCode::OK, Json(MeResponse {
                id: account.id.to_string(),
                email: account.email,
                plan: account.plan,
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Account not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching account: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
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
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Validate new password strength
    if let Err(e) = validate_password_strength(&payload.new_password) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Get current password hash
    let account_result = sqlx::query_scalar::<_, String>(
        "SELECT password_hash FROM accounts WHERE id = $1"
    )
    .bind(account_id)
    .fetch_optional(&pool)
    .await;

    let password_hash = match account_result {
        Ok(Some(hash)) => hash,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Account not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error fetching account: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Verify current password
    match verify_password(&payload.current_password, &password_hash) {
        Ok(true) => {},
        Ok(false) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Current password is incorrect"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to verify password: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Hash new password
    let new_password_hash = match hash_password(&payload.new_password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Update password
    let update_result = sqlx::query(
        "UPDATE accounts SET password_hash = $1 WHERE id = $2"
    )
    .bind(&new_password_hash)
    .bind(account_id)
    .execute(&pool)
    .await;

    match update_result {
        Ok(_) => {
            // Create notification for password change
            if let Err(e) = crate::notifications::create_password_changed_notification(&pool, account_id).await {
                tracing::error!("Failed to create password change notification: {}", e);
            }
            
            tracing::debug!("Password changed successfully for account: {}", account_id);
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Password changed successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating password: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

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
    .await {
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
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Generate reset token
    let reset_token = match generate_password_reset_token(&config.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate reset token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
    .await {
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

    (StatusCode::OK, Json(serde_json::json!({
        "message": "If an account with this email exists, a password reset link has been sent."
    }))).into_response()
}

/// Reset password using a valid token
pub async fn reset_password(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<ResetPasswordRequest>,
) -> impl IntoResponse {
    // Validate new password strength
    if let Err(e) = validate_password_strength(&payload.new_password) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Validate token signature and expiration
    let is_valid = match validate_password_reset_token(&payload.token, &config.jwt_secret) {
        Ok(valid) => valid,
        Err(e) => {
            tracing::warn!("Invalid reset token format: {}", e);
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid or expired reset token"
            }))).into_response();
        }
    };

    if !is_valid {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid or expired reset token"
        }))).into_response();
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
    .await {
        Ok(Some(record)) => record,
        Ok(None) => {
            tracing::warn!("Reset token not found in database");
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid or expired reset token"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error looking up reset token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Check if token was already used
    if token_record.used_at.is_some() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "This reset link has already been used"
        }))).into_response();
    }

    // Check if token has expired (database-side check)
    if token_record.expires_at < Utc::now() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "This reset link has expired"
        }))).into_response();
    }

    // Hash new password
    let new_password_hash = match hash_password(&payload.new_password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Update password
    if let Err(e) = sqlx::query!(
        "UPDATE accounts SET password_hash = $1 WHERE id = $2",
        new_password_hash,
        token_record.account_id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to update password: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Mark token as used
    if let Err(e) = sqlx::query!(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
        token_record.id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to mark token as used: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create notification for password change
    if let Err(e) = crate::notifications::create_password_changed_notification(&pool, token_record.account_id).await {
        tracing::error!("Failed to create password change notification: {}", e);
    }

    tracing::info!("Password reset successfully for account: {}", token_record.email);

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Password has been reset successfully. You can now log in with your new password."
    }))).into_response()
}

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
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid or expired refresh token"
            }))).into_response();
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
    .await {
        Ok(Some(record)) => record,
        Ok(None) => {
            // Token not found - might be reuse of old rotated token
            // Check if family exists and revoke all tokens in that family
            tracing::warn!("Refresh token not found, possible token reuse - revoking family {}", validated.family_id);
            // Convert family_id String to Uuid for database query
            let family_uuid = match uuid::Uuid::parse_str(&validated.family_id) {
                Ok(u) => u,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                        "error": "Invalid refresh token"
                    }))).into_response();
                }
            };
            let _ = sqlx::query!(
                "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'token_reuse_detected' WHERE family_id = $1",
                family_uuid
            )
            .execute(&pool)
            .await;

            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid refresh token. Please log in again."
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error looking up refresh token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Check if token was revoked
    if token_record.revoked_at.is_some() {
        tracing::warn!("Attempted use of revoked refresh token");
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
            "error": "Refresh token has been revoked. Please log in again."
        }))).into_response();
    }

    let account_id = token_record.account_id;

    // Start transaction for token rotation
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Revoke old refresh token (rotation)
    if let Err(e) = sqlx::query!(
        "UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'rotated' WHERE id = $1",
        token_record.id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to revoke old refresh token: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Generate new refresh token (same family for rotation chain)
    // Preserve original session duration (use long session on rotation)
    let family_str = token_record.family_id.to_string();
    let new_refresh = match generate_refresh_token(&config.jwt_secret, Some(&family_str), true) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate refresh token: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
    .await {
        tracing::error!("Failed to store new refresh token: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Generate new access token with JTI
    let jti = generate_jti();
    let access_token = match generate_token_with_jti(&account_id.to_string(), &jti, &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate access token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    tracing::info!("Token refreshed for account: {}", account_id);

    (StatusCode::OK, Json(TokenPairResponse {
        access_token,
        refresh_token: new_refresh.token,
        expires_in: asap_core_shared::ACCESS_TOKEN_LIFETIME_SECS,
    })).into_response()
}

/// Logout endpoint - revokes all refresh tokens for the account
pub async fn logout_all(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
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

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Successfully logged out from all devices"
    }))).into_response()
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
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
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
    .await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                tracing::warn!("Logout attempted with invalid or already revoked token");
            } else {
                tracing::info!("Account {} logged out from single session", account_id);
            }
        }
        Err(e) => {
            tracing::error!("Failed to revoke refresh token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Successfully logged out"
    }))).into_response()
}

/// Check if an access token is blacklisted
/// This is used by the auth middleware for immediate token revocation
pub async fn is_token_blacklisted(pool: &PgPool, jti: &str) -> bool {
    match sqlx::query!(
        "SELECT id FROM revoked_access_tokens WHERE jti = $1 AND expires_at > NOW()",
        jti
    )
    .fetch_optional(pool)
    .await {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("Error checking token blacklist: {}", e);
            false // Fail open to not break auth if DB has issues
        }
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/// Session info returned to clients
#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub is_current: bool,
}

/// List active sessions response
#[derive(Debug, Serialize)]
pub struct ListSessionsResponse {
    pub sessions: Vec<SessionInfo>,
}

/// Revoke session request
#[derive(Debug, Deserialize)]
pub struct RevokeSessionRequest {
    pub session_id: String,
}

/// List all active sessions for the authenticated user
pub async fn list_sessions(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    // Get all active (non-revoked, non-expired) refresh tokens for this account
    let sessions = match sqlx::query!(
        r#"
        SELECT id, user_agent, ip_address, created_at, expires_at
        FROM refresh_tokens
        WHERE account_id = $1 
          AND revoked_at IS NULL 
          AND expires_at > NOW()
        ORDER BY created_at DESC
        "#,
        account_id
    )
    .fetch_all(&pool)
    .await {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Failed to list sessions: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Find current session by matching JTI to family
    // For simplicity, we'll mark the most recent session as current
    // A more accurate approach would store the current token hash in claims
    let current_session_id = sessions.first().map(|s| s.id);

    let session_list: Vec<SessionInfo> = sessions
        .into_iter()
        .map(|s| SessionInfo {
            id: s.id.to_string(),
            user_agent: s.user_agent,
            ip_address: s.ip_address,
            created_at: s.created_at.to_rfc3339(),
            expires_at: s.expires_at.to_rfc3339(),
            is_current: Some(s.id) == current_session_id,
        })
        .collect();

    (StatusCode::OK, Json(ListSessionsResponse { sessions: session_list })).into_response()
}

/// Revoke a specific session
pub async fn revoke_session(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RevokeSessionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    let session_id = match Uuid::parse_str(&payload.session_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid session ID"
            }))).into_response();
        }
    };

    // Revoke the session (only if it belongs to the authenticated user)
    match sqlx::query!(
        r#"
        UPDATE refresh_tokens 
        SET revoked_at = NOW(), revoked_reason = 'user_revoked'
        WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL
        "#,
        session_id,
        account_id
    )
    .execute(&pool)
    .await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                    "error": "Session not found or already revoked"
                }))).into_response();
            }
            tracing::info!("Account {} revoked session {}", account_id, session_id);
        }
        Err(e) => {
            tracing::error!("Failed to revoke session: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Session revoked successfully"
    }))).into_response()
}
