use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::Claims;

#[derive(Debug, Serialize)]
pub struct UserData {
    pub id: String,
    pub email: String,
    pub tenant_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub data: serde_json::Value,
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

    // Query user and user_data
    let result = sqlx::query!(
        r#"
        SELECT u.id, u.email, u.tenant_id, COALESCE(ud.data, '{}'::jsonb) as "data!"
        FROM users u
        LEFT JOIN user_data ud ON u.id = ud.user_id
        WHERE u.id = $1 AND u.tenant_id = $2
        "#,
        user_id,
        Uuid::parse_str(&claims.tenant_id).unwrap()
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
