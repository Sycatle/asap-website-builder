//! V1 MVP: GitHub Integration API handlers
//!
//! Routes for GitHub OAuth and repo import:
//! - Initiate OAuth flow
//! - OAuth callback
//! - Fetch user repos
//! - Import repos as projects

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
pub struct OAuthUrlResponse {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackRequest {
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct OAuthCallbackResponse {
    pub success: bool,
    pub username: String,
}

#[derive(Debug, Serialize)]
pub struct GitHubRepo {
    pub id: i64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub homepage: Option<String>,
    pub stargazers_count: i32,
    pub language: Option<String>,
    pub topics: Vec<String>,
    pub pushed_at: String,
    pub fork: bool,
}

#[derive(Debug, Deserialize)]
pub struct ImportReposRequest {
    pub repo_ids: Vec<i64>,
}

#[derive(Debug, Serialize)]
pub struct ImportedProject {
    pub id: String,
    pub title: String,
    pub description: String,
    pub technologies: Vec<String>,
    pub github_url: String,
    pub demo_url: Option<String>,
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

/// Initiate GitHub OAuth flow
/// Returns the URL to redirect to for GitHub authorization
pub async fn initiate_github_oauth(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid website ID format"})),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Invalid token"})),
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
                Json(serde_json::json!({"error": "Website not found"})),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Not authorized"})),
        )
            .into_response();
    }

    // V1 MVP: GitHub OAuth not implemented yet
    // Return a placeholder URL that will show a "coming soon" message
    // In production, this would be the actual GitHub OAuth URL
    let redirect_uri = format!(
        "{}/onboarding/{}",
        crate::helpers::frontend_url(),
        website_id
    );
    let oauth_url = format!(
        "https://github.com/login/oauth/authorize?client_id=PLACEHOLDER&redirect_uri={}&state={}&scope=read:user,repo",
        redirect_uri.replace(":", "%3A").replace("/", "%2F"),
        website_id
    );

    tracing::info!(
        "GitHub OAuth initiated for website {} by user {}",
        website_id,
        claims.sub
    );

    // For V1, return an error indicating GitHub is not yet configured
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(serde_json::json!({
            "error": "GitHub OAuth not configured",
            "message": "L'intégration GitHub sera disponible prochainement. Utilisez 'Passer cette étape' pour continuer.",
            "url": oauth_url
        })),
    )
        .into_response()
}

/// Handle GitHub OAuth callback
pub async fn github_oauth_callback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<OAuthCallbackRequest>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid website ID format"})),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Invalid token"})),
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
                Json(serde_json::json!({"error": "Website not found"})),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Not authorized"})),
        )
            .into_response();
    }

    tracing::info!(
        "GitHub OAuth callback for website {} with code {}...",
        website_id,
        &payload.code[..8.min(payload.code.len())]
    );

    // V1 MVP: OAuth exchange not implemented
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(serde_json::json!({
            "error": "GitHub OAuth not configured",
            "message": "L'intégration GitHub sera disponible prochainement."
        })),
    )
        .into_response()
}

/// Fetch user's GitHub repositories
pub async fn fetch_github_repos(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid website ID format"})),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Invalid token"})),
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
                Json(serde_json::json!({"error": "Website not found"})),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Not authorized"})),
        )
            .into_response();
    }

    // V1 MVP: Return empty repos list (GitHub not connected)
    let repos: Vec<GitHubRepo> = vec![];

    (StatusCode::OK, Json(repos)).into_response()
}

/// Import selected repositories as projects
pub async fn import_github_repos(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<ImportReposRequest>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid website ID format"})),
            )
                .into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Invalid token"})),
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
                Json(serde_json::json!({"error": "Website not found"})),
            )
                .into_response();
        }
    };

    if website.account_id != account_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Not authorized"})),
        )
            .into_response();
    }

    tracing::info!(
        "Import {} repos for website {} by user {}",
        payload.repo_ids.len(),
        website_id,
        claims.sub
    );

    // V1 MVP: Return empty projects (no repos to import without GitHub connection)
    let projects: Vec<ImportedProject> = vec![];

    (StatusCode::OK, Json(projects)).into_response()
}
