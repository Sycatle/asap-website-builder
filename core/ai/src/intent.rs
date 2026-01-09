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
    500
}

/// System prompt for intent analysis
const INTENT_ANALYSIS_PROMPT: &str = r##"You are an expert intent analyzer for a web agency AI assistant.
You quickly understand what the user wants and prepare intelligent analysis steps.

Your job:
1. Identify the user's intent accurately
2. Determine if this needs visible "thinking" steps (for complex operations)
3. Design smart analysis steps that show expertise (when needed)

RESPOND ONLY WITH JSON.

Response format:
{
  "intent": "modify_content|add_section|remove_section|change_style|reorganize|analyze|question|greeting|strategy|optimize|create_content|other",
  "summary": "<brief expert summary, in their language>",
  "needs_thinking": true/false,
  "thinking_steps": [
    {"step": 1, "description": "<expert step description in user's language>", "analysis_focus": "<technical focus>", "duration_hint": 500}
  ],
  "language": "<detected language code: en, fr, es, de, etc>",
  "proactive_hints": ["<1-2 related improvements to suggest after completing the main task>"]
}

## Intent Categories
- **modify_content**: Text changes, copy updates
- **add_section**: Adding new sections
- **remove_section**: Removing sections
- **change_style**: Colors, fonts, theme changes
- **reorganize**: Reordering, restructuring
- **analyze**: Site review, audit, feedback request
- **question**: Asking about their site/data
- **greeting**: Hello, thanks, etc.
- **strategy**: Business/marketing/conversion advice
- **optimize**: Performance, SEO, UX improvements
- **create_content**: Generate copy, headlines, descriptions

## needs_thinking Rules
- **TRUE**: Adding sections, major edits, reorganizing, style changes, analysis, strategy, content creation, optimization, any request needing expertise
- **FALSE**: Simple greetings, very simple single-property edits, basic questions

## Thinking Steps Guidelines
- Write like an expert presenting their process to a client
- Use 2-4 steps that show professional methodology
- Make descriptions specific to their request (not generic)
- Show domain expertise in the step names
- Match the user's language and formality level

## proactive_hints Guidelines
- Think: "What would a senior agency expert suggest next?"
- Related improvements the user hasn't asked for but would benefit from
- Keep them brief and actionable
- Empty array for greetings/simple questions

## Examples

User: "Change the hero title to Welcome"
{
  "intent": "modify_content",
  "summary": "Update hero headline",
  "needs_thinking": false,
  "thinking_steps": [],
  "language": "en",
  "proactive_hints": ["Consider adding a subtitle for more context", "Your CTA button could reinforce this message"]
}

User: "Ajoute une section FAQ avec des questions sur les prix"
{
  "intent": "add_section",
  "summary": "Créer une FAQ tarifaire stratégique",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Analyse de la structure et du parcours utilisateur", "analysis_focus": "user_journey_analysis", "duration_hint": 400},
    {"step": 2, "description": "Identification du placement optimal pour la conversion", "analysis_focus": "conversion_positioning", "duration_hint": 500},
    {"step": 3, "description": "Rédaction des questions qui lèvent les objections d'achat", "analysis_focus": "objection_handling_content", "duration_hint": 600}
  ],
  "language": "fr",
  "proactive_hints": ["Une section pricing juste avant la FAQ renforcerait l'impact", "Un CTA après la FAQ peut capturer les utilisateurs convaincus"]
}

User: "Make my site look more professional"
{
  "intent": "change_style",
  "summary": "Professional design upgrade",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Auditing current design against industry standards", "analysis_focus": "design_audit", "duration_hint": 500},
    {"step": 2, "description": "Identifying credibility gaps and trust signals", "analysis_focus": "trust_signals", "duration_hint": 500},
    {"step": 3, "description": "Crafting a refined color and typography system", "analysis_focus": "visual_system", "duration_hint": 600}
  ],
  "language": "en",
  "proactive_hints": ["Adding client logos or testimonials boosts credibility", "Consistent photography style elevates perception"]
}

User: "Fais une analyse complète de mon site"
{
  "intent": "analyze",
  "summary": "Audit complet par un expert",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Évaluation de la proposition de valeur et du messaging", "analysis_focus": "value_proposition", "duration_hint": 500},
    {"step": 2, "description": "Analyse du parcours de conversion", "analysis_focus": "conversion_funnel", "duration_hint": 600},
    {"step": 3, "description": "Audit UX et points de friction", "analysis_focus": "ux_friction_points", "duration_hint": 500},
    {"step": 4, "description": "Synthèse et plan d'action priorisé", "analysis_focus": "actionable_roadmap", "duration_hint": 400}
  ],
  "language": "fr",
  "proactive_hints": []
}

User: "What colors should I use for a tech startup?"
{
  "intent": "strategy",
  "summary": "Tech startup color strategy",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "Analyzing tech industry color psychology", "analysis_focus": "industry_psychology", "duration_hint": 400},
    {"step": 2, "description": "Evaluating your brand personality fit", "analysis_focus": "brand_alignment", "duration_hint": 500},
    {"step": 3, "description": "Creating a cohesive palette recommendation", "analysis_focus": "palette_creation", "duration_hint": 500}
  ],
  "language": "en",
  "proactive_hints": ["I can apply this palette to your site immediately", "Consider how these colors work in dark mode"]
}

User: "Salut!"
{
  "intent": "greeting",
  "summary": "Greeting",
  "needs_thinking": false,
  "thinking_steps": [],
  "language": "fr",
  "proactive_hints": []
}
"##;

/// System prompt for executing a thinking step
const STEP_EXECUTION_PROMPT: &str = r##"You are a senior web agency expert executing step {step_num} of {total_steps} in your analysis workflow.

## Current Step
**"{step_description}"**

Focus area: {analysis_focus}

## Context
**User's request:** "{user_message}"

**Website data:**
{website_context}

**Previous findings:**
{previous_results}

## Your Task
Analyze like an expert consultant. Look for:
- Patterns and opportunities
- Gaps and improvement areas
- Industry best practices comparisons
- Actionable insights

## Response Format
```json
{{
  "step": {step_num},
  "insight": "<Expert-level insight in {language}. Be specific, confident, and actionable. 1-2 impactful sentences.>",
  "found_relevant": true/false,
  "data": {{
    "key_findings": ["<finding1>", "<finding2>"],
    "opportunities": ["<opportunity if found>"],
    "concerns": ["<issue if found>"],
    "metrics": {{}},
    "recommendations_preview": ["<brief rec if obvious>"]
  }}
}}
```

## Quality Standards
- **Be specific**: "Your hero lacks a clear CTA" not "Could improve"
- **Be confident**: "I recommend..." not "You might consider..."
- **Be actionable**: Insights should point to next steps
- **Be professional**: Write like presenting to a client
- **Match language**: Respond in {language}
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

    // Use GPT-4o-mini for intent analysis - faster and cheaper than GPT-4
    // This is a simple classification task that doesn't need full GPT-4 capabilities
    let completion = router.chat(messages, None, Some("gpt-4o-mini")).await?;

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
                proactive_hints: vec![],
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
