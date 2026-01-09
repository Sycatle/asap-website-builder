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

// Re-exports
pub use config::{AIConfig, OpenAIConfig};
pub use context::ContextBuilder;
pub use error::{AIError, AIResult};
pub use intent::{analyze_intent, execute_thinking_step, IntentAnalysis, ThinkingStep, StepResult};
pub use orchestrator::AIOrchestrator;
pub use rate_limiter::AIRateLimiter;
pub use router::ModelRouter;
pub use tools::{get_tool_definitions, ToolExecutor, ToolCall, ToolResult, ToolDefinition};
pub use providers::{OpenAIProvider, OpenAIMessage, ChatCompletionWithTools};
pub use types::*;

