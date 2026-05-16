//! HTTP handlers for the collections (items) endpoints.

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_domain::{CollectionItem, FilterClause};
use asap_core_shared::Claims;

use super::filters::{apply_filters, apply_sort};
use super::helpers::{parse_account_id, verify_website_ownership};
use super::types::{
    CollectionQueryParams, CollectionResponse, CollectionSummary, UpsertCollectionRequest,
};

/// List all collections for a website
/// GET /websites/:id/collections
pub async fn list_collections(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<Uuid>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            collection_slug,
            source_extension,
            total_count,
            sync_status,
            synced_at
        FROM website_collections
        WHERE website_id = $1
        ORDER BY collection_slug
        "#,
        website_id
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let collections: Vec<CollectionSummary> = rows
                .into_iter()
                .map(|r| CollectionSummary {
                    collection_slug: r.collection_slug,
                    source_extension: r.source_extension,
                    total_count: r.total_count,
                    sync_status: r.sync_status,
                    synced_at: r.synced_at.map(|t| t.to_rfc3339()),
                })
                .collect();

            (StatusCode::OK, Json(collections)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing collections: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Get a specific collection with items
/// GET /websites/:id/collections/:slug
pub async fn get_collection(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, collection_slug)): Path<(Uuid, String)>,
    Query(params): Query<CollectionQueryParams>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, website_id, collection_slug, items,
            source_extension, source_version, total_count,
            sync_status, sync_error, synced_at,
            created_at, updated_at
        FROM website_collections
        WHERE website_id = $1 AND collection_slug = $2
        "#,
        website_id,
        collection_slug
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let mut items: Vec<CollectionItem> =
                serde_json::from_value(row.items.clone()).unwrap_or_default();

            if let Some(filter_json) = &params.filter {
                if let Ok(filters) = serde_json::from_str::<Vec<FilterClause>>(filter_json) {
                    items = apply_filters(items, &filters);
                }
            }

            if let Some(sort_str) = &params.sort {
                items = apply_sort(items, sort_str);
            }

            let total_count = items.len() as i32;

            let offset = params.offset.unwrap_or(0) as usize;
            let limit = params.limit.unwrap_or(100) as usize;
            items = items.into_iter().skip(offset).take(limit).collect();

            let response = CollectionResponse {
                id: row.id.to_string(),
                website_id: row.website_id.to_string(),
                collection_slug: row.collection_slug,
                items,
                source_extension: row.source_extension,
                source_version: row.source_version,
                total_count,
                sync_status: row.sync_status,
                sync_error: row.sync_error,
                synced_at: row.synced_at.map(|t| t.to_rfc3339()),
                created_at: row.created_at.to_rfc3339(),
                updated_at: row.updated_at.to_rfc3339(),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Collection not found" })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error getting collection: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Upsert a collection (create or update)
/// PUT /websites/:id/collections/:slug
pub async fn upsert_collection(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, collection_slug)): Path<(Uuid, String)>,
    Json(request): Json<UpsertCollectionRequest>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    let items_json = serde_json::to_value(&request.items).unwrap_or_default();
    let total_count = request.items.len() as i32;
    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO website_collections (
            website_id, collection_slug, items,
            source_extension, source_version, total_count,
            sync_status, synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'idle', $7, $7, $7)
        ON CONFLICT (website_id, collection_slug) DO UPDATE SET
            items = $3,
            source_extension = $4,
            source_version = $5,
            total_count = $6,
            sync_status = 'idle',
            sync_error = NULL,
            synced_at = $7,
            updated_at = $7
        RETURNING id
        "#,
        website_id,
        collection_slug,
        items_json,
        request.source_extension,
        request.source_version,
        total_count,
        now
    )
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let _ = sqlx::query!(
                r#"
                UPDATE website_variables
                SET stale = TRUE, updated_at = NOW()
                WHERE website_id = $1 
                AND source = 'computed'
                AND computation->>'collection' = $2
                "#,
                website_id,
                collection_slug
            )
            .execute(&pool)
            .await;

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "id": row.id.to_string(),
                    "collection_slug": collection_slug,
                    "items_count": total_count,
                    "synced_at": now.to_rfc3339()
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Database error upserting collection: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Delete a collection
/// DELETE /websites/:id/collections/:slug
pub async fn delete_collection(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, collection_slug)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    let result = sqlx::query!(
        r#"
        DELETE FROM website_collections
        WHERE website_id = $1 AND collection_slug = $2
        RETURNING id
        "#,
        website_id,
        collection_slug
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => (StatusCode::NO_CONTENT, ()).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Collection not found" })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error deleting collection: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Trigger a sync for a collection
/// POST /websites/:id/collections/:slug/sync
pub async fn trigger_collection_sync(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, collection_slug)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    let collection = sqlx::query!(
        r#"
        SELECT source_extension, sync_status
        FROM website_collections
        WHERE website_id = $1 AND collection_slug = $2
        "#,
        website_id,
        collection_slug
    )
    .fetch_optional(&pool)
    .await;

    match collection {
        Ok(Some(row)) => {
            if row.sync_status == "syncing" {
                return (
                    StatusCode::CONFLICT,
                    Json(serde_json::json!({ "error": "Sync already in progress" })),
                )
                    .into_response();
            }

            let _ = sqlx::query!(
                r#"
                UPDATE website_collections
                SET sync_status = 'syncing', updated_at = NOW()
                WHERE website_id = $1 AND collection_slug = $2
                "#,
                website_id,
                collection_slug
            )
            .execute(&pool)
            .await;

            let event_data = serde_json::json!({
                "collection_slug": collection_slug,
                "extension_slug": row.source_extension
            });

            let _ = sqlx::query!(
                r#"
                INSERT INTO events (account_id, event_type, payload)
                SELECT account_id, 'SYNC_COLLECTION', $2
                FROM websites WHERE id = $1
                "#,
                website_id,
                event_data
            )
            .execute(&pool)
            .await;

            (
                StatusCode::ACCEPTED,
                Json(serde_json::json!({
                    "message": "Sync initiated",
                    "collection_slug": collection_slug
                })),
            )
                .into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Collection not found" })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error triggering sync: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}
