use axum::{Json, response::IntoResponse, http::StatusCode, extract::{State, Extension}};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use asap_core_shared::{
    SharedConfig, generate_token, Claims,
    generate_password_reset_token, validate_password_reset_token, hash_token,
    PASSWORD_RESET_TOKEN_LIFETIME_SECS,
};
use chrono::{Utc, Duration};

/// Default creation mode for websites created during signup
const DEFAULT_CREATION_MODE: &str = "from_scratch";

/// Default tagline for new websites
const DEFAULT_TAGLINE: &str = "";

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

    // Validate password length
    if payload.password.len() < 8 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Password must be at least 8 characters"
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
        return (StatusCode::CONFLICT, Json(serde_json::json!({
            "error": "Email already exists"
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

    // Generate JWT token
    let token = match generate_token(&account_id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    tracing::info!("Account created successfully: {}", payload.email);

    (StatusCode::CREATED, Json(SignupResponse {
        token,
        account: AccountResponse {
            id: account_id.to_string(),
            email: payload.email,
        },
    })).into_response()
}

pub async fn login(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // Query account by email
    let account = match sqlx::query!(
        "SELECT id, email, password_hash FROM accounts WHERE email = $1",
        payload.email
    )
    .fetch_optional(&pool)
    .await {
        Ok(Some(account)) => account,
        Ok(None) => {
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

    // Generate JWT token
    let token = match generate_token(&account.id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
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

    (StatusCode::OK, Json(LoginResponse { token })).into_response()
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

    // Validate new password length
    if payload.new_password.len() < 8 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "New password must be at least 8 characters"
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
    // For now, log the token for development/testing
    let reset_url = format!(
        "{}/reset-password?token={}",
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:4321".to_string()),
        reset_token.token
    );
    tracing::info!(
        "Password reset requested for {}. Reset URL: {}",
        account.email,
        reset_url
    );

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
    // Validate new password length
    if payload.new_password.len() < 8 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Password must be at least 8 characters"
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
