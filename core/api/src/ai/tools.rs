//! Data tools integration for AI
//!
//! Handles tool execution, screenshot capture, and context gathering
//! for AI responses.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;

use asap_core_ai::{
    get_tool_definitions, AIOrchestrator, OpenAIProvider, ToolExecutor, WebsiteContext,
};

// ============================================================================
// Types
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

/// Screenshot capture result
#[derive(Debug)]
pub struct ScreenshotData {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
}

/// Maximum iterations for tool calling loop to prevent infinite loops
const MAX_TOOL_ITERATIONS: usize = 5;

/// Preloaded screenshot handle type alias for clarity
pub type PreloadedScreenshot = tokio::task::JoinHandle<Result<ScreenshotData, String>>;

/// Channel sender for tool events
pub type ToolEventSender = mpsc::UnboundedSender<ToolEvent>;

// ============================================================================
// Screenshot Capture
// ============================================================================

/// Capture a screenshot via the screenshot service
pub async fn capture_screenshot_server_side(
    screenshot_url: &str,
    website_slug: &str,
    viewport: &str,
) -> Result<ScreenshotData, String> {
    let client = reqwest::Client::new();

    #[derive(Serialize)]
    struct CaptureRequest<'a> {
        #[serde(rename = "websiteSlug")]
        website_slug: &'a str,
        viewport: &'a str,
        #[serde(rename = "waitFor")]
        wait_for: u32,
    }

    #[derive(Deserialize)]
    struct CaptureResponse {
        image: String,
        width: u32,
        height: u32,
    }

    let response = client
        .post(format!("{}/capture", screenshot_url))
        .json(&CaptureRequest {
            website_slug,
            viewport,
            wait_for: 1500,
        })
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to screenshot service: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Screenshot service error: {}", error_text));
    }

    let capture: CaptureResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse screenshot response: {}", e))?;

    Ok(ScreenshotData {
        image_base64: capture.image,
        width: capture.width,
        height: capture.height,
    })
}

// ============================================================================
// Tool Helpers
// ============================================================================

/// Get a human-readable description for a tool
pub fn get_tool_description(tool_name: &str) -> &'static str {
    match tool_name {
        "search_collections" => "Recherche dans les collections",
        "search_variables" => "Recherche dans les variables",
        "get_website_sections" => "Analyse des sections du site",
        "get_website_theme" => "Consultation du thème",
        "get_website_settings" => "Consultation des paramètres",
        "list_extensions" => "Liste des extensions",
        "get_page_content" => "Lecture du contenu de page",
        "request_visual_analysis" => "Analyse visuelle du site",
        _ => "Outil de données",
    }
}

/// Truncate tool result to avoid context overflow
fn truncate_tool_result(content: &str, max_len: usize) -> &str {
    if content.len() <= max_len {
        content
    } else {
        &content[..max_len]
    }
}

// ============================================================================
// Data Tools Execution
// ============================================================================

