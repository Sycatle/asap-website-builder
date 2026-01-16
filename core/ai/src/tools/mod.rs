//! AI Tools Module
//!
//! Provides function calling (tools) for the AI to search and query website data.
//! Supports pluggable backends for web search and URL browsing.

pub mod definitions;
pub mod executor;
pub mod types;

pub use definitions::get_tool_definitions;
pub use executor::{ToolExecutor, WebSearchBackend, WebBrowseBackend};
pub use types::*;

