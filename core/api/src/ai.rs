//! AI Chat API endpoints with SSE streaming support
//!
//! Provides AI-powered website editing through natural language.
//! Supports both streaming (SSE) and non-streaming responses.

use axum::{
    extract::{State, multipart::Multipart},
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
use chrono::Utc;

use asap_core_ai::{
    AIOrchestrator, AIChatRequest as CoreAIChatRequest, AIAction, 
    WebsiteContext, WebsiteInfo, SectionInfo, TokenUsage,
    UserContext, UserQuota, WebsiteDataContext, VariableGroup, CollectionSummary,
    ActiveExtension,
    analyze_intent, execute_thinking_step, IntentAnalysis, StepResult,
    get_tool_definitions, ToolExecutor,
    OpenAIProvider,
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
    /// Request frontend to perform an action (e.g., capture screenshot)
    #[serde(rename = "toolrequest")]
    ToolRequest(ToolRequestData),
    /// Iteration status
    Iteration(IterationData),
    /// Current processing phase (for UX feedback)
    Phase(PhaseData),
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

/// Tool request event data - asks frontend to perform an action
#[derive(Debug, Clone, Serialize)]
pub struct ToolRequestData {
    /// Unique request ID for correlation
    pub request_id: String,
    /// Type of request (e.g., "capture_screenshot")
    pub request_type: String,
    /// Request parameters
    pub params: serde_json::Value,
    /// Timeout in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_seconds: Option<u32>,
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

/// Phase event data - indicates current processing phase for UX feedback
#[derive(Debug, Clone, Serialize)]
pub struct PhaseData {
    pub phase: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
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
    // Fetch account info (plan)
    let account: AccountRow = sqlx::query_as(
        "SELECT id, plan FROM accounts WHERE id = $1"
    )
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load account: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Fetch account_data for name, preferences and integrations
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
    
    // Extract user info from account_data
    let mut name: Option<String> = None;
    let mut integrations = vec![];
    let mut language = "en".to_string();
    
    if let Some(ref data_row) = account_data {
        // Get display name
        if let Some(display_name) = data_row.data.get("display_name").and_then(|v| v.as_str()) {
            name = Some(display_name.to_string());
        } else if let Some(given_name) = data_row.data.get("given_name").and_then(|v| v.as_str()) {
            name = Some(given_name.to_string());
        }
        
        // Check for GitHub integration
        if data_row.data.get("github").is_some() {
            integrations.push("github".to_string());
        }
        // Check for Google OAuth (indicates google integration)
        if data_row.data.get("oauth").and_then(|o| o.get("google")).is_some() {
            integrations.push("google".to_string());
        }
        // Check for language preference
        if let Some(lang) = data_row.data.get("language").and_then(|v| v.as_str()) {
            language = lang.to_string();
        }
    }
    
    Ok(UserContext {
        name,
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

/// Load website variables and collections for AI context (generic, not extension-specific)
async fn load_website_data(
    pool: &PgPool,
    _account_id: Uuid,
    website_id: Uuid,
) -> Result<Option<WebsiteDataContext>, StatusCode> {
    // Load ALL variables grouped by source
    // Use source_ref (extension slug) when source is 'extension', otherwise use source itself
    let all_vars: Vec<(String, String, serde_json::Value)> = sqlx::query_as(
        r#"
        SELECT COALESCE(source_ref, source) as effective_source, key, value 
        FROM website_variables 
        WHERE website_id = $1
        ORDER BY effective_source, key
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website variables: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Load ALL collections with their items
    let all_collections: Vec<(String, String, i32, serde_json::Value)> = sqlx::query_as(
        r#"
        SELECT collection_slug, source_extension, total_count, items
        FROM website_collections
        WHERE website_id = $1
        ORDER BY source_extension, collection_slug
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website collections: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // If no data, return None
    if all_vars.is_empty() && all_collections.is_empty() {
        return Ok(None);
    }
    
    // Group variables by source
    let mut variables_by_source: std::collections::HashMap<String, Vec<(String, serde_json::Value)>> = 
        std::collections::HashMap::new();
    
    for (source, key, value) in all_vars {
        variables_by_source
            .entry(source)
            .or_default()
            .push((key, value));
    }
    
    // Build VariableGroups
    let variables: Vec<VariableGroup> = variables_by_source
        .into_iter()
        .map(|(source, vars)| VariableGroup {
            source: source.clone(),
            variables: vars.into_iter().collect(),
        })
        .collect();
    
    // Build CollectionSummaries with item previews
    let collections: Vec<CollectionSummary> = all_collections
        .into_iter()
        .map(|(slug, source, total_count, items)| {
            let items_array = items.as_array().cloned().unwrap_or_default();
            // Use total_count from DB if available, otherwise count items array
            let count = if total_count > 0 { total_count } else { items_array.len() as i32 };
            
            // Extract preview fields from first few items (up to 5)
            let preview: Vec<serde_json::Value> = items_array
                .iter()
                .take(5)
                .filter_map(|item| {
                    let data = item.get("data")?;
                    let mut preview_obj = serde_json::Map::new();
                    
                    // Extract common identifying fields for preview
                    for key in &["name", "title", "id", "slug", "description", "language", "stars", "url"] {
                        if let Some(val) = data.get(*key) {
                            // Truncate long strings for preview
                            let truncated = if let Some(s) = val.as_str() {
                                if s.len() > 100 {
                                    serde_json::Value::String(format!("{}...", &s[..100]))
                                } else {
                                    val.clone()
                                }
                            } else {
                                val.clone()
                            };
                            preview_obj.insert((*key).to_string(), truncated);
                        }
                    }
                    
                    if preview_obj.is_empty() { None } else { Some(serde_json::Value::Object(preview_obj)) }
                })
                .collect();
            
            CollectionSummary {
                slug,
                source,
                count,
                preview,
            }
        })
        .collect();
    
    let data_context = WebsiteDataContext {
        variables,
        collections,
    };
    
    // Log summary for debugging
    let var_count: usize = data_context.variables.iter().map(|g| g.variables.len()).sum();
    let col_count = data_context.collections.len();
    tracing::debug!(
        "Website data loaded: {} variables in {} groups, {} collections",
        var_count,
        data_context.variables.len(),
        col_count
    );
    
    Ok(Some(data_context))
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
    
    // Load active extensions for this website
    let extensions: Vec<ActiveExtension> = sqlx::query_as::<_, (String, bool, serde_json::Value)>(
        r#"
        SELECT 
            ae.extension_slug,
            we.enabled,
            COALESCE(we.settings, '{}'::jsonb) as settings
        FROM website_extensions_v2 we
        JOIN account_extensions ae ON ae.id = we.account_extension_id
        WHERE we.website_id = $1
        ORDER BY ae.extension_slug
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(|(slug, enabled, settings)| {
                // Format extension name from slug (e.g., "github-sync" -> "GitHub Sync")
                let name = slug.split('-')
                    .map(|word| {
                        let mut chars: Vec<char> = word.chars().collect();
                        if let Some(first) = chars.first_mut() {
                            *first = first.to_ascii_uppercase();
                        }
                        chars.into_iter().collect::<String>()
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                ActiveExtension {
                    slug,
                    name,
                    enabled,
                    settings,
                }
            })
            .collect()
    })
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to load extensions: {}", e);
        Vec::new()
    });
    
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
        user: None, // Will be set by caller
        data: None, // Will be set by caller
        extensions,
    })
}

// ============================================================================
// Data Tools Integration
// ============================================================================

/// Result of executing data tools
#[derive(Debug, Clone)]
pub struct DataToolExecution {
    /// Tool calls that were made
    pub tool_calls: Vec<ExecutedToolCall>,
    /// Combined tool results as context for the final response
    pub context_additions: String,
    /// Visual analysis request if the AI wants to analyze a screenshot
    pub visual_analysis_request: Option<asap_core_ai::VisualAnalysisRequest>,
}

/// A single executed tool call with its result
#[derive(Debug, Clone, Serialize)]
pub struct ExecutedToolCall {
    pub id: String,
    pub tool_name: String,
    pub success: bool,
    pub description: String,
}

/// Maximum iterations for tool calling loop to prevent infinite loops
const MAX_TOOL_ITERATIONS: usize = 5;

/// Execute data tools in a loop to gather comprehensive context before generating the final response.
/// Uses chain-of-thought: the AI can request multiple tools across multiple iterations
/// until it has gathered all the information it needs.
async fn execute_data_tools(
    orchestrator: &AIOrchestrator,
    context: &WebsiteContext,
    user_message: &str,
    history: &[asap_core_ai::Message],
) -> Option<DataToolExecution> {
    // Create OpenAI provider for tools calls
    let openai_config = orchestrator.config().openai.clone();
    if openai_config.api_key.is_empty() {
        tracing::debug!("OpenAI not configured, skipping data tools");
        return None;
    }
    
    let openai = OpenAIProvider::new(openai_config);
    let tool_definitions = get_tool_definitions();
    let tool_executor = ToolExecutor::new();
    
    // Build initial messages for the tool call
    let system_prompt = r#"You are an AI assistant for a website builder with access to tools to search the user's website data.

IMPORTANT INSTRUCTIONS:
1. Use tools to find ALL relevant information before answering
2. You can call MULTIPLE tools in a single response if you need different types of data
3. After receiving tool results, you can call MORE tools if you need additional information
4. Think step by step: what data do I need? -> call tools -> analyze results -> need more data? -> call more tools or respond
5. NEVER call the same tool twice with the same parameters - you already have the result
6. For request_visual_analysis: ONLY CALL ONCE per request. Once you receive "VISUAL_ANALYSIS_COMPLETE", DO NOT request another visual analysis - use the result you received.

Available data sources:
- Collections: user's content from GitHub repos, manual entries, etc. (projects, posts, etc.)
- Variables: configuration values from various sources
- Sections: website page sections and their content
- Theme: design settings (colors, fonts, etc.)
- Settings: website configuration
- Extensions: installed extensions and their status
- Visual Analysis: screenshot-based UI/UX analysis (CALL ONLY ONCE)

Examples of when to use multiple tools:
- "Tell me about my projects" → search_collections for projects + get_website_sections to see how they're displayed
- "What's my site's style?" → get_website_theme + get_website_settings
- "How is my GitHub data used?" → list_extensions + search_collections with source filter
- "Analyze my site visually" → request_visual_analysis (ONCE only, then use the result)

Only skip tools if the question is purely conversational or doesn't need any data."#;
    
    let mut messages = vec![asap_core_ai::Message::system(system_prompt)];
    
    // Add conversation history
    for msg in history {
        messages.push(msg.clone());
    }
    
    // Add current user message
    messages.push(asap_core_ai::Message::user(user_message));
    
    let mut all_executed_calls = Vec::new();
    let mut all_context_parts = Vec::new();
    let mut iteration = 0;
    let mut visual_analysis_done = false; // Track if visual analysis was already performed
    
    // Tool calling loop - continue until AI stops requesting tools or max iterations
    loop {
        iteration += 1;
        if iteration > MAX_TOOL_ITERATIONS {
            tracing::warn!("Data tools reached max iterations ({}), stopping", MAX_TOOL_ITERATIONS);
            break;
        }
        
        tracing::debug!("Data tools iteration {}", iteration);
        
        // Call OpenAI with tools
        let result = openai.chat_with_tools(
            messages.clone(),
            Some(&tool_definitions),
            None, // Use default model
            Some(1024), // Token limit for tool decision
            Some(0.3), // Lower temperature for deterministic tool selection
        ).await;
        
        let response = match result {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("Data tools call failed at iteration {}: {}", iteration, e);
                break;
            }
        };
        
        // If no tool calls, AI has finished gathering data
        if response.tool_calls.is_empty() {
            tracing::debug!("AI finished gathering data after {} iterations", iteration);
            break;
        }
        
        tracing::info!(
            "Iteration {}: AI requested {} data tools: {:?}", 
            iteration, 
            response.tool_calls.len(),
            response.tool_calls.iter().map(|t| &t.function.name).collect::<Vec<_>>()
        );
        
        // Add assistant message with tool calls to conversation
        // This maintains the conversation flow for the next iteration
        let assistant_content = response.content.clone().unwrap_or_default();
        messages.push(asap_core_ai::Message::assistant(&assistant_content));
        
        // Execute each tool and collect results
        let mut tool_results_for_continuation = Vec::new();
        let mut visual_request: Option<asap_core_ai::VisualAnalysisRequest> = None;
        
        for tool_call in &response.tool_calls {
            let tool_name = &tool_call.function.name;
            let description = get_tool_description(tool_name);
            
            tracing::debug!(
                "Executing data tool: {} with args: {}", 
                tool_name, 
                tool_call.function.arguments
            );
            
            // Special handling for visual analysis - capture screenshot and analyze server-side
            if tool_name == "request_visual_analysis" {
                // Skip if visual analysis was already done in this request
                if visual_analysis_done {
                    tracing::info!("Skipping duplicate visual analysis request");
                    tool_results_for_continuation.push((
                        tool_call.id.clone(),
                        "ALREADY_COMPLETED: Visual analysis was already performed. Use the previous result.".to_string()
                    ));
                    continue;
                }
                
                // Parse the tool arguments
                let params: asap_core_ai::VisualAnalysisParams = 
                    serde_json::from_str(&tool_call.function.arguments)
                        .unwrap_or_else(|_| asap_core_ai::VisualAnalysisParams {
                            viewport: "desktop".to_string(),
                            focus: "overall".to_string(),
                            section: None,
                            question: None,
                        });
                
                // Get website slug for screenshot service
                let website_slug = context.website.slug.clone();
                
                // Capture screenshot via the screenshot service
                let screenshot_url = std::env::var("SCREENSHOT_SERVICE_URL")
                    .unwrap_or_else(|_| "http://screenshot:3001".to_string());
                
                tracing::info!("Capturing screenshot for visual analysis: {}", website_slug);
                
                let capture_result = capture_screenshot_server_side(
                    &screenshot_url,
                    &website_slug,
                    &params.viewport,
                ).await;
                
                match capture_result {
                    Ok(screenshot_data) => {
                        tracing::info!(
                            "Screenshot captured successfully: {}x{}", 
                            screenshot_data.width, 
                            screenshot_data.height
                        );
                        
                        // Build the image data URL for GPT-4 Vision
                        let image_url = format!("data:image/png;base64,{}", screenshot_data.image_base64);
                        
                        // Build analysis prompt based on focus
                        let focus_instruction = match params.focus.as_str() {
                            "layout" => "Focus your analysis on the layout structure, visual hierarchy, and how elements are arranged on the page.",
                            "colors" => "Focus your analysis on the color scheme, color harmony, contrast, and whether the colors effectively communicate the intended mood/brand.",
                            "typography" => "Focus your analysis on typography choices, font sizes, line heights, readability, and typographic hierarchy.",
                            "spacing" => "Focus your analysis on whitespace usage, margins, padding, and overall breathing room between elements.",
                            "specific_section" => {
                                if let Some(ref section) = params.section {
                                    &format!("Focus your analysis specifically on the '{}' section.", section)
                                } else {
                                    "Analyze the specific section mentioned by the user."
                                }
                            }
                            _ => "Provide a comprehensive UI/UX analysis covering layout, colors, typography, and overall design quality.",
                        };
                        
                        let vision_prompt = format!(
                            r#"You are an expert UI/UX designer performing a DETAILED visual analysis of this SPECIFIC website screenshot.

CRITICAL INSTRUCTIONS:
- You MUST describe what you ACTUALLY SEE in the image - real colors, real text, real elements
- DO NOT give generic advice - every point must reference something visible in the screenshot
- Mention specific elements by name (e.g., "the blue header", "the hero section with 'Welcome' text")
- If you see placeholder content or lorem ipsum, point it out
- If you see specific issues (misalignment, color contrast problems, spacing issues), describe them precisely

The user asked: "{}"
Viewport: {} view
Image dimensions: {}x{} pixels

{}

YOUR ANALYSIS MUST:
1. Reference SPECIFIC visual elements you see (buttons, headers, images, text)
2. Mention ACTUAL colors you observe (not generic "nice colors")
3. Point out REAL issues visible in the screenshot
4. Give recommendations that directly relate to what's shown

DO NOT:
- Give generic UI/UX advice that could apply to any website
- Say things like "ensure readability" without pointing to specific text that is/isn't readable
- Make assumptions about things not visible in the screenshot

Respond in the same language as the user's question.

Structure your response:
1. **Ce que je vois** - Describe the actual content/layout visible
2. **Points forts** - Specific elements that work well (with examples from the screenshot)
3. **Points faibles** - Specific issues visible (with precise locations)
4. **Recommandations concrètes** - Actionable fixes for the issues you identified"#,
                            user_message,
                            params.viewport,
                            screenshot_data.width,
                            screenshot_data.height,
                            focus_instruction
                        );
                        
                        // Call GPT-4 Vision for the actual analysis
                        tracing::info!("Calling GPT-4 Vision for visual analysis");
                        let vision_result = openai.chat_with_vision(
                            &vision_prompt,
                            vec![image_url],
                            None, // No additional system prompt
                            Some("gpt-4o"),
                            Some(2000),
                        ).await;
                        
                        match vision_result {
                            Ok(vision_response) => {
                                let analysis = if vision_response.content.is_empty() {
                                    "Unable to analyze image.".to_string()
                                } else {
                                    vision_response.content
                                };
                                
                                tracing::info!("Visual analysis completed successfully");
                                
                                let visual_result = format!(
                                    "[Visual Analysis - {} view]\n\
                                    Screenshot dimensions: {}x{} pixels\n\
                                    Focus: {}\n\n\
                                    Analysis:\n{}",
                                    params.viewport,
                                    screenshot_data.width,
                                    screenshot_data.height,
                                    params.focus,
                                    analysis,
                                );
                                
                                all_context_parts.push(visual_result.clone());
                                
                                // Add result for next iteration so AI knows analysis is done
                                tool_results_for_continuation.push((
                                    tool_call.id.clone(), 
                                    format!("VISUAL_ANALYSIS_COMPLETE: {}", visual_result)
                                ));
                                
                                // Mark visual analysis as done to prevent duplicates
                                visual_analysis_done = true;
                                
                                all_executed_calls.push(ExecutedToolCall {
                                    id: tool_call.id.clone(),
                                    tool_name: tool_name.clone(),
                                    success: true,
                                    description: description.to_string(),
                                });
                            }
                            Err(vision_error) => {
                                tracing::error!("Vision analysis failed: {:?}", vision_error);
                                all_context_parts.push(format!(
                                    "[Visual Analysis - Error]\n\
                                    Screenshot captured ({}x{}) but vision analysis failed: {}.\n\
                                    Please try again.",
                                    screenshot_data.width,
                                    screenshot_data.height,
                                    vision_error
                                ));
                                
                                all_executed_calls.push(ExecutedToolCall {
                                    id: tool_call.id.clone(),
                                    tool_name: tool_name.clone(),
                                    success: false,
                                    description: format!("{} (vision failed)", description),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Screenshot capture failed: {}", e);
                        all_context_parts.push(format!(
                            "[Visual Analysis - Error]\n\
                            Unable to capture screenshot: {}.\n\
                            Make sure the website is published and accessible.\n\
                            Proceeding with structural analysis only.",
                            e
                        ));
                        
                        all_executed_calls.push(ExecutedToolCall {
                            id: tool_call.id.clone(),
                            tool_name: tool_name.clone(),
                            success: false,
                            description: format!("{} (capture failed)", description),
                        });
                    }
                }
                
                // Continue processing other tools instead of returning early
                continue;
            }
            
            // Execute the tool (standard flow)
            let tool_result = tool_executor.execute(tool_call, context);
            
            all_executed_calls.push(ExecutedToolCall {
                id: tool_call.id.clone(),
                tool_name: tool_name.clone(),
                success: tool_result.success,
                description: description.to_string(),
            });
            
            // Store result for context
            if tool_result.success {
                all_context_parts.push(format!(
                    "[Data from {}]:\n{}\n",
                    tool_name,
                    truncate_tool_result(&tool_result.content, 2000)
                ));
            }
            
            // Store result for next iteration
            tool_results_for_continuation.push((tool_call.id.clone(), tool_result.content.clone()));
        }
        
        // Add tool results as user messages for the next iteration
        // (OpenAI expects tool results with role "tool", but we simulate with user messages)
        for (tool_call_id, result_content) in tool_results_for_continuation {
            messages.push(asap_core_ai::Message::user(
                format!("[Tool result for {}]: {}", tool_call_id, result_content)
            ));
        }
    }
    
    // If no tools were called, return None
    if all_executed_calls.is_empty() {
        tracing::debug!("AI decided no data tools needed");
        return None;
    }
    
    // Build combined context from all tool results
    let context_additions = if all_context_parts.is_empty() {
        String::new()
    } else {
        format!(
            "\n--- Retrieved Data (from {} tool calls) ---\n{}\n--- End Retrieved Data ---\n", 
            all_executed_calls.len(),
            all_context_parts.join("\n")
        )
    };
    
    tracing::info!(
        "Data tools completed: {} tools executed across {} iterations",
        all_executed_calls.len(),
        iteration
    );
    
    Some(DataToolExecution {
        tool_calls: all_executed_calls,
        context_additions,
        visual_analysis_request: None,
    })
}

/// Get a human-readable description for a tool
fn get_tool_description(tool_name: &str) -> &'static str {
    match tool_name {
        "search_collections" => "Recherche dans les collections",
        "search_variables" => "Recherche dans les variables",
        "get_website_sections" => "Analyse des sections du site",
        "get_website_theme" => "Consultation du thème",
        "get_website_settings" => "Consultation des paramètres",
        "list_extensions" => "Liste des extensions",
        "get_page_content" => "Lecture du contenu de page",
        "request_visual_analysis" => "Analyse visuelle du site",
        _ => "Outil de données",
    }
}

/// Truncate tool result to avoid context overflow
fn truncate_tool_result(content: &str, max_len: usize) -> &str {
    if content.len() <= max_len {
        content
    } else {
        &content[..max_len]
    }
}

/// Screenshot capture result
#[derive(Debug)]
struct ScreenshotData {
    #[allow(dead_code)]
    image_base64: String,
    width: u32,
    height: u32,
}

/// Capture a screenshot via the screenshot service
async fn capture_screenshot_server_side(
    screenshot_url: &str,
    website_slug: &str,
    viewport: &str,
) -> Result<ScreenshotData, String> {
    let client = reqwest::Client::new();
    
    #[derive(Serialize)]
    struct CaptureRequest<'a> {
        #[serde(rename = "websiteSlug")]
        website_slug: &'a str,
        viewport: &'a str,
        #[serde(rename = "waitFor")]
        wait_for: u32,
    }
    
    #[derive(Deserialize)]
    struct CaptureResponse {
        image: String,
        width: u32,
        height: u32,
    }
    
    let response = client
        .post(format!("{}/capture", screenshot_url))
        .json(&CaptureRequest {
            website_slug,
            viewport,
            wait_for: 1500,
        })
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to screenshot service: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Screenshot service error: {}", error_text));
    }
    
    let capture: CaptureResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse screenshot response: {}", e))?;
    
    Ok(ScreenshotData {
        image_base64: capture.image,
        width: capture.width,
        height: capture.height,
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
    
    // Load website variables and collections (all extensions' data)
    let website_data = load_website_data(&pool, account_id, req.website_id).await.map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Failed to load website data".to_string(),
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
    
    // Inject user and website data into context
    context.user = Some(user_context);
    context.data = website_data.clone();
    
    // Log website data summary for debugging
    if let Some(ref data) = website_data {
        let var_count: usize = data.variables.iter().map(|g| g.variables.len()).sum();
        let sources: Vec<&str> = data.variables.iter().map(|g| g.source.as_str()).collect();
        let col_slugs: Vec<&str> = data.collections.iter().map(|c| c.slug.as_str()).collect();
        tracing::info!(
            "Website data loaded: {} variables from {:?}, {} collections: {:?}",
            var_count,
            sources,
            data.collections.len(),
            col_slugs
        );
    } else {
        tracing::debug!("No website data loaded for website {}", req.website_id);
    }
    
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
    
    // Clone necessary data for the stream (data tools will be executed INSIDE the stream for real-time feedback)
    let orchestrator_for_tools = orchestrator.clone();
    let context_for_tools = context.clone();
    let user_message_for_tools = user_message.clone();
    let history_for_tools = history_messages.clone();
    
    // Clone for use inside the stream (needs 'static lifetime)
    let orchestrator_for_thinking = orchestrator.clone();
    let context_for_thinking = context.clone();
    let user_message_for_thinking = user_message.clone();
    let intent_for_thinking = intent_analysis.clone();
    
    // Clone pool for use in stream
    let pool_for_stream = pool.clone();
    
    // Clone intent analysis for use in stream
    let intent_for_stream = intent_analysis.clone();
    
    // Create SSE stream - data tools are executed INSIDE the stream for immediate feedback
    let stream = async_stream::stream! {
        // Send conversation ID first so frontend can track it
        let conv_event = SseEventData::Conversation(ConversationData { id: conversation_id });
        if let Ok(json) = serde_json::to_string(&conv_event) {
            yield Ok(Event::default().data(json));
        }
        
        // Send phase: analyzing
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "analyzing".to_string(),
            status: "starting".to_string(),
            message: Some("Analyse de votre demande...".to_string()),
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }
        
        // Execute data tools with real-time feedback
        let data_tool_execution = execute_data_tools_streaming(
            &orchestrator_for_tools,
            &context_for_tools,
            &user_message_for_tools,
            &history_for_tools,
        ).await;
        
        // Send tool events as they were collected
        if let Some(ref execution) = data_tool_execution {
            // Deduplicate consecutive tool calls with same description to avoid UI spam
            let mut last_description: Option<String> = None;
            
            for tool_call in &execution.tool_calls {
                // Skip duplicate consecutive descriptions
                if last_description.as_ref() == Some(&tool_call.description) {
                    continue;
                }
                last_description = Some(tool_call.description.clone());
                
                // Send tool call event
                let tool_call_event = SseEventData::ToolCall(ToolCallData {
                    id: tool_call.id.clone(),
                    tool: tool_call.tool_name.clone(),
                    description: tool_call.description.clone(),
                    args: None,
                    status: "completed".to_string(),
                });
                if let Ok(json) = serde_json::to_string(&tool_call_event) {
                    yield Ok(Event::default().data(json));
                }
            }
            
            // If visual analysis was requested, send tool request and end stream
            if let Some(ref visual_req) = execution.visual_analysis_request {
                let tool_request_event = SseEventData::ToolRequest(ToolRequestData {
                    request_id: visual_req.tool_call_id.clone(),
                    request_type: "capture_screenshot".to_string(),
                    params: serde_json::json!({
                        "viewport": visual_req.viewport,
                        "focus": visual_req.focus,
                        "section": visual_req.section,
                        "question": visual_req.question,
                    }),
                    timeout_seconds: Some(30),
                });
                if let Ok(json) = serde_json::to_string(&tool_request_event) {
                    yield Ok(Event::default().data(json));
                }
                
                let done_event = SseEventData::Done;
                if let Ok(json) = serde_json::to_string(&done_event) {
                    yield Ok(Event::default().data(json));
                }
                // Early exit - visual analysis requires client-side screenshot capture
                // The stream ends here; the client will send a new request with the screenshot
            }
        }
        
        // Check if we should continue with AI generation (skip if visual analysis was requested)
        let should_continue = data_tool_execution.as_ref()
            .map(|exec| exec.visual_analysis_request.is_none())
            .unwrap_or(true);
        
        if !should_continue {
            // Stream already ended with Done event above
        } else {
        
        // Send phase: generating
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "generating".to_string(),
            status: "starting".to_string(),
            message: Some("Génération de la réponse...".to_string()),
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }
        
        // Build AI request with data tool context
        let ai_request = CoreAIChatRequest {
            website_id: req.website_id,
            message: if let Some(ref execution) = data_tool_execution {
                format!("{}\n\n{}", user_message_for_tools, execution.context_additions)
            } else {
                user_message_for_tools.clone()
            },
            conversation_id: Some(conversation_id),
            history: history_for_tools.clone(),
            attachments: vec![],
            stream: true,
        };
        
        // Start actual AI streaming
        let stream_result = orchestrator_for_tools
            .chat_stream(&ai_request, context_for_tools.clone(), account_id, &plan)
            .await;
        
        match stream_result {
            Ok((mut token_stream, _rate_status)) => {
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
            }
            Err(e) => {
                // Send error in stream
                let error_event = SseEventData::Error {
                    code: "stream_error".to_string(),
                    message: e.to_string(),
                };
                if let Ok(json) = serde_json::to_string(&error_event) {
                    yield Ok(Event::default().data(json));
                }
            }
        }
        } // End of if should_continue else block
    };
    
    Ok(Sse::new(stream).keep_alive(
        KeepAlive::default()
            .interval(Duration::from_secs(15))
            .text("keep-alive")
    ))
}

/// Alias for execute_data_tools - streaming is handled at the SSE level
async fn execute_data_tools_streaming(
    orchestrator: &AIOrchestrator,
    context: &WebsiteContext,
    user_message: &str,
    history: &[asap_core_ai::Message],
) -> Option<DataToolExecution> {
    execute_data_tools(orchestrator, context, user_message, history).await
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
// Vision / Screenshot Upload
// ============================================================================

/// Request for uploading a preview screenshot for AI vision analysis
#[derive(Debug, Serialize)]
pub struct VisionUploadResponse {
    /// Unique ID for this screenshot
    pub image_id: String,
    /// URL to access the uploaded image (signed, temporary)
    pub url: String,
    /// When the URL expires
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

/// Upload a preview screenshot for AI visual analysis
/// POST /api/v1/ai/vision/upload
/// 
/// Accepts multipart form data with:
/// - image: The screenshot file (PNG/JPEG)
/// - website_id: The website this screenshot is for
/// - viewport: The viewport used (desktop/tablet/mobile)
pub async fn upload_vision_screenshot(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Result<Json<VisionUploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;

    // Parse multipart fields
    let mut image_data: Option<bytes::Bytes> = None;
    let mut website_id: Option<Uuid> = None;
    let mut viewport: String = "desktop".to_string();
    let mut content_type: String = "image/png".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: format!("Multipart error: {}", e),
            code: "multipart_error".to_string(),
        })))?
    {
        let field_name = field.name().map(|s| s.to_string());

        match field_name.as_deref() {
            Some("image") => {
                content_type = field.content_type()
                    .unwrap_or("image/png")
                    .to_string();
                image_data = Some(field.bytes().await.map_err(|e| {
                    (StatusCode::BAD_REQUEST, Json(ErrorResponse {
                        error: format!("Failed to read image: {}", e),
                        code: "read_error".to_string(),
                    }))
                })?);
            }
            Some("website_id") => {
                let value = field.text().await.unwrap_or_default();
                website_id = Uuid::parse_str(&value).ok();
            }
            Some("viewport") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    viewport = value;
                }
            }
            _ => {}
        }
    }

    // Validate required fields
    let image_bytes = image_data.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: "No image provided".to_string(),
            code: "missing_image".to_string(),
        }))
    })?;

    let website_id = website_id.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: "website_id is required".to_string(),
            code: "missing_website_id".to_string(),
        }))
    })?;

    // Verify website access
    verify_website_ownership(&pool, account_id, website_id)
        .await
        .map_err(|s| {
            (s, Json(ErrorResponse {
                error: "Website not found or access denied".to_string(),
                code: "not_found".to_string(),
            }))
        })?;

    // Validate image
    if !content_type.starts_with("image/") {
        return Err((StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: "File must be an image".to_string(),
            code: "invalid_content_type".to_string(),
        })));
    }

    // Limit image size (10MB max for screenshots)
    if image_bytes.len() > 10 * 1024 * 1024 {
        return Err((StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: "Image too large (max 10MB)".to_string(),
            code: "image_too_large".to_string(),
        })));
    }

    // Generate unique image ID
    let image_id = Uuid::new_v4();
    let extension = match content_type.as_str() {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/webp" => "webp",
        _ => "png",
    };
    let filename = format!("{}_{}.{}", viewport, image_id, extension);

    // Store in database (ai_screenshots table)
    // For now, we store as base64 in JSONB - later we'll migrate to R2
    let expires_at = Utc::now() + chrono::Duration::hours(1);
    
    sqlx::query(
        r#"
        INSERT INTO ai_screenshots (id, account_id, website_id, viewport, filename, content_type, data, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
        "#
    )
    .bind(image_id)
    .bind(account_id)
    .bind(website_id)
    .bind(&viewport)
    .bind(&filename)
    .bind(&content_type)
    .bind(image_bytes.as_ref()) // Store as bytea
    .bind(expires_at)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store screenshot: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Failed to store screenshot".to_string(),
            code: "storage_error".to_string(),
        }))
    })?;

    // Generate URL (internal endpoint to retrieve the image)
    let url = format!("/api/v1/ai/vision/{}", image_id);

    tracing::info!(
        image_id = %image_id,
        website_id = %website_id,
        viewport = %viewport,
        size_bytes = image_bytes.len(),
        "Vision screenshot uploaded"
    );

    Ok(Json(VisionUploadResponse {
        image_id: image_id.to_string(),
        url,
        expires_at,
    }))
}

