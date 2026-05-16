//! Intent Analysis Module
//!
//! Fast intent analysis with minimal latency.
//! Uses a streamlined prompt for quick classification.
//! Supports TRUE real-time streaming of ALL content - thoughts, plans, insights.

use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

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
const INTENT_ANALYSIS_PROMPT: &str = r##"You are a Senior Digital Project Manager AI thinking through a user's request in real-time.

Output JSON only (be fast - under 200 tokens):
{
  "intent": "<category>",
  "summary": "<1 sentence understanding in user's language>",
  "reasoning": "<2 sentences: what you notice and your approach>",
  "needs_thinking": <true for requests needing analysis/data>,
  "thinking_steps": [
    {
      "step": 1, 
      "description": "<20-word task in user's language>",
      "specialist": "<analyst|writer|designer|strategist|researcher>",
      "requires_data": <true if needs website info>,
      "tools_needed": ["get_website_sections", "search_collections"]
    }
  ],
  "language": "<en|fr|es|de>",
  "hypotheses": ["<assumption if any>"]
}

Categories: modify_content, add_section, remove_section, change_style, reorganize, analyze, question, greeting, strategy, optimize, create_content, audit, other

**Key Rules:**
1. reasoning = natural thoughts: "Je vois que... Cela nécessite... Mon approche..."
2. thinking_steps = 1-3 steps MAX (be efficient!)
3. Set requires_data=true + list tools_needed when you need website info
4. Simple greetings: needs_thinking=false, no steps
5. Match user's language exactly
"##;

/// Prompt for step execution - specialist agent executing their task with detailed reasoning
const STEP_EXECUTION_PROMPT: &str = r##"You are a {specialist} executing task {step_num}/{total_steps}.

TASK: "{step_description}"

Context:
- User asked: "{user_message}"
- Website: {website_context}
- Previous findings: {previous_results}

Output JSON (be specific and fast - under 250 tokens):
{{
  "step": {step_num}, 
  "thinking": "<1 sentence: what you're examining>",
  "insight": "<3 sentences in {language}. Be SPECIFIC with examples, numbers, and actionable advice.>", 
  "found_relevant": true,
  "key_observations": ["<specific finding 1>", "<specific finding 2>"],
  "recommendations": ["<actionable rec>"]
}}

Guidelines:
- SPECIFIC: "Header 'Welcome' lacks value prop" NOT "Header could improve"
- QUANTIFY: "3 CTAs compete" NOT "Too many CTAs"
- ACTIONABLE: Direct next steps
- Language: {language}
"##;

/// Analyze user intent with a quick AI call
/// Uses GPT-4o-mini for simple requests, GPT-4o for complex analysis requests
///
/// # Errors
/// Returns AIError if the AI call fails. Parse errors use a heuristic fallback
/// with a warning logged, as this should not block the user experience.
pub async fn analyze_intent(router: &ModelRouter, user_message: &str) -> AIResult<IntentAnalysis> {
    let messages = vec![
        Message::system(INTENT_ANALYSIS_PROMPT),
        Message::user(user_message),
    ];

    // Use GPT-4o-mini by default for fast intent analysis
    // Only use GPT-4o for very complex strategic analysis
    let lower = user_message.to_lowercase();
    let is_very_complex = (lower.contains("stratégie")
        || lower.contains("strategy")
        || lower.contains("audit complet")
        || lower.contains("full audit"))
        && user_message.len() > 150;

    let model = if is_very_complex {
        Some("gpt-4o")
    } else {
        Some("gpt-4o-mini")
    };
    let max_tokens = Some(300); // Consistent token limit

    let completion = router.chat(messages, max_tokens, model).await?;

    // Parse JSON response
    let content = completion.content.trim();

    // Extract JSON from potential markdown/noise
    let json_str = extract_json(content);

    // Try to parse, with fallback for malformed responses
    match serde_json::from_str::<IntentAnalysis>(json_str) {
        Ok(analysis) => Ok(analysis),
        Err(e) => {
            // Log the error with full context for debugging
            tracing::error!(
                error = %e,
                raw_content = content,
                extracted_json = json_str,
                user_message_len = user_message.len(),
                model = model.unwrap_or("default"),
                "INTENT_PARSE_FAILED: AI returned malformed JSON, using heuristic fallback"
            );

            // Return a fallback that indicates it was degraded
            let mut fallback = smart_fallback_intent(user_message);
            fallback.reasoning = format!(
                "[Fallback mode - AI response was malformed] {}",
                fallback.reasoning
            );

            Ok(fallback)
        }
    }
}

