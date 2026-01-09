//! Element Templates API Handlers
//!
//! Endpoints for managing user-saved section configuration templates.
//! Templates allow users to save configured sections for reuse across websites.

use axum::{
    extract::{Path, Query, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use serde_json::Value;

use asap_core_shared::Claims;

// ============================================================================
// Response Types
// ============================================================================

/// Full template response with all fields
#[derive(Debug, Clone, Serialize)]
pub struct ElementTemplateResponse {
    pub id: Uuid,
    pub account_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub element_type: String,
    pub variant: Option<String>,
    pub settings: Value,
    pub preview_image: Option<String>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Summary template response for listings
#[derive(Debug, Clone, Serialize)]
pub struct ElementTemplateSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub element_type: String,
    pub variant: Option<String>,
    pub preview_image: Option<String>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// Request Types  
// ============================================================================

/// Request to create a new element template
#[derive(Debug, Clone, Deserialize)]
pub struct CreateElementTemplateRequest {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub element_type: String,
    #[serde(default)]
    pub variant: Option<String>,
    pub settings: Value,
    #[serde(default)]
    pub preview_image: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Request to update an element template
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateElementTemplateRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default)]
    pub settings: Option<Value>,
    #[serde(default)]
    pub preview_image: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub is_favorite: Option<bool>,
}

/// Query parameters for listing templates
#[derive(Debug, Clone, Deserialize, Default)]
pub struct ListElementTemplatesQuery {
    /// Filter by element type
    #[serde(default)]
    pub element_type: Option<String>,
    /// Filter by tag
    #[serde(default)]
    pub tag: Option<String>,
    /// Show only favorites
    #[serde(default)]
    pub favorites_only: Option<bool>,
    /// Search in name/description
    #[serde(default)]
    pub search: Option<String>,
    /// Pagination: offset
    #[serde(default)]
    pub offset: Option<i64>,
    /// Pagination: limit (default 50)
    #[serde(default)]
    pub limit: Option<i64>,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Parse account ID from claims
fn parse_account_id(claims: &Claims) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid token" })),
        )
    })
}

// ============================================================================
// Endpoints
// ============================================================================

/// List element templates for the authenticated user
/// GET /templates
pub async fn list_templates(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListElementTemplatesQuery>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);
    let favorites_only = query.favorites_only.unwrap_or(false);
    
    let result = sqlx::query!(
        r#"
        SELECT id, name, description, element_type, variant, preview_image, tags, is_favorite, created_at
        FROM element_templates
        WHERE account_id = $1
          AND ($2::text IS NULL OR element_type = $2)
          AND ($3::boolean = false OR is_favorite = true)
          AND ($4::text IS NULL OR $4 = ANY(tags))
          AND ($5::text IS NULL OR name ILIKE '%' || $5 || '%' OR description ILIKE '%' || $5 || '%')
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
        account_id,
        query.element_type,
        favorites_only,
        query.tag,
        query.search,
        limit,
        offset
    )
    .fetch_all(&pool)
    .await;
    
    match result {
        Ok(rows) => {
            let templates: Vec<ElementTemplateSummary> = rows
                .into_iter()
                .map(|r| ElementTemplateSummary {
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    element_type: r.element_type,
                    variant: r.variant,
                    preview_image: r.preview_image,
                    tags: r.tags,
                    is_favorite: r.is_favorite,
                    created_at: r.created_at,
                })
                .collect();
            
            (StatusCode::OK, Json(templates)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list templates: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to list templates" })),
            ).into_response()
        }
    }
}

/// Get a single element template by ID
/// GET /templates/:template_id
pub async fn get_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    let result = sqlx::query!(
        r#"
        SELECT id, account_id, name, description, element_type, variant, settings, 
               preview_image, tags, is_favorite, created_at, updated_at
        FROM element_templates
        WHERE id = $1 AND account_id = $2
        "#,
        template_id,
        account_id
    )
    .fetch_optional(&pool)
    .await;
    
    match result {
        Ok(Some(r)) => {
            let template = ElementTemplateResponse {
                id: r.id,
                account_id: r.account_id,
                name: r.name,
                description: r.description,
                element_type: r.element_type,
                variant: r.variant,
                settings: r.settings,
                preview_image: r.preview_image,
                tags: r.tags,
                is_favorite: r.is_favorite,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            
            (StatusCode::OK, Json(template)).into_response()
        }
        Ok(None) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Template not found" })),
            ).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to get template: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to get template" })),
            ).into_response()
        }
    }
}

