//! Preset templates management

use axum::{
    extract::{State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

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
