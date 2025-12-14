//! Website module queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};
use asap_core_shared::module_catalog;

use super::types::WebsiteModuleRow;

/// Sync all modules from the catalog to the database
/// 
/// This should be called at startup to ensure all modules defined in code
/// exist in the database with their latest metadata.
pub async fn sync_modules_catalog(pool: &PgPool) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let modules = module_catalog::get_module_catalog();
    let mut synced = 0;
    
    for module in modules {
        let config_schema = module.config_schema.as_ref()
            .and_then(|s| serde_json::to_value(s).ok());
        
        let result = sqlx::query(
            r#"
            INSERT INTO modules (id, name, slug, version, description, category, icon, default_settings, config_schema, sidebar_order, sidebar_label, enabled)
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
        .bind(&module.name)
        .bind(&module.slug)
        .bind(&module.version)
        .bind(&module.description)
        .bind(&module.category)
        .bind(&module.icon)
        .bind(&module.default_settings)
        .bind(&config_schema)
        .bind(module.sidebar_order)
        .bind(&module.sidebar_label)
        .execute(pool)
        .await?;
        
        if result.rows_affected() > 0 {
            synced += 1;
        }
    }
    
    Ok(synced)
}

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

/// Deactivate (delete) a module from a website
/// module_id_or_row_id can be either the module_id (from modules table) or the id (from website_modules table)
pub async fn deactivate_website_module(
    pool: &PgPool,
    website_id: Uuid,
    module_id_or_row_id: Uuid,
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

    // Delete the module from the website - try both id (row id) and module_id
    let result = sqlx::query(
        "DELETE FROM website_modules WHERE website_id = $1 AND (id = $2 OR module_id = $2)"
    )
    .bind(website_id)
    .bind(module_id_or_row_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}