/// Create a new element template
/// POST /templates
pub async fn create_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateElementTemplateRequest>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    // Validate required fields
    if request.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Template name is required" })),
        ).into_response();
    }
    
    if request.element_type.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Element type is required" })),
        ).into_response();
    }
    
    let result = sqlx::query!(
        r#"
        INSERT INTO element_templates (account_id, name, description, element_type, variant, settings, preview_image, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, account_id, name, description, element_type, variant, settings, 
                  preview_image, tags, is_favorite, created_at, updated_at
        "#,
        account_id,
        request.name.trim(),
        request.description,
        request.element_type.trim(),
        request.variant,
        request.settings,
        request.preview_image,
        &request.tags
    )
    .fetch_one(&pool)
    .await;
    
    match result {
        Ok(r) => {
            let template = ElementTemplateResponse {
                id: r.id,
                account_id: r.account_id,
                name: r.name,
                description: r.description,
                element_type: r.element_type,
                variant: r.variant,
                settings: r.settings,
                preview_image: r.preview_image,
                tags: r.tags,
                is_favorite: r.is_favorite,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            
            tracing::info!(
                account_id = %account_id,
                template_id = %template.id,
                element_type = %template.element_type,
                "Element template created"
            );
            
            (StatusCode::CREATED, Json(template)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to create template: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to create template" })),
            ).into_response()
        }
    }
}

/// Update an existing element template
/// PATCH /templates/:template_id
pub async fn update_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(request): Json<UpdateElementTemplateRequest>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    // Verify ownership
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM element_templates WHERE id = $1 AND account_id = $2)",
        template_id,
        account_id
    )
    .fetch_one(&pool)
    .await;
    
    match exists {
        Ok(Some(true)) => {}
        Ok(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Template not found" })),
            ).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to verify template ownership: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Database error" })),
            ).into_response();
        }
    }
    
    // Update template
    let result = sqlx::query!(
        r#"
        UPDATE element_templates
        SET 
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            variant = COALESCE($5, variant),
            settings = COALESCE($6, settings),
            preview_image = COALESCE($7, preview_image),
            tags = COALESCE($8, tags),
            is_favorite = COALESCE($9, is_favorite),
            updated_at = now()
        WHERE id = $1 AND account_id = $2
        RETURNING id, account_id, name, description, element_type, variant, settings, 
                  preview_image, tags, is_favorite, created_at, updated_at
        "#,
        template_id,
        account_id,
        request.name,
        request.description,
        request.variant,
        request.settings,
        request.preview_image,
        request.tags.as_deref(),
        request.is_favorite
    )
    .fetch_one(&pool)
    .await;
    
    match result {
        Ok(r) => {
            let template = ElementTemplateResponse {
                id: r.id,
                account_id: r.account_id,
                name: r.name,
                description: r.description,
                element_type: r.element_type,
                variant: r.variant,
                settings: r.settings,
                preview_image: r.preview_image,
                tags: r.tags,
                is_favorite: r.is_favorite,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            
            (StatusCode::OK, Json(template)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to update template: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to update template" })),
            ).into_response()
        }
    }
}

/// Delete an element template
/// DELETE /templates/:template_id
pub async fn delete_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    let result = sqlx::query!(
        "DELETE FROM element_templates WHERE id = $1 AND account_id = $2",
        template_id,
        account_id
    )
    .execute(&pool)
    .await;
    
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            tracing::info!(
                account_id = %account_id,
                template_id = %template_id,
                "Element template deleted"
            );
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(_) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Template not found" })),
            ).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to delete template: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to delete template" })),
            ).into_response()
        }
    }
}

/// Toggle favorite status for a template
/// POST /templates/:template_id/favorite
pub async fn toggle_favorite(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };
    
    let result = sqlx::query!(
        r#"
        UPDATE element_templates
        SET is_favorite = NOT is_favorite, updated_at = now()
        WHERE id = $1 AND account_id = $2
        RETURNING id, account_id, name, description, element_type, variant, settings, 
                  preview_image, tags, is_favorite, created_at, updated_at
        "#,
        template_id,
        account_id
    )
    .fetch_optional(&pool)
    .await;
    
    match result {
        Ok(Some(r)) => {
            let template = ElementTemplateResponse {
                id: r.id,
                account_id: r.account_id,
                name: r.name,
                description: r.description,
                element_type: r.element_type,
                variant: r.variant,
                settings: r.settings,
                preview_image: r.preview_image,
                tags: r.tags,
                is_favorite: r.is_favorite,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            
            (StatusCode::OK, Json(template)).into_response()
        }
        Ok(None) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Template not found" })),
            ).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to toggle favorite: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to toggle favorite" })),
            ).into_response()
        }
    }
}
