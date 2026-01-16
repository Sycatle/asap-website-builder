//! Main HTTP handlers for AI chat
//!
//! Contains the chat, chat_stream, status, and quota endpoints.
//! Implements real-time streaming of AI phases via SSE.

use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    Extension, Json,
};
use futures::stream::{Stream, StreamExt};
use sqlx::PgPool;
use std::collections::HashSet;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;

use asap_core_ai::{
    AIAction, AIChatRequest as CoreAIChatRequest, AIOrchestrator,
    detect_language_simple, IntentAnalysis,
};
use crate::Claims;

use super::context::{load_user_context, load_website_context, load_website_data};
use super::conversation::{get_or_create_conversation, load_conversation_history, save_message};
use super::helpers::{
    ai_error_to_response, format_action_description, get_account_id, get_plan_daily_limit,
    get_user_plan, verify_website_ownership,
};
use super::tools::{capture_screenshot_server_side, execute_data_tools_streaming_channel, ToolEvent, PreloadedScreenshot};
use super::types::*;

// ============================================================================
// Utility Functions
// ============================================================================

/// Clean internal parsing markers from text before sending to frontend
fn clean_marker_text(text: &str) -> String {
    text.replace("PLAN_START", "")
        .replace("INSIGHT_START", "")
        .replace("JSON_START", "")
        .replace("THINKING:", "")
        .replace("PLAN:", "")
        .replace("INSIGHT:", "")
        .trim()
        .to_string()
}

// ============================================================================
// Non-Streaming Chat
// ============================================================================

/// Non-streaming chat endpoint
/// POST /api/v1/ai/chat
pub async fn chat(
    State(pool): State<PgPool>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    tracing::info!("AI Chat request: account_id={}, website_id={}", account_id, req.website_id);

    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            tracing::warn!("Website ownership verification failed: account_id={}, website_id={}", account_id, req.website_id);
            (s, Json(ErrorResponse { error: "Website not found".to_string(), code: "not_found".to_string(), ..Default::default() }))
        })?;

    // Get user plan
    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to get plan".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Load website context
    let context = load_website_context(&pool, account_id, req.website_id).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load website".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Get or create conversation
    let conversation_id = get_or_create_conversation(
        &pool,
        account_id,
        req.website_id,
        req.conversation_id,
        &req.message
    ).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to manage conversation".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Load conversation history
    let history = load_conversation_history(&pool, conversation_id, 20).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load conversation history".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Convert history to AI Message format
    let history_messages: Vec<asap_core_ai::Message> = history.iter().map(|m| {
        match m.role.as_str() {
            "user" => asap_core_ai::Message::user(&m.content),
            "assistant" => asap_core_ai::Message::assistant(&m.content),
            _ => asap_core_ai::Message::user(&m.content),
        }
    }).collect();

    // Save user message
    let _ = save_message(&pool, conversation_id, "user", &req.message, None, None).await;

    // Build AI request with history
    let ai_request = CoreAIChatRequest {
        website_id: req.website_id,
        message: req.message,
        conversation_id: Some(conversation_id),
        history: history_messages,
        attachments: vec![],
        stream: false,
    };

    // Call AI
    let (response, _rate_status) = orchestrator
        .chat(&ai_request, context, account_id, &plan)
        .await
        .map_err(|e| ai_error_to_response(e))?;

    // Save assistant response
    let _ = save_message(
        &pool,
        conversation_id,
        "assistant",
        &response.message,
        if response.actions.is_empty() { None } else { Some(&response.actions) },
        Some(response.usage.total_tokens as i32)
    ).await;

    Ok(Json(ChatResponse {
        id: response.id,
        conversation_id,
        message: response.message,
        actions: response.actions,
        usage: response.usage, ..Default::default() }))
}

// ============================================================================
// Streaming Chat (SSE)
// ============================================================================

