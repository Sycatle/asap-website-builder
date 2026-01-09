//! Intent Analysis Module
//!
//! Analyzes user messages to determine:
//! - User intent category
//! - Whether chain of thoughts is needed
//! - Dynamic thinking steps (multilingual)
//! - Multi-step AI workflow with real-time feedback

use serde::{Deserialize, Serialize};

use crate::error::AIResult;
use crate::router::ModelRouter;
use crate::types::{Message, WebsiteContext};

/// Result of intent analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentAnalysis {
    /// User's detected intent category
    pub intent: String,
    /// Brief summary of what the user wants (in user's language)
    pub summary: String,
    /// Whether this request needs chain of thoughts (complex operation)
    pub needs_thinking: bool,
    /// Dynamic thinking steps to show (in user's language)
    #[serde(default)]
    pub thinking_steps: Vec<ThinkingStep>,
    /// Detected user language (for response consistency)
    pub language: String,
}

/// A thinking step to display and execute
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingStep {
    /// Step number
    pub step: u32,
    /// Description of what's happening (in user's language)
    pub description: String,
    /// What this step analyzes (internal use)
    #[serde(default)]
    pub analysis_focus: String,
    /// Duration hint in ms (for UI pacing)
    #[serde(default = "default_duration")]
    pub duration_hint: u32,
}

/// Result of executing a thinking step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    /// Step number that was executed
    pub step: u32,
    /// Brief insight from this step (in user's language)
    pub insight: String,
    /// Whether this step found something relevant
    pub found_relevant: bool,
    /// Optional data gathered (for next steps)
    #[serde(default)]
    pub data: serde_json::Value,
}

fn default_duration() -> u32 {
    500
}

/// System prompt for intent analysis
const INTENT_ANALYSIS_PROMPT: &str = r##"You are an intent analyzer for a website builder AI assistant. 
Your job is to quickly analyze the user's message and determine:
1. Their intent (what they want to do)
2. Whether this requires showing "thinking" steps (complex operations)
3. What steps to show the user while processing

RESPOND ONLY WITH JSON, no other text.

Response format:
{
  "intent": "modify_content|add_section|remove_section|change_style|reorganize|analyze|question|greeting|other",
  "summary": "<brief summary of what user wants, in their language>",
  "needs_thinking": true/false,
  "thinking_steps": [
    {"step": 1, "description": "<step description in user's language>", "analysis_focus": "<what to analyze>", "duration_hint": 500}
  ],
  "language": "<detected language code: en, fr, es, de, etc>"
}

Guidelines for needs_thinking:
- TRUE: Adding sections, major edits, reorganizing, style changes, complex modifications, analysis requests
- FALSE: Simple questions, greetings, clarifications, very simple edits

Guidelines for thinking_steps (only if needs_thinking is true):
- Use 2-4 steps maximum
- Be specific and contextual to what the user asked
- Write descriptions in the SAME LANGUAGE as the user's message
- analysis_focus is internal (English), describes what data to analyze
- Each step should be a meaningful analysis phase

Examples:

User: "Change the hero title to Welcome"
{
  "intent": "modify_content",
  "summary": "Change hero section title",
  "needs_thinking": false,
  "thinking_steps": [],
  "language": "en"
}

User: "Ajoute une section FAQ avec des questions sur les prix"
{
  "intent": "add_section",
  "summary": "Ajouter une FAQ sur les tarifs",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Analyse de la structure actuelle du site", "analysis_focus": "current_sections", "duration_hint": 400},
    {"step": 2, "description": "Identification du meilleur emplacement", "analysis_focus": "positioning", "duration_hint": 500},
    {"step": 3, "description": "Préparation du contenu FAQ", "analysis_focus": "content_generation", "duration_hint": 600}
  ],
  "language": "fr"
}

User: "Fais une analyse complète de mon site"
{
  "intent": "analyze",
  "summary": "Analyse complète du site",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Analyse de la structure et navigation", "analysis_focus": "structure", "duration_hint": 500},
    {"step": 2, "description": "Évaluation du contenu et messages clés", "analysis_focus": "content", "duration_hint": 600},
    {"step": 3, "description": "Analyse UX et points d'amélioration", "analysis_focus": "ux", "duration_hint": 500},
    {"step": 4, "description": "Synthèse et recommandations", "analysis_focus": "synthesis", "duration_hint": 400}
  ],
  "language": "fr"
}

User: "Make the design more modern with darker colors"
{
  "intent": "change_style",
  "summary": "Update to modern dark theme",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Analyzing current theme and colors", "analysis_focus": "current_theme", "duration_hint": 400},
    {"step": 2, "description": "Selecting modern dark color palette", "analysis_focus": "color_selection", "duration_hint": 500},
    {"step": 3, "description": "Preparing theme changes", "analysis_focus": "theme_changes", "duration_hint": 500}
  ],
  "language": "en"
}

User: "Salut!"
{
  "intent": "greeting",
  "summary": "Greeting",
  "needs_thinking": false,
  "thinking_steps": [],
  "language": "fr"
}
"##;

/// System prompt for executing a thinking step
const STEP_EXECUTION_PROMPT: &str = r##"You are analyzing a website as part of a multi-step workflow.
You are currently executing step {step_num} of {total_steps}: "{step_description}"

Your focus for this step: {analysis_focus}

User's original request: "{user_message}"

Website context:
{website_context}

Previous steps results:
{previous_results}

RESPOND ONLY WITH JSON:
{
  "step": {step_num},
  "insight": "<1-2 sentence insight from this analysis, in {language}>",
  "found_relevant": true/false,
  "data": {<any relevant data found for use in next steps or final response>}
}

