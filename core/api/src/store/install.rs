//! Extension Installation API Handlers
//!
//! Authenticated handlers for installing/uninstalling extensions on accounts
//! and activating/deactivating them on websites.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;
use crate::queries::{
    get_store_extension, get_account_extension, is_extension_installed,
    install_extension, uninstall_extension, list_account_extensions,
    update_account_extension_settings, toggle_account_extension,
    activate_website_extension_v2, deactivate_website_extension_v2,
    list_website_extensions_v2, toggle_website_extension_v2,
    update_website_extension_settings_v2,
};

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to install an extension
#[derive(Debug, Deserialize)]
pub struct InstallExtensionRequest {
    /// Permissions granted by the user
    #[serde(default)]
    pub granted_permissions: Vec<String>,
}

/// Response after installing an extension
#[derive(Debug, Serialize)]
pub struct InstalledExtensionResponse {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub settings: JsonValue,
    pub granted_permissions: Vec<String>,
    pub enabled: bool,
    pub installed_at: String,
}

/// Summary for listing installed extensions
#[derive(Debug, Serialize)]
pub struct InstalledExtensionSummary {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub icon: Option<String>,
    pub category: String,
    pub enabled: bool,
    pub installed_at: String,
    pub websites_count: i32,
}

/// Request to update extension settings
#[derive(Debug, Deserialize)]
pub struct UpdateExtensionSettingsRequest {
    pub settings: JsonValue,
}

/// Request to toggle extension state
#[derive(Debug, Deserialize)]
pub struct ToggleExtensionRequest {
    pub enabled: bool,
}

/// Request to activate extension on website
#[derive(Debug, Deserialize)]
pub struct ActivateExtensionRequest {
    #[serde(default)]
    pub settings: Option<JsonValue>,
}

/// Response after activating extension on website
#[derive(Debug, Serialize)]
pub struct WebsiteExtensionResponse {
    pub id: String,
    pub extension_slug: String,
    pub extension_name: String,
    pub settings: JsonValue,
    pub enabled: bool,
    pub activated_at: String,
}

// ============================================================================
// Account Extension Handlers (Installation)
// ============================================================================

/// Install an extension on the account
///
/// POST /api/account/extensions/:slug/install
pub async fn install_account_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    Json(payload): Json<InstallExtensionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    // Check if extension exists
    let extension = match get_store_extension(&pool, &slug).await {
        Ok(Some(ext)) => ext,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to get extension {}: {}", slug, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to get extension"
            }))).into_response();
        }
    };

    // Check if already installed
    match is_extension_installed(&pool, account_id, &slug).await {
        Ok(true) => {
            return (StatusCode::CONFLICT, Json(serde_json::json!({
                "error": "Extension already installed",
                "code": "ALREADY_INSTALLED"
            }))).into_response();
        }
        Ok(false) => {}
        Err(e) => {
            tracing::error!("Failed to check installation status: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to check installation status"
            }))).into_response();
        }
    }

    // Validate permissions against required permissions
    let required_permissions: Vec<String> = extension.manifest
        .get("permissions")
        .and_then(|p| p.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    // All required permissions must be granted
    for required in &required_permissions {
        if !payload.granted_permissions.contains(required) {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": format!("Missing required permission: {}", required),
                "code": "MISSING_PERMISSION",
                "required_permissions": required_permissions
            }))).into_response();
        }
    }

    // Install the extension
    match install_extension(&pool, account_id, &slug, payload.granted_permissions).await {
        Ok(installed) => {
            // TODO: Execute on_install lifecycle hook if defined

            (StatusCode::CREATED, Json(InstalledExtensionResponse {
                slug: installed.extension_slug,
                name: extension.name,
                version: installed.installed_version,
                settings: installed.settings,
                granted_permissions: installed.granted_permissions,
                enabled: installed.enabled,
                installed_at: installed.installed_at.to_rfc3339(),
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to install extension {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to install extension"
            }))).into_response()
        }
    }
}

/// Uninstall an extension from the account
///
/// DELETE /api/account/extensions/:slug
pub async fn uninstall_account_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    // Check if installed
    match get_account_extension(&pool, account_id, &slug).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not installed"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to check extension {}: {}", slug, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to check extension"
            }))).into_response();
        }
    }

    // TODO: Execute on_uninstall lifecycle hook if defined
    // TODO: Deactivate from all websites first

    match uninstall_extension(&pool, account_id, &slug).await {
        Ok(true) => {
            (StatusCode::OK, Json(serde_json::json!({
                "success": true,
                "message": "Extension uninstalled"
            }))).into_response()
        }
        Ok(false) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to uninstall extension {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to uninstall extension"
            }))).into_response()
        }
    }
}