/// Streaming chat endpoint (SSE)
/// POST /api/v1/ai/chat/stream
pub async fn chat_stream(
    State(pool): State<PgPool>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    tracing::info!("AI Chat Stream request: account_id={}, website_id={}", account_id, req.website_id);

    // Verify ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            tracing::warn!("Website ownership verification failed: account_id={}, website_id={}", account_id, req.website_id);
            (s, Json(ErrorResponse { error: "Website not found".to_string(), code: "not_found".to_string(), ..Default::default() }))
        })?;

    // Get user plan
    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to get plan".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Get plan daily limit for quota info
    let plan_daily_limit = get_plan_daily_limit(&plan);
    // TODO: Get actual daily_used from rate limiter - for now use 0
    let plan_daily_used = 0u32;

    // OPTIMIZATION: Load user context, website data, and website context in PARALLEL
    // This reduces latency from ~3 sequential DB calls to 1 parallel batch
    let (user_context_result, website_data_result, context_result) = tokio::join!(
        load_user_context(&pool, account_id, plan_daily_limit, plan_daily_used),
        load_website_data(&pool, account_id, req.website_id),
        load_website_context(&pool, account_id, req.website_id),
    );

    let user_context = user_context_result.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load user context".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let website_data = website_data_result.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load website data".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let mut context = context_result.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load website".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Inject user and website data into context
    context.user = Some(user_context);
    context.data = website_data.clone();

    // Log website data summary for debugging
    if let Some(ref data) = website_data {
        let var_count: usize = data.variables.iter().map(|g| g.variables.len()).sum();
        let sources: Vec<&str> = data.variables.iter().map(|g| g.source.as_str()).collect();
        let col_slugs: Vec<&str> = data.collections.iter().map(|c| c.slug.as_str()).collect();
        tracing::info!(
            "Website data loaded: {} variables from {:?}, {} collections: {:?}",
            var_count,
            sources,
            data.collections.len(),
            col_slugs
        );
    } else {
        tracing::debug!("No website data loaded for website {}", req.website_id);
    }

    // Clone user message before moving req
    let user_message = req.message.clone();

    // Get or create conversation
    let conversation_id = get_or_create_conversation(
        &pool,
        account_id,
        req.website_id,
        req.conversation_id,
        &user_message
    ).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to manage conversation".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Load conversation history (last 20 messages for context)
    let history = load_conversation_history(&pool, conversation_id, 20).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to load conversation history".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    // Convert history to AI Message format
    let history_messages: Vec<asap_core_ai::Message> = history.iter().map(|m| {
        match m.role.as_str() {
            "user" => asap_core_ai::Message::user(&m.content),
            "assistant" => asap_core_ai::Message::assistant(&m.content),
            _ => asap_core_ai::Message::user(&m.content),
        }
    }).collect();

    // Save user message to conversation
    let pool_for_save = pool.clone();
    let _ = save_message(&pool_for_save, conversation_id, "user", &user_message, None, None).await;

    // Clone necessary data for the stream
    let orchestrator_for_stream = orchestrator.clone();
    let context_for_stream = context.clone();
    let user_message_for_stream = user_message.clone();
    let history_for_stream = history_messages.clone();
    let pool_for_stream = pool.clone();
    let plan_for_stream = plan.clone();

    // OPTIMIZATION #8: Preload screenshot in background at stream start
    let screenshot_url = std::env::var("SCREENSHOT_SERVICE_URL")
        .unwrap_or_else(|_| "http://screenshot:3001".to_string());
    let website_slug_for_screenshot = context.website.slug.clone();
    let preloaded_screenshot: PreloadedScreenshot = tokio::spawn(async move {
        capture_screenshot_server_side(&screenshot_url, &website_slug_for_screenshot, "desktop").await
    });

    // Wrap in Option and Mutex for moving into stream and consuming once
    let preloaded_screenshot_for_stream = std::sync::Arc::new(tokio::sync::Mutex::new(Some(preloaded_screenshot)));

    // Create SSE stream
    let stream = async_stream::stream! {
        // OPTIMIZATION #6: Send Typing event IMMEDIATELY (<50ms perceived latency)
        let typing_event = SseEventData::Typing;
        if let Ok(json) = serde_json::to_string(&typing_event) {
            yield Ok(Event::default().data(json));
        }

        // Send conversation ID so frontend can track it
        let conv_event = SseEventData::Conversation(ConversationData { id: conversation_id });
        if let Ok(json) = serde_json::to_string(&conv_event) {
            yield Ok(Event::default().data(json));
        }

        // OPTIMIZATION #2: Skip intent analysis for short/simple messages
        let is_simple_message = {
            let lower = user_message_for_stream.to_lowercase();
            lower == "ok" || lower == "merci" || lower == "thanks" || lower == "oui" ||
            lower == "non" || lower == "yes" || lower == "no" || lower.starts_with("salut") ||
            lower.starts_with("bonjour") || lower.starts_with("hello") || lower.starts_with("hi")
        };

        // Phase 1: Understanding the request - TRUE REAL-TIME STREAMING
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "understanding".to_string(),
            status: "starting".to_string(),
            message: Some("Réflexion en cours...".to_string()),
            progress: Some(0.0),
            eta_seconds: None,
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }

        // Perform intent analysis with TRUE STREAMING - tokens sent as they arrive
        let intent_analysis = if is_simple_message {
            IntentAnalysis {
                intent: "greeting".to_string(),
                summary: user_message_for_stream.chars().take(50).collect(),
                reasoning: String::new(),
                needs_thinking: false,
                thinking_steps: vec![],
                language: detect_language_simple(&user_message_for_stream),
                proactive_hints: vec![],
                hypotheses: vec![],
            }
        } else {
            // Use STREAMING intent analysis - direct execution with real-time token streaming
            let router = orchestrator_for_stream.router();
            
            // Build the streaming prompt inline
            let streaming_prompt = r##"You are a Senior Digital Project Manager AI. Think through the user's request OUT LOUD - your thoughts will be streamed in real-time.

CRITICAL FORMAT:
1. First, output your REASONING naturally (2-4 sentences, think out loud in user's language):
   "Je vois que l'utilisateur demande... Cela nécessite d'analyser... Mon approche sera..."

2. Then output PLAN_START marker followed by JSON:
{
  "intent": "<category>",
  "summary": "<1-2 sentences understanding in user's language>",
  "needs_thinking": true,
  "thinking_steps": [
    {"step": 1, "description": "<15-30 word task in user's language>", "specialist": "<type>", "requires_data": true, "tools_needed": ["tool1"]}
  ],
  "language": "<en|fr|es|de>"
}

Categories: modify_content, add_section, remove_section, change_style, analyze, question, greeting, strategy, optimize, audit, other
Specialists: data_analyst, content_writer, designer, strategist, validator, researcher

Rules:
- ALWAYS start with natural reasoning before PLAN_START
- needs_thinking=true except for pure greetings
- Match user's language in reasoning and descriptions
"##;

            let messages = vec![
                asap_core_ai::Message::system(streaming_prompt),
                asap_core_ai::Message::user(&user_message_for_stream),
            ];
            
            let mut full_content = String::new();
            let mut in_json = false;
            
            // Start streaming and handle result
            match router.chat_stream(messages, None, Some("gpt-4o")).await {
                Ok(mut stream) => {
                    while let Some(result) = futures::StreamExt::next(&mut stream).await {
                        match result {
                            Ok(token) => {
                                full_content.push_str(&token);
                                
                                // Check if we've hit the JSON marker
                                if full_content.contains("PLAN_START") && !in_json {
                                    in_json = true;
                                    continue;
                                }
                                
                                // Stream reasoning tokens IMMEDIATELY to frontend (before JSON)
                                if !in_json && !token.contains("PLAN_START") {
                                    let thinking_token_event = SseEventData::ThinkingToken(ThinkingTokenData {
                                        token,
                                        step: None,
                                        specialist: None,
                                    });
                                    if let Ok(json) = serde_json::to_string(&thinking_token_event) {
                                        yield Ok(Event::default().data(json));
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Intent token streaming error: {}", e);
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Intent streaming failed: {}", e);
                }
            }
            
            // Parse the JSON part - handle case where full_content might be empty
            if full_content.is_empty() {
                // Fallback for failed streaming
                IntentAnalysis {
                    intent: "other".to_string(),
                    summary: user_message_for_stream.chars().take(50).collect(),
                    reasoning: String::new(),
                    needs_thinking: false,
                    thinking_steps: vec![],
                    language: detect_language_simple(&user_message_for_stream),
                    proactive_hints: vec![],
                    hypotheses: vec![],
                }
            } else {
                let json_part = full_content
                    .split("PLAN_START")
                    .nth(1)
                    .unwrap_or(&full_content);
                
                // Extract JSON from potential markdown/noise
                let json_str = {
                    let trimmed = json_part.trim();
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
                };
                
                match serde_json::from_str::<IntentAnalysis>(json_str) {
                    Ok(mut analysis) => {
                        // Extract reasoning from the non-JSON part and clean markers
                        let reasoning = clean_marker_text(&full_content
                            .split("PLAN_START")
                            .next()
                            .unwrap_or("")
                            .trim()
                            .to_string());
                        analysis.reasoning = reasoning;
                        analysis
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse streaming intent: {} - content: {}", e, json_str);
                        // Smart fallback
                        let lower = user_message_for_stream.to_lowercase();
                        let lang = detect_language_simple(&user_message_for_stream);
                        let (intent, needs_thinking) = if lower.contains("ajoute") || lower.contains("add") {
                            ("add_section", true)
                        } else if lower.contains("analyse") || lower.contains("analyze") || lower.contains("audit") {
                            ("analyze", true)
                        } else {
                            ("other", false)
                        };
                        IntentAnalysis {
                            intent: intent.to_string(),
                            summary: user_message_for_stream.chars().take(40).collect(),
                            reasoning: String::new(),
                            needs_thinking,
                            thinking_steps: vec![],
                            language: lang,
                            proactive_hints: vec![],
                            hypotheses: vec![],
                        }
                    }
                }
            }
        };

        tracing::debug!("Intent analysis: {:?}", intent_analysis);

        // Send understanding complete
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "understanding".to_string(),
            status: "completed".to_string(),
            message: Some(intent_analysis.summary.clone()),
            progress: Some(0.25),
            eta_seconds: None,
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }

        // Phase 2: Gathering context
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "gathering".to_string(),
            status: "starting".to_string(),
            message: Some("Collecte des informations...".to_string()),
            progress: Some(0.3),
            eta_seconds: Some(5),
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }

        // Execute data tools with real-time streaming
        let preloaded = preloaded_screenshot_for_stream.lock().await.take();
        let (tool_future, mut tool_rx) = execute_data_tools_streaming_channel(
            orchestrator_for_stream.clone(),
            context_for_stream.clone(),
            user_message_for_stream.clone(),
            history_for_stream.clone(),
            preloaded,
        );

        // Spawn the tool execution task
        let tool_handle = tokio::spawn(tool_future);
        
        // Stream tool events as they happen
        while let Some(event) = tool_rx.recv().await {
            match event {
                ToolEvent::Started { id, tool_name, description } => {
                    let tool_call_event = SseEventData::ToolCall(ToolCallData {
                        id,
                        tool: tool_name,
                        description,
                        args: None,
                        status: "running".to_string(),
                        ..Default::default()
                    });
                    if let Ok(json) = serde_json::to_string(&tool_call_event) {
                        yield Ok(Event::default().data(json));
                    }
                }
                ToolEvent::Completed { id, tool_name, success, description, duration_ms, result_preview } => {
                    let tool_call_event = SseEventData::ToolCall(ToolCallData {
                        id: id.clone(),
                        tool: tool_name,
                        description: description.clone(),
                        args: None,
                        status: if success { "completed".to_string() } else { "failed".to_string() },
                        duration_ms: Some(duration_ms),
                    });
                    if let Ok(json) = serde_json::to_string(&tool_call_event) {
                        yield Ok(Event::default().data(json));
                    }
                    
                    // Also send tool result
                    let tool_result_event = SseEventData::ToolResult(ToolResultData {
                        tool_call_id: id,
                        success,
                        message: result_preview,
                        ..Default::default()
                    });
                    if let Ok(json) = serde_json::to_string(&tool_result_event) {
                        yield Ok(Event::default().data(json));
                    }
                }
                ToolEvent::VisualAnalysisRequested { tool_call_id, viewport, focus } => {
                    let tool_request_event = SseEventData::ToolRequest(ToolRequestData {
                        request_id: tool_call_id,
                        request_type: "visual_analysis".to_string(),
                        params: serde_json::json!({
                            "viewport": viewport,
                            "focus": focus,
                        }),
                        timeout_seconds: Some(30),
                    });
                    if let Ok(json) = serde_json::to_string(&tool_request_event) {
                        yield Ok(Event::default().data(json));
                    }
                }
            }
        }
        
        // Wait for tool execution to complete and get results
        let data_tool_execution = match tool_handle.await {
            Ok(result) => result,
            Err(e) => {
                tracing::error!("Tool execution task panicked: {}", e);
                None
            }
        };

        // Handle visual analysis request if present
        if let Some(ref execution) = data_tool_execution {
            if let Some(ref visual_req) = execution.visual_analysis_request {
                let tool_request_event = SseEventData::ToolRequest(ToolRequestData {
                    request_id: visual_req.tool_call_id.clone(),
                    request_type: "capture_screenshot".to_string(),
                    params: serde_json::json!({
                        "viewport": visual_req.viewport,
                        "focus": visual_req.focus,
                        "section": visual_req.section,
                        "question": visual_req.question,
                    }),
                    timeout_seconds: Some(30),
                });
                if let Ok(json) = serde_json::to_string(&tool_request_event) {
                    yield Ok(Event::default().data(json));
                }

                let done_event = SseEventData::Done;
                if let Ok(json) = serde_json::to_string(&done_event) {
                    yield Ok(Event::default().data(json));
                }
            }
        }

        // Check if we should continue with AI generation
        let should_continue = data_tool_execution.as_ref()
            .map(|exec| exec.visual_analysis_request.is_none())
            .unwrap_or(true);

        if !should_continue {
            // Stream already ended with Done event above
        } else {

        // Send phase: generating
        let phase_event = SseEventData::Phase(PhaseData {
            phase: "generating".to_string(),
            status: "starting".to_string(),
            message: Some("Génération de la réponse...".to_string()),
            progress: Some(0.6),
            eta_seconds: Some(10),
        });
        if let Ok(json) = serde_json::to_string(&phase_event) {
            yield Ok(Event::default().data(json));
        }

        // Build AI request with data tool context
        let ai_request = CoreAIChatRequest {
            website_id: req.website_id,
            message: if let Some(ref execution) = data_tool_execution {
                format!("{}\n\n{}", user_message_for_stream, execution.context_additions)
            } else {
                user_message_for_stream.clone()
            },
            conversation_id: Some(conversation_id),
            history: history_for_stream.clone(),
            attachments: vec![],
            stream: true,
        };

        // Start actual AI streaming
        let stream_result = orchestrator_for_stream
            .chat_stream(&ai_request, context_for_stream.clone(), account_id, &plan_for_stream)
            .await;

        match stream_result {
            Ok((mut token_stream, _rate_status)) => {
                // Execute thinking steps (synchronously but with immediate SSE updates)
                let mut step_results: Vec<asap_core_ai::StepResult> = Vec::new();

                if intent_analysis.needs_thinking && !intent_analysis.thinking_steps.is_empty() {
                    let total_steps = intent_analysis.thinking_steps.len() as u32;

                    // Send initial plan overview via PlanStep events for each step
                    for (idx, thinking_step) in intent_analysis.thinking_steps.iter().enumerate() {
                        let plan_step_event = SseEventData::PlanStep(PlanStepData {
                            id: format!("step_{}", thinking_step.step),
                            index: idx as u32,
                            title: thinking_step.description.clone(),
                            description: Some(thinking_step.analysis_focus.clone()),
                            status: "pending".to_string(),
                            specialist: Some(thinking_step.specialist.clone()),
                            error: None,
                            produces_output: Some(thinking_step.produces_output),
                        });
                        if let Ok(json) = serde_json::to_string(&plan_step_event) {
                            yield Ok(Event::default().data(json));
                        }
                    }

                    for thinking_step in &intent_analysis.thinking_steps {
                        // Send running status immediately
                        let plan_step_running = SseEventData::PlanStep(PlanStepData {
                            id: format!("step_{}", thinking_step.step),
                            index: (thinking_step.step - 1) as u32,
                            title: thinking_step.description.clone(),
                            description: Some(thinking_step.analysis_focus.clone()),
                            status: "running".to_string(),
                            specialist: Some(thinking_step.specialist.clone()),
                            error: None,
                            produces_output: Some(thinking_step.produces_output),
                        });
                        if let Ok(json) = serde_json::to_string(&plan_step_running) {
                            yield Ok(Event::default().data(json));
                        }

                        // Check if this step needs data tools FIRST
                        if thinking_step.requires_data && !thinking_step.tools_needed.is_empty() {
                            // Stream tool execution events for each tool
                            for tool_name in &thinking_step.tools_needed {
                                let tool_id = format!("tool_{}_{}", thinking_step.step, tool_name);
                                
                                // Send ToolCall event immediately
                                let tool_call_event = SseEventData::ToolCall(ToolCallData {
                                    id: tool_id.clone(),
                                    tool: tool_name.clone(),
                                    description: format!("Fetching {} data", tool_name.replace("_", " ")),
                                    args: None,
                                    status: "running".to_string(),
                                    duration_ms: None,
                                });
                                if let Ok(json) = serde_json::to_string(&tool_call_event) {
                                    yield Ok(Event::default().data(json));
                                }

                                // Execute tool and stream result
                                let tool_result = match tool_name.as_str() {
                                    "get_website_sections" => {
                                        let sections_summary = context_for_stream.sections.iter()
                                            .map(|s| serde_json::json!({
                                                "type": s.section_type,
                                                "id": s.id
                                            }))
                                            .collect::<Vec<_>>();
                                        serde_json::json!({ "sections": sections_summary })
                                    }
                                    "get_website_theme" => {
                                        context_for_stream.theme.clone()
                                    }
                                    "get_website_settings" => {
                                        serde_json::json!({ "title": context_for_stream.website.title })
                                    }
                                    "list_extensions" => {
                                        // Just signal that extensions were checked
                                        serde_json::json!({ "checked": true })
                                    }
                                    _ => serde_json::json!({ "executed": true })
                                };

                                // Send ToolResult event
                                let tool_result_event = SseEventData::ToolResult(ToolResultData {
                                    tool_call_id: tool_id.clone(),
                                    success: true,
                                    message: Some(format!("{} data loaded", tool_name.replace("_", " "))),
                                    data: Some(tool_result),
                                    duration_ms: None,
                                });
                                if let Ok(json) = serde_json::to_string(&tool_result_event) {
                                    yield Ok(Event::default().data(json));
                                }
                                
                                // Update tool call to completed
                                let tool_complete_event = SseEventData::ToolCall(ToolCallData {
                                    id: tool_id,
                                    tool: tool_name.clone(),
                                    description: format!("{} data loaded", tool_name.replace("_", " ")),
                                    args: None,
                                    status: "completed".to_string(),
                                    duration_ms: Some(50), // Fast in-memory operation
                                });
                                if let Ok(json) = serde_json::to_string(&tool_complete_event) {
                                    yield Ok(Event::default().data(json));
                                }
                            }
                        }

                        // Execute the step with TRUE STREAMING - direct execution
                        let router = orchestrator_for_stream.router();
                        let specialist = if thinking_step.specialist.is_empty() { "analyst" } else { &thinking_step.specialist };
                        
                        // Build rich context
                        let website_title = context_for_stream.website.title.as_deref().unwrap_or("Untitled Site");
                        let sections_info: Vec<String> = context_for_stream.sections.iter()
                            .take(10)
                            .map(|s| s.section_type.clone())
                            .collect();
                        let website_context = format!(
                            "Website: {}\nSections: [{}]\nTotal sections: {}",
                            website_title,
                            sections_info.join(", "),
                            context_for_stream.sections.len()
                        );
                        
                        // Build previous results string
                        let previous_str = if step_results.is_empty() {
                            "No previous findings yet.".to_string()
                        } else {
                            step_results.iter()
                                .map(|r| format!("Step {}: {}", r.step, r.insight))
                                .collect::<Vec<_>>()
                                .join("\n")
                        };
                        
                        // Streaming-friendly prompt
                        let streaming_prompt = format!(r##"You are a senior {specialist} specialist executing task {step_num}/{total_steps}.

YOUR TASK: "{step_description}"

User's request: "{user_message}"
Website: {website_context}
Previous findings: {previous_results}

IMPORTANT: Stream your thoughts naturally as you analyze. Think out loud like a human expert.

First, output your THINKING process (2-3 sentences, natural inner voice):
- What you're examining
- What you notice immediately  
- Your initial assessment

Then output INSIGHT_START marker, followed by your detailed finding (3-5 sentences in {language}):
- Be SPECIFIC: mention actual elements
- Give concrete observations
- Actionable recommendations

Then output JSON_START marker, followed by structured data:
{{"found_relevant": true/false, "key_observations": ["..."], "recommendations": ["..."]}}"##,
                            specialist = specialist,
                            step_num = thinking_step.step,
                            total_steps = total_steps,
                            step_description = thinking_step.description,
                            user_message = user_message_for_stream,
                            website_context = website_context,
                            previous_results = previous_str,
                            language = intent_analysis.language
                        );
                        
                        let messages = vec![
                            asap_core_ai::Message::system(&streaming_prompt),
                            asap_core_ai::Message::user("Begin your analysis now. Think step by step."),
                        ];
                        
                        // Stream the step execution
                        let mut full_content = String::new();
                        let mut current_section = "thinking"; // thinking, insight, json
                        
                        match router.chat_stream(messages, None, Some("gpt-4o")).await {
                            Ok(mut stream) => {
                                while let Some(result) = futures::StreamExt::next(&mut stream).await {
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
                                            
                                            // Stream tokens based on current section
                                            match current_section {
                                                "thinking" => {
                                                    if !token.contains("INSIGHT_START") {
                                                        let thinking_token_event = SseEventData::ThinkingToken(ThinkingTokenData {
                                                            token,
                                                            step: Some(thinking_step.step),
                                                            specialist: Some(specialist.to_string()),
                                                        });
                                                        if let Ok(json) = serde_json::to_string(&thinking_token_event) {
                                                            yield Ok(Event::default().data(json));
                                                        }
                                                    }
                                                }
                                                "insight" => {
                                                    if !token.contains("JSON_START") && !token.contains("INSIGHT_START") {
                                                        let insight_token_event = SseEventData::InsightToken(InsightTokenData {
                                                            token,
                                                            step: Some(thinking_step.step),
                                                        });
                                                        if let Ok(json) = serde_json::to_string(&insight_token_event) {
                                                            yield Ok(Event::default().data(json));
                                                        }
                                                    }
                                                }
                                                _ => {} // JSON section - don't stream
                                            }
                                        }
                                        Err(e) => {
                                            tracing::warn!("Step {} token error: {}", thinking_step.step, e);
                                            break;
                                        }
                                    }
                                }
                                
                                // Parse the result
                                let thinking = clean_marker_text(&full_content
                                    .split("INSIGHT_START")
                                    .next()
                                    .unwrap_or("")
                                    .trim()
                                    .to_string());
                                
                                let insight = clean_marker_text(&full_content
                                    .split("INSIGHT_START")
                                    .nth(1)
                                    .and_then(|s| s.split("JSON_START").next())
                                    .unwrap_or("")
                                    .trim()
                                    .to_string());
                                
                                let result = asap_core_ai::StepResult {
                                    step: thinking_step.step,
                                    thinking,
                                    insight: if insight.is_empty() { thinking_step.description.clone() } else { insight.clone() },
                                    found_relevant: !insight.is_empty(),
                                    key_observations: vec![],
                                    recommendations: vec![],
                                    data: serde_json::json!({}),
                                };
                                
                                // Update step status to done
                                let plan_step_done = SseEventData::PlanStep(PlanStepData {
                                    id: format!("step_{}", thinking_step.step),
                                    index: (thinking_step.step - 1) as u32,
                                    title: thinking_step.description.clone(),
                                    description: Some(result.insight.clone()),
                                    status: "done".to_string(),
                                    specialist: Some(specialist.to_string()),
                                    error: None,
                                    produces_output: Some(thinking_step.produces_output),
                                });
                                if let Ok(json) = serde_json::to_string(&plan_step_done) {
                                    yield Ok(Event::default().data(json));
                                }
                                
                                step_results.push(result);
                            }
                            Err(e) => {
                                tracing::warn!("Step {} streaming failed: {}", thinking_step.step, e);
                                // Update step status to failed
                                let plan_step_failed = SseEventData::PlanStep(PlanStepData {
                                    id: format!("step_{}", thinking_step.step),
                                    index: (thinking_step.step - 1) as u32,
                                    title: thinking_step.description.clone(),
                                    description: Some(format!("Error: {}", e)),
                                    status: "failed".to_string(),
                                    specialist: Some(specialist.to_string()),
                                    error: Some(StepErrorData {
                                        message: e.to_string(),
                                        cause: None,
                                        recoverable: true,
                                    }),
                                    produces_output: Some(thinking_step.produces_output),
                                });
                                if let Ok(json) = serde_json::to_string(&plan_step_failed) {
                                    yield Ok(Event::default().data(json));
                                }
                            }
                        }
                    }
                } else if !intent_analysis.summary.is_empty() {
                    // For simple requests, still show the reasoning if available
                    let thinking = SseEventData::Thinking(ThinkingData {
                        thought: intent_analysis.summary.clone(),
                        step: None,
                        status: Some("completed".to_string()),
                        reasoning: if intent_analysis.reasoning.is_empty() { None } else { Some(intent_analysis.reasoning.clone()) },
                        insight: None,
                        observations: vec![],
                        recommendations: vec![],
                        specialist: None,
                        total_steps: None,
                    });
                    if let Ok(json) = serde_json::to_string(&thinking) {
                        yield Ok(Event::default().data(json));
                    }
                }

                // Buffer for action detection
                let mut full_content = String::new();
                let mut detected_action_count = 0u32;
                let mut in_json_block = false;
                let mut json_buffer = String::new();
                let mut sent_tool_calls: HashSet<String> = HashSet::new();
                let mut parsed_actions: Vec<AIAction> = Vec::new();
                
                // REAL-TIME STREAMING: Send each token immediately as received
                while let Some(result) = token_stream.next().await {
                    match result {
                        Ok(text) => {
                            full_content.push_str(&text);

                            // Detect JSON code blocks for action parsing
                            if text.contains("```json") {
                                in_json_block = true;
                                json_buffer.clear();
                            } else if in_json_block && text.contains("```") {
                                in_json_block = false;
                                if let Ok(action) = serde_json::from_str::<AIAction>(&json_buffer) {
                                    let action_id = format!("action_{}", detected_action_count);
                                    detected_action_count += 1;

                                    parsed_actions.push(action.clone());

                                    if !sent_tool_calls.contains(&action_id) {
                                        sent_tool_calls.insert(action_id.clone());
                                        let tool_call = SseEventData::ToolCall(ToolCallData {
                                            id: action_id.clone(),
                                            tool: action.action_type().to_string(),
                                            description: format_action_description(&action),
                                            args: None,
                                            status: "running".to_string(), ..Default::default() });
                                        if let Ok(json) = serde_json::to_string(&tool_call) {
                                            yield Ok(Event::default().data(json));
                                        }
                                    }

                                    let action_event = SseEventData::Action(action);
                                    if let Ok(json) = serde_json::to_string(&action_event) {
                                        yield Ok(Event::default().data(json));
                                    }

                                    let tool_result = SseEventData::ToolResult(ToolResultData { 
                                        tool_call_id: action_id, 
                                        success: true, 
                                        message: Some("Action queued for execution".to_string()),
                                        ..Default::default() 
                                    });
                                    if let Ok(json) = serde_json::to_string(&tool_result) {
                                        yield Ok(Event::default().data(json));
                                    }
                                }
                                json_buffer.clear();
                            } else if in_json_block {
                                json_buffer.push_str(&text);
                            }

                            // Send token IMMEDIATELY - true real-time streaming
                            let token_event = SseEventData::Token(text);
                            if let Ok(json) = serde_json::to_string(&token_event) {
                                yield Ok(Event::default().data(json));
                            }
                        }
                        Err(err) => {
                            let error_event = SseEventData::Error { 
                                code: err.code().to_string(), 
                                message: err.to_string(),
                                cause: None, 
                                recoverable: None 
                            };
                            if let Ok(json) = serde_json::to_string(&error_event) {
                                yield Ok(Event::default().data(json));
                            }
                        }
                    }
                }

                // Estimate token usage
                let completion_tokens = (full_content.len() / 4) as u32;
                let prompt_tokens = (user_message.len() / 4) as u32 + 500;
                let total_tokens = prompt_tokens + completion_tokens;

                // Save assistant response
                if !full_content.is_empty() {
                    let actions_to_save: Option<&[AIAction]> = if parsed_actions.is_empty() {
                        None
                    } else {
                        Some(&parsed_actions)
                    };
                    let _ = save_message(
                        &pool_for_stream,
                        conversation_id,
                        "assistant",
                        &full_content,
                        actions_to_save,
                        Some(total_tokens as i32)
                    ).await;
                }

                // Send usage event
                let usage_event = SseEventData::Usage(UsageData {
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                });
                if let Ok(json) = serde_json::to_string(&usage_event) {
                    yield Ok(Event::default().data(json));
                }

                // Send done event
                let done = SseEventData::Done;
                if let Ok(json) = serde_json::to_string(&done) {
                    yield Ok(Event::default().data(json));
                }
            }
            Err(e) => {
                let error_event = SseEventData::Error { 
                    code: "stream_error".to_string(), 
                    message: e.to_string(),
                    cause: None, 
                    recoverable: None 
                };
                if let Ok(json) = serde_json::to_string(&error_event) {
                    yield Ok(Event::default().data(json));
                }
            }
        }
        } // End of if should_continue else block
    };

    Ok(Sse::new(stream).keep_alive(
        KeepAlive::default()
            .interval(Duration::from_secs(15))
            .text("keep-alive")
    ))
}

