use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::Claims;

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

pub async fn list_portfolios(
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

    let result = sqlx::query!(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, p.metadata,
            COALESCE(pd.data, '{}'::jsonb) as "data!"
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.tenant_id = $1
        ORDER BY p.created_at DESC
        "#,
        tenant_id
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(portfolios) => {
            let portfolios: Vec<Portfolio> = portfolios
                .into_iter()
                .map(|p| Portfolio {
                    id: p.id.to_string(),
                    tenant_id: p.tenant_id.to_string(),
                    slug: p.slug,
                    title: p.title,
                    tagline: p.tagline,
                    status: p.status,
                    metadata: p.metadata,
                    data: p.data,
                })
                .collect();

            (StatusCode::OK, Json(portfolios)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing portfolios: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn get_portfolio(
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

    let result = sqlx::query!(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, p.metadata,
            COALESCE(pd.data, '{}'::jsonb) as "data!"
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.id = $1 AND p.tenant_id = $2
        "#,
        portfolio_id,
        tenant_id
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
                "error": "Portfolio not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching portfolio: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_portfolio(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdatePortfolioRequest>,
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

    // Build update query dynamically based on provided fields
    let mut query_parts = vec![];
    let mut params: Vec<String> = vec![];
    let mut param_count = 3; // Starting after $1 (id) and $2 (tenant_id)

    if let Some(title) = &payload.title {
        query_parts.push(format!("title = ${}", param_count));
        params.push(title.clone());
        param_count += 1;
    }

    if let Some(tagline) = &payload.tagline {
        query_parts.push(format!("tagline = ${}", param_count));
        params.push(tagline.clone());
        param_count += 1;
    }

    if let Some(metadata) = &payload.metadata {
        query_parts.push(format!("metadata = ${}::jsonb", param_count));
        params.push(metadata.to_string());
        param_count += 1;
    }

    if query_parts.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "No fields to update"
        }))).into_response();
    }

    query_parts.push("updated_at = now()".to_string());

    let query = format!(
        "UPDATE portfolios SET {} WHERE id = $1 AND tenant_id = $2",
        query_parts.join(", ")
    );

    // Execute update with dynamic parameters
    let mut query_builder = sqlx::query(&query)
        .bind(portfolio_id)
        .bind(tenant_id);

    for param in params {
        query_builder = query_builder.bind(param);
    }

    let result = query_builder.execute(&pool).await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Portfolio updated successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating portfolio: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn patch_portfolio_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<PatchPortfolioDataRequest>,
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

    // Verify portfolio belongs to tenant
    let verify_result = sqlx::query!(
        "SELECT id FROM portfolios WHERE id = $1 AND tenant_id = $2",
        portfolio_id,
        tenant_id
    )
    .fetch_optional(&pool)
    .await;

    match verify_result {
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying portfolio: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
        _ => {}
    }

    // Update or insert portfolio_data
    let result = sqlx::query!(
        r#"
        INSERT INTO portfolio_data (portfolio_id, data)
        VALUES ($1, $2)
        ON CONFLICT (portfolio_id)
        DO UPDATE SET 
            data = portfolio_data.data || $2,
            updated_at = now()
        "#,
        portfolio_id,
        payload.data
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Portfolio data updated successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error updating portfolio data: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn publish_portfolio(
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

    // Update portfolio status to published
    let result = sqlx::query!(
        "UPDATE portfolios SET status = 'published', updated_at = now() WHERE id = $1 AND tenant_id = $2",
        portfolio_id,
        tenant_id
    )
    .execute(&pool)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            // Create PORTFOLIO_PUBLISHED event
            let event_payload = serde_json::json!({
                "portfolio_id": portfolio_id.to_string()
            });

            let event_result = sqlx::query!(
                r#"
                INSERT INTO events (tenant_id, event_type, payload)
                VALUES ($1, 'PORTFOLIO_PUBLISHED', $2)
                "#,
                tenant_id,
                event_payload
            )
            .execute(&pool)
            .await;

            if let Err(e) = event_result {
                tracing::error!("Failed to create PORTFOLIO_PUBLISHED event: {}", e);
                // Don't fail the request if event creation fails
            }

            tracing::info!("Portfolio published: {}", portfolio_id);

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Portfolio published successfully",
                "status": "published"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Portfolio not found"
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
