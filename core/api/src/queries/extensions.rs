//! Website extension queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};
use asap_core_shared::extension_catalog;

use super::types::WebsiteExtensionRow;

/// Sync all extensions from the catalog to the database
/// 
/// This should be called at startup to ensure all extensions defined in code
/// exist in the database with their latest metadata.
pub async fn sync_extensions_catalog(pool: &PgPool) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let extensions = extension_catalog::get_extension_catalog();
    let mut synced = 0;
    
    for extension in extensions {
        let config_schema = extension.config_schema.as_ref()
            .and_then(|s| serde_json::to_value(s).ok());
        
        let result = sqlx::query(
            r#"
            INSERT INTO extensions (id, name, slug, version, description, category, icon, default_settings, config_schema, sidebar_order, sidebar_label, enabled)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                version = EXCLUDED.version,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                icon = EXCLUDED.icon,
                default_settings = EXCLUDED.default_settings,
                config_schema = EXCLUDED.config_schema,
                sidebar_order = EXCLUDED.sidebar_order,
                sidebar_label = EXCLUDED.sidebar_label
            "#
        )
        .bind(&extension.name)
        .bind(&extension.slug)
        .bind(&extension.version)
        .bind(&extension.description)
        .bind(&extension.category)
        .bind(&extension.icon)
        .bind(&extension.default_settings)
        .bind(&config_schema)
        .bind(extension.sidebar_order)
        .bind(&extension.sidebar_label)
        .execute(pool)
        .await?;
        
        if result.rows_affected() > 0 {
            synced += 1;
        }
    }
    
    Ok(synced)
}

/// List extensions activated for a website
pub async fn list_website_extensions(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Vec<WebsiteExtensionRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, JsonValue, bool, DateTime<Utc>)>(
        r#"
        SELECT 
            we.id, we.website_id, we.extension_id, 
            e.name as extension_name, e.slug as extension_slug,
            we.settings, we.enabled, we.activated_at
        FROM website_extensions we
        JOIN extensions e ON we.extension_id = e.id
        WHERE we.website_id = $1
        ORDER BY we.activated_at
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, website_id, extension_id, extension_name, extension_slug, settings, enabled, activated_at)| {
        WebsiteExtensionRow {
            id,
            website_id,
            extension_id,
            extension_name,
            extension_slug,
            settings,
            enabled,
            activated_at,
        }
    }).collect())
}

/// Activate an extension for a website
pub async fn activate_website_extension(
    pool: &PgPool,
    website_id: Uuid,
    extension_id: Uuid,
    account_id: Uuid,
    settings: JsonValue,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to account
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Website not found".into());
    }

    // Insert or update extension activation
    sqlx::query(
        r#"
        INSERT INTO website_extensions (website_id, extension_id, settings, enabled)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (website_id, extension_id)
        DO UPDATE SET settings = $3, enabled = true, updated_at = now()
        "#
    )
    .bind(website_id)
    .bind(extension_id)
    .bind(&settings)
    .execute(pool)
    .await?;

    Ok(())
}

/// Update a website extension
pub async fn update_website_extension(
    pool: &PgPool,
    website_id: Uuid,
    extension_id: Uuid,
    account_id: Uuid,
    settings: &JsonValue,
    enabled: Option<bool>,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to account
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Ok(false);
    }

    let result = if let Some(en) = enabled {
        sqlx::query(
            "UPDATE website_extensions SET settings = $1, enabled = $2, updated_at = now() WHERE website_id = $3 AND extension_id = $4"
        )
        .bind(settings)
        .bind(en)
        .bind(website_id)
        .bind(extension_id)
        .execute(pool)
        .await?
    } else {
        sqlx::query(
            "UPDATE website_extensions SET settings = $1, updated_at = now() WHERE website_id = $2 AND extension_id = $3"
        )
        .bind(settings)
        .bind(website_id)
        .bind(extension_id)
        .execute(pool)
        .await?
    };

    Ok(result.rows_affected() > 0)
}

/// Deactivate (delete) an extension from a website
/// extension_id_or_row_id can be either the extension_id (from extensions table) or the id (from website_extensions table)
pub async fn deactivate_website_extension(
    pool: &PgPool,
    website_id: Uuid,
    extension_id_or_row_id: Uuid,
    account_id: Uuid,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website belongs to account
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM websites WHERE id = $1 AND account_id = $2"
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Ok(false);
    }

    // Delete the extension from the website - try both id (row id) and extension_id
    let result = sqlx::query(
        "DELETE FROM website_extensions WHERE website_id = $1 AND (id = $2 OR extension_id = $2)"
    )
    .bind(website_id)
    .bind(extension_id_or_row_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}