/// List installed extensions for the account
///
/// GET /api/account/extensions
pub async fn list_installed_extensions(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match list_account_extensions(&pool, account_id).await {
        Ok(extensions) => {
            let mut result = Vec::with_capacity(extensions.len());
            
            for ext in extensions {
                // Get extension details for name, icon, category
                let details = get_store_extension(&pool, &ext.extension_slug).await.ok().flatten();
                
                result.push(InstalledExtensionSummary {
                    slug: ext.extension_slug.clone(),
                    name: details.as_ref().map(|d| d.name.clone()).unwrap_or(ext.extension_slug),
                    version: ext.installed_version,
                    icon: details.as_ref().and_then(|d| d.icon.clone()),
                    category: details.as_ref().map(|d| d.category.clone()).unwrap_or_default(),
                    enabled: ext.enabled,
                    installed_at: ext.installed_at.to_rfc3339(),
                    websites_count: 0, // TODO: Count websites where activated
                });
            }

            (StatusCode::OK, Json(serde_json::json!({
                "extensions": result
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list installed extensions: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to list extensions"
            }))).into_response()
        }
    }
}

/// Get details of an installed extension
///
/// GET /api/account/extensions/:slug
pub async fn get_installed_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match get_account_extension(&pool, account_id, &slug).await {
        Ok(Some(ext)) => {
            let details = get_store_extension(&pool, &slug).await.ok().flatten();

            (StatusCode::OK, Json(InstalledExtensionResponse {
                slug: ext.extension_slug,
                name: details.map(|d| d.name).unwrap_or_default(),
                version: ext.installed_version,
                settings: ext.settings,
                granted_permissions: ext.granted_permissions,
                enabled: ext.enabled,
                installed_at: ext.installed_at.to_rfc3339(),
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not installed"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to get extension {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to get extension"
            }))).into_response()
        }
    }
}

/// Update extension settings at account level
///
/// PATCH /api/account/extensions/:slug/settings
pub async fn update_installed_extension_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    Json(payload): Json<UpdateExtensionSettingsRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match update_account_extension_settings(&pool, account_id, &slug, payload.settings).await {
        Ok(ext) => {
            (StatusCode::OK, Json(serde_json::json!({
                "slug": ext.extension_slug,
                "settings": ext.settings,
                "updated_at": ext.updated_at.to_rfc3339()
            }))).into_response()
        }
        Err(sqlx::Error::RowNotFound) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not installed"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to update extension settings {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to update settings"
            }))).into_response()
        }
    }
}

/// Toggle extension enabled state at account level
///
/// PATCH /api/account/extensions/:slug/toggle
pub async fn toggle_installed_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    Json(payload): Json<ToggleExtensionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match toggle_account_extension(&pool, account_id, &slug, payload.enabled).await {
        Ok(ext) => {
            (StatusCode::OK, Json(serde_json::json!({
                "slug": ext.extension_slug,
                "enabled": ext.enabled,
                "updated_at": ext.updated_at.to_rfc3339()
            }))).into_response()
        }
        Err(sqlx::Error::RowNotFound) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not installed"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to toggle extension {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to toggle extension"
            }))).into_response()
        }
    }
}

// ============================================================================
// Website Extension Handlers (Activation)
// ============================================================================

/// Activate an extension on a website
///
/// POST /api/websites/:id/extensions/v2/:slug/activate
pub async fn activate_extension_on_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, slug)): Path<(Uuid, String)>,
    Json(payload): Json<ActivateExtensionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    // Check extension is installed at account level
    match get_account_extension(&pool, account_id, &slug).await {
        Ok(Some(ext)) if !ext.enabled => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Extension is disabled at account level",
                "code": "EXTENSION_DISABLED"
            }))).into_response();
        }
        Ok(Some(_)) => {}
        Ok(None) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Extension not installed. Install it first.",
                "code": "NOT_INSTALLED"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to check extension: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to check extension"
            }))).into_response();
        }
    }

    // Activate on website
    match activate_website_extension_v2(&pool, website_id, account_id, &slug, payload.settings).await {
        Ok(activated) => {
            (StatusCode::CREATED, Json(WebsiteExtensionResponse {
                id: activated.id.to_string(),
                extension_slug: activated.extension_slug,
                extension_name: activated.extension_name,
                settings: activated.settings,
                enabled: activated.enabled,
                activated_at: activated.activated_at.to_rfc3339(),
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to activate extension {} on website {}: {}", slug, website_id, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to activate extension"
            }))).into_response()
        }
    }
}

