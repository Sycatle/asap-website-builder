//! AI-generated section code: validate, compile, and persist.
//!
//! Flow: studio sends raw JSX → `generate_section_code()` parses + validates
//! against the closed contract (token-only styling, no XSS / network / global
//! escape) → swc compiles to JS → we atomically write `source_code`,
//! `compiled_js`, `data_bindings`, and `knobs_schema` to the element row.
//!
//! Auth: standard owner-or-admin gate via `verify_website_access`.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_ai::{generate_section, CodegenError, SectionValidationError};
use asap_core_shared::{Claims, SharedWsBroadcaster};

#[derive(Debug, Deserialize)]
pub struct CompileSectionCodeRequest {
    pub source_code: String,
}

#[derive(Debug, Serialize)]
pub struct CompileSectionCodeResponse {
    pub ok: bool,
    /// Populated on success. `null` when the request was rejected.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_bindings: Option<serde_json::Value>,
    /// Populated on success.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knobs_schema: Option<serde_json::Value>,
    /// Populated when validation fails. Each error has a stable `code` so the
    /// studio can localize the message; the textual `message` is fallback.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub errors: Vec<SectionValidationError>,
    /// Populated when parsing fails (single, non-recoverable error).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parse_error: Option<String>,
}

/// `POST /api/websites/:website_id/elements/:element_id/code`
///
/// Validates + compiles the section source, then writes `source_code`,
/// `compiled_js`, `data_bindings`, `knobs_schema` to the element. Returns
/// the extracted metadata so the studio can render knob controls immediately.
pub async fn compile_section_code(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path((website_id, element_id)): Path<(String, String)>,
    Json(payload): Json<CompileSectionCodeRequest>,
) -> (StatusCode, Json<CompileSectionCodeResponse>) {
    let website_uuid = match Uuid::parse_str(&website_id) {
        Ok(id) => id,
        Err(_) => return bad_request("invalid website id"),
    };
    let element_uuid = match Uuid::parse_str(&element_id) {
        Ok(id) => id,
        Err(_) => return bad_request("invalid element id"),
    };
    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    match crate::queries::verify_website_access(&pool, website_uuid, account_id).await {
        Ok(true) => {}
        Ok(false) => return forbidden(),
        Err(e) => {
            tracing::error!("verify_website_access failed: {e}");
            return internal();
        }
    }

    let generated = match generate_section(&payload.source_code) {
        Ok(g) => g,
        Err(CodegenError::Parse(msg)) => {
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(CompileSectionCodeResponse {
                    ok: false,
                    data_bindings: None,
                    knobs_schema: None,
                    errors: vec![],
                    parse_error: Some(msg),
                }),
            );
        }
        Err(CodegenError::Validation { errors }) => {
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(CompileSectionCodeResponse {
                    ok: false,
                    data_bindings: None,
                    knobs_schema: None,
                    errors,
                    parse_error: None,
                }),
            );
        }
        Err(CodegenError::Compile(msg)) => {
            tracing::error!(element_id = %element_uuid, "section compile failed: {msg}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(CompileSectionCodeResponse {
                    ok: false,
                    data_bindings: None,
                    knobs_schema: None,
                    errors: vec![],
                    parse_error: Some(format!("compile: {msg}")),
                }),
            );
        }
    };

    let data_bindings_json = match serde_json::to_value(&generated.data_bindings) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("serialize data_bindings: {e}");
            return internal();
        }
    };
    let knobs_schema_json = match serde_json::to_value(&generated.knobs_schema) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("serialize knobs_schema: {e}");
            return internal();
        }
    };

    // One UPDATE: source / compiled / bindings / knobs travel as a unit so
    // partial writes can't leave a section with a stale compiled blob.
    let updated = sqlx::query(
        r#"
        UPDATE website_elements
        SET source_code = $1,
            compiled_js = $2,
            data_bindings = $3,
            knobs_schema = $4,
            updated_at = now()
        WHERE id = $5 AND website_id = $6
        "#,
    )
    .bind(&payload.source_code)
    .bind(&generated.compiled_js)
    .bind(&data_bindings_json)
    .bind(&knobs_schema_json)
    .bind(element_uuid)
    .bind(website_uuid)
    .execute(&pool)
    .await;

    match updated {
        Ok(result) if result.rows_affected() == 1 => {
            // Broadcast to other studio sessions (owner + administrators) so
            // they see the new compiled section without a manual reload.
            // Apps/sites picks up the new module via cache-busting on the
            // module URL (per-id cache, 60s max-age — fine for collab).
            if let Ok(account_ids) =
                crate::queries::get_website_account_ids(&pool, website_uuid).await
            {
                for acc_id in account_ids {
                    (*ws_broadcaster).sync_element_updated(
                        &acc_id.to_string(),
                        &website_id,
                        &element_id,
                        serde_json::json!({
                            "compiled": true,
                            "data_bindings": data_bindings_json,
                            "knobs_schema": knobs_schema_json,
                        }),
                    );
                }
            }
            (
                StatusCode::OK,
                Json(CompileSectionCodeResponse {
                    ok: true,
                    data_bindings: Some(data_bindings_json),
                    knobs_schema: Some(knobs_schema_json),
                    errors: vec![],
                    parse_error: None,
                }),
            )
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(CompileSectionCodeResponse {
                ok: false,
                data_bindings: None,
                knobs_schema: None,
                errors: vec![],
                parse_error: Some("element not found".to_string()),
            }),
        ),
        Err(e) => {
            tracing::error!("update website_elements: {e}");
            internal()
        }
    }
}

fn bad_request(msg: &str) -> (StatusCode, Json<CompileSectionCodeResponse>) {
    (
        StatusCode::BAD_REQUEST,
        Json(CompileSectionCodeResponse {
            ok: false,
            data_bindings: None,
            knobs_schema: None,
            errors: vec![],
            parse_error: Some(msg.to_string()),
        }),
    )
}

fn unauthorized() -> (StatusCode, Json<CompileSectionCodeResponse>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(CompileSectionCodeResponse {
            ok: false,
            data_bindings: None,
            knobs_schema: None,
            errors: vec![],
            parse_error: Some("invalid token".to_string()),
        }),
    )
}

fn forbidden() -> (StatusCode, Json<CompileSectionCodeResponse>) {
    (
        StatusCode::FORBIDDEN,
        Json(CompileSectionCodeResponse {
            ok: false,
            data_bindings: None,
            knobs_schema: None,
            errors: vec![],
            parse_error: Some("forbidden".to_string()),
        }),
    )
}

fn internal() -> (StatusCode, Json<CompileSectionCodeResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(CompileSectionCodeResponse {
            ok: false,
            data_bindings: None,
            knobs_schema: None,
            errors: vec![],
            parse_error: Some("internal error".to_string()),
        }),
    )
}
