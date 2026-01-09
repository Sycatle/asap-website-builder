//! AI Chat API endpoints with SSE streaming support
//!
//! Provides AI-powered website editing through natural language.
//! Supports both streaming (SSE) and non-streaming responses.

use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    Extension, Json,
};
use futures::stream::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;

use asap_core_ai::{
    AIOrchestrator, AIChatRequest as CoreAIChatRequest, AIAction, 
    WebsiteContext, WebsiteInfo, SectionInfo, TokenUsage,
    UserContext, UserQuota, ExtensionData, GitHubData, GitHubRepo, GitHubLanguage,
    analyze_intent, execute_thinking_step, IntentAnalysis, StepResult,
};
use crate::Claims;

// ============================================================================
// Types
// ============================================================================

/// Request body for AI chat endpoint
#[derive(Debug, Clone, Deserialize)]
pub struct ChatRequest {
    /// Target website ID
    pub website_id: Uuid,
    /// User's message
    pub message: String,
    /// Optional conversation ID to continue
    #[serde(default)]
    pub conversation_id: Option<Uuid>,
    /// Enable streaming response (default: true)
    #[serde(default = "default_stream")]
    pub stream: bool,
}

fn default_stream() -> bool {
    true
}

/// Response for non-streaming chat
#[derive(Debug, Clone, Serialize)]
pub struct ChatResponse {
    /// Response ID
    pub id: Uuid,
    /// Conversation ID for follow-up messages
    pub conversation_id: Uuid,
    /// AI-generated text response
    pub message: String,
    /// Actions to execute on the website
    pub actions: Vec<AIAction>,
    /// Token usage statistics
    pub usage: TokenUsage,
}

/// SSE event data for streaming
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
pub enum SseEventData {
    /// Text token from AI
    Token(String),
    /// AI is thinking/reasoning
    Thinking(ThinkingData),
    /// AI is calling a tool
    #[serde(rename = "toolcall")]
    ToolCall(ToolCallData),
    /// Result from a tool call
    #[serde(rename = "toolresult")]
    ToolResult(ToolResultData),
    /// Iteration status
    Iteration(IterationData),
    /// Action to execute
    Action(AIAction),
    /// Conversation metadata (sent at start)
    #[serde(rename = "conversation")]
    Conversation(ConversationData),
    /// Token usage statistics (sent at end)
    #[serde(rename = "usage")]
    Usage(UsageData),
    /// Stream complete
    Done,
    /// Error occurred
    Error { code: String, message: String },
}

/// Conversation metadata event
#[derive(Debug, Clone, Serialize)]
pub struct ConversationData {
    pub id: Uuid,
}

