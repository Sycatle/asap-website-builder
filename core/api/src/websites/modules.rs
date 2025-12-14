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

use asap_core_shared::{Claims, module_catalog};

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
/// 
/// This function first checks the module catalog (source of truth),
/// then ensures the module exists in the database, creating it if needed.
pub(crate) async fn resolve_module_id(pool: &PgPool, module_id_or_slug: &str) -> Result<Uuid, String> {
    // First try to parse as UUID
    if let Ok(uuid) = Uuid::parse_str(module_id_or_slug) {
        return Ok(uuid);
    }
    
    // Look up in the module catalog (source of truth)
    let module_def = module_catalog::get_module_by_slug(module_id_or_slug)
        .ok_or_else(|| format!("Module not found: {}", module_id_or_slug))?;
    
    // Check if module exists in database
    let existing = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM modules WHERE slug = $1"
    )
    .bind(&module_def.slug)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    if let Some((id,)) = existing {
        return Ok(id);
    }
    
    // Module not in DB, insert it from the catalog
    let new_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO modules (id, name, slug, version, description, category, icon, default_settings, config_schema, sidebar_order, sidebar_label, enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            version = EXCLUDED.version,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            icon = EXCLUDED.icon,
            default_settings = EXCLUDED.default_settings,
            config_schema = EXCLUDED.config_schema,
            sidebar_order = EXCLUDED.sidebar_order,
            sidebar_label = EXCLUDED.sidebar_label
        RETURNING id
        "#
    )
    .bind(new_id)
    .bind(&module_def.name)
    .bind(&module_def.slug)
    .bind(&module_def.version)
    .bind(&module_def.description)
    .bind(&module_def.category)
    .bind(&module_def.icon)
    .bind(&module_def.default_settings)
    .bind(module_def.config_schema.as_ref().map(|s| serde_json::to_value(s).ok()).flatten())
    .bind(module_def.sidebar_order)
    .bind(&module_def.sidebar_label)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert module: {}", e))?;
    
    // Fetch the actual ID (might be different if ON CONFLICT was triggered)
    let result = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM modules WHERE slug = $1"
    )
    .bind(&module_def.slug)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(result.0)
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    match queries::verify_website_ownership(&pool, website_uuid, account_id).await {
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

    let account_id = match Uuid::parse_str(&claims.sub) {
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
        account_id,
        payload.settings.unwrap_or(serde_json::json!({})),
    ).await;

    match result {
        Ok(_) => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "module_id": payload.module_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'MODULE_ACTIVATED', $2)"
            )
            .bind(account_id)
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

    let account_id = match Uuid::parse_str(&claims.sub) {
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
        account_id,
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
