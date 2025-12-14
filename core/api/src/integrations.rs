use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

#[derive(Debug, Serialize)]
pub struct IntegrationsResponse {
    pub integrations: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGitHubIntegrationRequest {
    pub github_username: String,
    pub github_token: Option<String>,
}

/// Validate GitHub username format (security)
fn validate_github_username(username: &str) -> Result<(), &'static str> {
    if username.is_empty() {
        return Err("GitHub username is required");
    }
    if username.len() > 39 {
        return Err("GitHub username too long (max 39 characters)");
    }
    if !username.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("GitHub username can only contain alphanumeric characters and hyphens");
    }
    if username.starts_with('-') || username.ends_with('-') || username.contains("--") {
        return Err("Invalid GitHub username format");
    }
    Ok(())
}

/// Validate GitHub token format (security)
fn validate_github_token(token: &Option<String>) -> Result<(), &'static str> {
    if let Some(t) = token {
        // GitHub tokens: ghp_ (PAT), gho_ (OAuth), ghu_ (user-to-server), ghs_ (server-to-server), ghr_ (refresh)
        let valid_prefixes = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_"];
        if !valid_prefixes.iter().any(|p| t.starts_with(p)) {
            return Err("Invalid GitHub token format. Must be a valid GitHub token (ghp_, gho_, etc.)");
        }
        if t.len() < 20 || t.len() > 255 {
            return Err("Invalid GitHub token length");
        }
        // Check for only valid characters in token
        let token_part = &t[4..]; // Skip prefix
        if !token_part.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            return Err("Invalid characters in GitHub token");
        }
    }
    Ok(())
}

pub async fn get_integrations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Parse user ID
    let user_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID format"
            }))).into_response();
        }
    };

    // Verify the user is accessing their own data
    let claims_user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if user_id != claims_user_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    // Query user_data for integrations
    let result = sqlx::query!(
        r#"
        SELECT COALESCE(data->'integrations', '{}'::jsonb) as "integrations!"
        FROM user_data
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(data)) => {
            (StatusCode::OK, Json(IntegrationsResponse {
                integrations: data.integrations,
            })).into_response()
        }
        Ok(None) => {
            (StatusCode::OK, Json(IntegrationsResponse {
                integrations: serde_json::json!({}),
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Database error fetching integrations: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Internal server error"
            }))).into_response()
        }
    }
}

pub async fn update_github_integration(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateGitHubIntegrationRequest>,
) -> impl IntoResponse {
    // Parse user ID
    let user_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid user ID format"
            }))).into_response();
        }
    };

    // Verify the user is accessing their own data
    let claims_user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    if user_id != claims_user_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Access denied"
        }))).into_response();
    }

    // Security: Validate GitHub username format
    if let Err(e) = validate_github_username(&payload.github_username) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Security: Validate GitHub token format (if provided)
    if let Err(e) = validate_github_token(&payload.github_token) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e
        }))).into_response();
    }

    // Build GitHub integration data  
    let github_integration = serde_json::json!({
        "username": payload.github_username,
        "token": payload.github_token
    });

    let integrations_data = serde_json::json!({
        "integrations": {
            "github": github_integration
        }
    });

    // Update user_data with GitHub integration
    let result = sqlx::query!(
        r#"
        INSERT INTO user_data (user_id, data)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            data = jsonb_set(
                COALESCE(user_data.data, '{}'::jsonb),
                '{integrations,github}',
                $2->'integrations'->'github',
                true
            ),
            updated_at = now()
        "#,
        user_id,
        integrations_data
    )
    .execute(&pool)
    .await;

    if let Err(e) = result {
        tracing::error!("Database error updating GitHub integration: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": "Internal server error"
        }))).into_response();
    }

    // Create an event for USER_INTEGRATION_ADDED
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "Invalid tenant ID"
            }))).into_response();
        }
    };

    let event_payload = serde_json::json!({
        "user_id": user_id.to_string(),
        "integration_type": "github",
        "username": payload.github_username
    });

    let event_result = sqlx::query!(
        r#"
        INSERT INTO events (account_id, event_type, payload)
        VALUES ($1, 'USER_INTEGRATION_ADDED', $2)
        "#,
        account_id,
        event_payload
    )
    .execute(&pool)
    .await;

    if let Err(e) = event_result {
        tracing::error!("Failed to create event: {}", e);
        // Don't fail the request if event creation fails
    }

    tracing::info!("GitHub integration updated for user: {}", user_id);

    (StatusCode::OK, Json(serde_json::json!({
        "message": "GitHub integration updated successfully",
        "username": payload.github_username
    }))).into_response()
}
