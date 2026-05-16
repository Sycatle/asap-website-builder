use asap_core_shared::{validate_csrf_token, SharedConfig, CSRF_HEADER};
use axum::{
    extract::{Request, State},
    http::{header, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Routes that require CSRF validation
/// These are state-changing operations that could be exploited via CSRF
const CSRF_PROTECTED_METHODS: &[&str] = &["POST", "PUT", "PATCH", "DELETE"];

/// Routes exempted from CSRF protection (webhooks with their own signature verification)
const CSRF_EXEMPT_PATHS: &[&str] = &[
    "/payments/webhook/stripe",
    "/metrics/events",
    "/metrics/events/batch",
];

/// CSRF middleware
///
/// Validates X-CSRF-Token header for state-changing requests.
/// Tokens are validated using HMAC-SHA256 with the JWT secret.
pub async fn csrf_middleware(
    State(config): State<SharedConfig>,
    req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let method = req.method().as_str();
    let path = req.uri().path();

    // Only check CSRF for state-changing methods
    if !CSRF_PROTECTED_METHODS.contains(&method) {
        return Ok(next.run(req).await);
    }

    // Skip CSRF check for exempt paths
    if CSRF_EXEMPT_PATHS
        .iter()
        .any(|exempt| path.starts_with(exempt))
    {
        return Ok(next.run(req).await);
    }

    // Extract CSRF token from header
    let csrf_token = req.headers().get(CSRF_HEADER).and_then(|h| h.to_str().ok());

    let token = match csrf_token {
        Some(token) if !token.is_empty() => token,
        _ => {
            tracing::warn!("Missing CSRF token for {} {}", method, path);
            return Err((
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Missing CSRF token",
                    "code": "CSRF_MISSING"
                })),
            ));
        }
    };

    // Validate token
    match validate_csrf_token(token, &config.jwt_secret) {
        Ok(true) => Ok(next.run(req).await),
        Ok(false) => {
            tracing::warn!("Invalid CSRF token for {} {}", method, path);
            Err((
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Invalid or expired CSRF token",
                    "code": "CSRF_INVALID"
                })),
            ))
        }
        Err(e) => {
            tracing::error!("CSRF validation error: {}", e);
            Err((
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "CSRF validation failed",
                    "code": "CSRF_ERROR"
                })),
            ))
        }
    }
}

/// Endpoint to get a new CSRF token
pub async fn get_csrf_token(
    axum::Extension(config): axum::Extension<SharedConfig>,
) -> impl IntoResponse {
    use asap_core_shared::generate_csrf_token;

    match generate_csrf_token(&config.jwt_secret) {
        Ok(token) => {
            let mut response = Json(json!({
                "csrf_token": token.token
            }))
            .into_response();

            // Add Secure flag in production (when not localhost)
            let is_secure = std::env::var("ENVIRONMENT")
                .map(|e| e == "production")
                .unwrap_or(false);
            let secure_flag = if is_secure { "; Secure" } else { "" };

            // Also set as cookie for convenience
            let cookie = format!(
                "csrf_token={}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600{}",
                token.token, secure_flag
            );
            response.headers_mut().insert(
                header::SET_COOKIE,
                HeaderValue::from_str(&cookie).unwrap_or_else(|_| HeaderValue::from_static("")),
            );

            response
        }
        Err(e) => {
            tracing::error!("Failed to generate CSRF token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to generate CSRF token"
                })),
            )
                .into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csrf_protected_methods() {
        assert!(CSRF_PROTECTED_METHODS.contains(&"POST"));
        assert!(CSRF_PROTECTED_METHODS.contains(&"PUT"));
        assert!(CSRF_PROTECTED_METHODS.contains(&"PATCH"));
        assert!(CSRF_PROTECTED_METHODS.contains(&"DELETE"));
        assert!(!CSRF_PROTECTED_METHODS.contains(&"GET"));
    }

    #[test]
    fn test_csrf_exempt_paths() {
        assert!(CSRF_EXEMPT_PATHS.contains(&"/payments/webhook/stripe"));
        assert!(CSRF_EXEMPT_PATHS.contains(&"/metrics/events"));
    }
}
