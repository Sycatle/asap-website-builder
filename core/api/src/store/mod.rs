//! Extension Store API Handlers
//!
//! Handlers for the public Extension Store API (browsing, details).
//! Installation and activation are handled in the `install` submodule.

pub mod install;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::queries::{
    get_extension_categories, get_featured_extensions, get_store_extension, is_extension_installed,
    list_store_extensions, ExtensionSort, ExtensionStoreFilter, Pagination,
};
use asap_core_shared::Claims;

// Re-export install handlers
pub use install::{
    activate_extension_on_website, deactivate_extension_from_website, get_installed_extension,
    install_account_extension, list_installed_extensions, list_website_extensions,
    toggle_installed_extension, toggle_website_extension, uninstall_account_extension,
    update_installed_extension_settings, update_website_extension_settings,
};

// ============================================================================
// Request/Response Types
// ============================================================================

/// Query parameters for listing extensions
#[derive(Debug, Deserialize)]
pub struct ListExtensionsQuery {
    /// Filter by category
    pub category: Option<String>,
    /// Filter by max required plan
    pub plan: Option<String>,
    /// Search query
    pub search: Option<String>,
    /// Filter by tags (comma-separated)
    pub tags: Option<String>,
    /// Sort order: popular, newest, rating, name
    #[serde(default = "default_sort")]
    pub sort: String,
    /// Featured only
    #[serde(default)]
    pub featured: bool,
    /// Include beta extensions
    #[serde(default)]
    pub include_beta: bool,
    /// Page number (1-based)
    #[serde(default = "default_page")]
    pub page: u32,
    /// Results per page
    #[serde(default = "default_per_page")]
    pub per_page: u32,
}

fn default_sort() -> String {
    "popular".to_string()
}

fn default_page() -> u32 {
    1
}

fn default_per_page() -> u32 {
    20
}

/// Extension summary for list view
#[derive(Debug, Serialize)]
pub struct ExtensionSummary {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub icon: Option<String>,
    pub category: String,
    pub tags: Vec<String>,
    pub min_plan: String,
    pub author_name: Option<String>,
    pub author_verified: bool,
    pub version: String,
    pub featured: bool,
    pub beta: bool,
    pub deprecated: bool,
    pub install_count: i32,
    pub rating: Option<f64>,
    pub rating_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed: Option<bool>,
}

/// Paginated list response
#[derive(Debug, Serialize)]
pub struct ExtensionListResponse {
    pub extensions: Vec<ExtensionSummary>,
    pub total: i64,
    pub page: u32,
    pub per_page: u32,
    pub has_more: bool,
}

/// Extension detail response
#[derive(Debug, Serialize)]
pub struct ExtensionDetailResponse {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub long_description: Option<String>,
    pub icon: Option<String>,
    pub banner: Option<String>,
    pub category: String,
    pub tags: Vec<String>,
    pub min_plan: String,
    pub author: Option<AuthorInfo>,
    pub featured: bool,
    pub beta: bool,
    pub deprecated: bool,
    pub install_count: i32,
    pub rating: Option<f64>,
    pub rating_count: i32,
    pub manifest: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct AuthorInfo {
    pub name: String,
    pub verified: bool,
}

/// Category with count
#[derive(Debug, Serialize)]
pub struct CategoryInfo {
    pub slug: String,
    pub name: String,
    pub count: i64,
}

/// Categories response
#[derive(Debug, Serialize)]
pub struct CategoriesResponse {
    pub categories: Vec<CategoryInfo>,
}

// ============================================================================
// Handlers
// ============================================================================

/// List extensions from the store
///
/// GET /api/store/extensions
///
/// Query parameters:
/// - category: Filter by category
/// - plan: Filter by max plan required
/// - search: Search in name/description/tags
/// - tags: Comma-separated list of tags
/// - sort: popular|newest|rating|name
/// - featured: true to show only featured
/// - include_beta: true to include beta extensions
/// - page: Page number (default 1)
/// - per_page: Results per page (default 20, max 100)
pub async fn list_extensions(
    State(pool): State<PgPool>,
    claims: Option<Extension<Claims>>,
    Query(params): Query<ListExtensionsQuery>,
) -> impl IntoResponse {
    // Build filter
    let filter = ExtensionStoreFilter {
        category: params.category,
        min_plan: params.plan,
        tags: params
            .tags
            .map(|t| t.split(',').map(|s| s.trim().to_string()).collect()),
        search: params.search,
        featured_only: params.featured,
        include_beta: params.include_beta,
        include_deprecated: false,
    };

    // Parse sort
    let sort = match params.sort.as_str() {
        "newest" => ExtensionSort::Newest,
        "rating" => ExtensionSort::Rating,
        "name" => ExtensionSort::Name,
        _ => ExtensionSort::Popular,
    };

    // Pagination (cap at 100)
    let pagination = Pagination {
        page: params.page.max(1),
        per_page: params.per_page.clamp(1, 100),
    };

    // Get account_id if authenticated
    let account_id = claims.as_ref().and_then(|c| Uuid::parse_str(&c.sub).ok());

    // Fetch extensions
    match list_store_extensions(&pool, filter, sort, pagination).await {
        Ok((rows, total)) => {
            let mut extensions = Vec::with_capacity(rows.len());

            for row in rows {
                // Check if installed (only if authenticated)
                let installed = if let Some(acc_id) = account_id {
                    (is_extension_installed(&pool, acc_id, &row.slug).await).ok()
                } else {
                    None
                };

                extensions.push(ExtensionSummary {
                    slug: row.slug,
                    name: row.name,
                    description: row.description,
                    icon: row.icon,
                    category: row.category,
                    tags: row.tags,
                    min_plan: row.min_plan,
                    author_name: row.author_name,
                    author_verified: row.author_verified.unwrap_or(false),
                    version: row.version,
                    featured: row.featured,
                    beta: row.beta,
                    deprecated: row.deprecated,
                    install_count: row.install_count,
                    rating: row.rating_average,
                    rating_count: row.rating_count,
                    installed,
                });
            }

            let has_more = (params.page as i64 * params.per_page as i64) < total;

            (
                StatusCode::OK,
                Json(ExtensionListResponse {
                    extensions,
                    total,
                    page: params.page,
                    per_page: params.per_page,
                    has_more,
                }),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list extensions: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extensions"
                })),
            )
                .into_response()
        }
    }
}