// ============================================================================
// Quota & Status
// ============================================================================

/// Get AI quota information
/// GET /api/v1/ai/quota
pub async fn get_quota(
    State(pool): State<PgPool>,
    Extension(_orchestrator): Extension<Arc<AIOrchestrator>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<QuotaResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Failed to get plan".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let daily_limit = get_plan_daily_limit(&plan);
    let daily_used = 0u32; // TODO: Get actual usage from rate limiter

    let now = chrono::Utc::now();
    let tomorrow = now.date_naive().succ_opt().unwrap();
    let resets_at = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
        tomorrow.and_hms_opt(0, 0, 0).unwrap(),
        chrono::Utc,
    );

    Ok(Json(QuotaResponse {
        plan: plan.clone(),
        daily_limit,
        daily_used,
        daily_remaining: daily_limit.saturating_sub(daily_used),
        resets_at,
    }))
}

/// Check AI service status
/// GET /api/v1/ai/status
pub async fn status(
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
) -> Json<serde_json::Value> {
    let available = orchestrator.is_configured();
    let providers = orchestrator.available_providers();

    Json(serde_json::json!({
        "available": available,
        "providers": providers,
    }))
}

// ============================================================================
// Conversation Endpoints
// ============================================================================

/// List conversations for a website
/// GET /api/v1/ai/conversations?website_id=...
pub async fn list_conversations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ConversationsResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    let website_id = params.get("website_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "website_id is required".to_string(), code: "bad_request".to_string(), ..Default::default() }))
        })?;

    verify_website_ownership(&pool, account_id, website_id).await.map_err(|s| {
        (s, Json(ErrorResponse { error: "Website not found".to_string(), code: "not_found".to_string(), ..Default::default() }))
    })?;

    let rows: Vec<(Uuid, Option<String>, Uuid, i64, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"
        SELECT 
            c.id, c.title, c.website_id,
            COUNT(m.id) as message_count,
            c.created_at, c.updated_at
        FROM ai_conversations c
        LEFT JOIN ai_messages m ON m.conversation_id = c.id
        WHERE c.account_id = $1 AND c.website_id = $2
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT 50
        "#
    )
    .bind(account_id)
    .bind(website_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversations: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to fetch conversations".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let conversations = rows.into_iter().map(|(id, title, website_id, message_count, created_at, updated_at)| {
        ConversationSummary {
            id,
            title,
            website_id,
            message_count,
            created_at,
            updated_at,
        }
    }).collect();

    Ok(Json(ConversationsResponse { conversations }))
}