/// Token usage data event
#[derive(Debug, Clone, Serialize)]
pub struct UsageData {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Thinking event data
#[derive(Debug, Clone, Serialize)]
pub struct ThinkingData {
    pub thought: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step: Option<u32>,
    /// Status: "starting", "completed", or absent
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// Insight from step execution (only when status is "completed")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insight: Option<String>,
}

/// Tool call event data
#[derive(Debug, Clone, Serialize)]
pub struct ToolCallData {
    pub id: String,
    pub tool: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
    pub status: String,
}

/// Tool result event data
#[derive(Debug, Clone, Serialize)]
pub struct ToolResultData {
    pub tool_call_id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Iteration event data
#[derive(Debug, Clone, Serialize)]
pub struct IterationData {
    pub current: u32,
    pub max: u32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// AI usage quota information
#[derive(Debug, Clone, Serialize)]
pub struct QuotaResponse {
    pub plan: String,
    pub daily_limit: u32,
    pub daily_used: u32,
    pub daily_remaining: u32,
    pub resets_at: chrono::DateTime<chrono::Utc>,
}

/// Conversation history message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub role: String,
    pub content: String,
}

/// List conversations response
#[derive(Debug, Clone, Serialize)]
pub struct ConversationsResponse {
    pub conversations: Vec<ConversationSummary>,
}

/// Summary of a conversation
#[derive(Debug, Clone, Serialize)]
pub struct ConversationSummary {
    pub id: Uuid,
    pub title: Option<String>,
    pub website_id: Uuid,
    pub message_count: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Full conversation with messages
#[derive(Debug, Clone, Serialize)]
pub struct ConversationDetail {
    pub id: Uuid,
    pub title: Option<String>,
    pub website_id: Uuid,
    pub messages: Vec<ConversationMessageDetail>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Message detail in a conversation
#[derive(Debug, Clone, Serialize)]
pub struct ConversationMessageDetail {
    pub id: Uuid,
    pub role: String,
    pub content: String,
    pub actions: Vec<AIAction>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Error response format
#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
}

// ============================================================================
// Helpers
// ============================================================================

fn get_account_id(claims: &Claims) -> Result<Uuid, StatusCode> {
    Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
}

/// Format a human-readable description for an AI action
fn format_action_description(action: &AIAction) -> String {
    match action {
        AIAction::UpdateSectionProperty { property, .. } => {
            format!("Updating {}", property.replace('_', " "))
        }
        AIAction::AddSection { section_type, .. } => {
            format!("Adding {} section", section_type)
        }
        AIAction::RemoveSection { .. } => "Removing section".to_string(),
        AIAction::ReorderSections { .. } => "Reordering sections".to_string(),
        AIAction::ChangeVariant { variant, .. } => {
            format!("Changing variant to {}", variant)
        }
        AIAction::UpdateTheme { .. } => "Updating theme".to_string(),
        AIAction::UpdateMetadata { .. } => "Updating metadata".to_string(),
        AIAction::GenerateImage { .. } => "Generating image".to_string(),
    }
}

/// Get the user's plan from the database
async fn get_user_plan(pool: &PgPool, account_id: Uuid) -> Result<String, StatusCode> {
    let row: (String,) = sqlx::query_as(
        "SELECT COALESCE(plan, 'free') FROM accounts WHERE id = $1"
    )
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get user plan: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    Ok(row.0)
}

/// Get daily message limit based on plan
fn get_plan_daily_limit(plan: &str) -> u32 {
    match plan {
        "pro" => 200,
        "business" => 1000,
        "enterprise" => 10000,
        _ => 20, // free
    }
}

/// Verify the user owns the website or is an administrator
async fn verify_website_ownership(
    pool: &PgPool,
    account_id: Uuid,
    website_id: Uuid,
) -> Result<(), StatusCode> {
    // Check if user is owner OR active administrator
    let has_access: (bool,) = sqlx::query_as(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM websites WHERE id = $1 AND account_id = $2
            UNION
            SELECT 1 FROM website_administrators 
            WHERE website_id = $1 AND account_id = $2 AND status = 'active'
        )
        "#
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to verify website access: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if !has_access.0 {
        return Err(StatusCode::NOT_FOUND);
    }
    
    Ok(())
}

// ============================================================================
// Conversation History Management
// ============================================================================

/// Get or create a conversation for the given website
async fn get_or_create_conversation(
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
async fn save_message(
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
async fn load_conversation_history(
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

// Row types for SQL queries
#[derive(sqlx::FromRow)]
struct WebsiteRow {
    id: Uuid,
    title: Option<String>,
    slug: String,
    preset_id: Option<Uuid>,
    data: Option<serde_json::Value>,
}

#[derive(sqlx::FromRow)]
struct ElementRow {
    id: Uuid,
    element_type: String,
    order: i32,
    settings: serde_json::Value,
    data: serde_json::Value,
}

#[derive(sqlx::FromRow)]
struct AccountRow {
    id: Uuid,
    name: Option<String>,
    plan: String,
}

#[derive(sqlx::FromRow)]
struct AccountDataRow {
    data: serde_json::Value,
}

/// Load user context for AI personalization
async fn load_user_context(
    pool: &PgPool,
    account_id: Uuid,
    plan_daily_limit: u32,
    plan_daily_used: u32,
) -> Result<UserContext, StatusCode> {
    // Fetch account info
    let account: AccountRow = sqlx::query_as(
        "SELECT id, name, plan FROM accounts WHERE id = $1"
    )
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load account: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Fetch account_data for preferences and integrations
    let account_data: Option<AccountDataRow> = sqlx::query_as(
        "SELECT data FROM account_data WHERE account_id = $1"
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load account_data: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Extract integrations from account_data
    let mut integrations = vec![];
    let mut language = "en".to_string();
    
    if let Some(ref data_row) = account_data {
        // Check for GitHub integration
        if data_row.data.get("github").is_some() {
            integrations.push("github".to_string());
        }
        // Check for language preference
        if let Some(lang) = data_row.data.get("language").and_then(|v| v.as_str()) {
            language = lang.to_string();
        }
    }
    
    Ok(UserContext {
        name: account.name,
        language,
        plan: account.plan,
        quota: Some(UserQuota {
            daily_limit: plan_daily_limit,
            daily_used: plan_daily_used,
            daily_remaining: plan_daily_limit.saturating_sub(plan_daily_used),
        }),
        integrations,
    })
}

/// Load extension data (GitHub, etc.) for AI context
async fn load_extension_data(
    pool: &PgPool,
    account_id: Uuid,
    _website_id: Uuid,
) -> Result<Option<ExtensionData>, StatusCode> {
    // Fetch account_data for GitHub info
    let account_data: Option<AccountDataRow> = sqlx::query_as(
        "SELECT data FROM account_data WHERE account_id = $1"
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load account_data for extensions: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let Some(data_row) = account_data else {
        return Ok(None);
    };
    
    // Extract GitHub data if present
    let github = if let Some(gh) = data_row.data.get("github") {
        Some(GitHubData {
            username: gh.get("username").and_then(|v| v.as_str()).map(String::from),
            bio: gh.get("bio").and_then(|v| v.as_str()).map(String::from),
            repositories: gh.get("repositories")
                .and_then(|v| v.as_array())
                .map(|repos| {
                    repos.iter().filter_map(|r| {
                        Some(GitHubRepo {
                            name: r.get("name")?.as_str()?.to_string(),
                            description: r.get("description").and_then(|v| v.as_str()).map(String::from),
                            language: r.get("language").and_then(|v| v.as_str()).map(String::from),
                            stars: r.get("stargazers_count").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                            is_fork: r.get("fork").and_then(|v| v.as_bool()).unwrap_or(false),
                        })
                    }).take(10).collect()
                })
                .unwrap_or_default(),
            languages: gh.get("languages")
                .and_then(|v| v.as_array())
                .map(|langs| {
                    langs.iter().filter_map(|l| {
                        Some(GitHubLanguage {
                            name: l.get("name")?.as_str()?.to_string(),
                            percentage: l.get("percentage").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                        })
                    }).take(10).collect()
                })
                .unwrap_or_default(),
            contributions: None, // TODO: Add when we sync contribution data
        })
    } else {
        None
    };
    
    if github.is_some() {
        Ok(Some(ExtensionData { github }))
    } else {
        Ok(None)
    }
}

/// Load website context for AI
async fn load_website_context(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<WebsiteContext, StatusCode> {
    // Fetch website info
    let website_row: WebsiteRow = sqlx::query_as(
        r#"
        SELECT 
            w.id, w.title, w.slug, w.preset_id,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON wd.website_id = w.id
        WHERE w.id = $1
        "#
    )
    .bind(website_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Fetch elements/sections
    let elements: Vec<ElementRow> = sqlx::query_as(
        r#"
        SELECT 
            id, element_type, "order", 
            settings, data
        FROM website_elements
        WHERE website_id = $1
        ORDER BY "order"
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load elements: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Build sections info
    let sections: Vec<SectionInfo> = elements
        .into_iter()
        .map(|e| {
            // Merge settings and data for full properties
            let mut properties = e.settings.clone();
            if let (Some(props), Some(data)) = (properties.as_object_mut(), e.data.as_object()) {
                for (k, v) in data {
                    props.insert(k.clone(), v.clone());
                }
            }
            SectionInfo {
                id: e.id,
                section_type: e.element_type.clone(),
                variant: e.settings.get("variant").and_then(|v| v.as_str()).map(String::from),
                position: e.order,
                properties,
                schema: None, // TODO: Load schema from section registry
            }
        })
        .collect();
    
    // Extract theme from website data
    let theme = website_row.data
        .as_ref()
        .and_then(|d| d.get("theme"))
        .cloned()
        .unwrap_or(serde_json::json!({}));
    
    Ok(WebsiteContext {
        website: WebsiteInfo {
            id: website_id,
            slug: website_row.slug,
            title: website_row.title,
            preset: website_row.preset_id.map(|id| id.to_string()),
        },
        sections,
        theme,
        available_section_types: vec![
            "hero".to_string(),
            "projects".to_string(),
            "skills".to_string(),
            "experience".to_string(),
            "contact".to_string(),
            "about".to_string(),
            "testimonials".to_string(),
            "gallery".to_string(),
            "features".to_string(),
            "pricing".to_string(),
            "faq".to_string(),
            "cta".to_string(),
        ],
        user: None,      // Will be set by caller
        extensions: None, // Will be set by caller
    })
}

/// Convert AI error to HTTP response
fn ai_error_to_response(err: asap_core_ai::AIError) -> (StatusCode, Json<ErrorResponse>) {
    use asap_core_ai::AIError;
    
    let (status, code) = match &err {
        AIError::RateLimitExceeded { .. } => (StatusCode::TOO_MANY_REQUESTS, "rate_limited"),
        AIError::ContextTooLong { .. } => (StatusCode::BAD_REQUEST, "context_too_large"),
        AIError::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
        AIError::ProviderError { .. } => (StatusCode::BAD_GATEWAY, "provider_error"),
        AIError::ProviderUnavailable(_) => (StatusCode::SERVICE_UNAVAILABLE, "provider_unavailable"),
        AIError::AuthenticationError(_) => (StatusCode::UNAUTHORIZED, "auth_error"),
        AIError::PermissionDenied(_) => (StatusCode::FORBIDDEN, "permission_denied"),
        AIError::WebsiteNotFound(_) => (StatusCode::NOT_FOUND, "website_not_found"),
        AIError::SectionNotFound(_) => (StatusCode::NOT_FOUND, "section_not_found"),
        AIError::InvalidAction(_) => (StatusCode::BAD_REQUEST, "invalid_action"),
        AIError::ContentFiltered(_) => (StatusCode::BAD_REQUEST, "content_filtered"),
        AIError::ConfigError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "config_error"),
        AIError::SerializationError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "serialization_error"),
        AIError::HttpError(_) => (StatusCode::BAD_GATEWAY, "http_error"),
        AIError::RedisError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "redis_error"),
        AIError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
    };
    
    (
        status,
        Json(ErrorResponse {
            error: err.to_string(),
            code: code.to_string(),
        }),
    )
}

// ============================================================================
// Handlers
// ============================================================================

/// Non-streaming chat endpoint
/// POST /api/v1/ai/chat
pub async fn chat(
    State(pool): State<PgPool>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    tracing::info!("AI Chat request: account_id={}, website_id={}", account_id, req.website_id);
    
    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            tracing::warn!("Website ownership verification failed: account_id={}, website_id={}", account_id, req.website_id);
            (s, Json(ErrorResponse {
                error: "Website not found".to_string(),
                code: "not_found".to_string(),
            }))
        })?;
    
    // Get user plan
    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to get plan".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Load website context
    let context = load_website_context(&pool, req.website_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load website".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Get or create conversation
    let conversation_id = get_or_create_conversation(
        &pool, 
        account_id, 
        req.website_id, 
        req.conversation_id,
        &req.message
    ).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to manage conversation".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Load conversation history
    let history = load_conversation_history(&pool, conversation_id, 20).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load conversation history".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Convert history to AI Message format
    let history_messages: Vec<asap_core_ai::Message> = history.iter().map(|m| {
        match m.role.as_str() {
            "user" => asap_core_ai::Message::user(&m.content),
            "assistant" => asap_core_ai::Message::assistant(&m.content),
            _ => asap_core_ai::Message::user(&m.content),
        }
    }).collect();
    
    // Save user message
    let _ = save_message(&pool, conversation_id, "user", &req.message, None, None).await;
    
    // Build AI request with history
    let ai_request = CoreAIChatRequest {
        website_id: req.website_id,
        message: req.message,
        conversation_id: Some(conversation_id),
        history: history_messages,
        attachments: vec![],
        stream: false,
    };
    
    // Call AI
    let (response, _rate_status) = orchestrator
        .chat(&ai_request, context, account_id, &plan)
        .await
        .map_err(|e| ai_error_to_response(e))?;
    
    // Save assistant response
    let _ = save_message(
        &pool, 
        conversation_id, 
        "assistant", 
        &response.message, 
        if response.actions.is_empty() { None } else { Some(&response.actions) },
        Some(response.usage.total_tokens as i32)
    ).await;
    
    Ok(Json(ChatResponse {
        id: response.id,
        conversation_id,
        message: response.message,
        actions: response.actions,
        usage: response.usage,
    }))
}

/// Streaming chat endpoint (SSE)
/// POST /api/v1/ai/chat/stream
pub async fn chat_stream(
    State(pool): State<PgPool>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    tracing::info!("AI Chat Stream request: account_id={}, website_id={}", account_id, req.website_id);
    
    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            tracing::warn!("Website ownership verification failed: account_id={}, website_id={}", account_id, req.website_id);
            (s, Json(ErrorResponse {
                error: "Website not found".to_string(),
                code: "not_found".to_string(),
            }))
        })?;
    
    // Get user plan
    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to get plan".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Get plan daily limit for quota info
    let plan_daily_limit = get_plan_daily_limit(&plan);
    // TODO: Get actual daily_used from rate limiter - for now use 0
    let plan_daily_used = 0u32;
    
    // Load user context for AI personalization
    let user_context = load_user_context(&pool, account_id, plan_daily_limit, plan_daily_used).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load user context".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Load extension data (GitHub, etc.)
    let extension_data = load_extension_data(&pool, account_id, req.website_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load extension data".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Load website context
    let mut context = load_website_context(&pool, req.website_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load website".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Inject user and extension data into context
    context.user = Some(user_context);
    context.extensions = extension_data;
    
    // Clone user message before moving req
    let user_message = req.message.clone();
    
    // Perform intent analysis first (fast AI call to determine thinking steps)
    let intent_analysis = analyze_intent(orchestrator.router(), &user_message)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Intent analysis failed, using fallback: {}", e);
            IntentAnalysis {
                intent: "other".to_string(),
                summary: user_message.chars().take(50).collect(),
                needs_thinking: false,
                thinking_steps: vec![],
                language: "en".to_string(),
            }
        });
    
    tracing::debug!("Intent analysis: {:?}", intent_analysis);
    
    // Get or create conversation
    let conversation_id = get_or_create_conversation(
        &pool, 
        account_id, 
        req.website_id, 
        req.conversation_id,
        &user_message
    ).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to manage conversation".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Load conversation history (last 20 messages for context)
    let history = load_conversation_history(&pool, conversation_id, 20).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load conversation history".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Convert history to AI Message format
    let history_messages: Vec<asap_core_ai::Message> = history.iter().map(|m| {
        match m.role.as_str() {
            "user" => asap_core_ai::Message::user(&m.content),
            "assistant" => asap_core_ai::Message::assistant(&m.content),
            _ => asap_core_ai::Message::user(&m.content),
        }
    }).collect();
    
    // Save user message to conversation
    let pool_for_save = pool.clone();
    let _ = save_message(&pool_for_save, conversation_id, "user", &user_message, None, None).await;
    
    // Build AI request with history
    let ai_request = CoreAIChatRequest {
        website_id: req.website_id,
        message: req.message.clone(),
        conversation_id: Some(conversation_id),
        history: history_messages,
        attachments: vec![],
        stream: true,
    };
    
    // Clone for use inside the stream (needs 'static lifetime)
    let orchestrator_for_thinking = orchestrator.clone();
    let context_for_thinking = context.clone();
    let user_message_for_thinking = user_message.clone();
    let intent_for_thinking = intent_analysis.clone();
    
    // Start streaming
    let _action_parser = orchestrator.action_parser().clone();
    let stream_result = orchestrator
        .chat_stream(&ai_request, context, account_id, &plan)
        .await;
    
    // Clone pool for use in stream
    let pool_for_stream = pool.clone();
    
    // Clone intent analysis for use in stream
    let intent_for_stream = intent_analysis.clone();
    
    match stream_result {
        Ok((mut token_stream, _rate_status)) => {
            // Create SSE stream from token stream with action parsing
            let stream = async_stream::stream! {
                // Send conversation ID first so frontend can track it
                let conv_event = SseEventData::Conversation(ConversationData { id: conversation_id });
                if let Ok(json) = serde_json::to_string(&conv_event) {
                    yield Ok(Event::default().data(json));
                }
                
                // Execute thinking steps with real AI calls (sequential)
                let mut step_results: Vec<StepResult> = Vec::new();
                
                if intent_for_thinking.needs_thinking && !intent_for_thinking.thinking_steps.is_empty() {
                    let total_steps = intent_for_thinking.thinking_steps.len() as u32;
                    
                    for thinking_step in &intent_for_thinking.thinking_steps {
                        // Send "starting" event for this step
                        let thinking_start = SseEventData::Thinking(ThinkingData {
                            thought: thinking_step.description.clone(),
                            step: Some(thinking_step.step),
                            status: Some("starting".to_string()),
                            insight: None,
                        });
                        if let Ok(json) = serde_json::to_string(&thinking_start) {
                            yield Ok(Event::default().data(json));
                        }
                        
                        // Execute real AI call for this step
                        let step_result = execute_thinking_step(
                            orchestrator_for_thinking.router(),
                            thinking_step,
                            total_steps,
                            &user_message_for_thinking,
                            &context_for_thinking,
                            &intent_for_thinking.language,
                            &step_results,
                        ).await;
                        
                        match step_result {
                            Ok(result) => {
                                // Send "completed" event with insight
                                let thinking_done = SseEventData::Thinking(ThinkingData {
                                    thought: thinking_step.description.clone(),
                                    step: Some(thinking_step.step),
                                    status: Some("completed".to_string()),
                                    insight: Some(result.insight.clone()),
                                });
                                if let Ok(json) = serde_json::to_string(&thinking_done) {
                                    yield Ok(Event::default().data(json));
                                }
                                step_results.push(result);
                            }
                            Err(e) => {
                                tracing::warn!("Step {} execution failed: {}", thinking_step.step, e);
                                // Send completed with fallback insight
                                let thinking_done = SseEventData::Thinking(ThinkingData {
                                    thought: thinking_step.description.clone(),
                                    step: Some(thinking_step.step),
                                    status: Some("completed".to_string()),
                                    insight: Some(thinking_step.description.clone()),
                                });
                                if let Ok(json) = serde_json::to_string(&thinking_done) {
                                    yield Ok(Event::default().data(json));
                                }
                            }
                        }
                    }
                } else if !intent_for_stream.summary.is_empty() {
                    // For simple requests, just show the summary briefly
                    let thinking = SseEventData::Thinking(ThinkingData {
                        thought: intent_for_stream.summary.clone(),
                        step: None,
                        status: None,
                        insight: None,
                    });
                    if let Ok(json) = serde_json::to_string(&thinking) {
                        yield Ok(Event::default().data(json));
                    }
                }
                
                // Buffer for action detection
                let mut full_content = String::new();
                let mut detected_action_count = 0u32;
                let mut in_json_block = false;
                let mut json_buffer = String::new();
                let mut sent_tool_calls: std::collections::HashSet<String> = std::collections::HashSet::new();
                let mut parsed_actions: Vec<AIAction> = Vec::new();
                
                while let Some(result) = token_stream.next().await {
                    match result {
                        Ok(text) => {
                            // Accumulate content for action detection
                            full_content.push_str(&text);
                            
                            // Detect JSON code blocks for action parsing
                            if text.contains("```json") {
                                in_json_block = true;
                                json_buffer.clear();
                            } else if in_json_block && text.contains("```") {
                                in_json_block = false;
                                // Try to parse JSON as action
                                if let Ok(action) = serde_json::from_str::<AIAction>(&json_buffer) {
                                    let action_id = format!("action_{}", detected_action_count);
                                    detected_action_count += 1;
                                    
                                    // Collect action for saving
                                    parsed_actions.push(action.clone());
                                    
                                    // Send tool call event (running)
                                    if !sent_tool_calls.contains(&action_id) {
                                        sent_tool_calls.insert(action_id.clone());
                                        let tool_call = SseEventData::ToolCall(ToolCallData {
                                            id: action_id.clone(),
                                            tool: action.action_type().to_string(),
                                            description: format_action_description(&action),
                                            args: None,
                                            status: "running".to_string(),
                                        });
                                        if let Ok(json) = serde_json::to_string(&tool_call) {
                                            yield Ok(Event::default().data(json));
                                        }
                                    }
                                    
                                    // Send action event
                                    let action_event = SseEventData::Action(action);
                                    if let Ok(json) = serde_json::to_string(&action_event) {
                                        yield Ok(Event::default().data(json));
                                    }
                                    
                                    // Send tool result (completed)
                                    let tool_result = SseEventData::ToolResult(ToolResultData {
                                        tool_call_id: action_id,
                                        success: true,
                                        message: Some("Action queued for execution".to_string()),
                                    });
                                    if let Ok(json) = serde_json::to_string(&tool_result) {
                                        yield Ok(Event::default().data(json));
                                    }
                                }
                                json_buffer.clear();
                            } else if in_json_block {
                                json_buffer.push_str(&text);
                            }
                            
                            // Send token event
                            let token_event = SseEventData::Token(text);
                            if let Ok(json) = serde_json::to_string(&token_event) {
                                yield Ok(Event::default().data(json));
                            }
                        }
                        Err(err) => {
                            // Error during streaming
                            let error_event = SseEventData::Error {
                                code: err.code().to_string(),
                                message: err.to_string(),
                            };
                            if let Ok(json) = serde_json::to_string(&error_event) {
                                yield Ok(Event::default().data(json));
                            }
                        }
                    }
                }
                
                // Estimate token usage (rough approximation: ~4 chars per token)
                // This is a simplification - actual tokenization varies by model
                let completion_tokens = (full_content.len() / 4) as u32;
                let prompt_tokens = (user_message.len() / 4) as u32 + 500; // +500 for system prompt estimate
                let total_tokens = prompt_tokens + completion_tokens;
                
                // Save assistant response to conversation history
                if !full_content.is_empty() {
                    let actions_to_save: Option<&[AIAction]> = if parsed_actions.is_empty() { 
                        None 
                    } else { 
                        Some(&parsed_actions) 
                    };
                    let _ = save_message(
                        &pool_for_stream, 
                        conversation_id, 
                        "assistant", 
                        &full_content, 
                        actions_to_save,
                        Some(total_tokens as i32)
                    ).await;
                }
                
                // Send usage event before done
                let usage_event = SseEventData::Usage(UsageData {
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                });
                if let Ok(json) = serde_json::to_string(&usage_event) {
                    yield Ok(Event::default().data(json));
                }
                
                // Send done event at the end
                let done = SseEventData::Done;
                if let Ok(json) = serde_json::to_string(&done) {
                    yield Ok(Event::default().data(json));
                }
            };
            
            Ok(Sse::new(stream).keep_alive(
                KeepAlive::default()
                    .interval(Duration::from_secs(15))
                    .text("keep-alive")
            ))
        }
        Err(e) => {
            Err(ai_error_to_response(e))
        }
    }
}

/// Get AI quota information
/// GET /api/v1/ai/quota
pub async fn get_quota(
    State(pool): State<PgPool>,
    Extension(_orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<QuotaResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    // Get user plan
    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to get plan".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    // Get quota limits based on plan
    let daily_limit = get_plan_daily_limit(&plan);
    
    // TODO: Get actual usage from rate limiter
    // For now, return placeholder values
    let daily_used = 0u32;
    
    // Calculate reset time (next midnight UTC)
    let now = chrono::Utc::now();
    let tomorrow = now.date_naive().succ_opt().unwrap();
    let resets_at = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
        tomorrow.and_hms_opt(0, 0, 0).unwrap(),
        chrono::Utc,
    );
    
    Ok(Json(QuotaResponse {
        plan: plan.clone(),
        daily_limit,
        daily_used,
        daily_remaining: daily_limit.saturating_sub(daily_used),
        resets_at,
    }))
}

/// Check AI service status
/// GET /api/v1/ai/status
pub async fn status(
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
) -> Json<serde_json::Value> {
    let available = orchestrator.is_configured();
    let providers = orchestrator.available_providers();
    
    Json(serde_json::json!({
        "available": available,
        "providers": providers,
    }))
}

// ============================================================================
// Conversation History Endpoints
// ============================================================================

/// List conversations for a website
/// GET /api/v1/ai/conversations?website_id=...
pub async fn list_conversations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ConversationsResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    let website_id = params.get("website_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (StatusCode::BAD_REQUEST, Json(ErrorResponse {
                error: "website_id is required".to_string(),
                code: "bad_request".to_string(),
            }))
        })?;
    
