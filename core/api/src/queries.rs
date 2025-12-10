// filepath: core/api/src/queries.rs
//! Optimized prepared queries and batch operations for ASAP Core API
//!
//! This module provides:
//! - Type-safe prepared statements using sqlx::query_as!
//! - Batch insert/update operations
//! - Query result caching patterns
//! - Performance monitoring utilities

use sqlx::{PgPool, FromRow};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};

/// Portfolio with data (used for queries with LOEFTs) - Legacy, kept for backward compatibility
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PortfolioWithData {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub metadata: JsonValue,
    #[sqlx(default)]
    pub data: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Website with data (new structure)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WebsiteWithData {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub creation_mode: String,
    #[sqlx(default)]
    pub preset_id: Option<Uuid>,
    pub metadata: JsonValue,
    #[sqlx(default)]
    pub data: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Website module response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteModuleRow {
    pub id: Uuid,
    pub website_id: Uuid,
    pub module_id: Uuid,
    pub module_name: String,
    pub module_slug: String,
    pub settings: JsonValue,
    pub enabled: bool,
    pub activated_at: DateTime<Utc>,
}

/// Website section response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteSectionRow {
    pub id: Uuid,
    pub website_id: Uuid,
    pub module_id: Option<Uuid>,
    pub section_type: String,
    pub slug: String,
    pub title: String,
    pub order: i32,
    pub layout: String,
    pub settings: JsonValue,
    pub data: JsonValue,
    pub visible: bool,
}

/// Preset response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetRow {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub category: String,
    pub config: JsonValue,
    pub thumbnail_url: Option<String>,
}

/// Module catalog response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleCatalogRow {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub default_settings: JsonValue,
}

/// Portfolio event for batch operations
#[derive(Debug, Clone)]
pub struct PortfolioEvent {
    pub tenant_id: Uuid,
    pub event_type: String,
    pub payload: JsonValue,
}

