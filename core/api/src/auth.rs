use axum::{Json, response::IntoResponse, http::StatusCode, extract::{State, Extension}};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{Utc, Duration};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

const JWT_SECRET: &str = "dev-secret-change-in-production"; // TODO: Load from config

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // user_id
    pub tenant_id: String,
    pub exp: i64,
}

/// Hash a password using bcrypt
fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST)
}

/// Verify a password against a hash
fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    bcrypt::verify(password, hash)
}

/// Generate a JWT token for a user
fn generate_token(user_id: &str, tenant_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_string(),
        tenant_id: tenant_id.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_ref()),
    )
}

pub async fn signup(
    State(pool): State<PgPool>,
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

    // Validate slug format
    if payload.portfolio_slug.is_empty() || !payload.portfolio_slug.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid portfolio slug format"
        }))).into_response();
    }

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
        payload.portfolio_slug
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
        payload.portfolio_slug,
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
    let token = match generate_token(&user_id.to_string(), &tenant_id.to_string()) {
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
            slug: payload.portfolio_slug,
        },
    })).into_response()
}

pub async fn login(
    State(pool): State<PgPool>,
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
    let token = match generate_token(&user.id.to_string(), &user.tenant_id.to_string()) {
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

