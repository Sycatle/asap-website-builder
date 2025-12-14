//! Website sections management

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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    let result = queries::list_website_sections(&pool, website_uuid, account_id).await;

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

    let account_id = match Uuid::parse_str(&claims.sub) {
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
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_id": section_id.to_string(),
                "section_type": payload.section_type
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'SECTION_CREATED', $2)"
            )
            .bind(account_id)
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

    let account_id = match Uuid::parse_str(&claims.sub) {
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    let result = queries::delete_website_section(&pool, section_uuid, website_uuid, account_id).await;

    match result {
        Ok(deleted) if deleted => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_id": section_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'SECTION_DELETED', $2)"
            )
            .bind(account_id)
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

    let account_id = match Uuid::parse_str(&claims.sub) {
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
    let result = queries::reorder_website_sections(&pool, website_uuid, account_id, &section_uuids).await;

    match result {
        Ok(_) => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "section_ids": payload.section_ids
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'SECTION_REORDERED', $2)"
            )
            .bind(account_id)
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