Be concise. The insight will be shown to the user in real-time.
"##;

/// Analyze user intent with a quick AI call
pub async fn analyze_intent(
    router: &ModelRouter,
    user_message: &str,
) -> AIResult<IntentAnalysis> {
    let messages = vec![
        Message::system(INTENT_ANALYSIS_PROMPT),
        Message::user(user_message),
    ];

    // Use the default provider's model - None lets the router choose automatically
    // This works with whichever provider is configured (OpenAI or Anthropic)
    let completion = router.chat(messages, None, None).await?;

    // Parse JSON response
    let content = completion.content.trim();
    
    // Handle potential markdown code blocks
    let json_str = if content.starts_with("```") {
        content
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        content
    };

    // Try to parse, with fallback for malformed responses
    match serde_json::from_str::<IntentAnalysis>(json_str) {
        Ok(analysis) => Ok(analysis),
        Err(e) => {
            tracing::warn!("Failed to parse intent analysis: {} - content: {}", e, json_str);
            // Fallback: simple analysis without thinking steps
            Ok(IntentAnalysis {
                intent: "other".to_string(),
                summary: user_message.chars().take(50).collect(),
                needs_thinking: false,
                thinking_steps: vec![],
                language: detect_language_simple(user_message),
            })
        }
    }
}

/// Execute a single thinking step with a real AI call
/// Returns the step result with insights
pub async fn execute_thinking_step(
    router: &ModelRouter,
    step: &ThinkingStep,
    total_steps: u32,
    user_message: &str,
    context: &WebsiteContext,
    language: &str,
    previous_results: &[StepResult],
) -> AIResult<StepResult> {
    // Build context string
    let website_context = build_website_context_string(context);
    
    // Build previous results string
    let previous_str = if previous_results.is_empty() {
        "None yet".to_string()
    } else {
        previous_results.iter()
            .map(|r| format!("Step {}: {}", r.step, r.insight))
            .collect::<Vec<_>>()
            .join("\n")
    };
    
    // Build the prompt
    let prompt = STEP_EXECUTION_PROMPT
        .replace("{step_num}", &step.step.to_string())
        .replace("{total_steps}", &total_steps.to_string())
        .replace("{step_description}", &step.description)
        .replace("{analysis_focus}", &step.analysis_focus)
        .replace("{user_message}", user_message)
        .replace("{website_context}", &website_context)
        .replace("{previous_results}", &previous_str)
        .replace("{language}", language);
    
    let messages = vec![
        Message::system(&prompt),
        Message::user(&format!("Execute step {} now.", step.step)),
    ];
    
    let completion = router.chat(messages, None, None).await?;
    
    // Parse result
    let content = completion.content.trim();
    let json_str = if content.starts_with("```") {
        content
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        content
    };
    
    match serde_json::from_str::<StepResult>(json_str) {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::warn!("Failed to parse step result: {} - content: {}", e, json_str);
            // Fallback with a generic insight
            Ok(StepResult {
                step: step.step,
                insight: step.description.clone(),
                found_relevant: true,
                data: serde_json::json!({}),
            })
        }
    }
}

/// Build a concise context string for the AI
fn build_website_context_string(context: &WebsiteContext) -> String {
    let mut parts = vec![];
    
    // Website info
    parts.push(format!(
        "Website: {} ({})",
        context.website.title.as_deref().unwrap_or("Untitled"),
        context.website.slug
    ));
    
    // Sections summary
    if !context.sections.is_empty() {
        let sections_list: Vec<String> = context.sections.iter()
            .map(|s| {
                let variant = s.variant.as_deref().unwrap_or("default");
                format!("- {} ({})", s.section_type, variant)
            })
            .collect();
        parts.push(format!("Sections ({}):\n{}", context.sections.len(), sections_list.join("\n")));
    }
    
    // Theme summary
    if let Some(theme) = context.theme.as_object() {
        let theme_items: Vec<String> = theme.iter()
            .take(5)  // Limit to avoid too much context
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect();
        if !theme_items.is_empty() {
            parts.push(format!("Theme: {}", theme_items.join(", ")));
        }
    }
    
    parts.join("\n\n")
}

/// Simple language detection fallback
fn detect_language_simple(text: &str) -> String {
    let lower = text.to_lowercase();
    
    // French indicators
    if lower.contains("bonjour") || lower.contains("merci") || lower.contains("s'il") 
        || lower.contains("ajoute") || lower.contains("modifie") || lower.contains("supprime") {
        return "fr".to_string();
    }
    
    // Spanish indicators
    if lower.contains("hola") || lower.contains("gracias") || lower.contains("añade") {
        return "es".to_string();
    }
    
    // German indicators
    if lower.contains("hallo") || lower.contains("danke") || lower.contains("bitte") {
        return "de".to_string();
    }
    
    // Default to English
    "en".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_language_simple() {
        assert_eq!(detect_language_simple("Hello world"), "en");
        assert_eq!(detect_language_simple("Bonjour le monde"), "fr");
        assert_eq!(detect_language_simple("Ajoute une section"), "fr");
        assert_eq!(detect_language_simple("Hola mundo"), "es");
    }

    #[test]
    fn test_intent_analysis_deserialization() {
        let json = r#"{
            "intent": "add_section",
            "summary": "Add FAQ section",
            "needs_thinking": true,
            "thinking_steps": [
                {"step": 1, "description": "Analyzing structure", "duration_hint": 400}
            ],
            "language": "en"
        }"#;

        let analysis: IntentAnalysis = serde_json::from_str(json).unwrap();
        assert_eq!(analysis.intent, "add_section");
        assert!(analysis.needs_thinking);
        assert_eq!(analysis.thinking_steps.len(), 1);
    }
}
