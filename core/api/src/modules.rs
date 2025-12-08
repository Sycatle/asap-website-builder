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
pub struct Module {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct ModuleConfig {
    pub module_id: String,
    pub module_name: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleConfigRequest {
    pub config: serde_json::Value,
}

pub async fn list_modules(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Get all modules with their configuration status for this tenant
    let result = sqlx::query!(
        r#"
        SELECT 
            m.id,
            m.name,
            m.version,
            m.description,
            m.enabled,
            CASE WHEN mc.id IS NOT NULL THEN true ELSE false END as "has_config!"
        FROM modules m
        LEFT JOIN module_configs mc ON m.id = mc.module_id AND mc.tenant_id = $1
        WHERE m.enabled = true
        ORDER BY m.name
        "#,
        tenant_id
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(modules) => {
            let modules: Vec<serde_json::Value> = modules
                .into_iter()
                .map(|m| serde_json::json!({
                    "id": m.id.to_string(),
                    "name": m.name,
                    "version": m.version,
                    "description": m.description,
                    "enabled": m.enabled,
                    "configured": m.has_config
                }))
                .collect();

            (StatusCode::OK, Json(modules)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing modules: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn get_module_config(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let module_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid module ID format"
            }))).into_response();
        }
    };

    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
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
            mc.module_id,
            m.name,
            COALESCE(mc.config, '{}'::jsonb) as "config!"
        FROM modules m
        LEFT JOIN module_configs mc ON m.id = mc.module_id AND mc.tenant_id = $1
        WHERE m.id = $2
        "#,
        tenant_id,
        module_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(config)) => {
            (StatusCode::OK, Json(ModuleConfig {
                module_id: config.module_id.to_string(),
                module_name: config.name,
                config: config.config,
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching module config: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_module_config(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateModuleConfigRequest>,
) -> impl IntoResponse {
    let module_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid module ID format"
            }))).into_response();
        }
    };

    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify module exists
    let module_exists = sqlx::query!(
        "SELECT id FROM modules WHERE id = $1 AND enabled = true",
        module_id
    )
    .fetch_optional(&pool)
    .await;

    match module_exists {
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found or disabled"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying module: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
        _ => {}
    }

    // Insert or update module config
    let result = sqlx::query!(
        r#"
        INSERT INTO module_configs (tenant_id, module_id, config)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET config = $3, updated_at = now()
        "#,
        tenant_id,
        module_id,
        payload.config
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Module config updated: {} for tenant {}", module_id, tenant_id);
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Module configuration updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating module config: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
