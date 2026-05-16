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
//! - `cache`: Redis-based caching for AI context (performance optimization)

mod actions;
pub mod cache;
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
    ConversationData,
    ConversationDetail,
    // Conversation types
    ConversationMessage,
    ConversationMessageDetail,
    ConversationSummary,
    ConversationsResponse,
    ErrorResponse,
    // Action types
    ExecuteActionRequest,
    ExecuteActionResponse,
    IterationData,
    PhaseData,
    QuotaResponse,
    // SSE event types
    SseEventData,
    ThinkingData,
    ToolCallData,
    ToolRequestData,
    ToolResultData,
    UsageData,
    // Vision types
    VisionUploadResponse,
    VisualAnalyzeRequest,
    VisualAnalyzeResponse,
};

// Public handlers for router registration
pub use handlers::{
    chat, chat_stream, delete_conversation, get_conversation, get_quota, list_conversations, status,
};

pub use actions::execute_action;

pub use vision::{analyze_vision, get_vision_screenshot, upload_vision_screenshot};
