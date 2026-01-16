//! Type definitions for AI Chat API
//!
//! Contains all request/response types, SSE event data structures,
//! and related serialization logic.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use asap_core_ai::{AIAction, TokenUsage};

// ============================================================================
// Request/Response Types
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
    /// Response format preferences
    #[serde(default)]
    pub constraints: Option<ChatConstraints>,
    /// Mode: chat, plan, execute, report
    #[serde(default)]
    pub mode: Option<String>,
}

fn default_stream() -> bool {
    true
}

/// Response format constraints from frontend
#[derive(Debug, Clone, Deserialize)]
pub struct ChatConstraints {
    /// Desired response length: short, medium, long
    pub max_length: Option<String>,
    /// Tone: casual, professional, technical
    pub tone: Option<String>,
    /// Format: text, markdown, json
    pub format: Option<String>,
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
    /// Quick summary (3-second read)
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub summary: Option<String>,
    /// Actions to execute on the website
    pub actions: Vec<AIAction>,
    /// Token usage statistics
    pub usage: TokenUsage,
    /// Confidence level 0-100
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub confidence: Option<u8>,
    /// Warnings/caveats
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub warnings: Vec<String>,
}

impl Default for ChatResponse {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            conversation_id: Uuid::nil(),
            message: String::new(),
            summary: None,
            actions: vec![],
            usage: TokenUsage::default(),
            confidence: None,
            warnings: vec![],
        }
    }
}

/// Error response format
#[derive(Debug, Clone, Serialize, Default)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
    /// Probable cause (for user understanding)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cause: Option<String>,
    /// Is this error recoverable?
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recoverable: Option<bool>,
    /// Suggested alternatives
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub alternatives: Vec<String>,
}

impl ErrorResponse {
    pub fn new(code: impl Into<String>, error: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            error: error.into(),
            cause: None,
            recoverable: None,
            alternatives: vec![],
        }
    }

    pub fn with_cause(mut self, cause: impl Into<String>) -> Self {
        self.cause = Some(cause.into());
        self
    }

    pub fn recoverable(mut self) -> Self {
        self.recoverable = Some(true);
        self
    }
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

// ============================================================================
// SSE Event Types
// ============================================================================

/// SSE event data for streaming
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
pub enum SseEventData {
    /// Typing indicator - sent immediately on request receipt
    Typing,
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
    /// Execution plan step
    #[serde(rename = "planstep")]
    PlanStep(PlanStepData),
    /// Action to execute
    Action(AIAction),
    /// Summary of the response (quick result)
    Summary(SummaryData),
    /// Artifact (rich content: code, table, checklist, etc.)
    Artifact(ArtifactData),
    /// Source/citation
    Source(SourceData),
    /// Confidence indicator
    Confidence(ConfidenceData),
    /// Warning/caveat
    Warning(WarningData),
    /// Conversation metadata (sent at start)
    #[serde(rename = "conversation")]
    Conversation(ConversationData),
    /// Token usage statistics (sent at end)
    #[serde(rename = "usage")]
    Usage(UsageData),
    /// Stream complete
    Done,
    /// Error occurred
    Error { 
        code: String, 
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        cause: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        recoverable: Option<bool>,
    },
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
#[derive(Debug, Clone, Serialize, Default)]
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
    /// Confidence level 0-100 for this step
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<u8>,
}

/// Tool call event data
#[derive(Debug, Clone, Serialize, Default)]
pub struct ToolCallData {
    pub id: String,
    pub tool: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
    pub status: String,
    /// Duration in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

/// Tool result event data
#[derive(Debug, Clone, Serialize, Default)]
pub struct ToolResultData {
    pub tool_call_id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// Result data (for display)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    /// Duration in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
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
    /// Progress from 0.0 to 1.0
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<f32>,
    /// Estimated time remaining in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eta_seconds: Option<u32>,
}

/// Execution plan step event - for pipeline runner UI
#[derive(Debug, Clone, Serialize)]
pub struct PlanStepData {
    pub id: String,
    pub index: u32,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// pending, running, done, failed, skipped
    pub status: String,
    /// Confidence level 0-100
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<u8>,
    /// Error info if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<StepErrorData>,
}

/// Step error details
#[derive(Debug, Clone, Serialize)]
pub struct StepErrorData {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cause: Option<String>,
    pub recoverable: bool,
}

/// Summary event - quick result shown at top of response
#[derive(Debug, Clone, Serialize)]
pub struct SummaryData {
    pub text: String,
    /// Type: success, info, warning, error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary_type: Option<String>,
}

/// Artifact event - rich content block
#[derive(Debug, Clone, Serialize)]
pub struct ArtifactData {
    pub id: String,
    /// code, table, checklist, timeline, image, diff, json, markdown
    pub artifact_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub content: serde_json::Value,
    /// Available actions: copy, download, apply, etc.
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub actions: Vec<String>,
}

/// Source/citation event
#[derive(Debug, Clone, Serialize)]
pub struct SourceData {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}

/// Confidence indicator event
#[derive(Debug, Clone, Serialize)]
pub struct ConfidenceData {
    /// Overall confidence 0-100
    pub level: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explanation: Option<String>,
}

/// Warning event
#[derive(Debug, Clone, Serialize)]
pub struct WarningData {
    pub message: String,
    /// warning, caution, limitation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning_type: Option<String>,
}

// ============================================================================
// Conversation Types
// ============================================================================

/// Conversation history message (for internal use)
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

// ============================================================================
// Action Types
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

// ============================================================================
// Vision Types
// ============================================================================

/// Response from uploading a vision screenshot
#[derive(Debug, Serialize)]
pub struct VisionUploadResponse {
    /// Unique ID for this screenshot
    pub image_id: String,
    /// URL to access the uploaded image (signed, temporary)
    pub url: String,
    /// When the URL expires
    pub expires_at: chrono::DateTime<chrono::Utc>,
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
}
