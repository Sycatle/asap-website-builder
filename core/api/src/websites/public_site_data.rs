//! `GET /api/public/websites/:slug/data` — returns the data envelope a
//! published site needs to hydrate AI-generated sections: every collection's
//! items + every variable's value.
//!
//! For v0 we fetch the whole envelope per page request. The runtime hands it
//! to `SiteRuntimeProvider`; sections read what they need via hooks. When
//! payloads get bigger, we'll switch to a request that takes the union of
//! `data_bindings` from the rendered sections and only returns what's used.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::{Map, Value as JsonValue};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct PublicSiteData {
    /// `{ slug: { items: [...] } }` — `items` is always an array. Sites with
    /// no collections get an empty object.
    pub collections: Map<String, JsonValue>,
    /// `{ key: value }` — value preserves the stored JSON shape (string,
    /// number, bool, object, array).
    pub variables: Map<String, JsonValue>,
}

pub async fn get_public_site_data(
    State(pool): State<PgPool>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let website_id = match resolve_published_website(&pool, &slug).await {
        Ok(Some(id)) => id,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "site not found or not published" })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("resolve_published_website: {e}");
            return internal();
        }
    };

    let collections = match fetch_collections(&pool, website_id).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("fetch_collections: {e}");
            return internal();
        }
    };

    let variables = match fetch_variables(&pool, website_id).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("fetch_variables: {e}");
            return internal();
        }
    };

    (
        StatusCode::OK,
        Json(PublicSiteData {
            collections,
            variables,
        }),
    )
        .into_response()
}

async fn resolve_published_website(pool: &PgPool, slug: &str) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM websites WHERE slug = $1 AND status = 'published' LIMIT 1",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
}

async fn fetch_collections(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Map<String, JsonValue>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (String, JsonValue)>(
        "SELECT collection_slug, items FROM website_collections WHERE website_id = $1",
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    let mut out = Map::new();
    for (slug, items) in rows {
        // The runtime expects `{ slug, items: [...] }`. Coerce non-arrays to
        // an empty list so generated code never trips on shape surprises.
        let items_array = match items {
            JsonValue::Array(a) => JsonValue::Array(a),
            _ => JsonValue::Array(Vec::new()),
        };
        out.insert(
            slug.clone(),
            serde_json::json!({ "slug": slug, "items": items_array }),
        );
    }
    Ok(out)
}

async fn fetch_variables(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Map<String, JsonValue>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (String, JsonValue)>(
        "SELECT key, value FROM website_variables WHERE website_id = $1 AND is_public = true",
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    let mut out = Map::new();
    for (key, value) in rows {
        out.insert(key, value);
    }
    Ok(out)
}

fn internal() -> axum::response::Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": "internal error" })),
    )
        .into_response()
}
