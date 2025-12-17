use axum::{
    extract::{Path, State, Extension as AxumExtension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

#[derive(Debug, Serialize)]
pub struct ExtensionInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct ExtensionConfig {
    pub extension_id: String,
    pub extension_name: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExtensionConfigRequest {
    pub config: serde_json::Value,
}

pub async fn list_extensions(
    State(pool): State<PgPool>,
    AxumExtension(claims): AxumExtension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Get all extensions with their configuration status for this account
    let result = sqlx::query!(
        r#"
        SELECT 
            e.id,
            e.name,
            e.version,
            e.description,
            e.enabled,
            CASE WHEN ec.id IS NOT NULL THEN true ELSE false END as "has_config!"
        FROM extensions e
        LEFT JOIN extension_configs ec ON e.id = ec.extension_id AND ec.account_id = $1
        WHERE e.enabled = true
        ORDER BY e.name
        "#,
        account_id
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(extensions) => {
            let extensions: Vec<serde_json::Value> = extensions
                .into_iter()
                .map(|e| serde_json::json!({
                    "id": e.id.to_string(),
                    "name": e.name,
                    "version": e.version,
                    "description": e.description,
                    "enabled": e.enabled,
                    "configured": e.has_config
                }))
                .collect();

            (StatusCode::OK, Json(extensions)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing extensions: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn get_extension_config(
    State(pool): State<PgPool>,
    AxumExtension(claims): AxumExtension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let extension_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid extension ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            ec.extension_id,
            e.name,
            COALESCE(ec.config, '{}'::jsonb) as "config!"
        FROM extensions e
        LEFT JOIN extension_configs ec ON e.id = ec.extension_id AND ec.account_id = $1
        WHERE e.id = $2
        "#,
        account_id,
        extension_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(config)) => {
            (StatusCode::OK, Json(ExtensionConfig {
                extension_id: config.extension_id.to_string(),
                extension_name: config.name,
                config: config.config,
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching extension config: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_extension_config(
    State(pool): State<PgPool>,
    AxumExtension(claims): AxumExtension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateExtensionConfigRequest>,
) -> impl IntoResponse {
    let extension_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid extension ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify extension exists
    let extension_exists = sqlx::query!(
        "SELECT id FROM extensions WHERE id = $1 AND enabled = true",
        extension_id
    )
    .fetch_optional(&pool)
    .await;

    match extension_exists {
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found or disabled"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying extension: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
        _ => {}
    }

    // Insert or update extension config
    let result = sqlx::query!(
        r#"
        INSERT INTO extension_configs (account_id, extension_id, config)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id, extension_id)
        DO UPDATE SET config = $3, updated_at = now()
        "#,
        account_id,
        extension_id,
        payload.config
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Extension config updated: {} for account {}", extension_id, account_id);
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Extension configuration updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating extension config: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