    // Verify ownership
    verify_website_ownership(&pool, account_id, website_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Website not found".to_string(),
            code: "not_found".to_string(),
        }))
    })?;
    
    // Fetch conversations with message counts
    let rows: Vec<(Uuid, Option<String>, Uuid, i64, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
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
        "#
    )
    .bind(account_id)
    .bind(website_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversations: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Failed to fetch conversations".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    let conversations = rows.into_iter().map(|(id, title, website_id, message_count, created_at, updated_at)| {
        ConversationSummary {
            id,
            title,
            website_id,
            message_count,
            created_at,
            updated_at,
        }
    }).collect();
    
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
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    // Fetch conversation
    let conv: Option<(Uuid, Option<String>, Uuid, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, title, website_id, created_at, updated_at FROM ai_conversations WHERE id = $1 AND account_id = $2"
    )
    .bind(conversation_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversation: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Failed to fetch conversation".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    let (id, title, website_id, created_at, updated_at) = conv.ok_or_else(|| {
        (StatusCode::NOT_FOUND, Json(ErrorResponse {
            error: "Conversation not found".to_string(),
            code: "not_found".to_string(),
        }))
    })?;
    
    // Fetch messages
    let message_rows: Vec<(Uuid, String, String, serde_json::Value, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"
        SELECT id, role, content, COALESCE(actions, '[]'::jsonb), created_at 
        FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY created_at
        "#
    )
    .bind(conversation_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch messages: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Failed to fetch messages".to_string(),
            code: "internal_error".to_string(),
        }))
    })?;
    
    let messages = message_rows.into_iter().map(|(id, role, content, actions_json, created_at)| {
        let actions: Vec<AIAction> = serde_json::from_value(actions_json).unwrap_or_default();
        ConversationMessageDetail {
            id,
            role,
            content,
            actions,
            created_at,
        }
    }).collect();
    
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
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    let result = sqlx::query("DELETE FROM ai_conversations WHERE id = $1 AND account_id = $2")
        .bind(conversation_id)
        .bind(account_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete conversation: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
                error: "Failed to delete conversation".to_string(),
                code: "internal_error".to_string(),
            }))
        })?;
    
    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse {
            error: "Conversation not found".to_string(),
            code: "not_found".to_string(),
        })));
    }
    
    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Action Execution
