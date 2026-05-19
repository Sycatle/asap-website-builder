//! ASAP AI Module
//!
//! This module provides AI capabilities for the ASAP platform:
//! - Multi-provider support (OpenAI, Anthropic)
//! - Streaming chat completions (SSE)
//! - Image generation (DALL-E 3)
//! - Rate limiting per plan
//! - Action parsing and execution
//! - Intent analysis for dynamic chain of thoughts
//! - Function calling (tools) for data retrieval
//! - TRUE real-time streaming of all AI phases

pub mod config;
pub mod context;
pub mod error;
pub mod intent;
pub mod orchestrator;
pub mod rate_limiter;
pub mod router;
pub mod tools;
pub mod types;

pub mod actions;
pub mod providers;
pub mod section_codegen;

// Re-exports
pub use config::{AIConfig, OpenAIConfig};
pub use context::ContextBuilder;
pub use error::{AIError, AIResult};
pub use intent::{
    analyze_intent, analyze_intent_streaming, detect_language_simple, execute_thinking_step,
    execute_thinking_step_streaming, IntentAnalysis, StepResult, StreamEvent, ThinkingStep,
};
pub use orchestrator::AIOrchestrator;
pub use providers::{
    ChatCompletionWithTools, ImageUrlContent, MessageContent, OpenAIMessage, OpenAIMessageVision,
    OpenAIProvider, VisionContentPart,
};
pub use rate_limiter::{AIRateLimiter, RateLimitResource, RateLimitStatus};
pub use router::ModelRouter;
pub use section_codegen::{
    generate as generate_section, CodegenError, DataBindings, GeneratedSection, Knob, KnobType,
    KnobsSchema, ValidationError as SectionValidationError,
};
pub use tools::{
    get_tool_definitions, ToolCall, ToolDefinition, ToolExecutor, ToolResult, VisualAnalysisParams,
    VisualAnalysisRequest, VisualAnalysisResult,
};
pub use types::*;
