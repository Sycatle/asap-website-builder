use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;

use crate::auth::Claims;

const JWT_SECRET: &str = "dev-secret-change-in-production"; // TODO: Load from config

pub async fn auth_middleware(
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
    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_ref()),
        &Validation::default(),
    ) {
        Ok(data) => data,
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
    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}
