//! Intent Analysis Module
//!
//! Fast intent analysis with minimal latency.
//! Uses a streamlined prompt for quick classification.

use serde::{Deserialize, Serialize};

use crate::error::AIResult;
use crate::router::ModelRouter;
use crate::types::{Message, WebsiteContext};

/// Result of intent analysis - "Chef de Projet Digital" architecture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentAnalysis {
    /// User's detected intent category
    pub intent: String,
    /// Brief summary of what the user wants (in user's language)
    pub summary: String,
    /// Explanation of the reasoning behind the approach
    #[serde(default)]
    pub reasoning: String,
    /// Whether this request needs chain of thoughts (complex operation)
    pub needs_thinking: bool,
    /// Dynamic thinking steps to show (in user's language) - each step is a "task" delegated to a specialist
    #[serde(default)]
    pub thinking_steps: Vec<ThinkingStep>,
    /// Detected user language (for response consistency)
    pub language: String,
    /// Proactive hints for related improvements (expert suggestions)
    #[serde(default)]
    pub proactive_hints: Vec<String>,
    /// Hypotheses/assumptions being made
    #[serde(default)]
    pub hypotheses: Vec<String>,
}

/// A thinking step to display and execute - represents a "task" delegated to a specialist
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
    /// The specialist/agent type handling this task
    #[serde(default = "default_specialist")]
    pub specialist: String,
    /// Whether this step produces visible output
    #[serde(default)]
    pub produces_output: bool,
    /// Internal questions this step will answer
    #[serde(default)]
    pub questions: Vec<String>,
    /// Requires website data (triggers tool call)
    #[serde(default)]
    pub requires_data: bool,
    /// Which tools to use if data is needed
    #[serde(default)]
    pub tools_needed: Vec<String>,
}

fn default_specialist() -> String {
    "analyst".to_string()
}

/// Result of executing a thinking step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    /// Step number that was executed
    pub step: u32,
    /// Internal reasoning process
    #[serde(default)]
    pub thinking: String,
    /// Brief insight from this step (in user's language)
    pub insight: String,
    /// Whether this step found something relevant
    pub found_relevant: bool,
    /// Key specific observations
    #[serde(default)]
    pub key_observations: Vec<String>,
    /// Actionable recommendations
    #[serde(default)]
    pub recommendations: Vec<String>,
    /// Optional data gathered (for next steps)
    #[serde(default)]
    pub data: serde_json::Value,
}

fn default_duration() -> u32 {
    300
}

/// Compact system prompt for fast intent analysis - "Chef de Projet Digital" style
const INTENT_ANALYSIS_PROMPT: &str = r##"You are a Senior Digital Project Manager AI thinking through a user's request in real-time. Your thoughts will be streamed to the user as you reason.

CRITICAL: Think step-by-step like ChatGPT's extended thinking. Show your reasoning process naturally.

Output JSON only:
{
  "intent": "<category>",
  "summary": "<your understanding in 1-2 sentences, in user's language>",
  "reasoning": "<your thought process: 'I'm looking at this request and I notice... This tells me the user wants... My approach will be...'>",
  "needs_thinking": <true for any request that needs analysis>,
  "thinking_steps": [
    {
      "step": 1, 
      "description": "<VERY detailed task: 'Examinons d'abord la structure de votre page d'accueil pour comprendre comment vos services sont présentés aux visiteurs'>",
      "analysis_focus": "<what to look for>",
      "specialist": "<agent type>",
      "duration_hint": 500,
      "produces_output": true,
      "questions": ["<internal question to answer>"],
      "requires_data": <true if needs to fetch website info>,
      "tools_needed": ["get_website_sections", "get_website_theme"]
    }
  ],
  "language": "<en|fr|es|de>",
  "proactive_hints": ["<things the user might not have asked but should know>"],
  "hypotheses": ["<assumptions: 'Je suppose que vous voulez améliorer les conversions' - verification needed>"]
}

Categories: modify_content, add_section, remove_section, change_style, reorganize, analyze, question, greeting, strategy, optimize, create_content, audit, troubleshoot, other

Specialists:
- "data_analyst" 📊: Collects metrics, analyzes structure
- "content_writer" ✍️: Evaluates copy, creates text
- "designer" 🎨: Reviews visual hierarchy, UX
- "strategist" 🧭: Plans user flow, conversion paths
- "validator" ✅: Checks SEO, accessibility
- "researcher" 🔍: Gathers benchmarks, insights

IMPORTANT RULES:
1. reasoning MUST sound natural like inner thoughts: "Je vois que l'utilisateur veut... Cela me fait penser que... Je vais donc..."
2. Each thinking_step description must be 15-30 words, specific and actionable
3. If the request involves analyzing the site, set requires_data=true and list tools_needed
4. Always needs_thinking=true except for pure greetings
5. Match user's language exactly in summary, reasoning, and descriptions
"##;

/// Prompt for step execution - specialist agent executing their task with detailed reasoning
const STEP_EXECUTION_PROMPT: &str = r##"You are a senior {specialist} specialist executing task {step_num}/{total_steps}.

YOUR TASK: "{step_description}"

User's original request: "{user_message}"
Website context: {website_context}
Previous team findings: {previous_results}

Think through this step naturally, as if explaining to a colleague. Stream your thoughts.

Output JSON only:
{{
  "step": {step_num}, 
  "thinking": "<1-2 sentences of what you're looking at and why - natural inner voice>",
  "insight": "<3-4 sentence detailed finding in {language}. Be SPECIFIC: mention actual elements, give concrete observations, actionable recommendations. Never vague.>", 
  "found_relevant": <true if discovered useful information>,
  "key_observations": ["<specific finding 1>", "<specific finding 2>"],
  "recommendations": ["<actionable recommendation if any>"],
  "data": {{"elements_analyzed": [], "issues_found": [], "opportunities": []}}
}}

