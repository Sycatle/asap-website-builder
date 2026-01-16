//! Intent Analysis Module
//!
//! Fast intent analysis with minimal latency.
//! Uses a streamlined prompt for quick classification.

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
    /// Proactive hints for related improvements (expert suggestions)
    #[serde(default)]
    pub proactive_hints: Vec<String>,
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
    300
}

/// Compact system prompt for fast intent analysis
const INTENT_ANALYSIS_PROMPT: &str = r##"Classify user intent for a website builder AI. Output JSON only.

{
  "intent": "<category>",
  "summary": "<10 words max, user's language>",
  "needs_thinking": <true if complex>,
  "thinking_steps": [{"step": 1, "description": "<action>", "analysis_focus": "<focus>", "duration_hint": 300}],
  "language": "<en|fr|es|de>",
  "proactive_hints": []
}

Categories: modify_content, add_section, remove_section, change_style, reorganize, analyze, question, greeting, strategy, optimize, create_content, other

Rules:
- needs_thinking=true: add/remove sections, style changes, analysis, strategy, optimization, content creation
- needs_thinking=false: greetings, simple edits, basic questions
- 2-4 thinking_steps max for complex tasks
- Match user's language
"##;

/// Compact prompt for step execution - generates insight in one shot
const STEP_EXECUTION_PROMPT: &str = r##"You are executing step {step_num}/{total_steps}: "{step_description}"

User request: "{user_message}"
Website: {website_context}
Previous: {previous_results}

Output JSON only:
{{"step": {step_num}, "insight": "<1 sentence expert insight in {language}>", "found_relevant": true, "data": {{}}}}
"##;

/// Analyze user intent with a quick AI call
/// Uses GPT-4o-mini for faster/cheaper intent analysis
pub async fn analyze_intent(
    router: &ModelRouter,
    user_message: &str,
) -> AIResult<IntentAnalysis> {
    let messages = vec![
        Message::system(INTENT_ANALYSIS_PROMPT),
        Message::user(user_message),
    ];

    // Use GPT-4o-mini for fast classification
    let completion = router.chat(messages, Some(150), Some("gpt-4o-mini")).await?;

    // Parse JSON response
    let content = completion.content.trim();
    
    // Extract JSON from potential markdown/noise
    let json_str = extract_json(content);

    // Try to parse, with fallback for malformed responses
    match serde_json::from_str::<IntentAnalysis>(json_str) {
        Ok(analysis) => Ok(analysis),
        Err(e) => {
            tracing::warn!("Failed to parse intent: {} - raw: {}", e, content);
            // Smart fallback based on message content
            Ok(smart_fallback_intent(user_message))
        }
    }
}

/// Extract JSON from potentially wrapped content
fn extract_json(content: &str) -> &str {
    let trimmed = content.trim();
    if trimmed.starts_with("```") {
        trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            &trimmed[start..=end]
        } else {
            trimmed
        }
    } else {
        trimmed
    }
}

/// Smart fallback when parsing fails - infer intent from keywords
fn smart_fallback_intent(message: &str) -> IntentAnalysis {
    let lower = message.to_lowercase();
    let lang = detect_language_simple(message);
    
    let (intent, needs_thinking) = if lower.contains("ajoute") || lower.contains("add") || lower.contains("créer") || lower.contains("create") {
        ("add_section", true)
    } else if lower.contains("supprime") || lower.contains("remove") || lower.contains("delete") {
        ("remove_section", true)
    } else if lower.contains("change") || lower.contains("modifie") || lower.contains("update") {
        ("modify_content", false)
    } else if lower.contains("couleur") || lower.contains("color") || lower.contains("style") || lower.contains("design") {
        ("change_style", true)
    } else if lower.contains("analyse") || lower.contains("analyze") || lower.contains("audit") {
        ("analyze", true)
    } else if lower.starts_with("salut") || lower.starts_with("bonjour") || lower.starts_with("hello") || lower.starts_with("hi") {
        ("greeting", false)
    } else {
        ("other", false)
    };
    
    IntentAnalysis {
        intent: intent.to_string(),
        summary: message.chars().take(40).collect(),
        needs_thinking,
        thinking_steps: vec![],
        language: lang,
        proactive_hints: vec![],
    }
}

/// Execute a single thinking step with a fast AI call
/// Uses gpt-4o-mini for speed
pub async fn execute_thinking_step(
    router: &ModelRouter,
    step: &ThinkingStep,
    total_steps: u32,
    user_message: &str,
    context: &WebsiteContext,
    language: &str,
    previous_results: &[StepResult],
) -> AIResult<StepResult> {
    // Build compact context
    let website_context = build_compact_context(context);
    
    // Build previous results string (compact)
    let previous_str = if previous_results.is_empty() {
        "None".to_string()
    } else {
        previous_results.iter()
            .map(|r| r.insight.clone())
            .collect::<Vec<_>>()
            .join("; ")
    };
    
    // Build the prompt
    let prompt = STEP_EXECUTION_PROMPT
        .replace("{step_num}", &step.step.to_string())
        .replace("{total_steps}", &total_steps.to_string())
        .replace("{step_description}", &step.description)
        .replace("{user_message}", user_message)
        .replace("{website_context}", &website_context)
        .replace("{previous_results}", &previous_str)
        .replace("{language}", language);
    
    let messages = vec![
        Message::system(&prompt),
        Message::user("Go"),
    ];
    
    // Use gpt-4o-mini with low max_tokens for speed
    let completion = router.chat(messages, Some(80), Some("gpt-4o-mini")).await?;
    
    // Parse result
    let content = completion.content.trim();
    let json_str = extract_json(content);
    
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

/// Build ultra-compact context for fast step execution
fn build_compact_context(context: &WebsiteContext) -> String {
    let title = context.website.title.as_deref().unwrap_or("Site");
    let section_types: Vec<&str> = context.sections.iter()
        .take(5)
        .map(|s| s.section_type.as_str())
        .collect();
    format!("{}: [{}]", title, section_types.join(", "))
}

/// Simple language detection fallback
pub fn detect_language_simple(text: &str) -> String {
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
