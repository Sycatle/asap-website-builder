//! Website elements management

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{Claims, SharedWsBroadcaster};

#[derive(Debug, Serialize)]
pub struct WebsiteElementResponse {
    pub id: String,
    pub website_id: String,
    pub extension_id: Option<String>,
    pub element_type: String,
    pub slug: String,
    pub title: String,
    pub order: i32,
    pub layout: String,
    pub settings: serde_json::Value,
    pub data: serde_json::Value,
    pub visible: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateElementRequest {
    pub element_type: String,
    pub slug: String,
    pub title: String,
    pub order: Option<i32>,
    pub layout: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub extension_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateElementRequest {
    pub title: Option<String>,
    pub layout: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub visible: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderElementsRequest {
    pub element_ids: Vec<String>,
}

pub async fn list_website_elements(
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

    use crate::queries;
    let result = queries::list_website_elements(&pool, website_uuid, account_id).await;

    match result {
        Ok(elements) => (StatusCode::OK, Json(elements)).into_response(),
        Err(e) => {
            tracing::error!("Database error listing elements: {}", e);
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

pub async fn create_element(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(website_id): Path<String>,
    Json(payload): Json<CreateElementRequest>,
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

    let extension_uuid = match payload.extension_id {
        Some(ref id) => match Uuid::parse_str(id) {
            Ok(uuid) => Some(uuid),
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "Invalid extension ID format"
                    })),
                )
                    .into_response();
            }
        },
        None => None,
    };

    // Clone settings and data before using them for the query
    let settings = payload.settings.clone().unwrap_or(serde_json::json!({}));
    let data = payload.data.clone().unwrap_or(serde_json::json!({}));

    use crate::queries;
    let result = queries::create_website_element(
        &pool,
        website_uuid,
        account_id,
        extension_uuid,
        &payload.element_type,
        &payload.slug,
        &payload.title,
        payload.order.unwrap_or(0),
        payload.layout.as_deref().unwrap_or("full"),
        &settings,
        &data,
    )
    .await;

    match result {
        Ok(element_id) => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "element_id": element_id.to_string(),
                "element_type": payload.element_type
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'ELEMENT_CREATED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Emit WebSocket event for real-time sync
            let element_data = serde_json::json!({
                "id": element_id.to_string(),
                "website_id": website_id,
                "extension_id": payload.extension_id,
                "element_type": payload.element_type,
                "slug": payload.slug,
                "title": payload.title,
                "order": payload.order.unwrap_or(0),
                "layout": payload.layout.as_deref().unwrap_or("full"),
                "settings": settings,
                "data": data,
                "visible": true
            });

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_element_created(
                        &acc_id.to_string(),
                        &website_id,
                        element_data.clone(),
                    );
                }
            }

            (
                StatusCode::CREATED,
                Json(serde_json::json!({
                    "id": element_id.to_string(),
                    "message": "Element created successfully"
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Database error creating element: {}", e);
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

pub async fn update_element(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path((website_id, element_id)): Path<(String, String)>,
    Json(payload): Json<UpdateElementRequest>,
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

    let element_uuid = match Uuid::parse_str(&element_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid element ID format"
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

    use crate::queries;
    let result = queries::update_website_element(
        &pool,
        element_uuid,
        website_uuid,
        account_id,
        payload.title.as_deref(),
        payload.layout.as_deref(),
        payload.settings.as_ref(),
        payload.data.as_ref(),
        payload.visible,
    )
    .await;

    match result {
        Ok(updated) if updated => {
            // Broadcast to all users with access (owner + administrators)
            match queries::get_website_account_ids(&pool, website_uuid).await {
                Ok(account_ids) => {
                    for acc_id in account_ids {
                        (*ws_broadcaster).sync_element_updated(
                            &acc_id.to_string(),
                            &website_id,
                            &element_id,
                            serde_json::json!({
                                "title": payload.title,
                                "layout": payload.layout,
                                "settings": payload.settings,
                                "data": payload.data,
                                "visible": payload.visible
                            }),
                        );
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get account IDs for broadcast: {}", e);
                }
            }

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "message": "Element updated successfully"
                })),
            )
                .into_response()
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Element not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error updating element: {}", e);
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

pub async fn delete_element(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path((website_id, element_id)): Path<(String, String)>,
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

    let element_uuid = match Uuid::parse_str(&element_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid element ID format"
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

    use crate::queries;
    let result =
        queries::delete_website_element(&pool, element_uuid, website_uuid, account_id).await;

    match result {
        Ok(deleted) if deleted => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "element_id": element_id
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'ELEMENT_DELETED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_element_deleted(
                        &acc_id.to_string(),
                        &website_id,
                        &element_id,
                    );
                }
            }

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "message": "Element deleted successfully"
                })),
            )
                .into_response()
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Element not found"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error deleting element: {}", e);
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

pub async fn reorder_elements(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(website_id): Path<String>,
    Json(payload): Json<ReorderElementsRequest>,
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

    let element_uuids: Result<Vec<Uuid>, _> = payload
        .element_ids
        .iter()
        .map(|id| Uuid::parse_str(id))
        .collect();

    let element_uuids = match element_uuids {
        Ok(ids) => ids,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid element ID format in list"
                })),
            )
                .into_response();
        }
    };

    use crate::queries;
    let result =
        queries::reorder_website_elements(&pool, website_uuid, account_id, &element_uuids).await;

    match result {
        Ok(_) => {
            let event_payload = serde_json::json!({
                "website_id": website_id,
                "element_ids": payload.element_ids
            });

            let _ = sqlx::query(
                "INSERT INTO events (account_id, event_type, payload) VALUES ($1, 'ELEMENT_REORDERED', $2)"
            )
            .bind(account_id)
            .bind(&event_payload)
            .execute(&pool)
            .await;

            // Broadcast to all users with access (owner + active administrators)
            let website_uuid = Uuid::parse_str(&website_id).unwrap();
            if let Ok(account_ids) = queries::get_website_account_ids(&pool, website_uuid).await {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_elements_reordered(
                        &acc_id.to_string(),
                        &website_id,
                        &payload.element_ids,
                    );
                }
            }

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "message": "Elements reordered successfully"
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Database error reordering elements: {}", e);
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

/// Get public elements for a published website (no auth required)
pub async fn get_public_website_elements(
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

    // Get elements for this website (public - only visible ones)
    let result = queries::list_public_website_elements(&pool, website.id).await;

    match result {
        Ok(elements) => {
            // Map to response format
            let response: Vec<serde_json::Value> = elements
                .into_iter()
                .map(|e| {
                    serde_json::json!({
                        "id": e.id.to_string(),
                        "website_id": e.website_id.to_string(),
                        "element_type": e.element_type,
                        "title": e.title,
                        "layout": e.layout,
                        "content": e.data,
                        "settings": e.settings,
                        "visible": e.visible,
                        "order_index": e.order
                    })
                })
                .collect();

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing public elements: {}", e);
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
