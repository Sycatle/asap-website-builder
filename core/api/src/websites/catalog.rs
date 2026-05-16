//! Extension catalog (available extensions listing and actions)

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, ExtensionRegistry};

/// List available extensions from the code-defined catalog
/// Extensions are no longer stored in database - schemas are defined in code
pub async fn list_available_extensions(Extension(_claims): Extension<Claims>) -> impl IntoResponse {
    let registry = match ExtensionRegistry::load_from_workspace() {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to load extension registry: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extensions"
                })),
            )
                .into_response();
        }
    };
    let extensions = registry.get_user_extensions();

    let response: Vec<serde_json::Value> = extensions
        .into_iter()
        .map(|e| {
            serde_json::json!({
                "id": e.slug.clone(),
                "name": e.name,
                "slug": e.slug,
                "version": e.version,
                "description": e.description,
                "category": e.category,
                "default_settings": e.default_settings,
                "config_schema": e.config_schema,
                "icon": e.icon
            })
        })
        .collect();

    (StatusCode::OK, Json(response)).into_response()
}

/// Get a single extension by slug from the code-defined catalog
pub async fn get_extension_by_slug(
    Extension(_claims): Extension<Claims>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let registry = match ExtensionRegistry::load_from_workspace() {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to load extension registry: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extensions"
                })),
            )
                .into_response();
        }
    };
    match registry.get_by_slug(&slug) {
        Some(e) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "id": e.slug.clone(),
                "name": e.name,
                "slug": e.slug,
                "version": e.version,
                "description": e.description,
                "category": e.category,
                "default_settings": e.default_settings,
                "config_schema": e.config_schema,
                "icon": e.icon
            })),
        )
            .into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Extension not found"
            })),
        )
            .into_response(),
    }
}

/// Get extension data for a website (includes settings, extension info, and dynamic data)
pub async fn get_website_extension_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, extension_slug)): Path<(String, String)>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid website ID format"
                })),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Verify website belongs to account
    let website_check =
        sqlx::query_as::<_, (Uuid,)>("SELECT id FROM websites WHERE id = $1 AND account_id = $2")
            .bind(website_uuid)
            .bind(account_id)
            .fetch_optional(&pool)
            .await;

    let website_exists = match website_check {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("Database error checking website: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    if !website_exists {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Website not found"
            })),
        )
            .into_response();
    }

    let registry = match ExtensionRegistry::load_from_workspace() {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to load extension registry: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extensions"
                })),
            )
                .into_response();
        }
    };

    let extension_def = match registry.get_by_slug(&extension_slug) {
        Some(e) => e,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Extension not found"
                })),
            )
                .into_response();
        }
    };

    let website_extension = sqlx::query_as::<_, (serde_json::Value, bool)>(
        r#"
        SELECT we.settings, we.enabled
        FROM website_extensions we
        INNER JOIN extensions e ON e.id = we.extension_id
        WHERE we.website_id = $1 AND e.slug = $2
        "#,
    )
    .bind(website_uuid)
    .bind(&extension_slug)
    .fetch_optional(&pool)
    .await;

    let (settings, enabled) = match website_extension {
        Ok(Some((s, e))) => (s, e),
        Ok(None) => (extension_def.default_settings.clone(), false),
        Err(e) => {
            tracing::error!("Database error getting website extension: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    let mut data = serde_json::json!({});

    if extension_slug == "github-sync" {
        let website_data = sqlx::query_as::<_, (serde_json::Value, chrono::DateTime<chrono::Utc>)>(
            r#"SELECT data, updated_at FROM website_data WHERE website_id = $1"#,
        )
        .bind(website_uuid)
        .fetch_optional(&pool)
        .await;

        if let Ok(Some((wd_data, updated_at))) = website_data {
            // Get generated_at from inside the JSON data, fallback to updated_at
            let last_sync = wd_data
                .get("generated_at")
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

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "extension": {
                "id": extension_def.slug.clone(),
                "name": extension_def.name,
                "slug": extension_def.slug,
                "version": extension_def.version,
                "description": extension_def.description,
                "category": extension_def.category,
                "default_settings": extension_def.default_settings,
                "config_schema": extension_def.config_schema,
                "icon": extension_def.icon
            },
            "settings": settings,
            "enabled": enabled,
            "data": data
        })),
    )
        .into_response()
}

/// Execute an extension action (e.g., sync GitHub)
pub async fn execute_extension_action(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, extension_slug, action_key)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid website ID format"
                })),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Verify website belongs to account
    let website_check =
        sqlx::query_as::<_, (Uuid,)>("SELECT id FROM websites WHERE id = $1 AND account_id = $2")
            .bind(website_uuid)
            .bind(account_id)
            .fetch_optional(&pool)
            .await;

    match website_check {
        Ok(Some(_)) => { /* website exists, continue */ }
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error checking website: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    }

    match (extension_slug.as_str(), action_key.as_str()) {
        ("github-sync", "sync") => {
            // Get github_username from payload or from website extension settings
            let github_username = match payload.get("github_username").and_then(|v| v.as_str()).map(|s| s.to_string()) {
                Some(username) if !username.is_empty() => Some(username),
                _ => {
                    // Try to get from extension settings
                    let settings: Option<(serde_json::Value,)> = sqlx::query_as(
                        r#"
                        SELECT we.settings
                        FROM website_extensions we
                        JOIN extensions e ON we.extension_id = e.id
                        WHERE we.website_id = $1 AND e.slug = 'github-sync'
                        "#
                    )
                    .bind(website_uuid)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();

                    settings.and_then(|(s,)| s.get("github_username").and_then(|v| v.as_str()).map(|s| s.to_string()))
                }
            };

            if github_username.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "GitHub username is required. Configure it in extension settings."
                }))).into_response();
            }

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
                    tracing::info!("GitHub sync requested for website {} with username {:?}", website_id, github_username);
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
                "error": format!("Action '{}' not found for extension '{}'", action_key, extension_slug)
            }))).into_response()
        }
    }
}
