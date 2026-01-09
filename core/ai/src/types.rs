//! AI Types
//!
//! Core types for AI requests, responses, and actions.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Role in a conversation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

/// A message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

impl Message {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
            name: None,
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
            name: None,
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: Role::Assistant,
            content: content.into(),
            name: None,
        }
    }
}

/// Request to the AI chat endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIChatRequest {
    /// Website ID to edit
    pub website_id: Uuid,

    /// User's message
    pub message: String,

    /// Conversation ID (to continue an existing conversation)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conversation_id: Option<Uuid>,
    
    /// Conversation history (previous messages)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub history: Vec<Message>,

    /// Optional attachments (images, files)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub attachments: Vec<Attachment>,

    /// Whether to stream the response
    #[serde(default = "default_stream")]
    pub stream: bool,
}

fn default_stream() -> bool {
    true
}

/// Attachment in a chat request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    #[serde(rename = "type")]
    pub attachment_type: AttachmentType,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub base64: Option<String>,

    pub mime_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AttachmentType {
    Image,
    File,
}

/// Response from the AI chat endpoint (non-streaming)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIChatResponse {
    /// Response ID
    pub id: Uuid,

    /// Conversation ID
    pub conversation_id: Uuid,

    /// AI's response message
    pub message: String,

    /// Actions performed on the website
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub actions: Vec<AIAction>,

    /// Suggestions for the user
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub suggestions: Vec<Suggestion>,

    /// Token usage
    pub usage: TokenUsage,
}

/// Token usage information
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    /// Estimated cost in USD
    pub estimated_cost: f64,
}

/// SSE event for streaming responses
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
pub enum AIStreamEvent {
    /// Token chunk
    Token(String),

    /// AI is thinking/reasoning (shows intermediate state)
    Thinking(ThinkingEvent),

    /// AI is calling a tool/executing an action
    ToolCall(ToolCallEvent),

    /// Result from a tool call
    ToolResult(ToolResultEvent),

    /// Action to execute (final parsed action)
    Action(AIAction),

    /// Suggestion for the user
    Suggestion(Suggestion),

    /// Iteration status (for multi-step workflows)
    Iteration(IterationEvent),

    /// Stream complete
    Done,

    /// Error occurred
    Error(AIErrorData),
}

/// Thinking event - AI is reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingEvent {
    /// Short description of what AI is thinking about
    pub thought: String,
    /// Current step in the reasoning process
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step: Option<u32>,
}

/// Tool call event - AI is using a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallEvent {
    /// Unique ID for this tool call
    pub id: String,
    /// Tool name being called
    pub tool: String,
    /// Human-readable description of what the tool does
    pub description: String,
    /// Tool arguments (for display)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
    /// Status: pending, running, completed, failed
    pub status: ToolCallStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ToolCallStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

/// Tool result event - result from a tool call
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResultEvent {
    /// Tool call ID this result is for
    pub tool_call_id: String,
    /// Whether the tool succeeded
    pub success: bool,
    /// Result message or error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// Detailed result data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// Iteration event - for multi-step workflows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IterationEvent {
    /// Current iteration number (1-based)
    pub current: u32,
    /// Maximum iterations allowed
    pub max: u32,
    /// What's happening in this iteration
    pub status: IterationStatus,
    /// Optional description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IterationStatus {
    /// Starting a new iteration
    Starting,
    /// Processing
    Processing,
    /// Iteration complete
    Complete,
    /// All iterations done
    Finished,
}

/// Error data in stream
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIErrorData {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after: Option<u64>,
}

/// An action the AI wants to perform on the website
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AIAction {
    /// Update a property on a section
    UpdateSectionProperty {
        section_id: Uuid,
        property: String,
        value: serde_json::Value,
    },

    /// Add a new section
    AddSection {
        section_type: String,
        #[serde(default)]
        position: Option<i32>,
        #[serde(default)]
        variant: Option<String>,
        #[serde(default)]
        properties: Option<serde_json::Value>,
    },

    /// Remove a section
    RemoveSection { section_id: Uuid },

    /// Reorder sections
    ReorderSections { order: Vec<Uuid> },

    /// Change section variant
    ChangeVariant { section_id: Uuid, variant: String },

    /// Update theme settings
    UpdateTheme { changes: serde_json::Value },

    /// Update website metadata
    UpdateMetadata { changes: serde_json::Value },

    /// Generate an image
    GenerateImage {
        prompt: String,
        #[serde(default)]
        target_section_id: Option<Uuid>,
        #[serde(default)]
        target_property: Option<String>,
    },
}