/// Retrieve a vision screenshot by ID
/// GET /api/v1/ai/vision/:id
pub async fn get_vision_screenshot(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(image_id): axum::extract::Path<Uuid>,
) -> Result<axum::response::Response, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;

    // Fetch screenshot (must belong to user and not expired)
    let row: Option<(Vec<u8>, String)> = sqlx::query_as(
        r#"
        SELECT data, content_type
        FROM ai_screenshots
        WHERE id = $1 AND account_id = $2 AND expires_at > NOW()
        "#
    )
    .bind(image_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch screenshot: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Database error".to_string(),
            code: "db_error".to_string(),
        }))
    })?;

    let (data, content_type) = row.ok_or_else(|| {
        (StatusCode::NOT_FOUND, Json(ErrorResponse {
            error: "Screenshot not found or expired".to_string(),
            code: "not_found".to_string(),
        }))
    })?;

    // Return image with proper content type
    use axum::response::IntoResponse;
    use axum::http::header;
    
    Ok((
        [(header::CONTENT_TYPE, content_type)],
        data
    ).into_response())
}

/// Request for visual analysis with screenshot
#[derive(Debug, Deserialize)]
pub struct VisualAnalyzeRequest {
    /// Website ID
    pub website_id: Uuid,
    /// Screenshot image ID (from upload endpoint)
    pub image_id: String,
    /// Original user message (the question about design)
    pub original_message: String,
    /// Viewport used for screenshot
    pub viewport: String,
    /// Focus area for analysis
    pub focus: String,
    /// Optional section name
    #[serde(default)]
    pub section: Option<String>,
    /// Optional specific question
    #[serde(default)]
    pub question: Option<String>,
    /// Conversation ID for context
    #[serde(default)]
    pub conversation_id: Option<Uuid>,
}

