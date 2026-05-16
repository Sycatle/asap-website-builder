//! Session listing and revocation endpoints.

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    {Extension, Json},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

// ============================================
// SESSION MANAGEMENT
// ============================================

/// Session info returned to clients
#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub is_current: bool,
}

/// List active sessions response
#[derive(Debug, Serialize)]
pub struct ListSessionsResponse {
    pub sessions: Vec<SessionInfo>,
}

/// Revoke session request
#[derive(Debug, Deserialize)]
pub struct RevokeSessionRequest {
    pub session_id: String,
}

/// List all active sessions for the authenticated user
pub async fn list_sessions(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid account ID"
                })),
            )
                .into_response();
        }
    };

    // Get all active (non-revoked, non-expired) refresh tokens for this account
    let sessions = match sqlx::query!(
        r#"
        SELECT id, user_agent, ip_address, created_at, expires_at
        FROM refresh_tokens
        WHERE account_id = $1 
          AND revoked_at IS NULL 
          AND expires_at > NOW()
        ORDER BY created_at DESC
        "#,
        account_id
    )
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Failed to list sessions: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    };

    // Find current session by matching JTI to family
    // For simplicity, we'll mark the most recent session as current
    // A more accurate approach would store the current token hash in claims
    let current_session_id = sessions.first().map(|s| s.id);

    let session_list: Vec<SessionInfo> = sessions
        .into_iter()
        .map(|s| SessionInfo {
            id: s.id.to_string(),
            user_agent: s.user_agent,
            ip_address: s.ip_address,
            created_at: s.created_at.to_rfc3339(),
            expires_at: s.expires_at.to_rfc3339(),
            is_current: Some(s.id) == current_session_id,
        })
        .collect();

    (
        StatusCode::OK,
        Json(ListSessionsResponse {
            sessions: session_list,
        }),
    )
        .into_response()
}

/// Revoke a specific session
pub async fn revoke_session(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RevokeSessionRequest>,
) -> impl IntoResponse {
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid account ID"
                })),
            )
                .into_response();
        }
    };

    let session_id = match Uuid::parse_str(&payload.session_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid session ID"
                })),
            )
                .into_response();
        }
    };

    // Revoke the session (only if it belongs to the authenticated user)
    match sqlx::query!(
        r#"
        UPDATE refresh_tokens 
        SET revoked_at = NOW(), revoked_reason = 'user_revoked'
        WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL
        "#,
        session_id,
        account_id
    )
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "error": "Session not found or already revoked"
                    })),
                )
                    .into_response();
            }
            tracing::info!("Account {} revoked session {}", account_id, session_id);
        }
        Err(e) => {
            tracing::error!("Failed to revoke session: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Internal server error"
                })),
            )
                .into_response();
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Session revoked successfully"
        })),
    )
        .into_response()
}