Guidelines:
- Be SPECIFIC: "The headline 'Welcome' lacks a clear value proposition" NOT "The headline could be improved"
- Show expertise: reference UX principles, conversion best practices
- Quantify when possible: "3 CTAs compete for attention" NOT "Too many CTAs"
- Connect findings to user goals: "This impacts conversion because..."
- Language must be {language}
"##;

/// Analyze user intent with a quick AI call
/// Uses GPT-4o-mini for simple requests, GPT-4o for complex analysis requests
pub async fn analyze_intent(
    router: &ModelRouter,
    user_message: &str,
) -> AIResult<IntentAnalysis> {
    let messages = vec![
        Message::system(INTENT_ANALYSIS_PROMPT),
        Message::user(user_message),
    ];

    // Use GPT-4o for complex-looking requests (analyze, audit, optimize keywords)
    let lower = user_message.to_lowercase();
    let is_complex = lower.contains("analyse") || lower.contains("analyze") 
        || lower.contains("audit") || lower.contains("optimise") || lower.contains("optimize")
        || lower.contains("stratégie") || lower.contains("strategy")
        || lower.contains("améliore") || lower.contains("improve")
        || lower.contains("review") || lower.contains("évalue") || lower.contains("evaluate")
        || user_message.len() > 100;
    
    let model = if is_complex { Some("gpt-4o") } else { Some("gpt-4o-mini") };
    let max_tokens = if is_complex { Some(400) } else { Some(200) };

    let completion = router.chat(messages, max_tokens, model).await?;

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
        reasoning: String::new(),
        needs_thinking,
        thinking_steps: vec![],
        language: lang,
        proactive_hints: vec![],
        hypotheses: vec![],
    }
}

/// Execute a single thinking step with a detailed AI call
/// Uses gpt-4o for complex analysis - specialist agent executes their task with detailed reasoning
pub async fn execute_thinking_step(
    router: &ModelRouter,
    step: &ThinkingStep,
    total_steps: u32,
    user_message: &str,
    context: &WebsiteContext,
    language: &str,
    previous_results: &[StepResult],
) -> AIResult<StepResult> {
    // Build richer context
    let website_context = build_rich_context(context);
    
    // Build previous results string with key findings
    let previous_str = if previous_results.is_empty() {
        "No previous findings yet - you're the first to analyze.".to_string()
    } else {
        previous_results.iter()
            .map(|r| {
                let observations = if r.key_observations.is_empty() {
                    String::new()
                } else {
                    format!(" Key findings: {}", r.key_observations.join(", "))
                };
                format!("Step {}: {}{}", r.step, r.insight, observations)
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    
    // Get specialist name
    let specialist = if step.specialist.is_empty() {
        "analyst"
    } else {
        &step.specialist
    };
    
    // Build the prompt
    let prompt = STEP_EXECUTION_PROMPT
        .replace("{step_num}", &step.step.to_string())
        .replace("{total_steps}", &total_steps.to_string())
        .replace("{step_description}", &step.description)
        .replace("{user_message}", user_message)
        .replace("{website_context}", &website_context)
        .replace("{previous_results}", &previous_str)
        .replace("{language}", language)
        .replace("{specialist}", specialist);
    
    let messages = vec![
        Message::system(&prompt),
        Message::user("Execute your analysis task now. Be thorough and specific."),
    ];
    
    // Use gpt-4o for better quality insights
    let completion = router.chat(messages, Some(300), Some("gpt-4o")).await?;
    
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
                thinking: format!("Analyzing based on {} expertise", specialist),
                insight: format!("{} - Analysis completed by {} specialist", step.description, specialist),
                found_relevant: true,
                key_observations: vec![],
                recommendations: vec![],
                data: serde_json::json!({}),
            })
        }
    }
}

/// Build rich context for detailed step execution
fn build_rich_context(context: &WebsiteContext) -> String {
    let title = context.website.title.as_deref().unwrap_or("Untitled Site");
    
    // Build sections info with more detail from properties
    let sections_info: Vec<String> = context.sections.iter()
        .take(10)
        .map(|s| {
            let content_preview = s.properties
                .as_object()
                .and_then(|obj| {
                    obj.get("headline")
                        .or(obj.get("title"))
                        .or(obj.get("heading"))
                        .and_then(|v| v.as_str())
                })
                .unwrap_or("");
            if content_preview.is_empty() {
                s.section_type.clone()
            } else {
                format!("{}(\"{}\")", s.section_type, content_preview.chars().take(30).collect::<String>())
            }
        })
        .collect();
    
    // Get theme info from the theme JSON value
    let theme_info = if context.theme.is_object() {
        let colors = context.theme.get("colors").and_then(|c| c.as_object());
        let fonts = context.theme.get("fonts").and_then(|f| f.as_object());
        let primary = colors.and_then(|c| c.get("primary")).and_then(|v| v.as_str()).unwrap_or("#000");
        let font = fonts.and_then(|f| f.get("heading")).and_then(|v| v.as_str()).unwrap_or("default");
        format!(" Theme: primary={}, font={}", primary, font)
    } else {
        String::new()
    };
    
    format!(
        "Website: {}\nSections: [{}]{}\nTotal sections: {}",
        title,
        sections_info.join(", "),
        theme_info,
        context.sections.len()
    )
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
