//! Conversation listing and retrieval endpoints.

use axum::{extract::State, http::StatusCode, Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_ai::AIAction;

use crate::Claims;

use super::helpers::{get_account_id, verify_website_ownership};
use super::types::{
    ConversationDetail, ConversationMessageDetail, ConversationSummary, ConversationsResponse,
    ErrorResponse,
};

// ============================================================================
// Conversation Endpoints
// ============================================================================

/// List conversations for a website
/// GET /api/v1/ai/conversations?website_id=...
pub async fn list_conversations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ConversationsResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (
            s,
            Json(ErrorResponse {
                error: "Unauthorized".to_string(),
                code: "unauthorized".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let website_id = params
        .get("website_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "website_id is required".to_string(),
                    code: "bad_request".to_string(),
                    ..Default::default()
                }),
            )
        })?;

    verify_website_ownership(&pool, account_id, website_id)
        .await
        .map_err(|s| {
            (
                s,
                Json(ErrorResponse {
                    error: "Website not found".to_string(),
                    code: "not_found".to_string(),
                    ..Default::default()
                }),
            )
        })?;

    let rows: Vec<(
        Uuid,
        Option<String>,
        Uuid,
        i64,
        chrono::DateTime<chrono::Utc>,
        chrono::DateTime<chrono::Utc>,
    )> = sqlx::query_as(
        r#"
        SELECT 
            c.id, c.title, c.website_id,
            COUNT(m.id) as message_count,
            c.created_at, c.updated_at
        FROM ai_conversations c
        LEFT JOIN ai_messages m ON m.conversation_id = c.id
        WHERE c.account_id = $1 AND c.website_id = $2
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT 50
        "#,
    )
    .bind(account_id)
    .bind(website_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversations: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to fetch conversations".to_string(),
                code: "internal_error".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let conversations = rows
        .into_iter()
        .map(
            |(id, title, website_id, message_count, created_at, updated_at)| ConversationSummary {
                id,
                title,
                website_id,
                message_count,
                created_at,
                updated_at,
            },
        )
        .collect();

    Ok(Json(ConversationsResponse { conversations }))
}

/// Get conversation details with messages
/// GET /api/v1/ai/conversations/:id
pub async fn get_conversation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(conversation_id): axum::extract::Path<Uuid>,
) -> Result<Json<ConversationDetail>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (
            s,
            Json(ErrorResponse {
                error: "Unauthorized".to_string(),
                code: "unauthorized".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let conv: Option<(Uuid, Option<String>, Uuid, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, title, website_id, created_at, updated_at FROM ai_conversations WHERE id = $1 AND account_id = $2"
    )
    .bind(conversation_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversation: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to fetch conversation".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let (id, title, website_id, created_at, updated_at) = conv.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Conversation not found".to_string(),
                code: "not_found".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let message_rows: Vec<(
        Uuid,
        String,
        String,
        serde_json::Value,
        chrono::DateTime<chrono::Utc>,
    )> = sqlx::query_as(
        r#"
        SELECT id, role, content, COALESCE(actions, '[]'::jsonb), created_at 
        FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY created_at
        "#,
    )
    .bind(conversation_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch messages: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to fetch messages".to_string(),
                code: "internal_error".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let messages = message_rows
        .into_iter()
        .map(|(id, role, content, actions_json, created_at)| {
            let actions: Vec<AIAction> = serde_json::from_value(actions_json).unwrap_or_default();
            ConversationMessageDetail {
                id,
                role,
                content,
                actions,
                created_at,
            }
        })
        .collect();

    Ok(Json(ConversationDetail {
        id,
        title,
        website_id,
        messages,
        created_at,
        updated_at,
    }))
}

/// Delete a conversation
/// DELETE /api/v1/ai/conversations/:id
pub async fn delete_conversation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(conversation_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (
            s,
            Json(ErrorResponse {
                error: "Unauthorized".to_string(),
                code: "unauthorized".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let result = sqlx::query("DELETE FROM ai_conversations WHERE id = $1 AND account_id = $2")
        .bind(conversation_id)
        .bind(account_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete conversation: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "Failed to delete conversation".to_string(),
                    code: "internal_error".to_string(),
                    ..Default::default()
                }),
            )
        })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Conversation not found".to_string(),
                code: "not_found".to_string(),
                ..Default::default()
            }),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
