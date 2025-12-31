//! Website CRUD queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;

use super::types::WebsiteWithData;

/// Verify that a website belongs to the specified account
/// Returns Ok(true) if website exists and belongs to account, Ok(false) otherwise
pub async fn verify_website_ownership(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    Ok(count.0 > 0)
}

/// Get website by ID with data
pub async fn get_website_with_data(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<Option<WebsiteWithData>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT 
            w.id, w.account_id, w.slug, w.title, w.tagline, w.status, 
            w.creation_mode, w.preset_id, w.metadata, w.created_at, w.updated_at,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON w.id = wd.website_id
        WHERE w.id = $1 AND w.account_id = $2
        "#
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await
}

/// List websites for account with data (limited to prevent memory issues)
/// For accounts with many websites, use pagination
pub async fn list_websites_with_data(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<Vec<WebsiteWithData>, sqlx::Error> {
    // Limit to 100 websites max to prevent memory exhaustion
    // Power users should use the paginated endpoint
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT DISTINCT
            w.id, w.account_id, w.slug, w.title, w.tagline, w.status, 
            w.creation_mode, w.preset_id, w.metadata, w.created_at, w.updated_at,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON w.id = wd.website_id
        LEFT JOIN website_administrators wa ON w.id = wa.website_id
        WHERE w.account_id = $1 
           OR (wa.account_id = $1 AND wa.status = 'active')
        ORDER BY w.created_at DESC
        LIMIT 100
        "#
    )
    .bind(account_id)
    .fetch_all(pool)
    .await
}

/// Get website data only (without website metadata)
pub async fn get_website_data(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<JsonValue, sqlx::Error> {
    let result: Option<(JsonValue,)> = sqlx::query_as(
        "SELECT COALESCE(data, '{}'::jsonb) FROM website_data WHERE website_id = $1"
    )
    .bind(website_id)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|r| r.0).unwrap_or_else(|| serde_json::json!({})))
}

/// Get public website by slug
pub async fn get_public_website(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<WebsiteWithData>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT 
            w.id, w.account_id, w.slug, w.title, w.tagline, w.status, 
            w.creation_mode, w.preset_id, w.metadata, w.created_at, w.updated_at,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON w.id = wd.website_id
        WHERE w.slug = $1 AND w.status = 'published'
        "#
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
}

/// Update website status
pub async fn update_website_status(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    status: &str,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE websites SET status = $1, updated_at = now() WHERE id = $2 AND account_id = $3"
    )
    .bind(status)
    .bind(website_id)
    .bind(account_id)
    .execute(pool)
    .await
}

/// Update website batch fields
pub async fn update_website_batch_fields(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    title: Option<&str>,
    tagline: Option<&str>,
    metadata: Option<&JsonValue>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut tx = pool.begin().await?;

    if let Some(t) = title {
        sqlx::query(
            "UPDATE websites SET title = $1, updated_at = now() WHERE id = $2 AND account_id = $3"
        )
        .bind(t)
        .bind(website_id)
        .bind(account_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(tl) = tagline {
        sqlx::query(
            "UPDATE websites SET tagline = $1, updated_at = now() WHERE id = $2 AND account_id = $3"
        )
        .bind(tl)
        .bind(website_id)
        .bind(account_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(m) = metadata {
        sqlx::query(
            "UPDATE websites SET metadata = $1, updated_at = now() WHERE id = $2 AND account_id = $3"
        )
        .bind(m)
        .bind(website_id)
        .bind(account_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

/// Upsert website data with JSONB merge
pub async fn upsert_website_data(
    pool: &PgPool,
    website_id: Uuid,
    data: &JsonValue,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO website_data (website_id, data)
        VALUES ($1, $2)
        ON CONFLICT (website_id)
        DO UPDATE SET 
            data = website_data.data || $2,
            updated_at = now()
        "#
    )
    .bind(website_id)
    .bind(data)
    .execute(pool)
    .await
}
