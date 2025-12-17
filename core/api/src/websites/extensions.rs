//! Website extensions management (legacy - per website)

use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, extension_catalog};

#[derive(Debug, Serialize)]
pub struct WebsiteExtensionResponse {
    pub id: String,
    pub website_id: String,
    pub extension_id: String,
    pub extension_name: String,
    pub extension_slug: String,
    pub settings: serde_json::Value,
    pub enabled: bool,
    pub activated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ActivateExtensionRequest {
    pub extension_id: String,  // Can be UUID or slug
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExtensionSettingsRequest {
    pub settings: serde_json::Value,
    pub enabled: Option<bool>,
}

/// Resolve an extension identifier (UUID or slug) to an extension UUID
/// 
/// This function first checks the extension catalog (source of truth),
/// then ensures the extension exists in the database, creating it if needed.
pub(crate) async fn resolve_extension_id(pool: &PgPool, extension_id_or_slug: &str) -> Result<Uuid, String> {
    // First try to parse as UUID
    if let Ok(uuid) = Uuid::parse_str(extension_id_or_slug) {
        return Ok(uuid);
    }
    
    // Look up in the extension catalog (source of truth)
    let extension_def = extension_catalog::get_extension_by_slug(extension_id_or_slug)
        .ok_or_else(|| format!("Extension not found: {}", extension_id_or_slug))?;
    
    // Check if extension exists in database
    let existing = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM extensions WHERE slug = $1"
    )
    .bind(&extension_def.slug)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    if let Some((id,)) = existing {
        return Ok(id);
    }
    
    // Extension not in DB, insert it from the catalog
    let new_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO extensions (id, name, slug, version, description, category, icon, default_settings, config_schema, sidebar_order, sidebar_label, enabled)
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
    .bind(&extension_def.name)
    .bind(&extension_def.slug)
    .bind(&extension_def.version)
    .bind(&extension_def.description)
    .bind(&extension_def.category)
    .bind(&extension_def.icon)
    .bind(&extension_def.default_settings)
    .bind(extension_def.config_schema.as_ref().map(|s| serde_json::to_value(s).ok()).flatten())
    .bind(extension_def.sidebar_order)
    .bind(&extension_def.sidebar_label)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert extension: {}", e))?;
    
    // Fetch the actual ID (might be different if ON CONFLICT was triggered)
    let result = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM extensions WHERE slug = $1"
    )
    .bind(&extension_def.slug)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(result.0)
}

pub async fn list_website_extensions(
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

    let result = queries::list_website_extensions(&pool, website_uuid).await;

    match result {
        Ok(extensions) => {
            (StatusCode::OK, Json(extensions)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing website extensions: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn activate_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
    Json(payload): Json<ActivateExtensionRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let extension_uuid = match resolve_extension_id(&pool, &payload.extension_id).await {
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
    let result = queries::activate_website_extension(
        &pool,
        website_uuid,
        extension_uuid,
        account_id,
        payload.settings.unwrap_or(serde_json::json!({})),
    ).await;

    match result {
        Ok(_) => {
            // Get extension name for notification
            let extension_name: Option<String> = sqlx::query_scalar(
                "SELECT name FROM extensions WHERE id = $1"
            )
            .bind(extension_uuid)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();

            let event_payload = serde_json::json!({
                "website_id": website_id,
                "extension_id": payload.extension_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'EXTENSION_ACTIVATED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Create notification for extension activated
            if let Some(name) = extension_name {
                if let Err(e) = crate::notifications::create_extension_activated_notification(&pool, account_id, &name).await {
                    tracing::error!("Failed to create extension activated notification: {}", e);
                }
            }

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Extension activated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error activating extension: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_website_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, extension_id)): Path<(String, String)>,
    Json(payload): Json<UpdateExtensionSettingsRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let extension_uuid = match resolve_extension_id(&pool, &extension_id).await {
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
    let result = queries::update_website_extension(
        &pool,
        website_uuid,
        extension_uuid,
        account_id,
        &payload.settings,
        payload.enabled,
    ).await;

    match result {
        Ok(updated) if updated => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Extension updated successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found for this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating extension: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn deactivate_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, extension_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    // For deactivate, we accept either the website_extensions.id or the extension_id
    // Just parse as UUID directly (no slug resolution needed for delete)
    let extension_uuid = match Uuid::parse_str(&extension_id) {
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

    use crate::queries;
    
    // Get extension name before deletion for notification
    // Try both we.id (row id) and we.extension_id to match how deactivate_website_extension works
    let extension_name: Option<String> = sqlx::query_scalar(
        r#"
        SELECT e.name FROM extensions e
        JOIN website_extensions we ON we.extension_id = e.id
        WHERE we.website_id = $1 AND (we.id = $2 OR we.extension_id = $2)
        "#
    )
    .bind(website_uuid)
    .bind(extension_uuid)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();
    
    let result = queries::deactivate_website_extension(
        &pool,
        website_uuid,
        extension_uuid,
        account_id,
    ).await;

    match result {
        Ok(deleted) if deleted => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "extension_id": extension_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'EXTENSION_DEACTIVATED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Create notification for extension deactivated
            if let Some(name) = extension_name {
                if let Err(e) = crate::notifications::create_extension_deactivated_notification(&pool, account_id, &name).await {
                    tracing::error!("Failed to create extension deactivated notification: {}", e);
                }
            }

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Extension deactivated successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found for this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error deactivating extension: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