/// Get conversation details with messages
/// GET /api/v1/ai/conversations/:id
pub async fn get_conversation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(conversation_id): axum::extract::Path<Uuid>,
) -> Result<Json<ConversationDetail>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    let conv: Option<(Uuid, Option<String>, Uuid, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, title, website_id, created_at, updated_at FROM ai_conversations WHERE id = $1 AND account_id = $2"
    )
    .bind(conversation_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch conversation: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to fetch conversation".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let (id, title, website_id, created_at, updated_at) = conv.ok_or_else(|| {
        (StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Conversation not found".to_string(), code: "not_found".to_string(), ..Default::default() }))
    })?;

    let message_rows: Vec<(Uuid, String, String, serde_json::Value, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"
        SELECT id, role, content, COALESCE(actions, '[]'::jsonb), created_at 
        FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY created_at
        "#
    )
    .bind(conversation_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch messages: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to fetch messages".to_string(), code: "internal_error".to_string(), ..Default::default() }))
    })?;

    let messages = message_rows.into_iter().map(|(id, role, content, actions_json, created_at)| {
        let actions: Vec<AIAction> = serde_json::from_value(actions_json).unwrap_or_default();
        ConversationMessageDetail {
            id,
            role,
            content,
            actions,
            created_at,
        }
    }).collect();

    Ok(Json(ConversationDetail {
        id,
        title,
        website_id,
        messages,
        created_at,
        updated_at,
    }))
}

/// Delete a conversation
/// DELETE /api/v1/ai/conversations/:id
pub async fn delete_conversation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(conversation_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    let result = sqlx::query("DELETE FROM ai_conversations WHERE id = $1 AND account_id = $2")
        .bind(conversation_id)
        .bind(account_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete conversation: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to delete conversation".to_string(), code: "internal_error".to_string(), ..Default::default() }))
        })?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Conversation not found".to_string(), code: "not_found".to_string(), ..Default::default() })));
    }

    Ok(StatusCode::NO_CONTENT)
}
