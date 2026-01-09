//! Conversation history management
//!
//! Functions to create, save, and load AI conversation history.

use axum::http::StatusCode;
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_ai::AIAction;

use super::types::ConversationMessage;

// ============================================================================
// Conversation Management
// ============================================================================

/// Get or create a conversation for the given website
pub async fn get_or_create_conversation(
    pool: &PgPool,
    account_id: Uuid,
    website_id: Uuid,
    conversation_id: Option<Uuid>,
    first_message: &str,
) -> Result<Uuid, StatusCode> {
    // If conversation_id provided, verify it exists and belongs to the user
    if let Some(conv_id) = conversation_id {
        let exists: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM ai_conversations WHERE id = $1 AND account_id = $2 AND website_id = $3)"
        )
        .bind(conv_id)
        .bind(account_id)
        .bind(website_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check conversation: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        if exists.0 {
            return Ok(conv_id);
        }
        // If not found, create a new one (don't error, just start fresh)
    }

    // Create a new conversation with auto-generated title from first message
    let title = generate_conversation_title(first_message);
    let new_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO ai_conversations (id, account_id, website_id, title) VALUES ($1, $2, $3, $4)"
    )
    .bind(new_id)
    .bind(account_id)
    .bind(website_id)
    .bind(&title)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create conversation: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(new_id)
}

/// Generate a short title from the first message
fn generate_conversation_title(message: &str) -> String {
    // Take first 50 chars, cut at word boundary
    let truncated: String = message.chars().take(60).collect();
    if let Some(pos) = truncated.rfind(' ') {
        if pos > 20 {
            return format!("{}...", &truncated[..pos]);
        }
    }
    if truncated.len() < message.len() {
        format!("{}...", truncated)
    } else {
        truncated
    }
}

/// Save a message to the conversation
pub async fn save_message(
    pool: &PgPool,
    conversation_id: Uuid,
    role: &str,
    content: &str,
    actions: Option<&[AIAction]>,
    tokens: Option<i32>,
) -> Result<Uuid, StatusCode> {
    let actions_json = actions
        .map(|a| serde_json::to_value(a).unwrap_or_default())
        .unwrap_or(serde_json::json!([]));

    let message_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO ai_messages (id, conversation_id, role, content, actions, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(message_id)
    .bind(conversation_id)
    .bind(role)
    .bind(content)
    .bind(&actions_json)
    .bind(tokens)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to save message: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(message_id)
}

/// Load conversation history for AI context
pub async fn load_conversation_history(
    pool: &PgPool,
    conversation_id: Uuid,
    max_messages: i64,
) -> Result<Vec<ConversationMessage>, StatusCode> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        r#"
        SELECT role, content 
        FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
        "#
    )
    .bind(conversation_id)
    .bind(max_messages)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load conversation history: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Reverse to get chronological order
    Ok(rows.into_iter().rev().map(|(role, content)| {
        ConversationMessage { role, content }
    }).collect())
}
