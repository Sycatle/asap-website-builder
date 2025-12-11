//! Tenant-level module management

use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, module_catalog};
use super::modules::{ActivateModuleRequest, UpdateModuleSettingsRequest, resolve_module_id};

#[derive(Debug, Serialize)]
pub struct TenantModuleResponse {
    pub id: String,
    pub tenant_id: String,
    pub module_id: String,
    pub module_name: String,
    pub module_slug: String,
    pub module_icon: Option<String>,
    pub settings: serde_json::Value,
    pub enabled: bool,
    pub activated_at: String,
    pub sidebar_label: Option<String>,
    pub sidebar_order: i32,
}

/// List all modules activated for a tenant
pub async fn list_tenant_modules(
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

    use crate::queries;
    let result = queries::list_tenant_modules(&pool, tenant_id).await;

    match result {
        Ok(modules) => {
            let response: Vec<TenantModuleResponse> = modules.into_iter().map(|m| TenantModuleResponse {
                id: m.id.to_string(),
                tenant_id: m.tenant_id.to_string(),
                module_id: m.module_id.to_string(),
                module_name: m.module_name,
                module_slug: m.module_slug,
                module_icon: m.module_icon,
                settings: m.settings,
                enabled: m.enabled,
                activated_at: m.activated_at.to_rfc3339(),
                sidebar_label: m.sidebar_label,
                sidebar_order: m.sidebar_order,
            }).collect();
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing tenant modules: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

/// Activate a module for a tenant
pub async fn activate_tenant_module(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ActivateModuleRequest>,
) -> impl IntoResponse {
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
    let result = queries::activate_tenant_module(
        &pool,
        tenant_id,
        module_uuid,
        payload.settings.unwrap_or(serde_json::json!({})),
    ).await;

    match result {
        Ok(_) => {
            let event_payload = serde_json::json!({
                "tenant_id": tenant_id.to_string(),
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

/// Update a tenant module settings
pub async fn update_tenant_module(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(module_slug): Path<String>,
    Json(payload): Json<UpdateModuleSettingsRequest>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    let module_row = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM modules WHERE slug = $1 AND enabled = true"
    )
    .bind(&module_slug)
    .fetch_optional(&pool)
    .await;

    let module_id = match module_row {
        Ok(Some((id,))) => id,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error finding module: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    use crate::queries;
    let result = queries::update_tenant_module(
        &pool,
        tenant_id,
        module_id,
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
                "error": "Module not activated for this tenant"
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

/// Get tenant module data (includes settings, module info, and dynamic data)
pub async fn get_tenant_module_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(module_slug): Path<String>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    let module_def = match module_catalog::get_module_by_slug(&module_slug) {
        Some(m) => m,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found"
            }))).into_response();
        }
    };

    let tenant_module = sqlx::query_as::<_, (serde_json::Value, bool)>(
        r#"
        SELECT tm.settings, tm.enabled
        FROM tenant_modules tm
        INNER JOIN modules m ON m.id = tm.module_id
        WHERE tm.tenant_id = $1 AND m.slug = $2
        "#
    )
    .bind(tenant_id)
    .bind(&module_slug)
    .fetch_optional(&pool)
    .await;

    let (settings, enabled) = match tenant_module {
        Ok(Some((s, e))) => (s, e),
        Ok(None) => (module_def.default_settings.clone(), false),
        Err(e) => {
            tracing::error!("Database error getting tenant module: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Get dynamic data based on module type
    let mut data = serde_json::json!({});
    
    if module_slug == "github-sync" {
        let website_data = sqlx::query_as::<_, (Option<serde_json::Value>, Option<chrono::DateTime<chrono::Utc>>)>(
            r#"
            SELECT wd.data, wd.updated_at 
            FROM website_data wd
            JOIN websites w ON w.id = wd.website_id
            WHERE w.tenant_id = $1
            ORDER BY wd.updated_at DESC
            LIMIT 1
            "#
        )
        .bind(tenant_id)
        .fetch_optional(&pool)
        .await;

        if let Ok(Some((wd_data, updated_at))) = website_data {
            if let Some(wd_data) = wd_data {
                data = serde_json::json!({
                    "profile": wd_data.get("profile").cloned().unwrap_or(serde_json::json!(null)),
                    "organizations": wd_data.get("organizations").cloned().unwrap_or(serde_json::json!([])),
                    "projects": wd_data.get("projects").cloned().unwrap_or(serde_json::json!([])),
                    "lastSync": updated_at.map(|dt| dt.to_rfc3339())
                });
            }
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "module": {
            "id": module_def.slug.clone(),
            "name": module_def.name,
            "slug": module_def.slug,
            "version": module_def.version,
            "description": module_def.description,
            "category": module_def.category,
            "default_settings": module_def.default_settings,
            "config_schema": module_def.config_schema,
            "icon": module_def.icon
        },
        "settings": settings,
        "enabled": enabled,
        "data": data
    }))).into_response()
}

/// Execute a tenant module action (e.g., sync GitHub)
pub async fn execute_tenant_module_action(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((module_slug, action_key)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    match (module_slug.as_str(), action_key.as_str()) {
        ("github-sync", "sync") => {
            let github_username = payload.get("github_username")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let website_id = sqlx::query_as::<_, (Uuid,)>(
                "SELECT id FROM websites WHERE tenant_id = $1 ORDER BY created_at LIMIT 1"
            )
            .bind(tenant_id)
            .fetch_optional(&pool)
            .await;

            let website_id_str = match website_id {
                Ok(Some((id,))) => id.to_string(),
                _ => "".to_string(),
            };

            let event_payload = serde_json::json!({
                "tenant_id": tenant_id.to_string(),
                "website_id": website_id_str,
                "github_username": github_username,
                "requested_by": claims.sub
            });

            let event_result = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'GITHUB_SYNC_REQUESTED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            match event_result {
                Ok(_) => {
                    tracing::info!("GitHub sync requested for tenant {}", tenant_id);
                    (StatusCode::OK, Json(serde_json::json!({
                        "message": "Synchronisation GitHub lancée",
                        "status": "pending"
                    }))).into_response()
                }
                Err(e) => {
                    tracing::error!("Failed to create sync event: {}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "error": "Failed to start synchronization"
                    }))).into_response()
                }
            }
        }
        _ => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": format!("Action '{}' not found for module '{}'", action_key, module_slug)
            }))).into_response()
        }
    }
}
