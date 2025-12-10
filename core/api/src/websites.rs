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
pub struct Website {
    pub id: String,
    pub tenant_id: String,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub creation_mode: String,
    pub preset_id: Option<String>,
    pub metadata: serde_json::Value,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CreateWebsiteRequest {
    pub slug: String,
    pub title: String,
    pub tagline: Option<String>,
    pub creation_mode: Option<String>,
    pub preset_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWebsiteRequest {
    pub title: Option<String>,
    pub tagline: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct PatchWebsiteDataRequest {
    pub data: serde_json::Value,
}

pub async fn list_websites(
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

    // Use optimized prepared statement
    use crate::queries;
    
    let result = queries::list_websites_with_data(&pool, tenant_id).await;

    match result {
        Ok(websites) => {
            let websites: Vec<Website> = websites
                .into_iter()
                .map(|w| Website {
                    id: w.id.to_string(),
                    tenant_id: w.tenant_id.to_string(),
                    slug: w.slug,
                    title: w.title,
                    tagline: w.tagline,
                    status: w.status,
                    creation_mode: w.creation_mode,
                    preset_id: w.preset_id.map(|id| id.to_string()),
                    metadata: w.metadata,
                    data: w.data.unwrap_or_else(|| serde_json::json!({})),
                })
                .collect();

            (StatusCode::OK, Json(websites)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing websites: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn get_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
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

    // Use optimized prepared statement
    use crate::queries;
    
    let result = queries::get_website_with_data(&pool, website_id, tenant_id).await;

    match result {
        Ok(Some(w)) => {
            (StatusCode::OK, Json(Website {
                id: w.id.to_string(),
                tenant_id: w.tenant_id.to_string(),
                slug: w.slug,
                title: w.title,
                tagline: w.tagline,
                status: w.status,
                creation_mode: w.creation_mode,
                preset_id: w.preset_id.map(|id| id.to_string()),
                metadata: w.metadata,
                data: w.data.unwrap_or_else(|| serde_json::json!({})),
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching website: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateWebsiteRequest>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
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

    // Check if there are any fields to update
    if payload.title.is_none() && payload.tagline.is_none() && payload.metadata.is_none() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "No fields to update"
        }))).into_response();
    }

    // Use prepared statements from queries module for type-safe updates
    use crate::queries;

    let result = queries::update_website_batch_fields(
        &pool,
        website_id,
        tenant_id,
        payload.title.as_deref(),
        payload.tagline.as_deref(),
        payload.metadata.as_ref(),
    ).await;

    match result {
        Ok(_) => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Website updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating website: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn patch_website_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<PatchWebsiteDataRequest>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
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

    // Verify website belongs to tenant
    let verify_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(&pool)
    .await;

    match verify_result {
        Ok(count) if count == 0 => {
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
        _ => {}
    }

    // Use optimized prepared statement for upsert
    use crate::queries;
    
    let result = queries::upsert_website_data(&pool, website_id, &payload.data).await;

    match result {
        Ok(_) => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Website data updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating website data: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn publish_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
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

    // Use optimized prepared statement
    use crate::queries;
    
    // Update website status to published
    let result = queries::update_website_status(&pool, website_id, tenant_id, "published").await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            // Create WEBSITE_PUBLISHED event
            let event_payload = serde_json::json!({
                "website_id": website_id.to_string()
            });

            let event_result = sqlx::query(
                r#"
                INSERT INTO events (tenant_id, event_type, payload)
                VALUES ($1, 'WEBSITE_PUBLISHED', $2)
                "#
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            if let Err(e) = event_result {
                tracing::error!("Failed to create WEBSITE_PUBLISHED event: {}", e);
                // Don't fail the request if event creation fails
            }

            tracing::info!("Website published: {}", website_id);

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Website published successfully",
                "status": "published"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error publishing website: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn get_public_website(
    State(pool): State<PgPool>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    // Use optimized prepared statement
    use crate::queries;
    
    let result = queries::get_public_website(&pool, &slug).await;

    match result {
        Ok(Some(w)) => {
            (StatusCode::OK, Json(Website {
                id: w.id.to_string(),
                tenant_id: w.tenant_id.to_string(),
                slug: w.slug,
                title: w.title,
                tagline: w.tagline,
                status: w.status,
                creation_mode: w.creation_mode,
                preset_id: w.preset_id.map(|id| id.to_string()),
                metadata: w.metadata,
                data: w.data.unwrap_or_else(|| serde_json::json!({})),
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found or not published"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching public website: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// ============================================================================
// Website Modules API
// ============================================================================

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
    pub module_id: String,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleSettingsRequest {
    pub settings: serde_json::Value,
    pub enabled: Option<bool>,
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

    // Verify website belongs to tenant
    let verify_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_uuid)
    .bind(tenant_id)
    .fetch_one(&pool)
    .await;

    match verify_result {
        Ok(count) if count == 0 => {
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
        _ => {}
    }

    use crate::queries;
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

    let module_uuid = match Uuid::parse_str(&payload.module_id) {
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
            // Create MODULE_ACTIVATED event
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

    let module_uuid = match Uuid::parse_str(&module_id) {
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

// ============================================================================
// Website Sections API
// ============================================================================

#[derive(Debug, Serialize)]
pub struct WebsiteSectionResponse {
    pub id: String,
    pub website_id: String,
    pub module_id: Option<String>,
    pub section_type: String,
    pub slug: String,
    pub title: String,
    pub order: i32,
    pub layout: String,
    pub settings: serde_json::Value,
    pub data: serde_json::Value,
    pub visible: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateSectionRequest {
    pub section_type: String,
    pub slug: String,
    pub title: String,
    pub order: Option<i32>,
    pub layout: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub module_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSectionRequest {
    pub title: Option<String>,
    pub layout: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub visible: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderSectionsRequest {
    pub section_ids: Vec<String>,
}

pub async fn list_website_sections(
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
    let result = queries::list_website_sections(&pool, website_uuid, tenant_id).await;

    match result {
        Ok(sections) => {
            (StatusCode::OK, Json(sections)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing sections: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn create_section(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
    Json(payload): Json<CreateSectionRequest>,
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

    let module_uuid = match payload.module_id {
        Some(ref id) => match Uuid::parse_str(id) {
            Ok(uuid) => Some(uuid),
            Err(_) => {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": "Invalid module ID format"
                }))).into_response();
            }
        },
        None => None,
    };

    use crate::queries;
    let result = queries::create_website_section(
        &pool,
        website_uuid,
        tenant_id,
        module_uuid,
        &payload.section_type,
        &payload.slug,
        &payload.title,
        payload.order.unwrap_or(0),
        payload.layout.as_deref().unwrap_or("full"),
        &payload.settings.unwrap_or(serde_json::json!({})),
        &payload.data.unwrap_or(serde_json::json!({})),
    ).await;

    match result {
        Ok(section_id) => {
            // Create SECTION_CREATED event
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_id": section_id.to_string(),
                "section_type": payload.section_type
            });

            let _ = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'SECTION_CREATED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            (StatusCode::CREATED, Json(serde_json::json!({
                "id": section_id.to_string(),
                "message": "Section created successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error creating section: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_section(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, section_id)): Path<(String, String)>,
    Json(payload): Json<UpdateSectionRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let section_uuid = match Uuid::parse_str(&section_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid section ID format"
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
    let result = queries::update_website_section(
        &pool,
        section_uuid,
        website_uuid,
        tenant_id,
        payload.title.as_deref(),
        payload.layout.as_deref(),
        payload.settings.as_ref(),
        payload.data.as_ref(),
        payload.visible,
    ).await;

    match result {
        Ok(updated) if updated => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Section updated successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Section not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating section: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn delete_section(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, section_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let section_uuid = match Uuid::parse_str(&section_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid section ID format"
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
    let result = queries::delete_website_section(&pool, section_uuid, website_uuid, tenant_id).await;

    match result {
        Ok(deleted) if deleted => {
            // Create SECTION_DELETED event
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_id": section_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'SECTION_DELETED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Section deleted successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Section not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error deleting section: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn reorder_sections(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
    Json(payload): Json<ReorderSectionsRequest>,
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

    let section_uuids: Result<Vec<Uuid>, _> = payload.section_ids
        .iter()
        .map(|id| Uuid::parse_str(id))
        .collect();

    let section_uuids = match section_uuids {
        Ok(ids) => ids,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid section ID format in list"
            }))).into_response();
        }
    };

    use crate::queries;
    let result = queries::reorder_website_sections(&pool, website_uuid, tenant_id, &section_uuids).await;

    match result {
        Ok(_) => {
            // Create SECTION_REORDERED event
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_ids": payload.section_ids
            });

            let _ = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'SECTION_REORDERED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Sections reordered successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error reordering sections: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// ============================================================================
// Presets API
// ============================================================================

#[derive(Debug, Serialize)]
pub struct PresetResponse {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub category: String,
    pub config: serde_json::Value,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFromPresetRequest {
    pub preset_id: String,
    pub slug: String,
    pub title: String,
    pub tagline: Option<String>,
}

pub async fn list_presets(
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    use crate::queries;
    let result = queries::list_presets(&pool).await;

    match result {
        Ok(presets) => {
            (StatusCode::OK, Json(presets)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing presets: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn create_website_from_preset(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFromPresetRequest>,
) -> impl IntoResponse {
    let preset_uuid = match Uuid::parse_str(&payload.preset_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid preset ID format"
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
    let result = queries::create_website_from_preset(
        &pool,
        tenant_id,
        preset_uuid,
        &payload.slug,
        &payload.title,
        payload.tagline.as_deref().unwrap_or(""),
    ).await;

    match result {
        Ok(website_id) => {
            // Create PRESET_APPLIED event
            let event_payload = serde_json::json!({
                "website_id": website_id.to_string(),
                "preset_id": payload.preset_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (tenant_id, event_type, payload) VALUES ($1, 'PRESET_APPLIED', $2)"
            )
            .bind(tenant_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            (StatusCode::CREATED, Json(serde_json::json!({
                "id": website_id.to_string(),
                "message": "Website created from preset successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error creating website from preset: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// ============================================================================
// Available Modules API (Module Catalog)
// ============================================================================

pub async fn list_available_modules(
    State(pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> impl IntoResponse {
    use crate::queries;
    let result = queries::list_available_modules(&pool).await;

    match result {
        Ok(modules) => {
            (StatusCode::OK, Json(modules)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing available modules: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
