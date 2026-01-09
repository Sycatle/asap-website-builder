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
    /// Action to execute
    Action(AIAction),
    /// Stream complete
    Done,
    /// Error occurred
    Error { code: String, message: String },
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

/// Verify the user owns the website
async fn verify_website_ownership(
    pool: &PgPool,
    account_id: Uuid,
    website_id: Uuid,
) -> Result<(), StatusCode> {
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM websites WHERE id = $1 AND account_id = $2)"
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to verify website ownership: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if !exists.0 {
        return Err(StatusCode::NOT_FOUND);
    }
    
    Ok(())
}

// Row types for SQL queries
#[derive(sqlx::FromRow)]
struct WebsiteRow {
    id: Uuid,
    name: Option<String>,
    slug: String,
    preset: Option<String>,
    data: Option<serde_json::Value>,
}

#[derive(sqlx::FromRow)]
struct ElementRow {
    id: Uuid,
    element_type: String,
    position: i32,
    config: Option<serde_json::Value>,
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
            w.id, w.name, w.slug, w.preset,
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
            id, element_type, position, 
            COALESCE(config, '{}'::jsonb) as config
        FROM website_elements
        WHERE website_id = $1
        ORDER BY position
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
            let config = e.config.clone().unwrap_or_default();
            SectionInfo {
                id: e.id,
                section_type: e.element_type.clone(),
                variant: config.get("variant").and_then(|v| v.as_str()).map(String::from),
                position: e.position,
                properties: config,
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
            title: website_row.name,
            preset: website_row.preset,
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
    
    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
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
    
    // Build AI request
    let ai_request = CoreAIChatRequest {
        website_id: req.website_id,
        message: req.message,
        conversation_id: req.conversation_id,
        attachments: vec![],
        stream: false,
    };
    
    // Call AI
    let (response, _rate_status) = orchestrator
        .chat(&ai_request, context, account_id, &plan)
        .await
        .map_err(|e| ai_error_to_response(e))?;
    
    Ok(Json(ChatResponse {
        id: response.id,
        conversation_id: response.conversation_id,
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
    
    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
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
    
    // Build AI request
    let ai_request = CoreAIChatRequest {
        website_id: req.website_id,
        message: req.message,
        conversation_id: req.conversation_id,
        attachments: vec![],
        stream: true,
    };
    
    // Start streaming
    let stream_result = orchestrator
        .chat_stream(&ai_request, context, account_id, &plan)
        .await;
    
    match stream_result {
        Ok((mut token_stream, _rate_status)) => {
            // Create SSE stream from token stream
            // TokenStream yields Result<String, AIError> for each token
            let stream = async_stream::stream! {
                while let Some(result) = token_stream.next().await {
                    let sse_data = match result {
                        Ok(text) => {
                            // Text token chunk
                            SseEventData::Token(text)
                        }
                        Err(err) => {
                            // Error during streaming
                            SseEventData::Error {
                                code: err.code().to_string(),
                                message: err.to_string(),
                            }
                        }
                    };
                    
                    if let Ok(json) = serde_json::to_string(&sse_data) {
                        yield Ok(Event::default().data(json));
                    }
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
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
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