impl AIAction {
    /// Get the action type as a string
    pub fn action_type(&self) -> &'static str {
        match self {
            Self::UpdateSectionProperty { .. } => "UPDATE_SECTION_PROPERTY",
            Self::AddSection { .. } => "ADD_SECTION",
            Self::RemoveSection { .. } => "REMOVE_SECTION",
            Self::ReorderSections { .. } => "REORDER_SECTIONS",
            Self::ChangeVariant { .. } => "CHANGE_VARIANT",
            Self::UpdateTheme { .. } => "UPDATE_THEME",
            Self::UpdateMetadata { .. } => "UPDATE_METADATA",
            Self::GenerateImage { .. } => "GENERATE_IMAGE",
        }
    }

    /// Whether this action is reversible
    pub fn is_reversible(&self) -> bool {
        // All actions are reversible except image generation
        !matches!(self, Self::GenerateImage { .. })
    }
}

/// Suggestion for the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub id: String,
    #[serde(rename = "type")]
    pub suggestion_type: SuggestionType,
    pub title: String,
    pub description: String,
    /// Action to execute if accepted
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<AIAction>,
    pub priority: SuggestionPriority,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SuggestionType {
    Improvement,
    Content,
    Design,
    Seo,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SuggestionPriority {
    Low,
    Medium,
    High,
}

/// Image generation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenRequest {
    pub prompt: String,
    #[serde(default)]
    pub style: Option<ImageStyle>,
    #[serde(default)]
    pub size: Option<ImageSize>,
    #[serde(default = "default_image_count")]
    pub count: u8,
}

fn default_image_count() -> u8 {
    1
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageStyle {
    Natural,
    Vivid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImageSize {
    #[serde(rename = "1024x1024")]
    Square,
    #[serde(rename = "1792x1024")]
    Landscape,
    #[serde(rename = "1024x1792")]
    Portrait,
}

impl ImageSize {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Square => "1024x1024",
            Self::Landscape => "1792x1024",
            Self::Portrait => "1024x1792",
        }
    }
}

/// Image generation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenResponse {
    pub images: Vec<GeneratedImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    pub url: String,
    pub revised_prompt: String,
}

/// User context for AI personalization
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserContext {
    /// User's display name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Preferred language (detected from messages or profile)
    #[serde(default = "default_language")]
    pub language: String,
    /// User's plan (free, pro, business)
    #[serde(default = "default_plan")]
    pub plan: String,
    /// AI messages used today vs limit
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quota: Option<UserQuota>,
    /// Connected integrations (GitHub, etc.)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub integrations: Vec<String>,
}

fn default_language() -> String {
    "en".to_string()
}

fn default_plan() -> String {
    "free".to_string()
}

/// User's AI quota information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserQuota {
    pub daily_limit: u32,
    pub daily_used: u32,
    pub daily_remaining: u32,
}

/// Extension data for AI context
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExtensionData {
    /// GitHub integration data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github: Option<GitHubData>,
}

/// GitHub integration data
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GitHubData {
    /// GitHub username
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    /// GitHub profile bio
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    /// Top repositories (name, description, language, stars)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub repositories: Vec<GitHubRepo>,
    /// Programming languages with usage percentage
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub languages: Vec<GitHubLanguage>,
    /// Contribution stats
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contributions: Option<GitHubContributions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(default)]
    pub stars: u32,
    #[serde(default)]
    pub is_fork: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubLanguage {
    pub name: String,
    pub percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubContributions {
    pub total_commits: u32,
    pub total_prs: u32,
    pub total_issues: u32,
}

/// Website context for AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteContext {
    pub website: WebsiteInfo,
    pub sections: Vec<SectionInfo>,
    pub theme: serde_json::Value,
    pub available_section_types: Vec<String>,
    /// User context for personalization
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<UserContext>,
    /// Extension data (GitHub, etc.)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<ExtensionData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteInfo {
    pub id: Uuid,
    pub slug: String,
    pub title: Option<String>,
    pub preset: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionInfo {
    pub id: Uuid,
    pub section_type: String,
    pub variant: Option<String>,
    pub position: i32,
    pub properties: serde_json::Value,
    /// Property schema for this section type
    pub schema: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_constructors() {
        let system = Message::system("You are helpful");
        assert_eq!(system.role, Role::System);

        let user = Message::user("Hello");
        assert_eq!(user.role, Role::User);

        let assistant = Message::assistant("Hi there!");
        assert_eq!(assistant.role, Role::Assistant);
    }

    #[test]
    fn test_action_type() {
        let action = AIAction::UpdateSectionProperty {
            section_id: Uuid::new_v4(),
            property: "title".to_string(),
            value: serde_json::json!("New Title"),
        };
        assert_eq!(action.action_type(), "UPDATE_SECTION_PROPERTY");
        assert!(action.is_reversible());
    }

    #[test]
    fn test_ai_action_serialization() {
        let action = AIAction::AddSection {
            section_type: "hero".to_string(),
            position: Some(0),
            variant: Some("centered".to_string()),
            properties: None,
        };

        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("ADD_SECTION"));
        assert!(json.contains("hero"));
    }

    #[test]
    fn test_stream_event_serialization() {
        let event = AIStreamEvent::Token("Hello".to_string());
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("token"));
        assert!(json.contains("Hello"));
    }
}