/// Execute data tools with optional real-time event streaming
pub async fn execute_data_tools_with_events(
    orchestrator: &AIOrchestrator,
    context: &WebsiteContext,
    user_message: &str,
    history: &[asap_core_ai::Message],
    preloaded_screenshot: Option<PreloadedScreenshot>,
    event_sender: Option<ToolEventSender>,
) -> Option<DataToolExecution> {
    // Store preloaded screenshot in Option so we can take it when needed
    let mut preloaded_screenshot = preloaded_screenshot;

    // Create OpenAI provider for tools calls
    let openai_config = orchestrator.config().openai.clone();
    if openai_config.api_key.is_empty() {
        tracing::debug!("OpenAI not configured, skipping data tools");
        return None;
    }

    let openai = OpenAIProvider::new(openai_config);
    let tool_definitions = get_tool_definitions();
    let tool_executor = ToolExecutor::new();

    // Build initial messages for the tool call
    let system_prompt = r#"# Expert Web Agency Data Analyst

You are a senior web agency expert gathering intelligence to help a client optimize their website. You have access to powerful tools to search and analyze their website data.

## Your Mission
Gather ALL relevant data to provide expert-level insights. Think like a consultant doing discovery for a major recommendation.

## Tool Strategy

### ALWAYS use tools proactively
- Don't wait to be asked for specific data — anticipate what's needed
- Gather context even if the user's question seems simple
- Cross-reference multiple data sources for comprehensive insights

### Multi-tool approach (call several tools when relevant)
- **"Tell me about my projects"** → `search_collections` (projects) + `get_website_sections` (how displayed) + `get_website_theme` (visual context)
- **"How's my site doing?"** → `get_website_sections` + `get_website_theme` + `get_website_settings` + `request_visual_analysis`
- **"What should I improve?"** → All data tools + `request_visual_analysis`

### Tool iteration - CRITICAL RULES
1. Start with broad searches to understand scope
2. Drill down into specific areas based on initial findings
3. Cross-reference related data for complete picture
4. **NEVER repeat exact same tool call with same arguments** — you already have the result
5. **If you called a tool and got data, USE IT** — don't call it again
6. **Progress forward** — each iteration should gather NEW information, not repeat
7. **STOP when you have enough data** — don't keep calling tools indefinitely

### Visual Analysis Rules
- `request_visual_analysis` — **CALL ONLY ONCE** per conversation
- After receiving "VISUAL_ANALYSIS_COMPLETE", use the insights — don't request again
- Use for UX/UI feedback, conversion analysis, design audits

## Available Data Sources

| Tool | Use For | Expert Tip |
|------|---------|------------|
| `search_collections` | Projects, posts, portfolio items | Check source filters for GitHub vs manual |
| `search_variables` | Config values, integrations | Find customization opportunities |
| `get_website_sections` | Page structure, content | Analyze hierarchy and flow |
| `get_website_theme` | Colors, fonts, spacing | Evaluate brand consistency |
| `get_website_settings` | Site config, metadata | Check SEO basics |
| `list_extensions` | Installed features | Identify unused capabilities |
| `request_visual_analysis` | Screenshot-based UX audit | **ONE TIME ONLY** |
| `analyze_trends` | Research market trends | Use ONLY if user explicitly asks about trends/market research |

## Expert Behaviors

1. **Be thorough** — A senior consultant never gives half-informed advice
2. **Connect the dots** — Relate data from different sources to find patterns
3. **Spot opportunities** — Notice what's missing, not just what's there
4. **Quantify findings** — Count sections, projects, usage patterns
5. **Prioritize insights** — Lead with the most impactful discoveries
6. **Be efficient** — Gather data quickly and move to analysis

## Skip tools ONLY if
- Pure greeting ("Hi!", "Thanks")
- Completely off-topic (not about their website)
- Already have all data from previous tool calls in this conversation
- User is asking about general trends/topics (NOT website-specific) — use analyze_trends tool ONCE if needed

## IMPORTANT: Anti-Loop Protection
If you find yourself about to call the same tool with the same arguments twice, STOP and use the data you already have instead."#;

    let mut messages = vec![asap_core_ai::Message::system(system_prompt)];

    // Add conversation history
    for msg in history {
        messages.push(msg.clone());
    }

    // Add current user message
    messages.push(asap_core_ai::Message::user(user_message));

    let mut all_executed_calls = Vec::new();
    let mut all_context_parts = Vec::new();
    let mut iteration = 0;
    let mut visual_analysis_done = false; // Track if visual analysis was already performed
    let mut previous_tool_calls: Vec<String> = Vec::new(); // Track previous tool calls to detect loops

    // Tool calling loop - continue until AI stops requesting tools or max iterations
    loop {
        iteration += 1;
        if iteration > MAX_TOOL_ITERATIONS {
            tracing::warn!(
                "Data tools reached max iterations ({}), stopping",
                MAX_TOOL_ITERATIONS
            );
            break;
        }

        tracing::debug!("Data tools iteration {}", iteration);

        // Call OpenAI with tools
        let result = openai
            .chat_with_tools(
                messages.clone(),
                Some(&tool_definitions),
                None,       // Use default model
                Some(1024), // Token limit for tool decision
                Some(0.3),  // Lower temperature for deterministic tool selection
            )
            .await;

        let response = match result {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("Data tools call failed at iteration {}: {}", iteration, e);
                break;
            }
        };

        // If no tool calls, AI has finished gathering data
        if response.tool_calls.is_empty() {
            tracing::debug!("AI finished gathering data after {} iterations", iteration);
            break;
        }

        tracing::info!(
            "Iteration {}: AI requested {} data tools: {:?}",
            iteration,
            response.tool_calls.len(),
            response
                .tool_calls
                .iter()
                .map(|t| &t.function.name)
                .collect::<Vec<_>>()
        );

        // Check for duplicate tool calls (AI looping without progress)
        let current_tool_signature: Vec<String> = response
            .tool_calls
            .iter()
            .map(|t| format!("{}:{}", t.function.name, t.function.arguments))
            .collect();

        if iteration > 1 && current_tool_signature == previous_tool_calls {
            tracing::warn!(
                "AI is repeating the same tool calls (iteration {}). Stopping to prevent infinite loop.",
                iteration
            );
            // Add a message explaining why we stopped
            messages.push(asap_core_ai::Message::user(
                "SYSTEM: You are repeating the same tool call. Please use the data you already gathered to answer the user's question."
            ));
            break;
        }
        previous_tool_calls = current_tool_signature;

        // Add assistant message with tool calls to conversation
        // This maintains the conversation flow for the next iteration
        let assistant_content = response.content.clone().unwrap_or_default();
        messages.push(asap_core_ai::Message::assistant(&assistant_content));

        // Execute each tool and collect results
        let mut tool_results_for_continuation = Vec::new();

        for tool_call in &response.tool_calls {
            let tool_name = &tool_call.function.name;
            let description = get_tool_description(tool_name);
            let start_time = std::time::Instant::now();

            // Send tool started event
            if let Some(ref sender) = event_sender {
                let _ = sender.send(ToolEvent::Started {
                    id: tool_call.id.clone(),
                    tool_name: tool_name.clone(),
                    description: description.to_string(),
                });
            }

            tracing::debug!(
                "Executing data tool: {} with args: {}",
                tool_name,
                tool_call.function.arguments
            );

            // Special handling for visual analysis - capture screenshot and analyze server-side
            if tool_name == "request_visual_analysis" {
                // Skip if visual analysis was already done in this request
                if visual_analysis_done {
                    tracing::info!("Skipping duplicate visual analysis request");
                    tool_results_for_continuation.push((
                        tool_call.id.clone(),
                        "ALREADY_COMPLETED: Visual analysis was already performed. Use the previous result.".to_string()
                    ));
                    continue;
                }

                // Parse the tool arguments
                let params: asap_core_ai::VisualAnalysisParams =
                    serde_json::from_str(&tool_call.function.arguments).unwrap_or_else(|_| {
                        asap_core_ai::VisualAnalysisParams {
                            viewport: "desktop".to_string(),
                            focus: "overall".to_string(),
                            section: None,
                            question: None,
                        }
                    });

                // Get website slug for screenshot service
                let website_slug = context.website.slug.clone();

                // OPTIMIZATION #8: Use preloaded screenshot if available and viewport matches
                // Otherwise capture a new one (different viewport requested)
                let can_use_preloaded =
                    params.viewport == "desktop" && preloaded_screenshot.is_some();

                tracing::info!(
                    "Visual analysis for {}: preloaded={}, viewport={}",
                    website_slug,
                    can_use_preloaded,
                    params.viewport
                );

                let capture_result = if can_use_preloaded {
                    // Use preloaded screenshot (captured in parallel during stream start)
                    let handle = preloaded_screenshot.take().unwrap();
                    match handle.await {
                        Ok(result) => {
                            tracing::info!("Using preloaded screenshot (saved ~2-3s)");
                            result
                        }
                        Err(e) => {
                            tracing::warn!("Preloaded screenshot failed, capturing new: {}", e);
                            let screenshot_url = std::env::var("SCREENSHOT_SERVICE_URL")
                                .unwrap_or_else(|_| "http://screenshot:3001".to_string());
                            capture_screenshot_server_side(
                                &screenshot_url,
                                &website_slug,
                                &params.viewport,
                            )
                            .await
                        }
                    }
                } else {
                    // Capture new screenshot (different viewport or no preload)
                    let screenshot_url = std::env::var("SCREENSHOT_SERVICE_URL")
                        .unwrap_or_else(|_| "http://screenshot:3001".to_string());
                    capture_screenshot_server_side(&screenshot_url, &website_slug, &params.viewport)
                        .await
                };

                match capture_result {
                    Ok(screenshot_data) => {
                        tracing::info!(
                            "Screenshot captured successfully: {}x{}",
                            screenshot_data.width,
                            screenshot_data.height
                        );

                        // Build the image data URL for GPT-4 Vision
                        let image_url =
                            format!("data:image/png;base64,{}", screenshot_data.image_base64);

                        // Build analysis prompt based on focus
                        let focus_instruction = match params.focus.as_str() {
                            "layout" => "Focus your analysis on the layout structure, visual hierarchy, and how elements are arranged on the page.",
                            "colors" => "Focus your analysis on the color scheme, color harmony, contrast, and whether the colors effectively communicate the intended mood/brand.",
                            "typography" => "Focus your analysis on typography choices, font sizes, line heights, readability, and typographic hierarchy.",
                            "spacing" => "Focus your analysis on whitespace usage, margins, padding, and overall breathing room between elements.",
                            "specific_section" => {
                                if let Some(ref section) = params.section {
                                    &format!("Focus your analysis specifically on the '{}' section.", section)
                                } else {
                                    "Analyze the specific section mentioned by the user."
                                }
                            }
                            _ => "Provide a comprehensive UI/UX analysis covering layout, colors, typography, and overall design quality.",
                        };

                        let vision_prompt = format!(
                            r#"You are an expert UI/UX designer performing a DETAILED visual analysis of this SPECIFIC website screenshot.

CRITICAL INSTRUCTIONS:
- You MUST describe what you ACTUALLY SEE in the image - real colors, real text, real elements
- DO NOT give generic advice - every point must reference something visible in the screenshot
- Mention specific elements by name (e.g., "the blue header", "the hero section with 'Welcome' text")
- If you see placeholder content or lorem ipsum, point it out
- If you see specific issues (misalignment, color contrast problems, spacing issues), describe them precisely

The user asked: "{}"
Viewport: {} view
Image dimensions: {}x{} pixels

{}

YOUR ANALYSIS MUST:
1. Reference SPECIFIC visual elements you see (buttons, headers, images, text)
2. Mention ACTUAL colors you observe (not generic "nice colors")
3. Point out REAL issues visible in the screenshot
4. Give recommendations that directly relate to what's shown

DO NOT:
- Give generic UI/UX advice that could apply to any website
- Say things like "ensure readability" without pointing to specific text that is/isn't readable
- Make assumptions about things not visible in the screenshot

Respond in the same language as the user's question.

Structure your response:
1. **Ce que je vois** - Describe the actual content/layout visible
2. **Points forts** - Specific elements that work well (with examples from the screenshot)
3. **Points faibles** - Specific issues visible (with precise locations)
4. **Recommandations concrètes** - Actionable fixes for the issues you identified"#,
                            user_message,
                            params.viewport,
                            screenshot_data.width,
                            screenshot_data.height,
                            focus_instruction
                        );

                        // Call GPT-4 Vision for the actual analysis
                        tracing::info!("Calling GPT-4 Vision for visual analysis");
                        let vision_result = openai
                            .chat_with_vision(
                                &vision_prompt,
                                vec![image_url],
                                None, // No additional system prompt
                                Some("gpt-4o"),
                                Some(2000),
                            )
                            .await;

                        match vision_result {
                            Ok(vision_response) => {
                                let analysis = if vision_response.content.is_empty() {
                                    "Unable to analyze image.".to_string()
                                } else {
                                    vision_response.content
                                };

                                tracing::info!("Visual analysis completed successfully");

                                let visual_result = format!(
                                    "[Visual Analysis - {} view]\n\
                                    Screenshot dimensions: {}x{} pixels\n\
                                    Focus: {}\n\n\
                                    Analysis:\n{}",
                                    params.viewport,
                                    screenshot_data.width,
                                    screenshot_data.height,
                                    params.focus,
                                    analysis,
                                );

                                all_context_parts.push(visual_result.clone());

                                // Add result for next iteration so AI knows analysis is done
                                tool_results_for_continuation.push((
                                    tool_call.id.clone(),
                                    format!("VISUAL_ANALYSIS_COMPLETE: {}", visual_result),
                                ));

                                // Mark visual analysis as done to prevent duplicates
                                visual_analysis_done = true;
                                let duration_ms = start_time.elapsed().as_millis() as u64;

                                // Send completed event
                                if let Some(ref sender) = event_sender {
                                    let _ = sender.send(ToolEvent::Completed {
                                        id: tool_call.id.clone(),
                                        tool_name: tool_name.clone(),
                                        success: true,
                                        description: description.to_string(),
                                        duration_ms,
                                        result_preview: Some(
                                            "Analyse visuelle terminée".to_string(),
                                        ),
                                    });
                                }

                                all_executed_calls.push(ExecutedToolCall {
                                    id: tool_call.id.clone(),
                                    tool_name: tool_name.clone(),
                                    success: true,
                                    description: description.to_string(),
                                    duration_ms: Some(duration_ms),
                                });
                            }
                            Err(vision_error) => {
                                tracing::error!("Vision analysis failed: {:?}", vision_error);
                                all_context_parts.push(format!(
                                    "[Visual Analysis - Error]\n\
                                    Screenshot captured ({}x{}) but vision analysis failed: {}.\n\
                                    Please try again.",
                                    screenshot_data.width, screenshot_data.height, vision_error
                                ));
                                let duration_ms = start_time.elapsed().as_millis() as u64;

                                // Send completed event (failed)
                                if let Some(ref sender) = event_sender {
                                    let _ = sender.send(ToolEvent::Completed {
                                        id: tool_call.id.clone(),
                                        tool_name: tool_name.clone(),
                                        success: false,
                                        description: format!("{} (vision failed)", description),
                                        duration_ms,
                                        result_preview: None,
                                    });
                                }

                                all_executed_calls.push(ExecutedToolCall {
                                    id: tool_call.id.clone(),
                                    tool_name: tool_name.clone(),
                                    success: false,
                                    description: format!("{} (vision failed)", description),
                                    duration_ms: Some(duration_ms),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Screenshot capture failed, using structural fallback: {}",
                            e
                        );
                        let duration_ms = start_time.elapsed().as_millis() as u64;

                        // OPTIMIZATION #6: Graceful fallback - provide structural analysis instead
                        let sections_summary = context
                            .sections
                            .iter()
                            .map(|s| {
                                format!(
                                    "- {} ({}): {}",
                                    s.section_type,
                                    s.id,
                                    s.properties
                                        .get("title")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("untitled")
                                )
                            })
                            .collect::<Vec<_>>()
                            .join("\n");

                        all_context_parts.push(format!(
                            "[Visual Analysis - Fallback to Structural Analysis]\n\
                            Screenshot unavailable ({}). Analyzing website structure instead:\n\n\
                            Website: {} ({})\n\
                            Preset: {}\n\
                            Sections ({}):\n{}\n\n\
                            Note: For detailed visual feedback, ensure the website is published and accessible.",
                            e,
                            context.website.title.as_deref().unwrap_or(&context.website.slug),
                            context.website.slug,
                            context.website.preset.as_deref().unwrap_or("default"),
                            context.sections.len(),
                            sections_summary
                        ));

                        // Send completed event (failed)
                        if let Some(ref sender) = event_sender {
                            let _ = sender.send(ToolEvent::Completed {
                                id: tool_call.id.clone(),
                                tool_name: tool_name.clone(),
                                success: false,
                                description: format!("{} (capture failed)", description),
                                duration_ms,
                                result_preview: None,
                            });
                        }

                        all_executed_calls.push(ExecutedToolCall {
                            id: tool_call.id.clone(),
                            tool_name: tool_name.clone(),
                            success: false,
                            description: format!("{} (capture failed)", description),
                            duration_ms: Some(duration_ms),
                        });
                    }
                }

                // Continue processing other tools instead of returning early
                continue;
            }

            // Execute the tool (standard flow)
            let tool_result = tool_executor.execute(tool_call, context).await;
            let duration_ms = start_time.elapsed().as_millis() as u64;

            // Send tool completed event
            if let Some(ref sender) = event_sender {
                let _ = sender.send(ToolEvent::Completed {
                    id: tool_call.id.clone(),
                    tool_name: tool_name.clone(),
                    success: tool_result.success,
                    description: description.to_string(),
                    duration_ms,
                    result_preview: if tool_result.success {
                        Some(truncate_tool_result(&tool_result.content, 100).to_string())
                    } else {
                        None
                    },
                });
            }

            all_executed_calls.push(ExecutedToolCall {
                id: tool_call.id.clone(),
                tool_name: tool_name.clone(),
                success: tool_result.success,
                description: description.to_string(),
                duration_ms: Some(duration_ms),
            });

            // Store result for context
            if tool_result.success {
                all_context_parts.push(format!(
                    "[Data from {}]:\n{}\n",
                    tool_name,
                    truncate_tool_result(&tool_result.content, 2000)
                ));
            }

            // Store result for next iteration
            tool_results_for_continuation.push((tool_call.id.clone(), tool_result.content.clone()));
        }

        // Add tool results as user messages for the next iteration
        // (OpenAI expects tool results with role "tool", but we simulate with user messages)
        for (tool_call_id, result_content) in tool_results_for_continuation {
            messages.push(asap_core_ai::Message::user(format!(
                "[Tool result for {}]: {}",
                tool_call_id, result_content
            )));
        }
    }

    // If no tools were called, return None
    if all_executed_calls.is_empty() {
        tracing::debug!("AI decided no data tools needed");
        return None;
    }

    // Build combined context from all tool results
    let context_additions = if all_context_parts.is_empty() {
        String::new()
    } else {
        format!(
            "\n--- Retrieved Data (from {} tool calls) ---\n{}\n--- End Retrieved Data ---\n",
            all_executed_calls.len(),
            all_context_parts.join("\n")
        )
    };

    tracing::info!(
        "Data tools completed: {} tools executed across {} iterations",
        all_executed_calls.len(),
        iteration
    );

    Some(DataToolExecution {
        context_additions,
        visual_analysis_request: None,
    })
}

/// Execute data tools with real-time streaming via channel
/// Returns a future that executes tools and a receiver for real-time events
pub fn execute_data_tools_streaming_channel(
    orchestrator: Arc<AIOrchestrator>,
    context: WebsiteContext,
    user_message: String,
    history: Vec<asap_core_ai::Message>,
    preloaded_screenshot: Option<PreloadedScreenshot>,
) -> (
    std::pin::Pin<Box<dyn std::future::Future<Output = Option<DataToolExecution>> + Send>>,
    mpsc::UnboundedReceiver<ToolEvent>,
) {
    let (tx, rx) = mpsc::unbounded_channel();

    let future = Box::pin(async move {
        execute_data_tools_with_events(
            &orchestrator,
            &context,
            &user_message,
            &history,
            preloaded_screenshot,
            Some(tx),
        )
        .await
    });

    (future, rx)
}

