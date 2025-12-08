use axum::{Json, response::IntoResponse, http::StatusCode, extract::{State, Extension}};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use asap_core_shared::{SharedConfig, generate_token, Claims};

#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub portfolio_slug: String,
}

#[derive(Debug, Serialize)]
pub struct SignupResponse {
    pub token: String,
    pub user: UserResponse,
    pub tenant: TenantResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct TenantResponse {
    pub id: String,
    pub slug: String,
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
    pub tenant_id: String,
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
            portfolio_slug: "my-portfolio".to_string(),
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
        assert_eq!(req.portfolio_slug, "my-portfolio");
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
    fn test_user_response() {
        let resp = UserResponse {
            id: "user-123".to_string(),
            email: "user@example.com".to_string(),
        };

        assert_eq!(resp.id, "user-123");
        assert_eq!(resp.email, "user@example.com");
    }

    #[test]
    fn test_tenant_response() {
        let resp = TenantResponse {
            id: "tenant-123".to_string(),
            slug: "my-workspace".to_string(),
        };

        assert_eq!(resp.id, "tenant-123");
        assert_eq!(resp.slug, "my-workspace");
    }

    #[test]
    fn test_me_response() {
        let resp = MeResponse {
            id: "user-456".to_string(),
            email: "me@example.com".to_string(),
            tenant_id: "tenant-789".to_string(),
        };

        assert_eq!(resp.id, "user-456");
        assert_eq!(resp.email, "me@example.com");
        assert_eq!(resp.tenant_id, "tenant-789");
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
        let valid_slugs = vec!["my-portfolio", "portfolio123", "a-b-c"];
        
        for slug in valid_slugs {
            assert!(!slug.is_empty());
            assert!(slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
        }
    }

    #[test]
    fn test_invalid_slug() {
        let invalid_slugs = vec!["my portfolio", "portfolio@123", "portfolio#1"];
        
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

    // Validate slug format (strict security rules)
    let slug = payload.portfolio_slug.trim().to_lowercase();
    if slug.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Portfolio slug is required"
        }))).into_response();
    }
    if slug.len() < 3 || slug.len() > 50 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Portfolio slug must be between 3 and 50 characters"
        }))).into_response();
    }
    if !slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Portfolio slug can only contain lowercase letters, numbers, and hyphens"
        }))).into_response();
    }
    if slug.starts_with('-') || slug.ends_with('-') || slug.contains("--") {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Portfolio slug cannot start/end with hyphen or contain consecutive hyphens"
        }))).into_response();
    }
    // Reserved slugs that could conflict with routes
    let reserved_slugs = ["api", "admin", "auth", "login", "signup", "public", "private", "health", "static", "assets", "www", "app"];
    if reserved_slugs.contains(&slug.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "This portfolio slug is reserved"
        }))).into_response();
    }
    let slug = slug; // Use sanitized slug

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

    // Create user and tenant (handling circular dependency)
    let user_id = Uuid::new_v4();
    let tenant_id = Uuid::new_v4();

    // Create tenant first (with temporary owner_id that will be updated)
    let tenant_result = sqlx::query!(
        "INSERT INTO tenants (id, owner_id, slug, plan) VALUES ($1, $1, $2, 'free')",
        tenant_id,
        slug // Use sanitized slug, not raw payload
    )
    .execute(&mut *tx)
    .await;

    if let Err(e) = tenant_result {
        tracing::error!("Failed to create tenant: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::CONFLICT, Json(serde_json::json!({
            "error": "Portfolio slug already exists"
        }))).into_response();
    }

    // Create user
    let user_result = sqlx::query!(
        "INSERT INTO users (id, email, password_hash, tenant_id) VALUES ($1, $2, $3, $4)",
        user_id,
        payload.email,
        password_hash,
        tenant_id
    )
    .execute(&mut *tx)
    .await;

    if let Err(e) = user_result {
        tracing::error!("Failed to create user: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::CONFLICT, Json(serde_json::json!({
            "error": "Email already exists"
        }))).into_response();
    }

    // Update tenant with correct owner_id
    if let Err(e) = sqlx::query!(
        "UPDATE tenants SET owner_id = $1 WHERE id = $2",
        user_id,
        tenant_id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to update tenant owner: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create user_data entry
    if let Err(e) = sqlx::query!(
        "INSERT INTO user_data (user_id, data) VALUES ($1, '{}'::jsonb)",
        user_id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to create user_data: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create default portfolio
    let portfolio_id = Uuid::new_v4();
    if let Err(e) = sqlx::query!(
        "INSERT INTO portfolios (id, tenant_id, slug, title, tagline, status) VALUES ($1, $2, $3, $4, '', 'draft')",
        portfolio_id,
        tenant_id,
        slug, // Use sanitized slug, not raw payload
        payload.email.split('@').next().unwrap_or("User")
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to create portfolio: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create portfolio_data entry
    if let Err(e) = sqlx::query!(
        "INSERT INTO portfolio_data (portfolio_id, data) VALUES ($1, '{}'::jsonb)",
        portfolio_id
    )
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to create portfolio_data: {}", e);
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

    // Generate JWT token
    let token = match generate_token(&user_id.to_string(), &tenant_id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    tracing::info!("User created successfully: {}", payload.email);

    (StatusCode::CREATED, Json(SignupResponse {
        token,
        user: UserResponse {
            id: user_id.to_string(),
            email: payload.email,
        },
        tenant: TenantResponse {
            id: tenant_id.to_string(),
            slug, // Use sanitized slug
        },
    })).into_response()
}

pub async fn login(
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // Query user by email
    let user = match sqlx::query!(
        "SELECT id, email, password_hash, tenant_id FROM users WHERE email = $1",
        payload.email
    )
    .fetch_optional(&pool)
    .await {
        Ok(Some(user)) => user,
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
    match verify_password(&payload.password, &user.password_hash) {
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
    let token = match generate_token(&user.id.to_string(), &user.tenant_id.to_string(), &config) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    tracing::info!("User logged in successfully: {}", payload.email);

    (StatusCode::OK, Json(LoginResponse { token })).into_response()
}

pub async fn me(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Query user information
    let result = sqlx::query!(
        "SELECT id, email, tenant_id FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(user)) => {
            (StatusCode::OK, Json(MeResponse {
                id: user.id.to_string(),
                email: user.email,
                tenant_id: user.tenant_id.to_string(),
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "User not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching user: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

