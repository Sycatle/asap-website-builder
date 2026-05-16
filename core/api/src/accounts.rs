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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
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
            // Extract avatar_file_id from account_data and generate URL
            let avatar_url = account.data
                .get("avatar_file_id")
                .and_then(|v| v.as_str())
                .map(|file_id| format!("/files/{}", file_id));

            (StatusCode::OK, Json(AccountData {
                id: account.id.to_string(),
                email: account.email,
                plan: account.plan,
                data: account.data,
                avatar_url,
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

/// Delete account and all associated data (websites, files, notifications, etc.)
/// This is a destructive operation that cannot be undone
pub async fn delete_account(
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

    // Verify the account is deleting their own account
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
            "error": "You can only delete your own account"
        }))).into_response();
    }

    // Start a transaction to ensure all deletions succeed or none do
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Delete order: child tables first, then parent
    // This follows foreign key constraints
    
    // 1. Delete refresh tokens (sessions)
    if let Err(e) = sqlx::query!(
        "DELETE FROM refresh_tokens WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete refresh tokens: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 2. Delete password reset tokens
    if let Err(e) = sqlx::query!(
        "DELETE FROM password_reset_tokens WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete password reset tokens: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 3. Delete notifications
    if let Err(e) = sqlx::query!(
        "DELETE FROM notifications WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete notifications: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 4. Delete notification queue items
    if let Err(e) = sqlx::query!(
        "DELETE FROM notification_queue WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete notification queue: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 5-6. Optional tables: file_audit_logs and file_contents.
    // Savepoints isolate deletes that may target tables that don't exist in some envs.
    // Savepoint names are static literals — never interpolate user/runtime data here.
    for (label, savepoint, sp_release, sp_rollback, query_str) in [
        (
            "file_audit_logs",
            "SAVEPOINT sp_file_audit_logs",
            "RELEASE SAVEPOINT sp_file_audit_logs",
            "ROLLBACK TO SAVEPOINT sp_file_audit_logs",
            "DELETE FROM file_audit_logs WHERE account_id = $1",
        ),
        (
            "file_contents",
            "SAVEPOINT sp_file_contents",
            "RELEASE SAVEPOINT sp_file_contents",
            "ROLLBACK TO SAVEPOINT sp_file_contents",
            "DELETE FROM file_contents WHERE file_id IN (SELECT id FROM files WHERE account_id = $1)",
        ),
    ] {
        if sqlx::query(savepoint).execute(&mut *tx).await.is_ok() {
            match sqlx::query(query_str).bind(account_id).execute(&mut *tx).await {
                Ok(_) => {
                    tracing::debug!("Deleted {} for account {}", label, account_id);
                    let _ = sqlx::query(sp_release).execute(&mut *tx).await;
                }
                Err(_) => {
                    let _ = sqlx::query(sp_rollback).execute(&mut *tx).await;
                    tracing::debug!("Table {} does not exist or delete failed, continuing", label);
                }
            }
        }
    }

    // 7. Delete files metadata
    if let Err(e) = sqlx::query!(
        "DELETE FROM files WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete files: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 8. Delete storage quota
    if let Err(e) = sqlx::query!(
        "DELETE FROM account_storage_quota WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete storage quota: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 9. Get all websites owned by this account
    let websites = match sqlx::query!(
        "SELECT id FROM websites WHERE account_id = $1",
        account_id
    ).fetch_all(&mut *tx).await {
        Ok(websites) => websites,
        Err(e) => {
            tracing::error!("Failed to fetch websites: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account data"
            }))).into_response();
        }
    };

    // For each website, delete all associated data
    for website in websites {
        let website_id = website.id;

        // Delete website elements (sections)
        if let Err(e) = sqlx::query!(
            "DELETE FROM website_elements WHERE website_id = $1",
            website_id
        ).execute(&mut *tx).await {
            tracing::error!("Failed to delete website elements: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account data"
            }))).into_response();
        }

        // Delete website extensions
        if let Err(e) = sqlx::query!(
            "DELETE FROM website_extensions WHERE website_id = $1",
            website_id
        ).execute(&mut *tx).await {
            tracing::error!("Failed to delete website extensions: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account data"
            }))).into_response();
        }

        // Delete website pages
        if let Err(e) = sqlx::query!(
            "DELETE FROM website_pages WHERE website_id = $1",
            website_id
        ).execute(&mut *tx).await {
            tracing::error!("Failed to delete website pages: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account data"
            }))).into_response();
        }

        // Delete website data
        if let Err(e) = sqlx::query!(
            "DELETE FROM website_data WHERE website_id = $1",
            website_id
        ).execute(&mut *tx).await {
            tracing::error!("Failed to delete website data: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account data"
            }))).into_response();
        }
    }

    // 10. Delete all websites
    if let Err(e) = sqlx::query!(
        "DELETE FROM websites WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete websites: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 11. Delete account data (JSONB settings, integrations, etc.)
    if let Err(e) = sqlx::query!(
        "DELETE FROM account_data WHERE account_id = $1",
        account_id
    ).execute(&mut *tx).await {
        tracing::error!("Failed to delete account data: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to delete account data"
        }))).into_response();
    }

    // 12. Finally, delete the account itself
    let result = sqlx::query!(
        "DELETE FROM accounts WHERE id = $1",
        account_id
    ).execute(&mut *tx).await;

    match result {
        Ok(_) => {
            // Commit transaction
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit transaction: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Failed to complete account deletion"
                }))).into_response();
            }

            tracing::info!("Account deleted successfully: {}", account_id);
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Account and all associated data deleted successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to delete account: {}", e);
            let _ = tx.rollback().await;
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to delete account"
            }))).into_response()
        }
    }
}
