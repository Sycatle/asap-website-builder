//! Tool Types
//!
//! Types for AI function calling / tools.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Definition of a tool available to the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    /// Tool type (always "function" for OpenAI)
    #[serde(rename = "type")]
    pub tool_type: String,
    /// Function definition
    pub function: FunctionDefinition,
}

/// Function definition for a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDefinition {
    /// Function name (identifier)
    pub name: String,
    /// Human-readable description
    pub description: String,
    /// JSON Schema for parameters
    pub parameters: serde_json::Value,
}

/// A tool call requested by the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// Unique ID for this call
    pub id: String,
    /// Tool type
    #[serde(rename = "type")]
    pub tool_type: String,
    /// Function details
    pub function: FunctionCall,
}

/// Function call details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    /// Function name
    pub name: String,
    /// Arguments as JSON string
    pub arguments: String,
}

/// Result of executing a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// Tool call ID this is responding to
    pub tool_call_id: String,
    /// Whether execution was successful
    pub success: bool,
    /// Result content (JSON or text)
    pub content: String,
    /// Error message if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Parameters for search_collections tool
#[derive(Debug, Clone, Deserialize)]
pub struct SearchCollectionsParams {
    /// Collection slug to search in (e.g., "github_repos", "github_languages")
    #[serde(default)]
    pub collection: Option<String>,
    /// Search query (fuzzy match on name, description, etc.)
    #[serde(default)]
    pub query: Option<String>,
    /// Filter by specific field values
    #[serde(default)]
    pub filters: Option<HashMap<String, serde_json::Value>>,
    /// Maximum number of results (default: 10)
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    10
}

/// Parameters for search_variables tool
#[derive(Debug, Clone, Deserialize)]
pub struct SearchVariablesParams {
    /// Source to filter by (e.g., "github-sync", "manual")
    #[serde(default)]
    pub source: Option<String>,
    /// Key pattern to match (supports wildcards: "github_*")
    #[serde(default)]
    pub pattern: Option<String>,
}

/// Parameters for get_website_sections tool
#[derive(Debug, Clone, Deserialize)]
pub struct GetSectionsParams {
    /// Filter by section type (e.g., "hero", "projects", "skills")
    #[serde(default)]
    pub section_type: Option<String>,
    /// Include full content (default: false, returns only summary)
    #[serde(default)]
    pub include_content: bool,
}

/// Parameters for get_website_theme tool
#[derive(Debug, Clone, Deserialize)]
pub struct GetThemeParams {
    /// Specific theme property to get (e.g., "colors", "fonts", "spacing")
    #[serde(default)]
    pub property: Option<String>,
}

/// Parameters for get_website_settings tool
#[derive(Debug, Clone, Deserialize)]
pub struct GetSettingsParams {
    /// Specific setting category (e.g., "seo", "social", "analytics")
    #[serde(default)]
    pub category: Option<String>,
}

/// Parameters for list_extensions tool
#[derive(Debug, Clone, Deserialize)]
pub struct ListExtensionsParams {
    /// Filter by active status only (default: true)
    #[serde(default = "default_true")]
    pub active_only: bool,
}

fn default_true() -> bool {
    true
}

/// Parameters for get_page_content tool
#[derive(Debug, Clone, Deserialize)]
pub struct GetPageContentParams {
    /// Page slug (e.g., "home", "about", "projects")
    pub page: String,
    /// Include section details (default: false)
    #[serde(default)]
    pub include_sections: bool,
}

/// Collection item returned from search
#[derive(Debug, Clone, Serialize)]
pub struct CollectionItem {
    /// Item ID
    pub id: String,
    /// Item data (key-value pairs)
    pub data: HashMap<String, serde_json::Value>,
    /// Relevance score (0-1)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f32>,
}

/// Variable returned from search
#[derive(Debug, Clone, Serialize)]
pub struct VariableItem {
    /// Variable key
    pub key: String,
    /// Variable value
    pub value: serde_json::Value,
    /// Source extension/module
    pub source: String,
}

/// Section summary for tools response
#[derive(Debug, Clone, Serialize)]
pub struct SectionSummary {
    /// Section ID
    pub id: String,
    /// Section type
    pub section_type: String,
    /// Section variant
    pub variant: Option<String>,
    /// Position in page
    pub position: i32,
    /// Brief preview of content
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
}

/// Extension info for tools response
#[derive(Debug, Clone, Serialize)]
pub struct ExtensionInfo {
    /// Extension ID
    pub id: String,
    /// Extension name
    pub name: String,
    /// Whether currently active
    pub active: bool,
    /// Number of variables provided
    pub variables_count: usize,
    /// Number of collections provided
    pub collections_count: usize,
}

/// Theme info for tools response
#[derive(Debug, Clone, Serialize)]
pub struct ThemeInfo {
    /// Primary color
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_color: Option<String>,
    /// Secondary color
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary_color: Option<String>,
    /// Background color
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background_color: Option<String>,
    /// Text color
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_color: Option<String>,
    /// Font family
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_family: Option<String>,
    /// Font size scale
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_scale: Option<String>,
    /// Border radius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub border_radius: Option<String>,
    /// Full theme object for detailed requests
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full: Option<serde_json::Value>,
}

/// Settings info for tools response
#[derive(Debug, Clone, Serialize)]
pub struct SettingsInfo {
    /// SEO settings
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo: Option<serde_json::Value>,
    /// Social links
    #[serde(skip_serializing_if = "Option::is_none")]
    pub social: Option<serde_json::Value>,
    /// Analytics settings
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<serde_json::Value>,
    /// Custom domain
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    /// Full settings for detailed requests
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full: Option<serde_json::Value>,
}

/// Parameters for request_visual_analysis tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualAnalysisParams {
    /// Viewport to capture
    #[serde(default = "default_viewport")]
    pub viewport: String,
    /// What aspect to focus on
    pub focus: String,
    /// Specific section to analyze (if focus is "specific_section")
    #[serde(default)]
    pub section: Option<String>,
    /// Specific question about the design
    #[serde(default)]
    pub question: Option<String>,
}

fn default_viewport() -> String {
    "desktop".to_string()
}

/// Visual analysis request sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualAnalysisRequest {
    /// Tool call ID to track this request
    pub tool_call_id: String,
    /// Viewport to capture
    pub viewport: String,
    /// Focus area for analysis
    pub focus: String,
    /// Optional section name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
    /// Optional question
    #[serde(skip_serializing_if = "Option::is_none")]
    pub question: Option<String>,
}

/// Visual analysis result from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualAnalysisResult {
    /// Tool call ID this responds to
    pub tool_call_id: String,
    /// Screenshot URL (from ai_screenshots table)
    pub screenshot_url: String,
    /// Original parameters
    pub viewport: String,
    pub focus: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub question: Option<String>,
}
