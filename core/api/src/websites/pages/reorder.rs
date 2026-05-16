//! Bulk-reorder pages for a website.

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use super::ReorderPagesRequest;
use crate::queries;
use asap_core_shared::{Claims, SharedWsBroadcaster};

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

    // Start transaction for atomic reordering
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Update order for each page within transaction
    for (index, page_id) in payload.page_ids.iter().enumerate() {
        let page_uuid = match Uuid::parse_str(page_id) {
            Ok(id) => id,
            Err(_) => {
                let _ = tx.rollback().await;
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": format!("Invalid page ID: {}", page_id)
                    })),
                )
                    .into_response();
            }
        };

        if let Err(e) = sqlx::query(
            r#"UPDATE website_pages SET "order" = $1 WHERE id = $2 AND website_id = $3"#,
        )
        .bind(index as i32)
        .bind(page_uuid)
        .bind(website_uuid)
        .execute(&mut *tx)
        .await
        {
            tracing::error!("Failed to update page order: {}", e);
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to reorder pages"
                })),
            )
                .into_response();
        }
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Internal server error"
            })),
        )
            .into_response();
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

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Pages reordered successfully"
        })),
    )
        .into_response()
}