/// Streaming prompt for intent analysis - outputs reasoning token by token
const STREAMING_INTENT_PROMPT: &str = r##"You are a Senior Digital Project Manager AI. Think OUT LOUD in 2-3 sentences.

FORMAT:
1. Your REASONING (natural, in user's language):
   "Je vois que... Cela nécessite... Mon approche..."

2. Then PLAN_START followed by JSON:
{
  "intent": "<category>",
  "summary": "<1 sentence in user's language>",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "<20-word task>", "specialist": "<type>", "requires_data": true, "tools_needed": ["tool1"]}
  ],
  "language": "<en|fr|es|de>"
}

Categories: modify_content, add_section, remove_section, change_style, analyze, question, greeting, strategy, optimize, audit, other
Specialists: analyst, writer, designer, strategist, researcher

Rules:
- Start with natural reasoning, then PLAN_START
- Keep it brief (under 250 tokens total)
- Match user's language
- 1-3 thinking_steps MAX
"##;

/// Analyze intent with REAL-TIME streaming of reasoning tokens
/// Returns events via channel as tokens are generated
///
/// # Error Handling
/// - Stream errors are sent to the channel AND returned as AIError
/// - Parse errors use heuristic fallback with warning notification
pub async fn analyze_intent_streaming(
    router: &ModelRouter,
    user_message: &str,
    event_tx: mpsc::Sender<StreamEvent>,
) -> AIResult<IntentAnalysis> {
    let messages = vec![
        Message::system(STREAMING_INTENT_PROMPT),
        Message::user(user_message),
    ];

    // Use GPT-4o-mini for fast streaming intent analysis
    let model = "gpt-4o-mini";

    // Start streaming
    let mut stream = router.chat_stream(messages, None, Some(model)).await?;

    let mut full_content = String::new();
    let mut in_json = false;

    while let Some(result) = stream.next().await {
        match result {
            Ok(token) => {
                full_content.push_str(&token);

                // Check if we've hit the JSON marker
                if full_content.contains("PLAN_START") && !in_json {
                    in_json = true;
                    continue;
                }

                // Stream reasoning tokens (before JSON)
                if !in_json && !token.contains("PLAN_START") {
                    let _ = event_tx.send(StreamEvent::ReasoningToken(token)).await;
                }
            }
            Err(e) => {
                // Log the error with context
                tracing::error!(
                    error = %e,
                    content_so_far = full_content,
                    user_message_len = user_message.len(),
                    "STREAM_ERROR: Intent analysis stream failed"
                );

                // Notify the channel about the error
                let _ = event_tx
                    .send(StreamEvent::Error(format!(
                        "Stream error during intent analysis: {}",
                        e
                    )))
                    .await;

                return Err(e);
            }
        }
    }

    // Parse the JSON part
    let json_part = full_content
        .split("PLAN_START")
        .nth(1)
        .unwrap_or(&full_content);
    let json_str = extract_json(json_part);

    let analysis = match serde_json::from_str::<IntentAnalysis>(json_str) {
        Ok(mut analysis) => {
            // Extract reasoning from the non-JSON part
            let reasoning = full_content
                .split("PLAN_START")
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            analysis.reasoning = reasoning;
            analysis
        }
        Err(e) => {
            // Log detailed error for debugging
            tracing::error!(
                error = %e,
                full_content = full_content,
                json_part = json_part,
                extracted_json = json_str,
                "STREAMING_INTENT_PARSE_FAILED: Using heuristic fallback"
            );

            // Notify the channel that we're using fallback
            let _ = event_tx
                .send(StreamEvent::Warning(
                    "Intent analysis returned malformed data, using simplified processing"
                        .to_string(),
                ))
                .await;

            let mut fallback = smart_fallback_intent(user_message);
            fallback.reasoning = format!(
                "[Fallback mode] {}",
                full_content.split("PLAN_START").next().unwrap_or("").trim()
            );
            fallback
        }
    };

    let _ = event_tx
        .send(StreamEvent::IntentCompleted(analysis.clone()))
        .await;

    Ok(analysis)
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

    let (intent, needs_thinking) = if lower.contains("ajoute")
        || lower.contains("add")
        || lower.contains("créer")
        || lower.contains("create")
    {
        ("add_section", true)
    } else if lower.contains("supprime") || lower.contains("remove") || lower.contains("delete") {
        ("remove_section", true)
    } else if lower.contains("change") || lower.contains("modifie") || lower.contains("update") {
        ("modify_content", false)
    } else if lower.contains("couleur")
        || lower.contains("color")
        || lower.contains("style")
        || lower.contains("design")
    {
        ("change_style", true)
    } else if lower.contains("analyse") || lower.contains("analyze") || lower.contains("audit") {
        ("analyze", true)
    } else if lower.starts_with("salut")
        || lower.starts_with("bonjour")
        || lower.starts_with("hello")
        || lower.starts_with("hi")
    {
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
        previous_results
            .iter()
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

    // Use gpt-4o-mini for faster insights, still good quality
    let completion = router
        .chat(messages, Some(250), Some("gpt-4o-mini"))
        .await?;

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
                insight: format!(
                    "{} - Analysis completed by {} specialist",
                    step.description, specialist
                ),
                found_relevant: true,
                key_observations: vec![],
                recommendations: vec![],
                data: serde_json::json!({}),
            })
        }
    }
}

