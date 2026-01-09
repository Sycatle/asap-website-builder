//! ASAP AI Module
//!
//! This module provides AI capabilities for the ASAP platform:
//! - Multi-provider support (OpenAI, Anthropic)
//! - Streaming chat completions (SSE)
//! - Image generation (DALL-E 3)
//! - Rate limiting per plan
//! - Action parsing and execution

pub mod config;
pub mod context;
pub mod error;
pub mod orchestrator;
pub mod rate_limiter;
pub mod router;
pub mod types;

pub mod actions;
pub mod providers;

// Re-exports
pub use config::AIConfig;
pub use context::ContextBuilder;
pub use error::{AIError, AIResult};
pub use orchestrator::AIOrchestrator;
pub use rate_limiter::AIRateLimiter;
pub use router::ModelRouter;
pub use types::*;