/// Deactivate an extension from a website
///
/// DELETE /api/websites/:id/extensions/v2/:slug
pub async fn deactivate_extension_from_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, slug)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match deactivate_website_extension_v2(&pool, website_id, account_id, &slug).await {
        Ok(true) => {
            (StatusCode::OK, Json(serde_json::json!({
                "success": true,
                "message": "Extension deactivated"
            }))).into_response()
        }
        Ok(false) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not active on this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to deactivate extension {} from website {}: {}", slug, website_id, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to deactivate extension"
            }))).into_response()
        }
    }
}

/// List activated extensions for a website (v2)
///
/// GET /api/websites/:id/extensions/v2
pub async fn list_website_extensions(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<Uuid>,
) -> impl IntoResponse {
    let _account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    // TODO: Verify website ownership using _account_id

    match list_website_extensions_v2(&pool, website_id).await {
        Ok(extensions) => {
            let result: Vec<WebsiteExtensionResponse> = extensions.into_iter().map(|ext| {
                WebsiteExtensionResponse {
                    id: ext.id.to_string(),
                    extension_slug: ext.extension_slug,
                    extension_name: ext.extension_name,
                    settings: ext.settings,
                    enabled: ext.enabled,
                    activated_at: ext.activated_at.to_rfc3339(),
                }
            }).collect();

            (StatusCode::OK, Json(serde_json::json!({
                "extensions": result
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list website extensions: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to list extensions"
            }))).into_response()
        }
    }
}

/// Toggle extension enabled state on website
///
/// PATCH /api/websites/:id/extensions/v2/:slug/toggle
pub async fn toggle_website_extension(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, slug)): Path<(Uuid, String)>,
    Json(payload): Json<ToggleExtensionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match toggle_website_extension_v2(&pool, website_id, account_id, &slug, payload.enabled).await {
        Ok(ext) => {
            (StatusCode::OK, Json(serde_json::json!({
                "extension_slug": ext.extension_slug,
                "enabled": ext.enabled,
                "updated_at": ext.updated_at.to_rfc3339()
            }))).into_response()
        }
        Err(sqlx::Error::RowNotFound) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not active on this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to toggle website extension: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to toggle extension"
            }))).into_response()
        }
    }
}

/// Update extension settings on website
///
/// PATCH /api/websites/:id/extensions/v2/:slug/settings
pub async fn update_website_extension_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, slug)): Path<(Uuid, String)>,
    Json(payload): Json<UpdateExtensionSettingsRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid account ID"
            }))).into_response();
        }
    };

    match update_website_extension_settings_v2(&pool, website_id, account_id, &slug, payload.settings).await {
        Ok(ext) => {
            (StatusCode::OK, Json(serde_json::json!({
                "extension_slug": ext.extension_slug,
                "settings": ext.settings,
                "updated_at": ext.updated_at.to_rfc3339()
            }))).into_response()
        }
        Err(sqlx::Error::RowNotFound) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Extension not active on this website"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to update website extension settings: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to update settings"
            }))).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_install_request_default_permissions() {
        let json = r#"{}"#;
        let req: InstallExtensionRequest = serde_json::from_str(json).unwrap();
        assert!(req.granted_permissions.is_empty());
    }

    #[test]
    fn test_install_request_with_permissions() {
        let json = r#"{"granted_permissions": ["data.read", "network.github.com"]}"#;
        let req: InstallExtensionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.granted_permissions.len(), 2);
        assert!(req.granted_permissions.contains(&"data.read".to_string()));
    }

    #[test]
    fn test_activate_request_optional_settings() {
        let json = r#"{}"#;
        let req: ActivateExtensionRequest = serde_json::from_str(json).unwrap();
        assert!(req.settings.is_none());

        let json = r#"{"settings": {"auto_sync": true}}"#;
        let req: ActivateExtensionRequest = serde_json::from_str(json).unwrap();
        assert!(req.settings.is_some());
    }
}