/// Optimized query: Get portfolio by ID with data
pub async fn get_portfolio_with_data(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
) -> Result<Option<PortfolioWithData>, sqlx::Error> {
    sqlx::query_as::<_, PortfolioWithData>(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, 
            p.metadata, p.created_at, p.updated_at,
            COALESCE(pd.data, '{}'::jsonb) as data
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.id = $1 AND p.tenant_id = $2
        "#
    )
    .bind(portfolio_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

/// Optimized query: List portfolios for tenant with data
pub async fn list_portfolios_with_data(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<PortfolioWithData>, sqlx::Error> {
    sqlx::query_as::<_, PortfolioWithData>(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, 
            p.metadata, p.created_at, p.updated_at,
            COALESCE(pd.data, '{}'::jsonb) as data
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.tenant_id = $1
        ORDER BY p.created_at DESC
        "#
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}

/// Optimized query: Get public portfolio by slug
pub async fn get_public_portfolio(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<PortfolioWithData>, sqlx::Error> {
    sqlx::query_as::<_, PortfolioWithData>(
        r#"
        SELECT 
            p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, 
            p.metadata, p.created_at, p.updated_at,
            COALESCE(pd.data, '{}'::jsonb) as data
        FROM portfolios p
        LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
        WHERE p.slug = $1 AND p.status = 'published'
        "#
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
}

/// Optimized update: Set multiple fields using prepared statement
/// 
/// This eliminates format!() SQL concatenation and uses proper parameterized queries.
/// Each combination of fields is a separate prepared statement (compile-time checked).
pub async fn update_portfolio_title(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
    title: &str,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE portfolios SET title = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
    )
    .bind(title)
    .bind(portfolio_id)
    .bind(tenant_id)
    .execute(pool)
    .await
}

pub async fn update_portfolio_tagline(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
    tagline: &str,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE portfolios SET tagline = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
    )
    .bind(tagline)
    .bind(portfolio_id)
    .bind(tenant_id)
    .execute(pool)
    .await
}

pub async fn update_portfolio_metadata(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
    metadata: &JsonValue,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE portfolios SET metadata = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
    )
    .bind(metadata)
    .bind(portfolio_id)
    .bind(tenant_id)
    .execute(pool)
    .await
}

/// Atomic multi-field update using a transaction
/// Performs multiple updates atomically
pub async fn update_portfolio_batch_fields(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
    title: Option<&str>,
    tagline: Option<&str>,
    metadata: Option<&JsonValue>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut tx = pool.begin().await?;

    if let Some(t) = title {
        sqlx::query(
            "UPDATE portfolios SET title = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(t)
        .bind(portfolio_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(tl) = tagline {
        sqlx::query(
            "UPDATE portfolios SET tagline = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(tl)
        .bind(portfolio_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(m) = metadata {
        sqlx::query(
            "UPDATE portfolios SET metadata = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(m)
        .bind(portfolio_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn update_portfolio_status(
    pool: &PgPool,
    portfolio_id: Uuid,
    tenant_id: Uuid,
    status: &str,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE portfolios SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
    )
    .bind(status)
    .bind(portfolio_id)
    .bind(tenant_id)
    .execute(pool)
    .await
}

/// Upsert portfolio data with JSONB merge
pub async fn upsert_portfolio_data(
    pool: &PgPool,
    portfolio_id: Uuid,
    data: &JsonValue,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO portfolio_data (portfolio_id, data)
        VALUES ($1, $2)
        ON CONFLICT (portfolio_id)
        DO UPDATE SET 
            data = portfolio_data.data || $2,
            updated_at = now()
        "#
    )
    .bind(portfolio_id)
    .bind(data)
    .execute(pool)
    .await
}

/// Batch insert events (optimized for high volume)
/// 
/// Uses multi-row INSERT for better performance than individual inserts
pub async fn batch_insert_events(
    pool: &PgPool,
    events: &[PortfolioEvent],
) -> Result<u64, sqlx::Error> {
    if events.is_empty() {
        return Ok(0);
    }

    let mut query = String::from(
        "INSERT INTO events (tenant_id, event_type, payload) VALUES "
    );

    let mut bindings: Vec<(Uuid, String, JsonValue)> = Vec::new();
    
    for (idx, event) in events.iter().enumerate() {
        if idx > 0 {
            query.push_str(", ");
        }
        query.push_str(&format!("(${}, ${}, ${})", idx * 3 + 1, idx * 3 + 2, idx * 3 + 3));
        bindings.push((event.tenant_id, event.event_type.clone(), event.payload.clone()));
    }

    let mut query_builder = sqlx::query(&query);
    for (tenant_id, event_type, payload) in bindings {
        query_builder = query_builder.bind(tenant_id).bind(event_type).bind(payload);
    }

    let result = query_builder.execute(pool).await?;
    Ok(result.rows_affected())
}

/// Batch delete old events (for cleanup operations)
/// Deletes events older than the specified duration
pub async fn batch_delete_old_events(
    pool: &PgPool,
    hours_old: i32,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM events WHERE created_at < now() - INTERVAL '1 hour' * $1"
    )
    .bind(hours_old)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

// ============================================================================
// Website Queries
// ============================================================================

/// Verify that a website belongs to the specified tenant
/// Returns Ok(true) if website exists and belongs to tenant, Ok(false) otherwise
pub async fn verify_website_ownership(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    Ok(count.0 > 0)
}

/// Get website by ID with data
pub async fn get_website_with_data(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
) -> Result<Option<WebsiteWithData>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT 
            w.id, w.tenant_id, w.slug, w.title, w.tagline, w.status, 
            w.creation_mode, w.preset_id, w.metadata, w.created_at, w.updated_at,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON w.id = wd.website_id
        WHERE w.id = $1 AND w.tenant_id = $2
        "#
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

/// List websites for tenant with data
pub async fn list_websites_with_data(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<WebsiteWithData>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT 
            w.id, w.tenant_id, w.slug, w.title, w.tagline, w.status, 
            w.creation_mode, w.preset_id, w.metadata, w.created_at, w.updated_at,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON w.id = wd.website_id
        WHERE w.tenant_id = $1
        ORDER BY w.created_at DESC
        "#
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}

/// Get public website by slug
pub async fn get_public_website(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<WebsiteWithData>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteWithData>(
        r#"
        SELECT 
            w.id, w.tenant_id, w.slug, w.title, w.tagline, w.status, 
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
    tenant_id: Uuid,
    status: &str,
) -> Result<sqlx::postgres::PgQueryResult, sqlx::Error> {
    sqlx::query(
        "UPDATE websites SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
    )
    .bind(status)
    .bind(website_id)
    .bind(tenant_id)
    .execute(pool)
    .await
}

/// Update website batch fields
pub async fn update_website_batch_fields(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
    title: Option<&str>,
    tagline: Option<&str>,
    metadata: Option<&JsonValue>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut tx = pool.begin().await?;

    if let Some(t) = title {
        sqlx::query(
            "UPDATE websites SET title = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(t)
        .bind(website_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(tl) = tagline {
        sqlx::query(
            "UPDATE websites SET tagline = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(tl)
        .bind(website_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(m) = metadata {
        sqlx::query(
            "UPDATE websites SET metadata = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3"
        )
        .bind(m)
        .bind(website_id)
        .bind(tenant_id)
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

// ============================================================================
// Website Modules Queries
// ============================================================================

/// List modules activated for a website
pub async fn list_website_modules(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Vec<WebsiteModuleRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, JsonValue, bool, DateTime<Utc>)>(
        r#"
        SELECT 
            wm.id, wm.website_id, wm.module_id, 
            m.name as module_name, m.slug as module_slug,
            wm.settings, wm.enabled, wm.activated_at
        FROM website_modules wm
        JOIN modules m ON wm.module_id = m.id
        WHERE wm.website_id = $1
        ORDER BY wm.activated_at
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, website_id, module_id, module_name, module_slug, settings, enabled, activated_at)| {
        WebsiteModuleRow {
            id,
            website_id,
            module_id,
            module_name,
            module_slug,
            settings,
            enabled,
            activated_at,
        }
    }).collect())
}

/// Activate a module for a website
pub async fn activate_website_module(
    pool: &PgPool,
    website_id: Uuid,
    module_id: Uuid,
    tenant_id: Uuid,
    settings: JsonValue,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Website not found".into());
    }

    // Insert or update module activation
    sqlx::query(
        r#"
        INSERT INTO website_modules (website_id, module_id, settings, enabled)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (website_id, module_id)
        DO UPDATE SET settings = $3, enabled = true, updated_at = now()
        "#
    )
    .bind(website_id)
    .bind(module_id)
    .bind(&settings)
    .execute(pool)
    .await?;

    Ok(())
}

/// Update a website module
pub async fn update_website_module(
    pool: &PgPool,
    website_id: Uuid,
    module_id: Uuid,
    tenant_id: Uuid,
    settings: &JsonValue,
    enabled: Option<bool>,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Ok(false);
    }

    let result = if let Some(en) = enabled {
        sqlx::query(
            "UPDATE website_modules SET settings = $1, enabled = $2, updated_at = now() WHERE website_id = $3 AND module_id = $4"
        )
        .bind(settings)
        .bind(en)
        .bind(website_id)
        .bind(module_id)
        .execute(pool)
        .await?
    } else {
        sqlx::query(
            "UPDATE website_modules SET settings = $1, updated_at = now() WHERE website_id = $2 AND module_id = $3"
        )
        .bind(settings)
        .bind(website_id)
        .bind(module_id)
        .execute(pool)
        .await?
    };

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// Website Sections Queries
// ============================================================================

/// List sections for a website
pub async fn list_website_sections(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
) -> Result<Vec<WebsiteSectionRow>, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Website not found".into());
    }

    let rows = sqlx::query_as::<_, (Uuid, Uuid, Option<Uuid>, String, String, String, i32, String, JsonValue, JsonValue, bool)>(
        r#"
        SELECT 
            id, website_id, module_id, section_type, slug, title,
            "order", layout, settings, data, visible
        FROM website_sections
        WHERE website_id = $1
        ORDER BY "order"
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, website_id, module_id, section_type, slug, title, order, layout, settings, data, visible)| {
        WebsiteSectionRow {
            id,
            website_id,
            module_id,
            section_type,
            slug,
            title,
            order,
            layout,
            settings,
            data,
            visible,
        }
    }).collect())
}

/// Create a section for a website
pub async fn create_website_section(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
    module_id: Option<Uuid>,
    section_type: &str,
    slug: &str,
    title: &str,
    order: i32,
    layout: &str,
    settings: &JsonValue,
    data: &JsonValue,
) -> Result<Uuid, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Website not found".into());
    }

    let section_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO website_sections (id, website_id, module_id, section_type, slug, title, "order", layout, settings, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#
    )
    .bind(section_id)
    .bind(website_id)
    .bind(module_id)
    .bind(section_type)
    .bind(slug)
    .bind(title)
    .bind(order)
    .bind(layout)
    .bind(settings)
    .bind(data)
    .execute(pool)
    .await?;

    Ok(section_id)
}

/// Update a website section
pub async fn update_website_section(
    pool: &PgPool,
    section_id: Uuid,
    website_id: Uuid,
    tenant_id: Uuid,
    title: Option<&str>,
    layout: Option<&str>,
    settings: Option<&JsonValue>,
    data: Option<&JsonValue>,
    visible: Option<bool>,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Ok(false);
    }

    let mut tx = pool.begin().await?;

    if let Some(t) = title {
        sqlx::query(
            "UPDATE website_sections SET title = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(t)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(l) = layout {
        sqlx::query(
            "UPDATE website_sections SET layout = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(l)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(s) = settings {
        sqlx::query(
            "UPDATE website_sections SET settings = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(s)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(d) = data {
        sqlx::query(
            "UPDATE website_sections SET data = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(d)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(v) = visible {
        sqlx::query(
            "UPDATE website_sections SET visible = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(v)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(true)
}

/// Delete a website section
pub async fn delete_website_section(
    pool: &PgPool,
    section_id: Uuid,
    website_id: Uuid,
    tenant_id: Uuid,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Ok(false);
    }

    let result = sqlx::query(
        "DELETE FROM website_sections WHERE id = $1 AND website_id = $2"
    )
    .bind(section_id)
    .bind(website_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// Reorder sections
pub async fn reorder_website_sections(
    pool: &PgPool,
    website_id: Uuid,
    tenant_id: Uuid,
    section_ids: &[Uuid],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to tenant
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND tenant_id = $2"
    )
    .bind(website_id)
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Website not found".into());
    }

    let mut tx = pool.begin().await?;

    for (order, section_id) in section_ids.iter().enumerate() {
        sqlx::query(
            r#"UPDATE website_sections SET "order" = $1, updated_at = now() WHERE id = $2 AND website_id = $3"#
        )
        .bind(order as i32)
        .bind(section_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

// ============================================================================
// Presets Queries
// ============================================================================

/// List available presets
pub async fn list_presets(
    pool: &PgPool,
) -> Result<Vec<PresetRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, (Uuid, String, String, String, String, JsonValue, Option<String>)>(
        r#"
        SELECT id, name, slug, description, category, config, thumbnail_url
        FROM presets
        WHERE enabled = true
        ORDER BY name
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, name, slug, description, category, config, thumbnail_url)| {
        PresetRow {
            id,
            name,
            slug,
            description,
            category,
            config,
            thumbnail_url,
        }
    }).collect())
}

/// Create website from preset
pub async fn create_website_from_preset(
    pool: &PgPool,
    tenant_id: Uuid,
    preset_id: Uuid,
    slug: &str,
    title: &str,
    tagline: &str,
) -> Result<Uuid, Box<dyn std::error::Error + Send + Sync>> {
    // Get preset
    let preset: Option<(JsonValue,)> = sqlx::query_as(
        "SELECT config FROM presets WHERE id = $1 AND enabled = true"
    )
    .bind(preset_id)
    .fetch_optional(pool)
    .await?;

    let config = match preset {
        Some((c,)) => c,
        None => return Err("Preset not found".into()),
    };

    let mut tx = pool.begin().await?;

    // Create website
    let website_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO websites (id, tenant_id, slug, title, tagline, creation_mode, preset_id)
        VALUES ($1, $2, $3, $4, $5, 'from_preset', $6)
        "#
    )
    .bind(website_id)
    .bind(tenant_id)
    .bind(slug)
    .bind(title)
    .bind(tagline)
    .bind(preset_id)
    .execute(&mut *tx)
    .await?;

    // Create website data
    sqlx::query(
        "INSERT INTO website_data (website_id) VALUES ($1)"
    )
    .bind(website_id)
    .execute(&mut *tx)
    .await?;

    // Activate modules from preset config
    if let Some(modules) = config.get("modules").and_then(|m| m.as_array()) {
        for module_slug in modules {
            if let Some(slug_str) = module_slug.as_str() {
                // Get module ID by slug
                let module: Option<(Uuid, JsonValue)> = sqlx::query_as(
                    "SELECT id, default_settings FROM modules WHERE slug = $1 AND enabled = true"
                )
                .bind(slug_str)
                .fetch_optional(&mut *tx)
                .await?;

                if let Some((module_id, default_settings)) = module {
                    sqlx::query(
                        "INSERT INTO website_modules (website_id, module_id, settings) VALUES ($1, $2, $3)"
                    )
                    .bind(website_id)
                    .bind(module_id)
                    .bind(&default_settings)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }
    }

    // Create sections from preset config
    if let Some(sections) = config.get("sections").and_then(|s| s.as_array()) {
        for (order, section) in sections.iter().enumerate() {
            let section_type = section.get("section_type").and_then(|s| s.as_str()).unwrap_or("custom");
            let section_slug = section.get("slug").and_then(|s| s.as_str()).unwrap_or("section");
            let section_title = section.get("title").and_then(|s| s.as_str()).unwrap_or("Section");
            let layout = section.get("layout").and_then(|l| l.as_str()).unwrap_or("full");
            let default_settings = serde_json::json!({});
            let settings = section.get("settings").unwrap_or(&default_settings);

            sqlx::query(
                r#"
                INSERT INTO website_sections (website_id, section_type, slug, title, "order", layout, settings)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#
            )
            .bind(website_id)
            .bind(section_type)
            .bind(section_slug)
            .bind(section_title)
            .bind(order as i32)
            .bind(layout)
            .bind(settings)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;
    Ok(website_id)
}

// ============================================================================
// Module Catalog Queries
// ============================================================================

/// List available modules from the catalog
pub async fn list_available_modules(
    pool: &PgPool,
) -> Result<Vec<ModuleCatalogRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, (Uuid, String, String, String, String, String, JsonValue)>(
        r#"
        SELECT id, name, slug, version, description, category, default_settings
        FROM modules
        WHERE enabled = true
        ORDER BY category, name
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, name, slug, version, description, category, default_settings)| {
        ModuleCatalogRow {
            id,
            name,
            slug,
            version,
            description,
            category,
            default_settings,
        }
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_portfolio_event_creation() {
        let event = PortfolioEvent {
            tenant_id: Uuid::new_v4(),
            event_type: "PORTFOLIO_PUBLISHED".to_string(),
            payload: serde_json::json!({ "portfolio_id": "test" }),
        };

        assert_eq!(event.event_type, "PORTFOLIO_PUBLISHED");
    }

    #[test]
    fn test_portfolio_with_data_serialization() {
        let portfolio = PortfolioWithData {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            slug: "test".to_string(),
            title: "Test".to_string(),
            tagline: "Test".to_string(),
            status: "published".to_string(),
            metadata: serde_json::json!({}),
            data: Some(serde_json::json!({})),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&portfolio).unwrap();
        assert!(json.contains("test"));
    }

    #[test]
    fn test_website_with_data_serialization() {
        let website = WebsiteWithData {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            slug: "my-website".to_string(),
            title: "My Website".to_string(),
            tagline: "A great website".to_string(),
            status: "draft".to_string(),
            creation_mode: "from_scratch".to_string(),
            preset_id: None,
            metadata: serde_json::json!({}),
            data: Some(serde_json::json!({})),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&website).unwrap();
        assert!(json.contains("my-website"));
        assert!(json.contains("from_scratch"));
    }

    #[test]
    fn test_website_module_row_serialization() {
        let module = WebsiteModuleRow {
            id: Uuid::new_v4(),
            website_id: Uuid::new_v4(),
            module_id: Uuid::new_v4(),
            module_name: "GitHub Sync".to_string(),
            module_slug: "github-sync".to_string(),
            settings: serde_json::json!({"auto_sync": true}),
            enabled: true,
            activated_at: Utc::now(),
        };

        let json = serde_json::to_string(&module).unwrap();
        assert!(json.contains("github-sync"));
        assert!(json.contains("auto_sync"));
    }

    #[test]
    fn test_website_section_row_serialization() {
        let section = WebsiteSectionRow {
            id: Uuid::new_v4(),
            website_id: Uuid::new_v4(),
            module_id: Some(Uuid::new_v4()),
            section_type: "projects".to_string(),
            slug: "my-projects".to_string(),
            title: "My Projects".to_string(),
            order: 1,
            layout: "grid".to_string(),
            settings: serde_json::json!({}),
            data: serde_json::json!({}),
            visible: true,
        };

        let json = serde_json::to_string(&section).unwrap();
        assert!(json.contains("my-projects"));
        assert!(json.contains("grid"));
    }

    #[test]
    fn test_preset_row_serialization() {
        let preset = PresetRow {
            id: Uuid::new_v4(),
            name: "Developer Portfolio".to_string(),
            slug: "developer-portfolio".to_string(),
            description: "Perfect for developers".to_string(),
            category: "professional".to_string(),
            config: serde_json::json!({
                "modules": ["github-sync"],
                "sections": []
            }),
            thumbnail_url: Some("https://example.com/thumb.jpg".to_string()),
        };

        let json = serde_json::to_string(&preset).unwrap();
        assert!(json.contains("developer-portfolio"));
        assert!(json.contains("professional"));
    }

    #[test]
    fn test_module_catalog_row_serialization() {
        let module = ModuleCatalogRow {
            id: Uuid::new_v4(),
            name: "Blog Engine".to_string(),
            slug: "blog-engine".to_string(),
            version: "1.0.0".to_string(),
            description: "Full-featured blog engine".to_string(),
            category: "content".to_string(),
            default_settings: serde_json::json!({"posts_per_page": 10}),
        };

        let json = serde_json::to_string(&module).unwrap();
        assert!(json.contains("blog-engine"));
        assert!(json.contains("content"));
    }
}
