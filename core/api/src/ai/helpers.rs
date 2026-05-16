//! Helper functions for AI module
//!
//! Contains utility functions for authentication, formatting,
//! plan management, and error handling.

use axum::http::StatusCode;
use axum::Json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::Claims;
use asap_core_ai::AIAction;

use super::types::ErrorResponse;

// ============================================================================
// Authentication Helpers
// ============================================================================

/// Extract account ID from JWT claims
pub fn get_account_id(claims: &Claims) -> Result<Uuid, StatusCode> {
    Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
}

/// Verify the user owns the website or is an administrator
pub async fn verify_website_ownership(
    pool: &PgPool,
    account_id: Uuid,
    website_id: Uuid,
) -> Result<(), StatusCode> {
    // Check if user is owner OR active administrator
    let has_access: (bool,) = sqlx::query_as(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM websites WHERE id = $1 AND account_id = $2
            UNION
            SELECT 1 FROM website_administrators 
            WHERE website_id = $1 AND account_id = $2 AND status = 'active'
        )
        "#,
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to verify website access: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if !has_access.0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(())
}

// ============================================================================
// Plan & Quota Helpers
// ============================================================================

/// Get the user's plan from the database
pub async fn get_user_plan(pool: &PgPool, account_id: Uuid) -> Result<String, StatusCode> {
    let row: (String,) =
        sqlx::query_as("SELECT COALESCE(plan, 'free') FROM accounts WHERE id = $1")
            .bind(account_id)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get user plan: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

    Ok(row.0)
}

/// Get daily message limit based on plan
pub fn get_plan_daily_limit(plan: &str) -> u32 {
    match plan {
        "pro" => 200,
        "business" => 1000,
        "enterprise" => 10000,
        _ => 20, // free
    }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/// Format a human-readable description for an AI action
pub fn format_action_description(action: &AIAction) -> String {
    match action {
        AIAction::UpdateSectionProperty { property, .. } => {
            format!("Updating {}", property.replace('_', " "))
        }
        AIAction::AddSection { section_type, .. } => {
            format!("Adding {} section", section_type)
        }
        AIAction::RemoveSection { .. } => "Removing section".to_string(),
        AIAction::ReorderSections { .. } => "Reordering sections".to_string(),
        AIAction::ChangeVariant { variant, .. } => {
            format!("Changing variant to {}", variant)
        }
        AIAction::UpdateTheme { .. } => "Updating theme".to_string(),
        AIAction::UpdateMetadata { .. } => "Updating metadata".to_string(),
        AIAction::GenerateImage { .. } => "Generating image".to_string(),
    }
}

// ============================================================================
// Error Helpers
// ============================================================================

/// Convert AI error to HTTP response
pub fn ai_error_to_response(err: asap_core_ai::AIError) -> (StatusCode, Json<ErrorResponse>) {
    use asap_core_ai::AIError;

    let (status, code) = match &err {
        AIError::RateLimitExceeded { .. } => (StatusCode::TOO_MANY_REQUESTS, "rate_limited"),
        AIError::ContextTooLong { .. } => (StatusCode::BAD_REQUEST, "context_too_large"),
        AIError::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
        AIError::ProviderError { .. } => (StatusCode::BAD_GATEWAY, "provider_error"),
        AIError::ProviderUnavailable(_) => {
            (StatusCode::SERVICE_UNAVAILABLE, "provider_unavailable")
        }
        AIError::AuthenticationError(_) => (StatusCode::UNAUTHORIZED, "auth_error"),
        AIError::PermissionDenied(_) => (StatusCode::FORBIDDEN, "permission_denied"),
        AIError::WebsiteNotFound(_) => (StatusCode::NOT_FOUND, "website_not_found"),
        AIError::SectionNotFound(_) => (StatusCode::NOT_FOUND, "section_not_found"),
        AIError::InvalidAction(_) => (StatusCode::BAD_REQUEST, "invalid_action"),
        AIError::ContentFiltered(_) => (StatusCode::BAD_REQUEST, "content_filtered"),
        AIError::ConfigError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "config_error"),
        AIError::SerializationError(_) => {
            (StatusCode::INTERNAL_SERVER_ERROR, "serialization_error")
        }
        AIError::HttpError(_) => (StatusCode::BAD_GATEWAY, "http_error"),
        AIError::RedisError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "redis_error"),
        AIError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
    };

    (
        status,
        Json(ErrorResponse {
            error: err.to_string(),
            code: code.to_string(),
            ..Default::default()
        }),
    )
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plan_daily_limit() {
        assert_eq!(get_plan_daily_limit("free"), 20);
        assert_eq!(get_plan_daily_limit("pro"), 200);
        assert_eq!(get_plan_daily_limit("business"), 1000);
        assert_eq!(get_plan_daily_limit("enterprise"), 10000);
    }
}
