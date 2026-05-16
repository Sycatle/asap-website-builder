//! AI tool execution
//!
//! - `screenshot` — server-side screenshot capture via the screenshot service
//! - `data` — orchestrates the chain-of-thought tool-calling loop that gathers
//!   data context for the AI before the final user-facing response

use serde::Serialize;
use tokio::sync::mpsc;

mod data;
mod screenshot;

pub use data::execute_data_tools_streaming_channel;
pub use screenshot::{capture_screenshot_server_side, ScreenshotData};

// ============================================================================
// Shared types
// ============================================================================

/// Result of executing data tools
#[derive(Debug, Clone)]
pub struct DataToolExecution {
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
    /// Duration in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

/// Tool event for real-time streaming
#[derive(Debug, Clone)]
pub enum ToolEvent {
    /// Tool call started
    Started {
        id: String,
        tool_name: String,
        description: String,
    },
    /// Tool call completed
    Completed {
        id: String,
        tool_name: String,
        success: bool,
        description: String,
        duration_ms: u64,
        result_preview: Option<String>,
    },
}

/// Preloaded screenshot handle type alias for clarity
pub type PreloadedScreenshot = tokio::task::JoinHandle<Result<ScreenshotData, String>>;

/// Channel sender for tool events
pub type ToolEventSender = mpsc::UnboundedSender<ToolEvent>;
