use axum::{
    extract::{Path, State, Extension, Query},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono;

use crate::auth::Claims;

#[derive(Debug, Serialize)]
pub struct Event {
    pub id: String,
    pub tenant_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub created_at: String,
    pub processed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub event_type: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct GetEventsQuery {
    pub unprocessed_only: Option<bool>,
    pub event_type: Option<String>,
    pub limit: Option<i64>,
}

pub async fn get_events(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GetEventsQuery>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    let limit = params.limit.unwrap_or(100).min(1000);
    let unprocessed_only = params.unprocessed_only.unwrap_or(false);

    // Build query string dynamically
    let mut query_str = String::from(
        "SELECT id, tenant_id, event_type, payload, created_at, processed_at FROM events WHERE tenant_id = $1"
    );
    let mut bind_count = 2;

    if let Some(_) = &params.event_type {
        query_str.push_str(&format!(" AND event_type = ${}", bind_count));
        bind_count += 1;
    }

    if unprocessed_only {
        query_str.push_str(" AND processed_at IS NULL");
    }

    if unprocessed_only {
        query_str.push_str(" ORDER BY created_at ASC");
    } else {
        query_str.push_str(" ORDER BY created_at DESC");
    }

    query_str.push_str(&format!(" LIMIT ${}", bind_count));

    // Execute query with dynamic bindings
    let mut query = sqlx::query(&query_str).bind(tenant_id).bind(limit);

    if let Some(event_type) = &params.event_type {
        // Need to rebind in correct order
        query = sqlx::query(&query_str)
            .bind(tenant_id)
            .bind(event_type)
            .bind(limit);
    }

    let rows = match query.fetch_all(&pool).await {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Database error fetching events: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response();
        }
    };

    let events: Vec<Event> = rows
        .into_iter()
        .map(|row| {
            use sqlx::Row;
            Event {
                id: row.get::<Uuid, _>("id").to_string(),
                tenant_id: row.get::<Uuid, _>("tenant_id").to_string(),
                event_type: row.get("event_type"),
                payload: row.get("payload"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_string(),
                processed_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("processed_at").map(|t| t.to_string()),
            }
        })
        .collect();

    (StatusCode::OK, Json(events)).into_response()
}

pub async fn create_event(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateEventRequest>,
) -> impl IntoResponse {
    let tenant_id = match Uuid::parse_str(&claims.tenant_id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    let event_id = Uuid::new_v4();
    let result = sqlx::query!(
        r#"
        INSERT INTO events (id, tenant_id, event_type, payload)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
        "#,
        event_id,
        tenant_id,
        payload.event_type,
        payload.payload
    )
    .fetch_one(&pool)
    .await;

    match result {
        Ok(event) => {
            tracing::info!("Event created: {} ({})", payload.event_type, event_id);
            (StatusCode::CREATED, Json(serde_json::json!({
                "id": event.id.to_string(),
                "event_type": payload.event_type,
                "created_at": event.created_at.to_string()
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error creating event: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn mark_processed(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let event_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid event ID format"
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
        UPDATE events
        SET processed_at = now()
        WHERE id = $1 AND tenant_id = $2 AND processed_at IS NULL
        "#,
        event_id,
        tenant_id
    )
    .execute(&pool)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            tracing::info!("Event marked as processed: {}", event_id);
            (StatusCode::OK, Json(serde_json::json!({
                "message": "Event marked as processed"
            }))).into_response()
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Event not found or already processed"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Database error marking event as processed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}
