//! Website pages management

use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, SharedWsBroadcaster};
use crate::queries;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WebsitePage {
    pub id: Uuid,
    pub website_id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub is_homepage: bool,
    pub order: i32,
    pub visible: bool,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct WebsitePageResponse {
    pub id: String,
    pub website_id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub is_homepage: bool,
    pub order: i32,
    pub visible: bool,
    pub metadata: serde_json::Value,
}

impl From<WebsitePage> for WebsitePageResponse {
    fn from(page: WebsitePage) -> Self {
        Self {
            id: page.id.to_string(),
            website_id: page.website_id.to_string(),
            slug: page.slug,
            title: page.title,
            description: page.description,
            is_homepage: page.is_homepage,
            order: page.order,
            visible: page.visible,
            metadata: page.metadata,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePageRequest {
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub is_homepage: Option<bool>,
    pub order: Option<i32>,
    pub visible: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePageRequest {
    pub slug: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub is_homepage: Option<bool>,
    pub order: Option<i32>,
    pub visible: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderPagesRequest {
    pub page_ids: Vec<String>,
}

// List all pages for a website
pub async fn list_website_pages(
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    let result = sqlx::query_as::<_, WebsitePage>(
        r#"
        SELECT id, website_id, slug, title, description, is_homepage, "order", visible, metadata
        FROM website_pages
        WHERE website_id = $1
        ORDER BY "order" ASC, created_at ASC
        "#
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
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Get a single page
pub async fn get_page(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, page_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let page_uuid = match Uuid::parse_str(&page_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid page ID format"
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
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
        Ok(Some(page)) => {
            (StatusCode::OK, Json(WebsitePageResponse::from(page))).into_response()
        }
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Page not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching page: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Create a new page
pub async fn create_page(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(website_id): Path<String>,
    Json(payload): Json<CreatePageRequest>,
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Start transaction for atomic create with homepage flag
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // If this is set as homepage, unset other homepages (within transaction)
    if payload.is_homepage.unwrap_or(false) {
        if let Err(e) = sqlx::query(
            "UPDATE website_pages SET is_homepage = false WHERE website_id = $1"
        )
        .bind(website_uuid)
        .execute(&mut *tx)
        .await {
            tracing::error!("Failed to unset homepages: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Get next order value
    let next_order = sqlx::query_scalar::<_, i32>(
        r#"SELECT COALESCE(MAX("order"), 0) + 1 FROM website_pages WHERE website_id = $1"#
    )
    .bind(website_uuid)
    .fetch_one(&mut *tx)
    .await
    .unwrap_or(0);

    let page_id = Uuid::new_v4();
    let result = sqlx::query(
        r#"
        INSERT INTO website_pages (id, website_id, slug, title, description, is_homepage, "order", visible, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#
    )
    .bind(page_id)
    .bind(website_uuid)
    .bind(&payload.slug)
    .bind(&payload.title)
    .bind(payload.description.as_deref().unwrap_or(""))
    .bind(payload.is_homepage.unwrap_or(false))
    .bind(payload.order.unwrap_or(next_order))
    .bind(payload.visible.unwrap_or(true))
    .bind(payload.metadata.as_ref().unwrap_or(&serde_json::json!({})))
    .execute(&mut *tx)
    .await;

    match result {
        Ok(_) => {
            // Commit the transaction before any other operations
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit transaction: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Internal server error"
                }))).into_response();
            }

            // Create event
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "page_id": page_id.to_string(),
                "slug": payload.slug
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'PAGE_CREATED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Emit WebSocket event for real-time sync
            let page_data = serde_json::json!({
                "id": page_id.to_string(),
                "website_id": website_id,
                "slug": payload.slug,
                "title": payload.title,
                "description": payload.description.as_deref().unwrap_or(""),
                "is_homepage": payload.is_homepage.unwrap_or(false),
                "order": payload.order.unwrap_or(next_order),
                "visible": payload.visible.unwrap_or(true),
                "metadata": payload.metadata.as_ref().unwrap_or(&serde_json::json!({}))
            });

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_page_created(
                        &acc_id.to_string(),
                        &website_id,
                        page_data.clone(),
                    );
                }
            }

            (StatusCode::CREATED, Json(serde_json::json!({
                "id": page_id.to_string(),
                "message": "Page created successfully"
            }))).into_response()
        }
        Err(e) => {
            if e.to_string().contains("unique constraint") {
                return (StatusCode::CONFLICT, Json(serde_json::json!({
                    "error": "A page with this slug already exists"
                }))).into_response();
            }
            tracing::error!("Database error creating page: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Update a page
pub async fn update_page(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path((website_id, page_id)): Path<(String, String)>,
    Json(payload): Json<UpdatePageRequest>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let page_uuid = match Uuid::parse_str(&page_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid page ID format"
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Verify page exists for this website
    let page_exists = sqlx::query_scalar::<_, bool>(
        r#"SELECT EXISTS(SELECT 1 FROM website_pages WHERE id = $1 AND website_id = $2)"#
    )
    .bind(page_uuid)
    .bind(website_uuid)
    .fetch_one(&pool)
    .await;

    match page_exists {
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Page not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying page: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
        _ => {}
    }

    // Start transaction for atomic update with homepage flag
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // If setting as homepage, unset others (within transaction)
    if payload.is_homepage.unwrap_or(false) {
        if let Err(e) = sqlx::query(
            "UPDATE website_pages SET is_homepage = false WHERE website_id = $1 AND id != $2"
        )
        .bind(website_uuid)
        .bind(page_uuid)
        .execute(&mut *tx)
        .await {
            tracing::error!("Failed to unset homepages: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Build dynamic update query
    let mut query = String::from("UPDATE website_pages SET ");
    let mut params: Vec<String> = vec![];
    let mut param_count = 1;

    if payload.slug.is_some() {
        params.push(format!("slug = ${}", param_count));
        param_count += 1;
    }
    if payload.title.is_some() {
        params.push(format!("title = ${}", param_count));
        param_count += 1;
    }
    if payload.description.is_some() {
        params.push(format!("description = ${}", param_count));
        param_count += 1;
    }
    if payload.is_homepage.is_some() {
        params.push(format!("is_homepage = ${}", param_count));
        param_count += 1;
    }
    if payload.order.is_some() {
        params.push(format!("\"order\" = ${}", param_count));
        param_count += 1;
    }
    if payload.visible.is_some() {
        params.push(format!("visible = ${}", param_count));
        param_count += 1;
    }
    if payload.metadata.is_some() {
        params.push(format!("metadata = ${}", param_count));
        param_count += 1;
    }

    if params.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "No fields to update"
        }))).into_response();
    }

    query.push_str(&params.join(", "));
    query.push_str(&format!(" WHERE id = ${} AND website_id = ${}", param_count, param_count + 1));

    // Execute with sqlx raw query
    let mut q = sqlx::query(&query);
    
    if let Some(ref slug) = payload.slug {
        q = q.bind(slug);
    }
    if let Some(ref title) = payload.title {
        q = q.bind(title);
    }
    if let Some(ref description) = payload.description {
        q = q.bind(description);
    }
    if let Some(is_homepage) = payload.is_homepage {
        q = q.bind(is_homepage);
    }
    if let Some(order) = payload.order {
        q = q.bind(order);
    }
    if let Some(visible) = payload.visible {
        q = q.bind(visible);
    }
    if let Some(ref metadata) = payload.metadata {
        q = q.bind(metadata);
    }
    
    q = q.bind(page_uuid).bind(website_uuid);

    match q.execute(&mut *tx).await {
        Ok(_) => {
            // Commit transaction
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit transaction: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Internal server error"
                }))).into_response();
            }

            let update_data = serde_json::json!({
                "slug": payload.slug,
                "title": payload.title,
                "description": payload.description,
                "is_homepage": payload.is_homepage,
                "order": payload.order,
                "visible": payload.visible,
                "metadata": payload.metadata
            });

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_page_updated(
                        &acc_id.to_string(),
                        &website_id,
                        &page_id,
                        update_data.clone(),
                    );
                }
            }

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Page updated successfully"
            }))).into_response()
        }
        Err(e) => {
            let _ = tx.rollback().await;
            if e.to_string().contains("unique constraint") {
                return (StatusCode::CONFLICT, Json(serde_json::json!({
                    "error": "A page with this slug already exists"
                }))).into_response();
            }
            tracing::error!("Database error updating page: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Delete a page
pub async fn delete_page(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path((website_id, page_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let page_uuid = match Uuid::parse_str(&page_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid page ID format"
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    let result = sqlx::query(
        r#"DELETE FROM website_pages WHERE id = $1 AND website_id = $2"#
    )
    .bind(page_uuid)
    .bind(website_uuid)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // Create event
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "page_id": page_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'PAGE_DELETED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_page_deleted(
                        &acc_id.to_string(),
                        &website_id,
                        &page_id,
                    );
                }
            }

            (StatusCode::OK, Json(serde_json::json!({
                "message": "Page deleted successfully"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Page not found"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error deleting page: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

// Reorder pages
pub async fn reorder_pages(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(website_id): Path<String>,
    Json(payload): Json<ReorderPagesRequest>,
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

    // Verify website access (owner or active administrator)
    match queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error verifying website access: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    }

    // Start transaction for atomic reordering
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Update order for each page within transaction
    for (index, page_id) in payload.page_ids.iter().enumerate() {
        let page_uuid = match Uuid::parse_str(page_id) {
            Ok(id) => id,
            Err(_) => {
                let _ = tx.rollback().await;
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "error": format!("Invalid page ID: {}", page_id)
                }))).into_response();
            }
        };

        if let Err(e) = sqlx::query(
            r#"UPDATE website_pages SET "order" = $1 WHERE id = $2 AND website_id = $3"#
        )
        .bind(index as i32)
        .bind(page_uuid)
        .bind(website_uuid)
        .execute(&mut *tx)
        .await {
            tracing::error!("Failed to update page order: {}", e);
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Failed to reorder pages"
            }))).into_response();
        }
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Broadcast to all users with access (owner + active administrators)
    if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
        for acc_id in account_ids {
            (*ws_broadcaster).sync_pages_reordered(
                &acc_id.to_string(),
                &website_id,
                &payload.page_ids,
            );
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "message": "Pages reordered successfully"
    }))).into_response()
}

/// Get public pages for a published website (no auth required)
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
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found or not published"
            }))).into_response();
        }
        Err(e) => {
            tracing::error!("Database error fetching website: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };
    
    // Get pages for this website (public - only visible ones)
    let result = sqlx::query_as::<_, WebsitePage>(
        r#"
        SELECT id, website_id, slug, title, description, is_homepage, "order", visible, metadata
        FROM website_pages
        WHERE website_id = $1 AND visible = true
        ORDER BY "order" ASC
        "#
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
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
