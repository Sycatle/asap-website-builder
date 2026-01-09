//! AI Chat API endpoints with SSE streaming support
//!
//! Provides AI-powered website editing through natural language.
//! Supports both streaming (SSE) and non-streaming responses.
//!
//! # Module Structure
//!
//! - `types`: Request/response types, SSE event data
//! - `helpers`: Authentication, plan management, formatting utilities
//! - `context`: User and website context loading
//! - `conversation`: Conversation history management
//! - `tools`: Data tools execution, screenshot capture
//! - `handlers`: Main HTTP handlers (chat, chat_stream, quota, status)
//! - `actions`: AI action execution (update sections, themes, etc.)
//! - `vision`: Vision/screenshot endpoints for GPT-4 Vision

mod actions;
mod context;
mod conversation;
mod handlers;
mod helpers;
mod tools;
mod types;
mod vision;

// ============================================================================
// Re-exports
// ============================================================================

// Public types for external use
pub use types::{
    // Request/Response types
    ChatRequest,
    ChatResponse,
    ErrorResponse,
    QuotaResponse,
    // SSE event types
    SseEventData,
    ConversationData,
    UsageData,
    ThinkingData,
    ToolCallData,
    ToolResultData,
    ToolRequestData,
    IterationData,
    PhaseData,
    // Conversation types
    ConversationMessage,
    ConversationsResponse,
    ConversationSummary,
    ConversationDetail,
    ConversationMessageDetail,
    // Action types
    ExecuteActionRequest,
    ExecuteActionResponse,
    // Vision types
    VisionUploadResponse,
    VisualAnalyzeRequest,
    VisualAnalyzeResponse,
};

// Public handlers for router registration
pub use handlers::{
    chat,
    chat_stream,
    get_quota,
    status,
    list_conversations,
    get_conversation,
    delete_conversation,
};

pub use actions::execute_action;

pub use vision::{
    upload_vision_screenshot,
    get_vision_screenshot,
    analyze_vision,
};