/// Get extension details
///
/// GET /api/store/extensions/:slug
pub async fn get_extension(
    State(pool): State<PgPool>,
    claims: Option<Extension<Claims>>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    // Get account_id if authenticated
    let account_id = claims.as_ref().and_then(|c| Uuid::parse_str(&c.sub).ok());

    match get_store_extension(&pool, &slug).await {
        Ok(Some(row)) => {
            // Check if installed
            let installed = if let Some(acc_id) = account_id {
                (is_extension_installed(&pool, acc_id, &row.slug).await).ok()
            } else {
                None
            };

            let author = row.author_name.map(|name| AuthorInfo {
                name,
                verified: row.author_verified.unwrap_or(false),
            });

            (
                StatusCode::OK,
                Json(ExtensionDetailResponse {
                    slug: row.slug,
                    name: row.name,
                    version: row.version,
                    description: row.description,
                    long_description: row.long_description,
                    icon: row.icon,
                    banner: row.banner,
                    category: row.category,
                    tags: row.tags,
                    min_plan: row.min_plan,
                    author,
                    featured: row.featured,
                    beta: row.beta,
                    deprecated: row.deprecated,
                    install_count: row.install_count,
                    rating: row.rating_average,
                    rating_count: row.rating_count,
                    manifest: row.manifest,
                    created_at: row.created_at.to_rfc3339(),
                    updated_at: row.updated_at.to_rfc3339(),
                    installed,
                }),
            )
                .into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Extension not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Failed to get extension {}: {}", slug, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extension"
                })),
            )
                .into_response()
        }
    }
}

/// Get extension manifest only
///
/// GET /api/store/extensions/:slug/manifest
pub async fn get_extension_manifest(
    State(pool): State<PgPool>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    match get_store_extension(&pool, &slug).await {
        Ok(Some(row)) => (StatusCode::OK, Json(row.manifest)).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Extension not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Failed to get extension manifest {}: {}", slug, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load extension manifest"
                })),
            )
                .into_response()
        }
    }
}

/// Get featured extensions
///
/// GET /api/store/extensions/featured
pub async fn list_featured_extensions(
    State(pool): State<PgPool>,
    claims: Option<Extension<Claims>>,
) -> impl IntoResponse {
    let account_id = claims.as_ref().and_then(|c| Uuid::parse_str(&c.sub).ok());

    match get_featured_extensions(&pool, 6).await {
        Ok(rows) => {
            let mut extensions = Vec::with_capacity(rows.len());

            for row in rows {
                let installed = if let Some(acc_id) = account_id {
                    (is_extension_installed(&pool, acc_id, &row.slug).await).ok()
                } else {
                    None
                };

                extensions.push(ExtensionSummary {
                    slug: row.slug,
                    name: row.name,
                    description: row.description,
                    icon: row.icon,
                    category: row.category,
                    tags: row.tags,
                    min_plan: row.min_plan,
                    author_name: row.author_name,
                    author_verified: row.author_verified.unwrap_or(false),
                    version: row.version,
                    featured: row.featured,
                    beta: row.beta,
                    deprecated: row.deprecated,
                    install_count: row.install_count,
                    rating: row.rating_average,
                    rating_count: row.rating_count,
                    installed,
                });
            }

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "extensions": extensions
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Failed to get featured extensions: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load featured extensions"
                })),
            )
                .into_response()
        }
    }
}

/// Get all categories with extension counts
///
/// GET /api/store/categories
pub async fn list_categories(State(pool): State<PgPool>) -> impl IntoResponse {
    match get_extension_categories(&pool).await {
        Ok(rows) => {
            let categories: Vec<CategoryInfo> = rows
                .into_iter()
                .map(|(slug, count)| CategoryInfo {
                    name: category_display_name(&slug),
                    slug,
                    count,
                })
                .collect();

            (StatusCode::OK, Json(CategoriesResponse { categories })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to get categories: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to load categories"
                })),
            )
                .into_response()
        }
    }
}

/// Get human-readable category name
fn category_display_name(slug: &str) -> String {
    match slug {
        "utility" => "Utilities".to_string(),
        "integration" => "Integrations".to_string(),
        "analytics" => "Analytics".to_string(),
        "marketing" => "Marketing".to_string(),
        "design" => "Design".to_string(),
        "seo" => "SEO".to_string(),
        "security" => "Security".to_string(),
        "performance" => "Performance".to_string(),
        "social" => "Social".to_string(),
        "ai" => "AI".to_string(),
        _ => slug.to_string(),
    }
}

#[cfg(test)]
mod tests;
