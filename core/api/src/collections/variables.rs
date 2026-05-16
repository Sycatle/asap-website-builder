//! HTTP handlers for the website variables endpoints.

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

use super::filters::compute_variable;
use super::helpers::{parse_account_id, verify_website_ownership};
use super::types::{SetVariableRequest, VariableResponse, VariablesListResponse};

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

    let value_type = request.value_type.unwrap_or_else(|| match &request.value {
        serde_json::Value::String(_) => "string".to_string(),
        serde_json::Value::Number(_) => "number".to_string(),
        serde_json::Value::Bool(_) => "boolean".to_string(),
        _ => "json".to_string(),
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
