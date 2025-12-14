//! Core website CRUD operations

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
    let tenant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

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

    let tenant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

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

    let tenant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if payload.title.is_none() && payload.tagline.is_none() && payload.metadata.is_none() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "No fields to update"
        }))).into_response();
    }

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

    let tenant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    match queries::verify_website_ownership(&pool, website_id, tenant_id).await {
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

    let tenant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    let result = queries::update_website_status(&pool, website_id, tenant_id, "published").await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
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