/// Event emitted during streaming - covers ALL phases
#[derive(Debug, Clone)]
pub enum StreamEvent {
    // === Intent Analysis Phase ===
    /// Raw reasoning token during intent analysis
    ReasoningToken(String),
    /// Intent analysis completed
    IntentCompleted(IntentAnalysis),

    // === Thinking Step Phase ===
    /// Step started (with description)
    StepStarted {
        step: u32,
        total: u32,
        description: String,
        specialist: String,
    },
    /// Thinking text token during step execution
    ThinkingToken { step: u32, token: String },
    /// Insight text token during step execution  
    InsightToken { step: u32, token: String },
    /// Step completed with full result
    StepCompleted(StepResult),

    // === Status Events ===
    /// Warning (non-fatal issue, operation continues with degraded quality)
    Warning(String),
    /// Error during execution (fatal, operation may abort)
    Error(String),
}

/// Legacy alias for backwards compatibility
pub type ThoughtStreamEvent = StreamEvent;

/// Execute a thinking step with streaming output
/// Streams tokens as they are generated for ChatGPT-like UX
#[allow(clippy::too_many_arguments)]
pub async fn execute_thinking_step_streaming(
    router: &ModelRouter,
    step: &ThinkingStep,
    total_steps: u32,
    user_message: &str,
    context: &WebsiteContext,
    language: &str,
    previous_results: &[StepResult],
    event_tx: mpsc::Sender<ThoughtStreamEvent>,
) -> AIResult<StepResult> {
    // Build richer context
    let website_context = build_rich_context(context);

    // Build previous results string with key findings
    let previous_str = if previous_results.is_empty() {
        "No previous findings yet.".to_string()
    } else {
        previous_results
            .iter()
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

    // Use a fast streaming-friendly prompt
    let streaming_prompt = format!(
        r##"You are a {specialist} executing task {step_num}/{total_steps}.

TASK: "{step_description}"

Context:
- User: "{user_message}"
- Website: {website_context}
- Previous: {previous_results}

Stream naturally in {language}:
1. THINKING (1 sentence): What you're examining
2. INSIGHT_START then your finding (3 sentences, specific with examples)
3. JSON_START then: {{"found_relevant": true, "key_observations": ["..."], "recommendations": ["..."]}}

Be SPECIFIC and fast."##,
        specialist = specialist,
        step_num = step.step,
        total_steps = total_steps,
        step_description = step.description,
        user_message = user_message,
        website_context = website_context,
        previous_results = previous_str,
        language = language
    );

    let messages = vec![
        Message::system(&streaming_prompt),
        Message::user("Begin your analysis now. Think step by step."),
    ];

    // Send step started event IMMEDIATELY
    let _ = event_tx
        .send(StreamEvent::StepStarted {
            step: step.step,
            total: total_steps,
            description: step.description.clone(),
            specialist: specialist.to_string(),
        })
        .await;

    // Start streaming with faster model
    let mut stream = router
        .chat_stream(messages, None, Some("gpt-4o-mini"))
        .await?;

    let mut full_content = String::new();
    let mut current_section = "thinking"; // thinking, insight, json

    while let Some(result) = stream.next().await {
        match result {
            Ok(token) => {
                full_content.push_str(&token);

                // Check for section markers
                if full_content.contains("INSIGHT_START") && current_section == "thinking" {
                    current_section = "insight";
                    continue;
                }
                if full_content.contains("JSON_START") && current_section == "insight" {
                    current_section = "json";
                    continue;
                }

                // Stream tokens based on current section with step info
                match current_section {
                    "thinking" => {
                        if !token.contains("INSIGHT_START") {
                            let _ = event_tx
                                .send(StreamEvent::ThinkingToken {
                                    step: step.step,
                                    token,
                                })
                                .await;
                        }
                    }
                    "insight" => {
                        if !token.contains("JSON_START") && !token.contains("INSIGHT_START") {
                            let _ = event_tx
                                .send(StreamEvent::InsightToken {
                                    step: step.step,
                                    token,
                                })
                                .await;
                        }
                    }
                    _ => {} // JSON section - don't stream
                }
            }
            Err(e) => {
                let _ = event_tx.send(StreamEvent::Error(e.to_string())).await;
                return Err(e);
            }
        }
    }

    // Parse the final result
    let result = parse_streaming_result(
        &full_content,
        step.step,
        specialist,
        &step.description,
        language,
    );

    let _ = event_tx
        .send(StreamEvent::StepCompleted(result.clone()))
        .await;

    Ok(result)
}

/// Parse the streaming output into a StepResult
fn parse_streaming_result(
    content: &str,
    step_num: u32,
    specialist: &str,
    description: &str,
    _language: &str,
) -> StepResult {
    // Extract sections
    let thinking = content
        .split("INSIGHT_START")
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    let insight = content
        .split("INSIGHT_START")
        .nth(1)
        .and_then(|s| s.split("JSON_START").next())
        .unwrap_or("")
        .trim()
        .to_string();

    // Try to parse JSON section
    let json_section = content.split("JSON_START").nth(1).unwrap_or("{}");

    let json_str = extract_json(json_section);

    #[derive(Deserialize, Default)]
    struct JsonData {
        #[serde(default)]
        found_relevant: bool,
        #[serde(default)]
        key_observations: Vec<String>,
        #[serde(default)]
        recommendations: Vec<String>,
    }

    let json_data: JsonData = serde_json::from_str(json_str).unwrap_or_default();

    let has_insight = !insight.is_empty();

    StepResult {
        step: step_num,
        thinking: if thinking.is_empty() {
            format!("Analyzing based on {} expertise", specialist)
        } else {
            thinking
        },
        insight: if insight.is_empty() {
            format!("{} - Analysis completed.", description)
        } else {
            insight
        },
        found_relevant: json_data.found_relevant || has_insight,
        key_observations: json_data.key_observations,
        recommendations: json_data.recommendations,
        data: serde_json::json!({}),
    }
}

/// Build rich context for detailed step execution
fn build_rich_context(context: &WebsiteContext) -> String {
    let title = context.website.title.as_deref().unwrap_or("Untitled Site");

    // Build sections info with more detail from properties
    let sections_info: Vec<String> = context
        .sections
        .iter()
        .take(10)
        .map(|s| {
            let content_preview = s
                .properties
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
                format!(
                    "{}(\"{}\")",
                    s.section_type,
                    content_preview.chars().take(30).collect::<String>()
                )
            }
        })
        .collect();

    // Get theme info from the theme JSON value
    let theme_info = if context.theme.is_object() {
        let colors = context.theme.get("colors").and_then(|c| c.as_object());
        let fonts = context.theme.get("fonts").and_then(|f| f.as_object());
        let primary = colors
            .and_then(|c| c.get("primary"))
            .and_then(|v| v.as_str())
            .unwrap_or("#000");
        let font = fonts
            .and_then(|f| f.get("heading"))
            .and_then(|v| v.as_str())
            .unwrap_or("default");
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
    if lower.contains("bonjour")
        || lower.contains("merci")
        || lower.contains("s'il")
        || lower.contains("ajoute")
        || lower.contains("modifie")
        || lower.contains("supprime")
    {
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