// ============================================================================

/// Request to execute AI actions
#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteActionRequest {
    /// Target website ID
    pub website_id: Uuid,
    /// Action to execute
    pub action: AIAction,
}

/// Response from action execution
#[derive(Debug, Clone, Serialize)]
pub struct ExecuteActionResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub affected_element_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Execute an AI action
/// POST /api/v1/ai/execute
pub async fn execute_action(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExecuteActionRequest>,
) -> Result<Json<ExecuteActionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;
    
    // Verify website access
    let has_access = crate::queries::verify_website_access(&pool, req.website_id, account_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to verify website access: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
                error: "Failed to verify access".to_string(),
                code: "internal_error".to_string(),
            }))
        })?;
    
    if !has_access {
        return Err((StatusCode::FORBIDDEN, Json(ErrorResponse {
            error: "Access denied to this website".to_string(),
            code: "forbidden".to_string(),
        })));
    }
    
    tracing::info!(
        website_id = %req.website_id,
        account_id = %account_id,
        action_type = ?req.action.action_type(),
        "Executing AI action"
    );
    
    // Execute the action
    let result = execute_ai_action(&pool, req.website_id, account_id, &req.action).await;
    
    match result {
        Ok((message, affected_id)) => {
            Ok(Json(ExecuteActionResponse {
                success: true,
                message,
                affected_element_id: affected_id,
                error: None,
            }))
        }
        Err(e) => {
            tracing::error!("Action execution failed: {}", e);
            Ok(Json(ExecuteActionResponse {
                success: false,
                message: "Action failed".to_string(),
                affected_element_id: None,
                error: Some(e.to_string()),
            }))
        }
    }
}

