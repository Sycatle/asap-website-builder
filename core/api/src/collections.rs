//! Collections & Variables API Handlers
//!
//! Endpoints for managing website collections and variables.
//! Collections are typed arrays of items produced by extensions.
//! Variables are single values that can be manual, synced, or computed.

use axum::{
    extract::{Path, Query, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

use asap_core_shared::Claims;
use asap_core_domain::{
    CollectionItem, FilterClause, VariableComputation, ComputeOperation,
};

// ============================================================================
// Response Types
// ============================================================================

#[derive(Debug, Serialize)]
pub struct CollectionResponse {
    pub id: String,
    pub website_id: String,
    pub collection_slug: String,
    pub items: Vec<CollectionItem>,
    pub source_extension: String,
    pub source_version: Option<String>,
    pub total_count: i32,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct CollectionSummary {
    pub collection_slug: String,
    pub source_extension: String,
    pub total_count: i32,
    pub sync_status: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VariableResponse {
    pub id: String,
    pub website_id: String,
    pub key: String,
    pub value: serde_json::Value,
    pub value_type: String,
    pub source: String,
    pub source_ref: Option<String>,
    pub stale: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct VariablesListResponse {
    pub variables: Vec<VariableResponse>,
    /// Quick lookup map: key → value
    pub values: serde_json::Value,
}

// ============================================================================
// Request Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CollectionQueryParams {
    /// Filter as JSON string: [{"field": "language", "operator": "eq", "value": "TypeScript"}]
    pub filter: Option<String>,
    /// Sort field with optional - prefix for desc: "-stars" or "name"
    pub sort: Option<String>,
    /// Maximum items to return
    pub limit: Option<i32>,
    /// Offset for pagination
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertCollectionRequest {
    pub collection_slug: String,
    pub items: Vec<CollectionItem>,
    pub source_extension: String,
    pub source_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetVariableRequest {
    pub value: serde_json::Value,
    pub value_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComputedVariableRequest {
    pub key: String,
    pub value_type: String,
    pub computation: VariableComputation,
}

#[derive(Debug, Deserialize)]
pub struct TriggerSyncRequest {
    pub extension_slug: Option<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Check if the authenticated user owns the website
async fn verify_website_ownership(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query!(
        r#"SELECT id FROM websites WHERE id = $1 AND account_id = $2"#,
        website_id,
        account_id
    )
    .fetch_optional(pool)
    .await;

    match result {
        Ok(Some(_)) => Ok(()),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Website not found" })),
        )),
        Err(e) => {
            tracing::error!("Database error verifying website ownership: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ))
        }
    }
}

/// Parse account ID from claims
fn parse_account_id(claims: &Claims) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid token" })),
        )
    })
}

// ============================================================================
// Collection Endpoints
// ============================================================================

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
            // Parse items from JSONB
            let mut items: Vec<CollectionItem> = serde_json::from_value(row.items.clone())
                .unwrap_or_default();

            // Apply filtering if provided
            if let Some(filter_json) = &params.filter {
                if let Ok(filters) = serde_json::from_str::<Vec<FilterClause>>(filter_json) {
                    items = apply_filters(items, &filters);
                }
            }

            // Apply sorting if provided
            if let Some(sort_str) = &params.sort {
                items = apply_sort(items, sort_str);
            }

            let total_count = items.len() as i32;

            // Apply pagination
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
            // Mark related computed variables as stale
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

    // Get the collection to find source extension
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

            // Update sync status to syncing
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

            // Create an event for the worker to process
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

// ============================================================================
// Variable Endpoints
// ============================================================================

/// List all variables for a website
/// GET /websites/:id/variables
pub async fn list_variables(
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
            id, website_id, key, value, value_type,
            source, source_ref, stale,
            created_at, updated_at
        FROM website_variables
        WHERE website_id = $1
        ORDER BY key
        "#,
        website_id
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let mut values = serde_json::Map::new();
            let variables: Vec<VariableResponse> = rows
                .into_iter()
                .map(|r| {
                    // Add to quick lookup map
                    values.insert(r.key.clone(), r.value.clone());
                    
                    VariableResponse {
                        id: r.id.to_string(),
                        website_id: r.website_id.to_string(),
                        key: r.key,
                        value: r.value,
                        value_type: r.value_type,
                        source: r.source,
                        source_ref: r.source_ref,
                        stale: r.stale,
                        created_at: r.created_at.to_rfc3339(),
                        updated_at: r.updated_at.to_rfc3339(),
                    }
                })
                .collect();

            let response = VariablesListResponse {
                variables,
                values: serde_json::Value::Object(values),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Database error listing variables: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Get a specific variable
/// GET /websites/:id/variables/:key
pub async fn get_variable(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, key)): Path<(Uuid, String)>,
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
            id, website_id, key, value, value_type,
            source, source_ref, stale,
            created_at, updated_at
        FROM website_variables
        WHERE website_id = $1 AND key = $2
        "#,
        website_id,
        key
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let response = VariableResponse {
                id: row.id.to_string(),
                website_id: row.website_id.to_string(),
                key: row.key,
                value: row.value,
                value_type: row.value_type,
                source: row.source,
                source_ref: row.source_ref,
                stale: row.stale,
                created_at: row.created_at.to_rfc3339(),
                updated_at: row.updated_at.to_rfc3339(),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Variable not found" })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error getting variable: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Set a manual variable
/// PUT /websites/:id/variables/:key
pub async fn set_variable(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, key)): Path<(Uuid, String)>,
    Json(request): Json<SetVariableRequest>,
) -> impl IntoResponse {
    let account_id = match parse_account_id(&claims) {
        Ok(id) => id,
        Err(e) => return e.into_response(),
    };

    if let Err(e) = verify_website_ownership(&pool, website_id, account_id).await {
        return e.into_response();
    }

    // Infer value type if not provided
    let value_type = request.value_type.unwrap_or_else(|| {
        match &request.value {
            serde_json::Value::String(_) => "string".to_string(),
            serde_json::Value::Number(_) => "number".to_string(),
            serde_json::Value::Bool(_) => "boolean".to_string(),
            _ => "json".to_string(),
        }
    });

    let result = sqlx::query!(
        r#"
        INSERT INTO website_variables (
            website_id, key, value, value_type, source
        ) VALUES ($1, $2, $3, $4, 'manual')
        ON CONFLICT (website_id, key) DO UPDATE SET
            value = $3,
            value_type = $4,
            source = 'manual',
            stale = FALSE,
            updated_at = NOW()
        RETURNING id
        "#,
        website_id,
        key,
        request.value,
        value_type
    )
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "id": row.id.to_string(),
                "key": key,
                "value": request.value
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error setting variable: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Delete a variable
/// DELETE /websites/:id/variables/:key
pub async fn delete_variable(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, key)): Path<(Uuid, String)>,
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
        DELETE FROM website_variables
        WHERE website_id = $1 AND key = $2
        RETURNING id
        "#,
        website_id,
        key
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => (StatusCode::NO_CONTENT, ()).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Variable not found" })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Database error deleting variable: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

/// Recompute all stale computed variables
/// POST /websites/:id/variables/recompute
pub async fn recompute_variables(
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

    // Get all stale computed variables
    let stale_vars = sqlx::query!(
        r#"
        SELECT id, key, computation, value_type
        FROM website_variables
        WHERE website_id = $1 AND source = 'computed' AND stale = TRUE
        "#,
        website_id
    )
    .fetch_all(&pool)
    .await;

    match stale_vars {
        Ok(vars) => {
            let mut recomputed = 0;
            let mut errors = Vec::new();

            for var in vars {
                if let Some(comp_json) = var.computation {
                    match compute_variable(&pool, website_id, comp_json).await {
                        Ok(value) => {
                            let _ = sqlx::query!(
                                r#"
                                UPDATE website_variables
                                SET value = $1, stale = FALSE, updated_at = NOW()
                                WHERE id = $2
                                "#,
                                value,
                                var.id
                            )
                            .execute(&pool)
                            .await;
                            recomputed += 1;
                        }
                        Err(e) => {
                            errors.push(format!("{}: {}", var.key, e));
                        }
                    }
                }
            }

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "recomputed": recomputed,
                    "errors": errors
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Database error recomputing variables: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            )
                .into_response()
        }
    }
}

// ============================================================================
// Filter & Sort Helpers
// ============================================================================

fn apply_filters(items: Vec<CollectionItem>, filters: &[FilterClause]) -> Vec<CollectionItem> {
    items
        .into_iter()
        .filter(|item| {
            filters.iter().all(|f| {
                let field_value = item.data.get(&f.field);
                match (&f.operator, field_value) {
                    (asap_core_domain::FilterOperator::Eq, Some(v)) => v == &f.value,
                    (asap_core_domain::FilterOperator::Neq, Some(v)) => v != &f.value,
                    (asap_core_domain::FilterOperator::Gt, Some(v)) => {
                        compare_json(v, &f.value) == Some(std::cmp::Ordering::Greater)
                    }
                    (asap_core_domain::FilterOperator::Gte, Some(v)) => {
                        matches!(compare_json(v, &f.value), Some(std::cmp::Ordering::Greater | std::cmp::Ordering::Equal))
                    }
                    (asap_core_domain::FilterOperator::Lt, Some(v)) => {
                        compare_json(v, &f.value) == Some(std::cmp::Ordering::Less)
                    }
                    (asap_core_domain::FilterOperator::Lte, Some(v)) => {
                        matches!(compare_json(v, &f.value), Some(std::cmp::Ordering::Less | std::cmp::Ordering::Equal))
                    }
                    (asap_core_domain::FilterOperator::Contains, Some(v)) => {
                        if let (Some(s), Some(pattern)) = (v.as_str(), f.value.as_str()) {
                            s.to_lowercase().contains(&pattern.to_lowercase())
                        } else {
                            false
                        }
                    }
                    (asap_core_domain::FilterOperator::Exists, _) => field_value.is_some(),
                    (asap_core_domain::FilterOperator::NotExists, _) => field_value.is_none(),
                    _ => false,
                }
            })
        })
        .collect()
}

fn apply_sort(mut items: Vec<CollectionItem>, sort_str: &str) -> Vec<CollectionItem> {
    let (field, desc) = if sort_str.starts_with('-') {
        (&sort_str[1..], true)
    } else {
        (sort_str, false)
    };

    items.sort_by(|a, b| {
        let a_val = a.data.get(field);
        let b_val = b.data.get(field);
        let ordering = match (a_val, b_val) {
            (Some(a), Some(b)) => compare_json(a, b).unwrap_or(std::cmp::Ordering::Equal),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        };
        if desc { ordering.reverse() } else { ordering }
    });

    items
}

fn compare_json(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    match (a, b) {
        (serde_json::Value::Number(a), serde_json::Value::Number(b)) => {
            a.as_f64().partial_cmp(&b.as_f64())
        }
        (serde_json::Value::String(a), serde_json::Value::String(b)) => {
            Some(a.cmp(b))
        }
        (serde_json::Value::Bool(a), serde_json::Value::Bool(b)) => {
            Some(a.cmp(b))
        }
        _ => None,
    }
}

// ============================================================================
// Computation Helpers
// ============================================================================

async fn compute_variable(
    pool: &PgPool,
    website_id: Uuid,
    computation: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let comp: VariableComputation = serde_json::from_value(computation)
        .map_err(|e| format!("Invalid computation: {}", e))?;

    // Get the collection items
    let collection = sqlx::query!(
        r#"SELECT items FROM website_collections WHERE website_id = $1 AND collection_slug = $2"#,
        website_id,
        comp.collection
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?
    .ok_or_else(|| format!("Collection not found: {}", comp.collection))?;

    let mut items: Vec<CollectionItem> = serde_json::from_value(collection.items)
        .map_err(|e| format!("Failed to parse items: {}", e))?;

    // Apply filters if present
    if let Some(filters) = &comp.filter {
        items = apply_filters(items, filters);
    }

    // Apply sort if present
    if let Some(sort) = &comp.sort {
        let sort_str = if sort.order == asap_core_domain::SortOrder::Desc {
            format!("-{}", sort.field)
        } else {
            sort.field.clone()
        };
        items = apply_sort(items, &sort_str);
    }

    // Perform computation
    let result = match comp.operation {
        ComputeOperation::Count => serde_json::Value::Number(items.len().into()),
        ComputeOperation::Sum => {
            let field = comp.field.as_ref().ok_or("Field required for sum")?;
            let sum: f64 = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .sum();
            serde_json::json!(sum)
        }
        ComputeOperation::Avg => {
            let field = comp.field.as_ref().ok_or("Field required for avg")?;
            let values: Vec<f64> = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .collect();
            if values.is_empty() {
                serde_json::Value::Null
            } else {
                let avg = values.iter().sum::<f64>() / values.len() as f64;
                serde_json::json!(avg)
            }
        }
        ComputeOperation::Min => {
            let field = comp.field.as_ref().ok_or("Field required for min")?;
            let min = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .fold(f64::INFINITY, f64::min);
            if min.is_infinite() {
                serde_json::Value::Null
            } else {
                serde_json::json!(min)
            }
        }
        ComputeOperation::Max => {
            let field = comp.field.as_ref().ok_or("Field required for max")?;
            let max = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .fold(f64::NEG_INFINITY, f64::max);
            if max.is_infinite() {
                serde_json::Value::Null
            } else {
                serde_json::json!(max)
            }
        }
        ComputeOperation::First => {
            let field = comp.field.as_ref().ok_or("Field required for first")?;
            items
                .first()
                .and_then(|item| item.data.get(field).cloned())
                .unwrap_or(serde_json::Value::Null)
        }
        ComputeOperation::Last => {
            let field = comp.field.as_ref().ok_or("Field required for last")?;
            items
                .last()
                .and_then(|item| item.data.get(field).cloned())
                .unwrap_or(serde_json::Value::Null)
        }
        ComputeOperation::Mode => {
            let field = comp.field.as_ref().ok_or("Field required for mode")?;
            let mut counts = std::collections::HashMap::new();
            for item in &items {
                if let Some(value) = item.data.get(field) {
                    let key = value.to_string();
                    *counts.entry(key).or_insert(0) += 1;
                }
            }
            counts
                .into_iter()
                .max_by_key(|(_, count)| *count)
                .map(|(value, _)| {
                    // Try to parse back to original type
                    serde_json::from_str(&value).unwrap_or(serde_json::Value::String(value))
                })
                .unwrap_or(serde_json::Value::Null)
        }
    };

    Ok(result)
}
