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

// Re-export for use in routes
pub use crate::apps::api::portfolio_cache::{PortfolioCacheService, CachedPortfolio};

#[derive(Debug, Serialize)]
pub struct Portfolio {
    pub id: String,
    pub tenant_id: String,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub metadata: serde_json::Value,
    pub data: serde_json::Value,
}

impl From<CachedPortfolio> for Portfolio {
    fn from(cached: CachedPortfolio) -> Self {
        Self {
            id: cached.id,
            tenant_id: cached.tenant_id,
            slug: cached.slug,
            title: cached.title,
            tagline: cached.tagline,
            status: cached.status,
            metadata: cached.metadata,
            data: cached.data,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdatePortfolioRequest {
    pub title: Option<String>,
    pub tagline: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct PatchPortfolioDataRequest {
    pub data: serde_json::Value,
}

/// Get public portfolio with Redis caching
pub async fn get_public_portfolio_cached(
    Extension(cache_service): Extension<std::sync::Arc<PortfolioCacheService>>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    match cache_service.get_public_portfolio(&slug).await {
        Ok(Some(cached_portfolio)) => {
            let portfolio: Portfolio = cached_portfolio.into();
            (StatusCode::OK, Json(portfolio)).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found or not published"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Error fetching public portfolio {}: {}", slug, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Keep the original function for backward compatibility
pub async fn get_public_portfolio(
    State(pool): State<PgPool>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, p.metadata,
            COALESCE(pd.data, '{}'::jsonb) as "data!"
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.slug = $1 AND p.status = 'published'
        "#,
        slug
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(p)) => {
            (StatusCode::OK, Json(Portfolio {
                id: p.id.to_string(),
                tenant_id: p.tenant_id.to_string(),
                slug: p.slug,
                title: p.title,
                tagline: p.tagline,
                status: p.status,
                metadata: p.metadata,
                data: p.data,
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found or not published"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching public portfolio: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

/// Publish a portfolio (and invalidate cache)
pub async fn publish_portfolio_with_cache(
    Extension(cache_service): Extension<std::sync::Arc<PortfolioCacheService>>,
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let portfolio_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid portfolio ID format"
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

    // Get portfolio to get its slug
    let portfolio_query = sqlx::query!(
        "SELECT slug FROM portfolios WHERE id = $1 AND tenant_id = $2",
        portfolio_id,
        tenant_id
    )
    .fetch_optional(&pool)
    .await;

    let slug = match portfolio_query {
        Ok(Some(p)) => p.slug,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Update portfolio status
    let update_result = sqlx::query!(
        "UPDATE portfolios SET status = 'published', updated_at = now() WHERE id = $1",
        portfolio_id
    )
    .execute(&pool)
    .await;

    match update_result {
        Ok(_) => {
            // Invalidate cache for this portfolio
            if let Err(e) = cache_service.invalidate_portfolio(&slug).await {
                tracing::warn!("Failed to invalidate cache for portfolio {}: {}", slug, e);
                // Continue anyway - this is not critical
            }

            (StatusCode::OK, Json(serde_json::json!({
                "status": "published",
                "public_url": format!("https://{}.asap.cool", slug)
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error publishing portfolio: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Include remaining portfolio functions from original file
// (list_portfolios, get_portfolio, update_portfolio, etc.)
// These remain unchanged and should be preserved
