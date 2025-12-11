//! Preset queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;

use super::types::PresetRow;

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
