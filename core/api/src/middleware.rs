use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
    Json,
};
use serde_json::json;

use asap_core_shared::{validate_token, SharedConfig};

pub async fn auth_middleware(
    State(config): State<SharedConfig>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // Extract token from Authorization header
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            header.trim_start_matches("Bearer ")
        }
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Missing or invalid Authorization header"
                })),
            ));
        }
    };

    // Validate token
    let claims = match validate_token(token, &config) {
        Ok(claims) => claims,
        Err(e) => {
            tracing::warn!("Failed to decode JWT: {}", e);
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Invalid or expired token"
                })),
            ));
        }
    };

    // Insert claims into request extensions
    req.extensions_mut().insert(claims);

    Ok(next.run(req).await)
}
