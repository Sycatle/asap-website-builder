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

use asap_core_domain::{
    derive_tokens, BrandBrief, ColorMode, DesignTokens, Formality, HarmonyScheme,
};
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
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid website ID format"
                })),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteRow> =
        sqlx::query_as("SELECT id, account_id, status FROM websites WHERE id = $1")
            .bind(website_id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found"
                })),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Not authorized"
            })),
        )
            .into_response();
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
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid website ID format"
                })),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteOwnerRow> =
        sqlx::query_as("SELECT id, account_id FROM websites WHERE id = $1")
            .bind(website_id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found"
                })),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Not authorized"
            })),
        )
            .into_response();
    }

    // V1: Just acknowledge the skip - no state to update yet
    tracing::info!(
        "User {} skipped GitHub import for website {}",
        claims.sub,
        website_id
    );

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
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid website ID format"
                })),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid token"
                })),
            )
                .into_response();
        }
    };

    // Verify ownership
    let website: Option<WebsiteOwnerRow> =
        sqlx::query_as("SELECT id, account_id FROM websites WHERE id = $1")
            .bind(website_id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Website not found"
                })),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Not authorized"
            })),
        )
            .into_response();
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

// ============================================
// Derive design tokens
// ============================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HarmonyChoice {
    Analogous,
    Complementary,
    Triadic,
}

impl From<HarmonyChoice> for HarmonyScheme {
    fn from(value: HarmonyChoice) -> Self {
        match value {
            HarmonyChoice::Analogous => HarmonyScheme::Analogous,
            HarmonyChoice::Complementary => HarmonyScheme::Complementary,
            HarmonyChoice::Triadic => HarmonyScheme::Triadic,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ColorModeChoice {
    Dark,
    Light,
}

impl From<ColorModeChoice> for ColorMode {
    fn from(value: ColorModeChoice) -> Self {
        match value {
            ColorModeChoice::Dark => ColorMode::Dark,
            ColorModeChoice::Light => ColorMode::Light,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FormalityChoice {
    Casual,
    Neutral,
    Formal,
}

impl From<FormalityChoice> for Formality {
    fn from(value: FormalityChoice) -> Self {
        match value {
            FormalityChoice::Casual => Formality::Casual,
            FormalityChoice::Neutral => Formality::Neutral,
            FormalityChoice::Formal => Formality::Formal,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct DeriveTokensRequest {
    /// Seed hex color (extracted from a logo or chosen by the user).
    pub seed_color: String,
    pub sector: Option<String>,
    pub tone: Option<String>,
    pub formality: Option<FormalityChoice>,
    pub mode: Option<ColorModeChoice>,
    pub harmony: Option<HarmonyChoice>,
}

#[derive(Debug, Serialize)]
pub struct DeriveTokensResponse {
    pub tokens: DesignTokens,
}

/// Derive a coherent `DesignTokens` from a seed color and an optional brief.
///
/// Stateless: nothing is persisted. The wizard previews the result and only
/// writes into `websites.metadata.tokens` once the user confirms.
pub async fn derive_tokens_handler(
    Extension(_claims): Extension<Claims>,
    Json(payload): Json<DeriveTokensRequest>,
) -> impl IntoResponse {
    let seed = payload.seed_color.trim().to_string();
    if !is_valid_hex_color(&seed) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "seed_color must be a 6-digit hex color (e.g. #6366f1)"
            })),
        )
            .into_response();
    }

    let brief = BrandBrief {
        sector: payload.sector,
        tone: payload.tone,
        formality: payload.formality.map(Into::into),
        mode: payload.mode.map(Into::into),
        harmony: payload.harmony.map(Into::into),
    };

    let tokens = derive_tokens(&seed, &brief);
    (StatusCode::OK, Json(DeriveTokensResponse { tokens })).into_response()
}

fn is_valid_hex_color(value: &str) -> bool {
    let v = value.trim_start_matches('#');
    v.len() == 6 && v.chars().all(|c| c.is_ascii_hexdigit())
}
