//! V1 MVP: Onboarding API handlers
//! 
//! Routes for the GitHub onboarding flow:
//! - Skip GitHub import (demo mode)
//! - Get onboarding state
//! - Update onboarding step

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use asap_core_shared::Claims;

// ============================================
// Types
// ============================================

#[derive(Debug, Serialize)]
pub struct OnboardingState {
    pub current_step: String,
    pub github_connected: bool,
    pub github_username: Option<String>,
    pub selected_repos: Vec<String>,
    pub profile_completed: bool,
    pub published: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStepRequest {
    pub step: String,
}

#[derive(Debug, FromRow)]
struct WebsiteRow {
    #[allow(dead_code)]
    id: Uuid,
    account_id: Uuid,
    status: String,
}

#[derive(Debug, FromRow)]
struct WebsiteOwnerRow {
    #[allow(dead_code)]
    id: Uuid,
    account_id: Uuid,
}

// ============================================
// Handlers
// ============================================

/// Get onboarding state for a website
pub async fn get_onboarding_state(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteRow> = sqlx::query_as(
        "SELECT id, account_id, status FROM websites WHERE id = $1"
    )
    .bind(website_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
    };

    if website.account_id != account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Not authorized"
        }))).into_response();
    }

    // V1: Return mock onboarding state
    // In production, this would be stored in the database
    let state = OnboardingState {
        current_step: "github_connect".to_string(),
        github_connected: false,
        github_username: None,
        selected_repos: vec![],
        profile_completed: false,
        published: website.status == "published",
    };

    (StatusCode::OK, Json(state)).into_response()
}

/// Skip GitHub import (demo mode)
pub async fn skip_github_import(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteOwnerRow> = sqlx::query_as(
        "SELECT id, account_id FROM websites WHERE id = $1"
    )
    .bind(website_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
    };

    if website.account_id != account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Not authorized"
        }))).into_response();
    }

    // V1: Just acknowledge the skip - no state to update yet
    tracing::info!("User {} skipped GitHub import for website {}", claims.sub, website_id);
    
    StatusCode::NO_CONTENT.into_response()
}

/// Update onboarding step
pub async fn update_onboarding_step(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateStepRequest>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteOwnerRow> = sqlx::query_as(
        "SELECT id, account_id FROM websites WHERE id = $1"
    )
    .bind(website_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
    };

    if website.account_id != account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Not authorized"
        }))).into_response();
    }

    // V1: Just log the step change - no state persistence yet
    tracing::info!(
        "User {} updated onboarding step to '{}' for website {}",
        claims.sub,
        payload.step,
        website_id
    );

    StatusCode::NO_CONTENT.into_response()
}
