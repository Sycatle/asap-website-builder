//! Vision and screenshot endpoints for AI
//!
//! Handles screenshot upload, retrieval, and GPT-4 Vision analysis.

use axum::{
    extract::{multipart::Multipart, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use asap_core_ai::AIOrchestrator;
use crate::Claims;

use super::conversation::save_message;
use super::helpers::{get_account_id, verify_website_ownership};
use super::types::{
    ErrorResponse, VisualAnalyzeRequest, VisualAnalyzeResponse, VisionUploadResponse,
};

// ============================================================================
// Upload Screenshot
// ============================================================================

/// Upload a preview screenshot for AI visual analysis
/// POST /api/v1/ai/vision/upload
///
/// Accepts multipart form data with:
/// - image: The screenshot file (PNG/JPEG)
/// - website_id: The website this screenshot is for
/// - viewport: The viewport used (desktop/tablet/mobile)
pub async fn upload_vision_screenshot(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Result<Json<VisionUploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    // Parse multipart fields
    let mut image_data: Option<bytes::Bytes> = None;
    let mut website_id: Option<Uuid> = None;
    let mut viewport: String = "desktop".to_string();
    let mut content_type: String = "image/png".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ErrorResponse {
            error: format!("Multipart error: {}", e),
            code: "multipart_error".to_string(),
            ..Default::default()
        })))?
    {
        let field_name = field.name().map(|s| s.to_string());

        match field_name.as_deref() {
            Some("image") => {
                content_type = field.content_type()
                    .unwrap_or("image/png")
                    .to_string();
                image_data = Some(field.bytes().await.map_err(|e| {
                    (StatusCode::BAD_REQUEST, Json(ErrorResponse {
                        error: format!("Failed to read image: {}", e),
                        code: "read_error".to_string(),
                        ..Default::default()
                    }))
                })?);
            }
            Some("website_id") => {
                let value = field.text().await.unwrap_or_default();
                website_id = Uuid::parse_str(&value).ok();
            }
            Some("viewport") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    viewport = value;
                }
            }
            _ => {}
        }
    }

    // Validate required fields
    let image_bytes = image_data.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "No image provided".to_string(), code: "missing_image".to_string(), ..Default::default() }))
    })?;

    let website_id = website_id.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "website_id is required".to_string(), code: "missing_website_id".to_string(), ..Default::default() }))
    })?;

    // Verify website access
    verify_website_ownership(&pool, account_id, website_id)
        .await
        .map_err(|s| {
            (s, Json(ErrorResponse { error: "Website not found or access denied".to_string(), code: "not_found".to_string(), ..Default::default() }))
        })?;

    // Validate image
    if !content_type.starts_with("image/") {
        return Err((StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "File must be an image".to_string(), code: "invalid_content_type".to_string(), ..Default::default() })));
    }

    // Limit image size (10MB max for screenshots)
    if image_bytes.len() > 10 * 1024 * 1024 {
        return Err((StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "Image too large (max 10MB)".to_string(), code: "image_too_large".to_string(), ..Default::default() })));
    }

    // Generate unique image ID
    let image_id = Uuid::new_v4();
    let extension = match content_type.as_str() {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/webp" => "webp",
        _ => "png",
    };
    let filename = format!("{}_{}.{}", viewport, image_id, extension);

    // Store in database (ai_screenshots table)
    // For now, we store as base64 in JSONB - later we'll migrate to R2
    let expires_at = Utc::now() + chrono::Duration::hours(1);

    sqlx::query(
        r#"
        INSERT INTO ai_screenshots (id, account_id, website_id, viewport, filename, content_type, data, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
        "#
    )
    .bind(image_id)
    .bind(account_id)
    .bind(website_id)
    .bind(&viewport)
    .bind(&filename)
    .bind(&content_type)
    .bind(image_bytes.as_ref()) // Store as bytea
    .bind(expires_at)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store screenshot: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to store screenshot".to_string(), code: "storage_error".to_string(), ..Default::default() }))
    })?;

    // Generate URL (internal endpoint to retrieve the image)
    let url = format!("/api/v1/ai/vision/{}", image_id);

    tracing::info!(
        image_id = %image_id,
        website_id = %website_id,
        viewport = %viewport,
        size_bytes = image_bytes.len(),
        "Vision screenshot uploaded"
    );

    Ok(Json(VisionUploadResponse {
        image_id: image_id.to_string(),
        url,
        expires_at,
    }))
}

// ============================================================================
// Retrieve Screenshot
// ============================================================================

/// Retrieve a vision screenshot by ID
/// GET /api/v1/ai/vision/:id
pub async fn get_vision_screenshot(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(image_id): axum::extract::Path<Uuid>,
) -> Result<axum::response::Response, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    // Fetch screenshot (must belong to user and not expired)
    let row: Option<(Vec<u8>, String)> = sqlx::query_as(
        r#"
        SELECT data, content_type
        FROM ai_screenshots
        WHERE id = $1 AND account_id = $2 AND expires_at > NOW()
        "#
    )
    .bind(image_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch screenshot: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string(), code: "db_error".to_string(), ..Default::default() }))
    })?;

    let (data, content_type) = row.ok_or_else(|| {
        (StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Screenshot not found or expired".to_string(), code: "not_found".to_string(), ..Default::default() }))
    })?;

    // Return image with proper content type
    Ok((
        [(header::CONTENT_TYPE, content_type)],
        data
    ).into_response())
}

// ============================================================================
// Vision Analysis
// ============================================================================