/// Execute a single AI action against the database
async fn execute_ai_action(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    action: &AIAction,
) -> Result<(String, Option<Uuid>), Box<dyn std::error::Error + Send + Sync>> {
    match action {
        AIAction::UpdateSectionProperty { section_id, property, value } => {
            // Update settings or data based on property type
            // Properties like "headline", "subheadline", etc. go in settings
            // Dynamic content goes in data
            
            // First, get current element
            let elements = crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let element = elements.iter().find(|e| e.id == *section_id)
                .ok_or("Section not found")?;
            
            // Update settings with the new property value
            let mut settings = element.settings.clone();
            if let serde_json::Value::Object(ref mut map) = settings {
                map.insert(property.clone(), value.clone());
            }
            
            crate::queries::update_website_element(
                pool, *section_id, website_id, account_id,
                None, None, Some(&settings), None, None
            ).await?;
            
            Ok((format!("Updated '{}' on section", property), Some(*section_id)))
        }
        
        AIAction::AddSection { section_type, position, variant, properties } => {
            // Get max order
            let elements = crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let order = position.unwrap_or_else(|| elements.len() as i32);
            
            // Build settings from properties and variant
            let mut settings = properties.clone().unwrap_or_else(|| serde_json::json!({}));
            if let Some(v) = variant {
                if let serde_json::Value::Object(ref mut map) = settings {
                    map.insert("variant".to_string(), serde_json::json!(v));
                }
            }
            
            let slug = format!("{}-{}", section_type, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("new"));
            
            let element_id = crate::queries::create_website_element(
                pool, website_id, account_id,
                None, // extension_id
                section_type,
                &slug,
                section_type, // title = section_type for now
                order,
                "default", // layout
                &settings,
                &serde_json::json!({}), // data
            ).await?;
            
            Ok((format!("Added {} section", section_type), Some(element_id)))
        }
        
        AIAction::RemoveSection { section_id } => {
            crate::queries::delete_website_element(pool, *section_id, website_id, account_id).await?;
            Ok(("Section removed".to_string(), Some(*section_id)))
        }
        
        AIAction::ReorderSections { order } => {
            crate::queries::reorder_website_elements(pool, website_id, account_id, order).await?;
            Ok((format!("Reordered {} sections", order.len()), None))
        }
        
        AIAction::ChangeVariant { section_id, variant } => {
            // Get current element
            let elements = crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let element = elements.iter().find(|e| e.id == *section_id)
                .ok_or("Section not found")?;
            
            // Update settings with new variant
            let mut settings = element.settings.clone();
            if let serde_json::Value::Object(ref mut map) = settings {
                map.insert("variant".to_string(), serde_json::json!(variant));
            }
            
            crate::queries::update_website_element(
                pool, *section_id, website_id, account_id,
                None, None, Some(&settings), None, None
            ).await?;
            
            Ok((format!("Changed variant to '{}'", variant), Some(*section_id)))
        }
        
        AIAction::UpdateTheme { changes } => {
            // Theme is stored in website_data
            // Update the theme object in the data JSONB column
            sqlx::query(
                r#"
                UPDATE websites 
                SET data = jsonb_set(
                    COALESCE(data, '{}'::jsonb),
                    '{theme}',
                    COALESCE(data->'theme', '{}'::jsonb) || $1::jsonb,
                    true
                ),
                updated_at = now()
                WHERE id = $2 AND account_id = $3
                "#
            )
            .bind(changes)
            .bind(website_id)
            .bind(account_id)
            .execute(pool)
            .await?;
            
            Ok(("Theme updated".to_string(), None))
        }
        
        AIAction::UpdateMetadata { changes } => {
            // Update website metadata (title, description, etc.)
            if let serde_json::Value::Object(map) = changes {
                if let Some(title) = map.get("title").and_then(|v| v.as_str()) {
                    sqlx::query("UPDATE websites SET title = $1, updated_at = now() WHERE id = $2 AND account_id = $3")
                        .bind(title)
                        .bind(website_id)
                        .bind(account_id)
                        .execute(pool)
                        .await?;
                }
                // Add more metadata fields as needed
            }
            
            Ok(("Metadata updated".to_string(), None))
        }
        
        AIAction::GenerateImage { prompt, target_section_id, target_property } => {
            // Image generation is handled separately through the AI orchestrator
            // For now, just acknowledge the request
            tracing::info!(
                prompt = prompt,
                target_section_id = ?target_section_id,
                target_property = ?target_property,
                "Image generation requested - not yet implemented"
            );
            
            Ok(("Image generation queued (coming soon)".to_string(), *target_section_id))
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sse_event_serialization() {
        let text_event = SseEventData::Token("Hello".to_string());
        let json = serde_json::to_string(&text_event).unwrap();
        assert!(json.contains(r#""type":"token""#));
        assert!(json.contains("Hello"));
        
        let done_event = SseEventData::Done;
        let json = serde_json::to_string(&done_event).unwrap();
        assert!(json.contains(r#""type":"done""#));
    }
    
    #[test]
    fn test_error_response_serialization() {
        let err = ErrorResponse {
            error: "Rate limited".to_string(),
            code: "rate_limited".to_string(),
        };
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("rate_limited"));
    }
    
    #[test]
    fn test_plan_daily_limit() {
        assert_eq!(get_plan_daily_limit("free"), 20);
        assert_eq!(get_plan_daily_limit("pro"), 200);
        assert_eq!(get_plan_daily_limit("business"), 1000);
        assert_eq!(get_plan_daily_limit("enterprise"), 10000);
    }
}
