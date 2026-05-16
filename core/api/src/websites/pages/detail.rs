//! `GET /websites/:id/pages/:page_id` — fetch one page.

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use super::{WebsitePage, WebsitePageResponse};
use crate::queries;
use asap_core_shared::Claims;

pub async fn get_page(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, page_id)): Path<(String, String)>,
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

    let page_uuid = match Uuid::parse_str(&page_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid page ID format"
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    }

    let result = sqlx::query_as::<_, WebsitePage>(
        r#"
        SELECT p.id, p.website_id, p.slug, p.title, p.description, p.is_homepage, p."order", p.visible, p.metadata
        FROM website_pages p
        WHERE p.id = $1 AND p.website_id = $2
        "#
    )
    .bind(page_uuid)
    .bind(website_uuid)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(page)) => (StatusCode::OK, Json(WebsitePageResponse::from(page))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Page not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error fetching page: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response()
        }
    }
}

// Create a new page
