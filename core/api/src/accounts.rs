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
pub struct AccountData {
    pub id: String,
    pub email: String,
    pub plan: String,
    pub data: serde_json::Value,
}

/// Maximum allowed size for account data JSON (64KB)
const MAX_ACCOUNT_DATA_SIZE: usize = 64 * 1024;
/// Maximum nesting depth for JSON
const MAX_JSON_DEPTH: usize = 10;

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub data: serde_json::Value,
}

/// Validate JSON data size and structure
fn validate_account_data(data: &serde_json::Value) -> Result<(), &'static str> {
    // Check serialized size
    let serialized = serde_json::to_string(data).map_err(|_| "Invalid JSON structure")?;
    if serialized.len() > MAX_ACCOUNT_DATA_SIZE {
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

pub async fn get_account(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Parse account ID
    let account_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid account ID format"
            }))).into_response();
        }
    };

    // Verify the account is accessing their own data
    let claims_account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if account_id != claims_account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    // Query account and account_data
    let result = sqlx::query!(
        r#"
        SELECT a.id, a.email, a.plan, COALESCE(ad.data, '{}'::jsonb) as "data!"
        FROM accounts a
        LEFT JOIN account_data ad ON a.id = ad.account_id
        WHERE a.id = $1
        "#,
        account_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(account)) => {
            (StatusCode::OK, Json(AccountData {
                id: account.id.to_string(),
                email: account.email,
                plan: account.plan,
                data: account.data,
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

pub async fn update_account(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateAccountRequest>,
) -> impl IntoResponse {
    // Parse account ID
    let account_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid account ID format"
            }))).into_response();
        }
    };

    // Verify the account is accessing their own data
    let claims_account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if account_id != claims_account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    // Validate payload data (size, depth, structure)
    if let Err(e) = validate_account_data(&payload.data) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Update account_data
    let result = sqlx::query!(
        r#"
        INSERT INTO account_data (account_id, data)
        VALUES ($1, $2)
        ON CONFLICT (account_id)
        DO UPDATE SET data = $2, updated_at = now()
        "#,
        account_id,
        payload.data
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Account data updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating account: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
