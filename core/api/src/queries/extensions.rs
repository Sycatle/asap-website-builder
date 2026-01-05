//! Website extension queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};
use asap_core_shared::ExtensionRegistry;

use super::types::WebsiteExtensionRow;

/// Sync all extensions from the catalog to the database
/// 
/// This should be called at startup to ensure all extensions defined in code
/// exist in the database with their latest metadata.
pub async fn sync_extensions_catalog(pool: &PgPool) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let registry = ExtensionRegistry::load_from_workspace()?;
    let extensions = registry.get_all();
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
    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, Option<String>, JsonValue, bool, DateTime<Utc>)>(
        r#"
        SELECT 
            we.id, we.website_id, we.extension_id, 
            e.name as extension_name, e.slug as extension_slug, e.category, e.icon,
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

    Ok(rows.into_iter().map(|(id, website_id, extension_id, extension_name, extension_slug, category, icon, settings, enabled, activated_at)| {
        WebsiteExtensionRow {
            id,
            website_id,
            extension_id,
            extension_name,
            extension_slug,
            category,
            icon,
            settings,
            enabled,
            activated_at,
        }
    }).collect())
}

/// Activate an extension for a website
/// Returns the activated extension data
pub async fn activate_website_extension(
    pool: &PgPool,
    website_id: Uuid,
    extension_id: Uuid,
    account_id: Uuid,
    settings: JsonValue,
) -> Result<WebsiteExtensionRow, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
        return Err("Website not found".into());
    }

    // Insert or update extension activation and return the result
    let row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, Option<String>, JsonValue, bool, DateTime<Utc>)>(
        r#"
        WITH upserted AS (
            INSERT INTO website_extensions (website_id, extension_id, settings, enabled)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (website_id, extension_id)
            DO UPDATE SET settings = $3, enabled = true, updated_at = now()
            RETURNING id, website_id, extension_id, settings, enabled, activated_at
        )
        SELECT 
            u.id, u.website_id, u.extension_id, 
            e.name as extension_name, e.slug as extension_slug, e.category, e.icon,
            u.settings, u.enabled, u.activated_at
        FROM upserted u
        JOIN extensions e ON u.extension_id = e.id
        "#
    )
    .bind(website_id)
    .bind(extension_id)
    .bind(&settings)
    .fetch_one(pool)
    .await?;

    Ok(WebsiteExtensionRow {
        id: row.0,
        website_id: row.1,
        extension_id: row.2,
        extension_name: row.3,
        extension_slug: row.4,
        category: row.5,
        icon: row.6,
        settings: row.7,
        enabled: row.8,
        activated_at: row.9,
    })
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
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
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
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
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
