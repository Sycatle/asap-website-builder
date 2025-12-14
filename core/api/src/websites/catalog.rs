//! Module catalog (available modules listing and actions)

use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, module_catalog};

/// List available modules from the code-defined catalog
/// Modules are no longer stored in database - schemas are defined in code
pub async fn list_available_modules(
    Extension(_claims): Extension<Claims>,
) -> impl IntoResponse {
    let modules = module_catalog::get_user_modules();
    
    let response: Vec<serde_json::Value> = modules.into_iter().map(|m| {
        serde_json::json!({
            "id": m.slug.clone(),
            "name": m.name,
            "slug": m.slug,
            "version": m.version,
            "description": m.description,
            "category": m.category,
            "default_settings": m.default_settings,
            "config_schema": m.config_schema,
            "icon": m.icon
        })
    }).collect();
    
    (StatusCode::OK, Json(response)).into_response()
}

/// Get a single module by slug from the code-defined catalog
pub async fn get_module_by_slug(
    Extension(_claims): Extension<Claims>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    match module_catalog::get_module_by_slug(&slug) {
        Some(m) => {
            (StatusCode::OK, Json(serde_json::json!({
                "id": m.slug.clone(),
                "name": m.name,
                "slug": m.slug,
                "version": m.version,
                "description": m.description,
                "category": m.category,
                "default_settings": m.default_settings,
                "config_schema": m.config_schema,
                "icon": m.icon
            }))).into_response()
        }
        None => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found"
            }))).into_response()
        }
    }
}

/// Get module data for a website (includes settings, module info, and dynamic data)
pub async fn get_website_module_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, module_slug)): Path<(String, String)>,
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

    // Verify website belongs to account
    let website_check = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_uuid)
    .bind(account_id)
    .fetch_optional(&pool)
    .await;

    if let Err(e) = website_check {
        tracing::error!("Database error checking website: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    if website_check.unwrap().is_none() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({
            "error": "Website not found"
        }))).into_response();
    }

    let module_def = match module_catalog::get_module_by_slug(&module_slug) {
        Some(m) => m,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Module not found"
            }))).into_response();
        }
    };

    let website_module = sqlx::query_as::<_, (serde_json::Value, bool)>(
        r#"
        SELECT wm.settings, wm.enabled
        FROM website_modules wm
        INNER JOIN modules m ON m.id = wm.module_id
        WHERE wm.website_id = $1 AND m.slug = $2
        "#
    )
    .bind(website_uuid)
    .bind(&module_slug)
    .fetch_optional(&pool)
    .await;

    let (settings, enabled) = match website_module {
        Ok(Some((s, e))) => (s, e),
        Ok(None) => (module_def.default_settings.clone(), false),
        Err(e) => {
            tracing::error!("Database error getting website module: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    let mut data = serde_json::json!({});
    
    if module_slug == "github-sync" {
        let website_data = sqlx::query_as::<_, (serde_json::Value, chrono::DateTime<chrono::Utc>)>(
            r#"SELECT data, updated_at FROM website_data WHERE website_id = $1"#
        )
        .bind(website_uuid)
        .fetch_optional(&pool)
        .await;

        if let Ok(Some((wd_data, updated_at))) = website_data {
            // Get generated_at from inside the JSON data, fallback to updated_at
            let last_sync = wd_data.get("generated_at")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| updated_at.to_rfc3339());
            
            data = serde_json::json!({
                "projects": wd_data.get("projects").cloned().unwrap_or(serde_json::json!([])),
                "profile": wd_data.get("profile").cloned(),
                "lastSync": last_sync
            });
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

/// Execute a module action (e.g., sync GitHub)
pub async fn execute_module_action(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, module_slug, action_key)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
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

    // Verify website belongs to account
    let website_check = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_uuid)
    .bind(account_id)
    .fetch_optional(&pool)
    .await;

    if let Err(e) = website_check {
        tracing::error!("Database error checking website: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    if website_check.unwrap().is_none() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({
            "error": "Website not found"
        }))).into_response();
    }

    match (module_slug.as_str(), action_key.as_str()) {
        ("github-sync", "sync") => {
            let github_username = payload.get("github_username")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let event_payload = serde_json::json!({
                "website_id": website_id,
                "github_username": github_username,
                "requested_by": claims.sub
            });

            let event_result = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'GITHUB_SYNC_REQUESTED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            match event_result {
                Ok(_) => {
                    tracing::info!("GitHub sync requested for website {}", website_id);
                    (StatusCode::OK, Json(serde_json::json!({
                        "message": "GitHub synchronization started",
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
