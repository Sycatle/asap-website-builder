//! Common helper functions for API handlers
//!
//! This module provides reusable helper functions to reduce code duplication
//! and apply DRY (Don't Repeat Yourself) principle across handlers.

// Helpers return `axum::Response` so callers can `?` them straight into a
// handler. Boxing the response just to satisfy `result_large_err` would cost
// an allocation on every parse.
#![allow(clippy::result_large_err)]

/// Resolve the public frontend URL from `FRONTEND_URL`, falling back to the
/// dev origin. Centralized so the dev fallback is in one place; production
/// deployments are expected to set the env var explicitly.
pub fn frontend_url() -> String {
    std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:4321".to_string())
}

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use uuid::Uuid;

use asap_core_shared::Claims;

/// Type alias for JSON error response tuple
pub type JsonErrorResponse = (StatusCode, Json<serde_json::Value>);

/// Parse a UUID from a string, returning an appropriate error response if invalid.
///
/// # Arguments
/// * `id` - The string to parse as UUID
/// * `field_name` - The name of the field for error messages (e.g., "website ID", "element ID")
///
/// # Returns
/// * `Ok(Uuid)` - Successfully parsed UUID
/// * `Err(Response)` - Error response with BAD_REQUEST status
pub fn parse_uuid(id: &str, field_name: &str) -> Result<Uuid, Response> {
    Uuid::parse_str(id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": format!("Invalid {} format", field_name)
            })),
        )
            .into_response()
    })
}

/// Parse the account ID from claims, returning an error response if invalid.
///
/// # Arguments
/// * `claims` - The JWT claims containing account ID in sub field
///
/// # Returns
/// * `Ok(Uuid)` - Successfully parsed account UUID
/// * `Err(Response)` - Error response with UNAUTHORIZED status
pub fn parse_account_id(claims: &Claims) -> Result<Uuid, Response> {
    Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid account ID in token"
            })),
        )
            .into_response()
    })
}

/// Create a standard JSON error response
///
/// # Arguments
/// * `status` - HTTP status code
/// * `message` - Error message to include in response
pub fn error_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({
            "error": message
        })),
    )
        .into_response()
}

/// Create a standard JSON success response
///
/// # Arguments
/// * `status` - HTTP status code
/// * `message` - Success message to include in response
pub fn success_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({
            "message": message
        })),
    )
        .into_response()
}

/// Create a "not found" error response
pub fn not_found_response(resource: &str) -> Response {
    error_response(StatusCode::NOT_FOUND, &format!("{} not found", resource))
}

/// Create an internal server error response (also logs the error)
pub fn internal_error_response(context: &str, error: impl std::fmt::Display) -> Response {
    tracing::error!("{}: {}", context, error);
    error_response(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_uuid_valid() {
        let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
        let result = parse_uuid(uuid_str, "test ID");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().to_string(), uuid_str);
    }

    #[test]
    fn test_parse_uuid_invalid() {
        let result = parse_uuid("not-a-uuid", "test ID");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_account_id_valid() {
        let claims = Claims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            exp: 0,
            jti: Some("test-jti".to_string()),
        };
        let result = parse_account_id(&claims);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_account_id_invalid() {
        let claims = Claims {
            sub: "invalid".to_string(),
            exp: 0,
            jti: Some("test-jti".to_string()),
        };
        let result = parse_account_id(&claims);
        assert!(result.is_err());
    }
}
