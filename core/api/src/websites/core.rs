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

use asap_core_shared::{Claims, SharedWsBroadcaster};

#[derive(Debug, Serialize)]
pub struct Website {
    pub id: String,
    pub account_id: String,
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
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    let result = queries::list_websites_with_data(&pool, account_id).await;

    match result {
        Ok(websites) => {
            let websites: Vec<Website> = websites
                .into_iter()
                .map(|w| Website {
                    id: w.id.to_string(),
                    account_id: w.account_id.to_string(),
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

/// Create a new website for the authenticated user
pub async fn create_website(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Json(payload): Json<CreateWebsiteRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Validate title length (prevent DoS via huge payloads)
    if payload.title.len() > 200 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Title must be under 200 characters"
        }))).into_response();
    }
    if payload.tagline.as_ref().map_or(false, |t| t.len() > 500) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Tagline must be under 500 characters"
        }))).into_response();
    }

    // Validate slug
    let slug = payload.slug.trim().to_lowercase();
    if slug.is_empty() || slug.len() < 3 || slug.len() > 50 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Slug must be between 3 and 50 characters"
        }))).into_response();
    }
    if !slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Slug can only contain lowercase letters, numbers, and hyphens"
        }))).into_response();
    }
    if slug.starts_with('-') || slug.ends_with('-') || slug.contains("--") {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Slug cannot start/end with hyphen or contain consecutive hyphens"
        }))).into_response();
    }
    
    // Reserved slugs
    let reserved = ["api", "admin", "auth", "login", "signup", "public", "private", "health", "static", "assets", "www", "app"];
    if reserved.contains(&slug.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "This slug is reserved"
        }))).into_response();
    }

    let website_id = Uuid::new_v4();
    let tagline = payload.tagline.unwrap_or_default();
    let creation_mode = payload.creation_mode.unwrap_or_else(|| "onboarding".to_string());
    let metadata = payload.metadata.unwrap_or_else(|| serde_json::json!({}));

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    // Check if slug already exists
    let slug_exists: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM websites WHERE slug = $1)"
    )
    .bind(&slug)
    .fetch_one(&mut *tx)
    .await
    .ok();

    if slug_exists == Some(true) {
        let _ = tx.rollback().await;
        return (StatusCode::CONFLICT, Json(serde_json::json!({
            "error": "This slug is already taken"
        }))).into_response();
    }

    // Create website
    let result = sqlx::query(
        "INSERT INTO websites (id, account_id, slug, title, tagline, status, creation_mode, preset_id, metadata) 
         VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8)"
    )
    .bind(website_id)
    .bind(account_id)
    .bind(&slug)
    .bind(&payload.title)
    .bind(&tagline)
    .bind(&creation_mode)
    .bind(payload.preset_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()))
    .bind(&metadata)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to create website: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Failed to create website"
        }))).into_response();
    }

    // Create website_data entry
    if let Err(e) = sqlx::query(
        "INSERT INTO website_data (website_id, data) VALUES ($1, '{}'::jsonb)"
    )
    .bind(website_id)
    .execute(&mut *tx)
    .await {
        tracing::error!("Failed to create website_data: {}", e);
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    tracing::info!("Website {} created for account {}", slug, account_id);

    let website_response = Website {
        id: website_id.to_string(),
        account_id: account_id.to_string(),
        slug: slug.clone(),
        title: payload.title.clone(),
        tagline: tagline.clone(),
        status: "draft".to_string(),
        creation_mode: creation_mode.clone(),
        preset_id: payload.preset_id.clone(),
        metadata: metadata.clone(),
        data: serde_json::json!({}),
    };

    // Emit WebSocket event for real-time sync
    // Note: For newly created websites, only the owner exists at creation time
    ws_broadcaster.sync_website_created(
        &account_id.to_string(),
        serde_json::to_value(&website_response).unwrap_or_default(),
    );

    (StatusCode::CREATED, Json(website_response)).into_response()
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    let result = queries::get_website_with_data(&pool, website_id, account_id).await;

    match result {
        Ok(Some(w)) => {
            (StatusCode::OK, Json(Website {
                id: w.id.to_string(),
                account_id: w.account_id.to_string(),
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
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
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

    let account_id = match Uuid::parse_str(&claims.sub) {
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
        account_id,
        payload.title.as_deref(),
        payload.tagline.as_deref(),
        payload.metadata.as_ref(),
    ).await;

    match result {
        Ok(_) => {
            let update_data = serde_json::json!({
                "title": payload.title,
                "tagline": payload.tagline,
                "metadata": payload.metadata
            });

            // Broadcast to all users with access (owner + active administrators)
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_id).await {
                for acc_id in account_ids {
                    ws_broadcaster.sync_website_updated(
                        &acc_id.to_string(),
                        &id,
                        update_data.clone(),
                    );
                }
            }

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

/// Get website data only (without website metadata)
pub async fn get_website_data(
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    match queries::verify_website_access(&pool, website_id, account_id).await {
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

    let result = queries::get_website_data(&pool, website_id).await;

    match result {
        Ok(data) => {
            (StatusCode::OK, Json(data)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching website data: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn patch_website_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    match queries::verify_website_access(&pool, website_id, account_id).await {
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
            // Broadcast to all users with access (owner + active administrators)
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_id).await {
                for acc_id in account_ids {
                    ws_broadcaster.sync_website_data_updated(
                        &acc_id.to_string(),
                        &id,
                        payload.data.clone(),
                    );
                }
            }

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
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
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

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    use crate::queries;
    
    let result = queries::update_website_status(&pool, website_id, account_id, "published").await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            // Get website slug for notification
            let website_slug = sqlx::query_scalar::<_, String>(
                "SELECT slug FROM websites WHERE id = $1"
            )
            .bind(website_id)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten()
            .unwrap_or_else(|| website_id.to_string());

            let event_payload = serde_json::json!({
                "website_id": website_id.to_string()
            });

            let event_result = sqlx::query(
                r#"
                INSERT INTO events (account_id, event_type, payload)
                VALUES ($1, 'WEBSITE_PUBLISHED', $2)
                "#
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            if let Err(e) = event_result {
                tracing::error!("Failed to create WEBSITE_PUBLISHED event: {}", e);
            }

            // Create notification for website published
            if let Err(e) = crate::notifications::create_website_published_notification(&pool, account_id, &website_slug).await {
                tracing::error!("Failed to create website published notification: {}", e);
            }

            tracing::info!("Website published: {}", website_id);

            // Broadcast to all users with access (owner + active administrators)
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_id).await {
                for acc_id in account_ids {
                    ws_broadcaster.sync_website_published(
                        &acc_id.to_string(),
                        &id,
                        "published",
                    );
                }
            }

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
                account_id: w.account_id.to_string(),
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
