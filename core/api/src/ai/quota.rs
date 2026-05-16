//! Quota and status endpoints for the AI subsystem.

use axum::{extract::State, http::StatusCode, Extension, Json};
use sqlx::PgPool;
use std::sync::Arc;

use asap_core_ai::AIOrchestrator;

use crate::Claims;

use super::helpers::{get_account_id, get_plan_daily_limit, get_user_plan};
use super::types::{ErrorResponse, QuotaResponse};

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
        (
            s,
            Json(ErrorResponse {
                error: "Unauthorized".to_string(),
                code: "unauthorized".to_string(),
                ..Default::default()
            }),
        )
    })?;

    let plan = get_user_plan(&pool, account_id).await.map_err(|s| {
        (
            s,
            Json(ErrorResponse {
                error: "Failed to get plan".to_string(),
                code: "internal_error".to_string(),
                ..Default::default()
            }),
        )
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

