//! Shared helpers for the collections module: ownership check + claims parsing.

use axum::{http::StatusCode, Json};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::Claims;

/// Check if the authenticated user owns the website.
pub(super) async fn verify_website_ownership(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query!(
        r#"SELECT id FROM websites WHERE id = $1 AND account_id = $2"#,
        website_id,
        account_id
    )
    .fetch_optional(pool)
    .await;

    match result {
        Ok(Some(_)) => Ok(()),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Website not found" })),
        )),
        Err(e) => {
            tracing::error!("Database error verifying website ownership: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ))
        }
    }
}

/// Parse account ID from claims.
pub(super) fn parse_account_id(
    claims: &Claims,
) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid token" })),
        )
    })
}
