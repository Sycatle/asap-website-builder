//! Serves the compiled JS for an AI-generated section as a real JS module so
//! browsers can `import()` it. Public, no auth: the code is already part of a
//! published site, just like CSS or HTML.
//!
//! Why a separate endpoint rather than inlining? Compiled JS can run into tens
//! of KB per section. Pushing it into the JSON payload bloats every page-data
//! fetch even when only one section changed; here it's a static-feeling
//! response that the browser can cache by element id.

use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn get_public_section_module(
    State(pool): State<PgPool>,
    Path(element_id): Path<String>,
) -> impl IntoResponse {
    let id = match Uuid::parse_str(&element_id) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, "invalid element id").into_response(),
    };

    // Only return modules for visible elements on published sites.
    let row = sqlx::query_scalar::<_, Option<String>>(
        r#"
        SELECT e.compiled_js
        FROM website_elements e
        INNER JOIN websites w ON w.id = e.website_id
        WHERE e.id = $1
          AND e.visible = true
          AND w.status = 'published'
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match row {
        Ok(Some(Some(js))) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/javascript; charset=utf-8"),
            );
            // Compiled JS for a section is keyed by element id; when the
            // studio recompiles, the row's updated_at changes but the id is
            // stable. Mid-term we'll switch to ETag / hash-of-content; for
            // now a short cache window keeps things sane in dev.
            headers.insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static("public, max-age=60, must-revalidate"),
            );
            (StatusCode::OK, headers, js).into_response()
        }
        Ok(Some(None)) | Ok(None) => {
            (StatusCode::NOT_FOUND, "section module not found").into_response()
        }
        Err(e) => {
            tracing::error!("get_public_section_module: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}