/// Analyze a website screenshot using GPT-4 Vision
/// POST /api/v1/ai/vision/analyze
pub async fn analyze_vision(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(orchestrator): Extension<Arc<AIOrchestrator>>,
    Json(req): Json<VisualAnalyzeRequest>,
) -> Result<Json<VisualAnalyzeResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (s, Json(ErrorResponse { error: "Unauthorized".to_string(), code: "unauthorized".to_string(), ..Default::default() }))
    })?;

    // Verify website ownership
    verify_website_ownership(&pool, account_id, req.website_id)
        .await
        .map_err(|s| {
            (s, Json(ErrorResponse { error: "Website not found or access denied".to_string(), code: "not_found".to_string(), ..Default::default() }))
        })?;

    // Verify image exists and belongs to user
    let image_id = Uuid::parse_str(&req.image_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: "Invalid image_id".to_string(), code: "invalid_image_id".to_string(), ..Default::default() }))
    })?;

    let image_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM ai_screenshots WHERE id = $1 AND account_id = $2 AND expires_at > NOW())"
    )
    .bind(image_id)
    .bind(account_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check image: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string(), code: "db_error".to_string(), ..Default::default() }))
    })?;

    if !image_exists {
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Screenshot not found or expired".to_string(), code: "image_not_found".to_string(), ..Default::default() })));
    }

    // Build image URL (internal endpoint)
    // Note: For OpenAI Vision, we need a publicly accessible URL or base64 data
    // Since our screenshots are stored in DB, we'll fetch and convert to base64 data URL
    let (image_data, content_type): (Vec<u8>, String) = sqlx::query_as(
        "SELECT data, content_type FROM ai_screenshots WHERE id = $1"
    )
    .bind(image_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch image data: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to retrieve image".to_string(), code: "fetch_error".to_string(), ..Default::default() }))
    })?;

    // Convert to base64 data URL for OpenAI Vision API
    let base64_image = general_purpose::STANDARD.encode(&image_data);
    let image_url = format!("data:{};base64,{}", content_type, base64_image);

    // Build analysis prompt based on focus
    let focus_instruction = match req.focus.as_str() {
        "layout" => "Focus your analysis on the layout structure, visual hierarchy, and how elements are arranged on the page.",
        "colors" => "Focus your analysis on the color scheme, color harmony, contrast, and whether the colors effectively communicate the intended mood/brand.",
        "typography" => "Focus your analysis on typography choices, font sizes, line heights, readability, and typographic hierarchy.",
        "spacing" => "Focus your analysis on whitespace usage, margins, padding, and overall breathing room between elements.",
        "specific_section" => {
            if let Some(ref section) = req.section {
                &format!("Focus your analysis specifically on the '{}' section.", section)
            } else {
                "Analyze the specific section mentioned by the user."
            }
        }
        _ => "Provide a comprehensive UI/UX analysis covering layout, colors, typography, and overall design quality.",
    };

    let specific_question = req.question.as_deref().unwrap_or("");

    let vision_prompt = format!(
        r#"You are an expert UI/UX designer analyzing a website screenshot.

The user asked: "{}"
{}
Viewport: {} view

{}

Provide actionable, specific feedback. Reference what you actually see in the screenshot.
Be constructive and suggest improvements with specific recommendations.
Keep your response focused and organized.
Respond in the same language as the user's question."#,
        req.original_message,
        if !specific_question.is_empty() { format!("Specific question: {}", specific_question) } else { String::new() },
        req.viewport,
        focus_instruction
    );

    // Get or create conversation
    let conversation_id = req.conversation_id.unwrap_or_else(Uuid::new_v4);

    // Ensure conversation exists
    let _ = sqlx::query(
        r#"
        INSERT INTO ai_conversations (id, account_id, website_id, title, context_summary, last_intent)
        VALUES ($1, $2, $3, $4, '', '{}')
        ON CONFLICT (id) DO NOTHING
        "#
    )
    .bind(conversation_id)
    .bind(account_id)
    .bind(req.website_id)
    .bind(&req.original_message[..req.original_message.len().min(100)])
    .execute(&pool)
    .await;

    // Call GPT-4 Vision
    let openai_config = orchestrator.config().openai.clone();
    if openai_config.api_key.is_empty() {
        return Err((StatusCode::SERVICE_UNAVAILABLE, Json(ErrorResponse { error: "OpenAI not configured".to_string(), code: "provider_unavailable".to_string(), ..Default::default() })));
    }

    let openai = asap_core_ai::OpenAIProvider::new(openai_config);

    let vision_result = openai.chat_with_vision(
        &vision_prompt,
        vec![image_url],
        None, // No additional system prompt
        Some("gpt-4o"), // Use GPT-4 Vision
        Some(2000), // Max tokens for detailed analysis
    ).await;

    let analysis = match vision_result {
        Ok(response) => {
            // ChatCompletion has direct content field
            if response.content.is_empty() {
                "Unable to analyze image.".to_string()
            } else {
                response.content
            }
        }
        Err(e) => {
            tracing::error!("Vision analysis failed: {:?}", e);
            return Err((StatusCode::BAD_GATEWAY, Json(ErrorResponse { error: "Vision analysis failed".to_string(), code: "vision_error".to_string(), ..Default::default() })));
        }
    };

    // Save the analysis as an AI message in the conversation
    let _ = save_message(
        &pool,
        conversation_id,
        "assistant",
        &analysis,
        None,
        None,
    ).await;

    tracing::info!(
        image_id = %image_id,
        conversation_id = %conversation_id,
        focus = %req.focus,
        viewport = %req.viewport,
        "Visual analysis completed"
    );

    Ok(Json(VisualAnalyzeResponse {
        analysis,
        conversation_id,
    }))
}