/// Response from visual analysis
#[derive(Debug, Serialize)]
pub struct VisualAnalyzeResponse {
    /// Analysis from GPT-4 Vision
    pub analysis: String,
    /// Conversation ID
    pub conversation_id: Uuid,
}

/// Analyze a website screenshot using GPT-4 Vision
/// POST /api/v1/ai/vision/analyze
pub async fn analyze_vision(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Json(req): Json<VisualAnalyzeRequest>,
) -> Result<Json<VisualAnalyzeResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse {
            error: "Unauthorized".to_string(),
            code: "unauthorized".to_string(),
        }))
    })?;

    // Verify website ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            (s, Json(ErrorResponse {
                error: "Website not found or access denied".to_string(),
                code: "not_found".to_string(),
            }))
        })?;

    // Verify image exists and belongs to user
    let image_id = Uuid::parse_str(&req.image_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: "Invalid image_id".to_string(),
            code: "invalid_image_id".to_string(),
        }))
    })?;

    let image_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM ai_screenshots WHERE id = $1 AND account_id = $2 AND expires_at > NOW())"
    )
    .bind(image_id)
    .bind(account_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check image: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Database error".to_string(),
            code: "db_error".to_string(),
        }))
    })?;

    if !image_exists {
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse {
            error: "Screenshot not found or expired".to_string(),
            code: "image_not_found".to_string(),
        })));
    }

    // Build image URL (internal endpoint)
    // Note: For OpenAI Vision, we need a publicly accessible URL or base64 data
    // Since our screenshots are stored in DB, we'll fetch and convert to base64 data URL
    let (image_data, content_type): (Vec<u8>, String) = sqlx::query_as(
        "SELECT data, content_type FROM ai_screenshots WHERE id = $1"
    )
    .bind(image_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch image data: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse {
            error: "Failed to retrieve image".to_string(),
            code: "fetch_error".to_string(),
        }))
    })?;

    // Convert to base64 data URL for OpenAI Vision API
    use base64::{Engine as _, engine::general_purpose};
    let base64_image = general_purpose::STANDARD.encode(&image_data);
    let image_url = format!("data:{};base64,{}", content_type, base64_image);

    // Build analysis prompt based on focus
    let focus_instruction = match req.focus.as_str() {
        "layout" => "Focus your analysis on the layout structure, visual hierarchy, and how elements are arranged on the page.",
        "colors" => "Focus your analysis on the color scheme, color harmony, contrast, and whether the colors effectively communicate the intended mood/brand.",
        "typography" => "Focus your analysis on typography choices, font sizes, line heights, readability, and typographic hierarchy.",
        "spacing" => "Focus your analysis on whitespace usage, margins, padding, and overall breathing room between elements.",
        "specific_section" => {
            if let Some(ref section) = req.section {
                &format!("Focus your analysis specifically on the '{}' section.", section)
            } else {
                "Analyze the specific section mentioned by the user."
            }
        }
        _ => "Provide a comprehensive UI/UX analysis covering layout, colors, typography, and overall design quality.",
    };

    let specific_question = req.question.as_deref().unwrap_or("");
    
    let vision_prompt = format!(
        r#"You are an expert UI/UX designer analyzing a website screenshot.

The user asked: "{}"
{}
Viewport: {} view

{}

Provide actionable, specific feedback. Reference what you actually see in the screenshot.
Be constructive and suggest improvements with specific recommendations.
Keep your response focused and organized.
Respond in the same language as the user's question."#,
        req.original_message,
        if !specific_question.is_empty() { format!("Specific question: {}", specific_question) } else { String::new() },
        req.viewport,
        focus_instruction
    );

    // Get or create conversation
    let conversation_id = req.conversation_id.unwrap_or_else(Uuid::new_v4);
    
    // Ensure conversation exists
    let _ = sqlx::query(
        r#"
        INSERT INTO ai_conversations (id, account_id, website_id, title, context_summary, last_intent)
        VALUES ($1, $2, $3, $4, '', '{}')
        ON CONFLICT (id) DO NOTHING
        "#
    )
    .bind(conversation_id)
    .bind(account_id)
    .bind(req.website_id)
    .bind(&req.original_message[..req.original_message.len().min(100)])
    .execute(&pool)
    .await;

    // Call GPT-4 Vision
    let openai_config = orchestrator.config().openai.clone();
    if openai_config.api_key.is_empty() {
        return Err((StatusCode::SERVICE_UNAVAILABLE, Json(ErrorResponse {
            error: "OpenAI not configured".to_string(),
            code: "provider_unavailable".to_string(),
        })));
    }

    let openai = asap_core_ai::OpenAIProvider::new(openai_config);
    
    let vision_result = openai.chat_with_vision(
        &vision_prompt,
        vec![image_url],
        None, // No additional system prompt
        Some("gpt-4o"), // Use GPT-4 Vision
        Some(2000), // Max tokens for detailed analysis
    ).await;

    let analysis = match vision_result {
        Ok(response) => {
            // ChatCompletion has direct content field
            if response.content.is_empty() {
                "Unable to analyze image.".to_string()
            } else {
                response.content
            }
        }
        Err(e) => {
            tracing::error!("Vision analysis failed: {:?}", e);
            return Err((StatusCode::BAD_GATEWAY, Json(ErrorResponse {
                error: "Vision analysis failed".to_string(),
                code: "vision_error".to_string(),
            })));
        }
    };

    // Save the analysis as an AI message in the conversation
    let _ = save_message(
        &pool,
        conversation_id,
        "assistant",
        &analysis,
        None,
        None,
    ).await;

    tracing::info!(
        image_id = %image_id,
        conversation_id = %conversation_id,
        focus = %req.focus,
        viewport = %req.viewport,
        "Visual analysis completed"
    );

    Ok(Json(VisualAnalyzeResponse {
        analysis,
        conversation_id,
    }))
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
