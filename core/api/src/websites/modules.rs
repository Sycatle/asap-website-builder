//! Website modules management (legacy - per website)

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
pub struct WebsiteModuleResponse {
    pub id: String,
    pub website_id: String,
    pub module_id: String,
    pub module_name: String,
    pub module_slug: String,
    pub settings: serde_json::Value,
    pub enabled: bool,
    pub activated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ActivateModuleRequest {
    pub module_id: String,  // Can be UUID or slug
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleSettingsRequest {
    pub settings: serde_json::Value,
    pub enabled: Option<bool>,
}

/// Resolve a module identifier (UUID or slug) to a module UUID
pub(crate) async fn resolve_module_id(pool: &PgPool, module_id_or_slug: &str) -> Result<Uuid, String> {
    // First try to parse as UUID
    if let Ok(uuid) = Uuid::parse_str(module_id_or_slug) {
        return Ok(uuid);
    }
    
    // Otherwise, look up by slug
    let result = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM modules WHERE slug = $1 AND enabled = true"
    )
    .bind(module_id_or_slug)
    .fetch_optional(pool)
    .await;
    
    match result {
        Ok(Some((id,))) => Ok(id),
        Ok(None) => Err(format!("Module not found: {}", module_id_or_slug)),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

pub async fn list_website_modules(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
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

    use crate::queries;
    
    match queries::verify_website_ownership(&pool, website_uuid, tenant_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    let result = queries::list_website_modules(&pool, website_uuid).await;

    match result {
        Ok(modules) => {
            (StatusCode::OK, Json(modules)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing website modules: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn activate_module(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
    Json(payload): Json<ActivateModuleRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let module_uuid = match resolve_module_id(&pool, &payload.module_id).await {
        Ok(id) => id,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": e
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

    use crate::queries;
    let result = queries::activate_website_module(
        &pool,
        website_uuid,
        module_uuid,
        tenant_id,
        payload.settings.unwrap_or(serde_json::json!({})),
    ).await;

    match result {
        Ok(_) => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "module_id": payload.module_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'MODULE_ACTIVATED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Module activated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error activating module: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_website_module(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, module_id)): Path<(String, String)>,
    Json(payload): Json<UpdateModuleSettingsRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let module_uuid = match resolve_module_id(&pool, &module_id).await {
        Ok(id) => id,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": e
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

    use crate::queries;
    let result = queries::update_website_module(
        &pool,
        website_uuid,
        module_uuid,
        tenant_id,
        &payload.settings,
        payload.enabled,
    ).await;

    match result {
        Ok(updated) if updated => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Module updated successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found for this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating module: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
