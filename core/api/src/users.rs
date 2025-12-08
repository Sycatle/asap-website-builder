use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

#[derive(Debug, Serialize)]
pub struct UserData {
    pub id: String,
    pub email: String,
    pub tenant_id: String,
    pub data: serde_json::Value,
}

/// Maximum allowed size for user data JSON (64KB)
const MAX_USER_DATA_SIZE: usize = 64 * 1024;
/// Maximum nesting depth for JSON
const MAX_JSON_DEPTH: usize = 10;

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub data: serde_json::Value,
}

/// Validate JSON data size and structure
fn validate_user_data(data: &serde_json::Value) -> Result<(), &'static str> {
    // Check serialized size
    let serialized = serde_json::to_string(data).map_err(|_| "Invalid JSON structure")?;
    if serialized.len() > MAX_USER_DATA_SIZE {
        return Err("Data payload too large (max 64KB)");
    }
    
    // Check nesting depth
    fn check_depth(value: &serde_json::Value, current_depth: usize) -> bool {
        if current_depth > MAX_JSON_DEPTH {
            return false;
        }
        match value {
            serde_json::Value::Object(map) => {
                map.values().all(|v| check_depth(v, current_depth + 1))
            }
            serde_json::Value::Array(arr) => {
                arr.iter().all(|v| check_depth(v, current_depth + 1))
            }
            _ => true,
        }
    }
    
    if !check_depth(data, 0) {
        return Err("JSON nesting too deep (max 10 levels)");
    }
    
    Ok(())
}

pub async fn get_user(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Parse user ID
    let user_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID format"
            }))).into_response();
        }
    };

    // Verify the user is accessing their own data or within their tenant
    let claims_user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if user_id != claims_user_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Query user and user_data
    let result = sqlx::query!(
        r#"
        SELECT u.id, u.email, u.tenant_id, COALESCE(ud.data, '{}'::jsonb) as "data!"
        FROM users u
        LEFT JOIN user_data ud ON u.id = ud.user_id
        WHERE u.id = $1 AND u.tenant_id = $2
        "#,
        user_id,
        tenant_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(user)) => {
            (StatusCode::OK, Json(UserData {
                id: user.id.to_string(),
                email: user.email,
                tenant_id: user.tenant_id.to_string(),
                data: user.data,
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

pub async fn update_user(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    // Parse user ID
    let user_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID format"
            }))).into_response();
        }
    };

    // Verify the user is accessing their own data
    let claims_user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if user_id != claims_user_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    // Validate payload data (size, depth, structure)
    if let Err(e) = validate_user_data(&payload.data) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Update user_data
    let result = sqlx::query!(
        r#"
        INSERT INTO user_data (user_id, data)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET data = $2, updated_at = now()
        "#,
        user_id,
        payload.data
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "User data updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating user: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
