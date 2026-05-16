//! List pages — authenticated `/websites/:id/pages` and the public published endpoint.

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

// List all pages for a website
pub async fn list_website_pages(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<String>,
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
        SELECT id, website_id, slug, title, description, is_homepage, "order", visible, metadata
        FROM website_pages
        WHERE website_id = $1
        ORDER BY "order" ASC, created_at ASC
        "#,
    )
    .bind(website_uuid)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(pages) => {
            let response: Vec<WebsitePageResponse> = pages.into_iter().map(Into::into).collect();
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing pages: {}", e);
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

pub async fn get_public_website_pages(
    State(pool): State<PgPool>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    use crate::queries;

    // First get the website by slug to verify it's published
    let website_result = queries::get_public_website(&pool, &slug).await;

    let website = match website_result {
        Ok(Some(w)) => w,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found or not published"
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Database error fetching website: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Get pages for this website (public - only visible ones)
    let result = sqlx::query_as::<_, WebsitePage>(
        r#"
        SELECT id, website_id, slug, title, description, is_homepage, "order", visible, metadata
        FROM website_pages
        WHERE website_id = $1 AND visible = true
        ORDER BY "order" ASC
        "#,
    )
    .bind(website.id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(pages) => {
            let response: Vec<WebsitePageResponse> = pages.into_iter().map(Into::into).collect();
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching public pages: {}", e);
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
