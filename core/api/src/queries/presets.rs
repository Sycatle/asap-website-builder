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
    account_id: Uuid,
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
        INSERT INTO websites (id, account_id, slug, title, tagline, creation_mode, preset_id)
        VALUES ($1, $2, $3, $4, $5, 'from_preset', $6)
        "#
    )
    .bind(website_id)
    .bind(account_id)
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

    // Activate extensions from preset config
    if let Some(extensions) = config.get("extensions").and_then(|m| m.as_array()) {
        for extension_slug in extensions {
            if let Some(slug_str) = extension_slug.as_str() {
                // Get extension ID by slug
                let extension: Option<(Uuid, JsonValue)> = sqlx::query_as(
                    "SELECT id, default_settings FROM extensions WHERE slug = $1 AND enabled = true"
                )
                .bind(slug_str)
                .fetch_optional(&mut *tx)
                .await?;

                if let Some((extension_id, default_settings)) = extension {
                    sqlx::query(
                        "INSERT INTO website_extensions (website_id, extension_id, settings) VALUES ($1, $2, $3)"
                    )
                    .bind(website_id)
                    .bind(extension_id)
                    .bind(&default_settings)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }
    }

    // Create pages and elements from preset config (new page-based structure)
    if let Some(pages) = config.get("pages").and_then(|p| p.as_array()) {
        for (page_order, page) in pages.iter().enumerate() {
            let page_slug = page.get("slug").and_then(|s| s.as_str()).unwrap_or("");
            let page_title = page.get("title").and_then(|s| s.as_str()).unwrap_or("Page");
            let page_description = page.get("description").and_then(|s| s.as_str()).unwrap_or("");
            let is_homepage = page.get("is_homepage").and_then(|h| h.as_bool()).unwrap_or(false);

            // Create the page
            let page_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO website_pages (id, website_id, slug, title, description, is_homepage, "order", visible)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                "#
            )
            .bind(page_id)
            .bind(website_id)
            .bind(page_slug)
            .bind(page_title)
            .bind(page_description)
            .bind(is_homepage)
            .bind(page_order as i32)
            .execute(&mut *tx)
            .await?;

            // Create elements for this page
            if let Some(elements) = page.get("elements").and_then(|s| s.as_array()) {
                for (element_order, element) in elements.iter().enumerate() {
                    let element_type = element.get("element_type").and_then(|s| s.as_str()).unwrap_or("custom");
                    let element_slug = element.get("slug").and_then(|s| s.as_str()).unwrap_or("element");
                    let element_title = element.get("title").and_then(|s| s.as_str()).unwrap_or("Element");
                    let layout = element.get("layout").and_then(|l| l.as_str()).unwrap_or("full");
                    let default_settings = serde_json::json!({});
                    let settings = element.get("settings").unwrap_or(&default_settings);

                    // Create element in website_elements
                    let element_id = Uuid::new_v4();
                    sqlx::query(
                        r#"
                        INSERT INTO website_elements (id, website_id, element_type, slug, title, "order", layout, settings)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        "#
                    )
                    .bind(element_id)
                    .bind(website_id)
                    .bind(element_type)
                    .bind(element_slug)
                    .bind(element_title)
                    .bind(element_order as i32)
                    .bind(layout)
                    .bind(settings)
                    .execute(&mut *tx)
                    .await?;

                    // Link element to page via page_elements
                    sqlx::query(
                        r#"
                        INSERT INTO page_elements (page_id, element_id, "order", visible)
                        VALUES ($1, $2, $3, true)
                        "#
                    )
                    .bind(page_id)
                    .bind(element_id)
                    .bind(element_order as i32)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }
    } else if let Some(elements) = config.get("elements").and_then(|s| s.as_array()) {
        // Fallback: Legacy support for old presets with elements at root level
        // Create a default homepage with all elements
        let page_id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO website_pages (id, website_id, slug, title, description, is_homepage, "order", visible)
            VALUES ($1, $2, '', 'Accueil', 'Page d''accueil', true, 0, true)
            "#
        )
        .bind(page_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;

        for (order, element) in elements.iter().enumerate() {
            let element_type = element.get("element_type").and_then(|s| s.as_str()).unwrap_or("custom");
            let element_slug = element.get("slug").and_then(|s| s.as_str()).unwrap_or("element");
            let element_title = element.get("title").and_then(|s| s.as_str()).unwrap_or("Element");
            let layout = element.get("layout").and_then(|l| l.as_str()).unwrap_or("full");
            let default_settings = serde_json::json!({});
            let settings = element.get("settings").unwrap_or(&default_settings);

            // Create element
            let element_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO website_elements (id, website_id, element_type, slug, title, "order", layout, settings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                "#
            )
            .bind(element_id)
            .bind(website_id)
            .bind(element_type)
            .bind(element_slug)
            .bind(element_title)
            .bind(order as i32)
            .bind(layout)
            .bind(settings)
            .execute(&mut *tx)
            .await?;

            // Link to homepage
            sqlx::query(
                r#"
                INSERT INTO page_elements (page_id, element_id, "order", visible)
                VALUES ($1, $2, $3, true)
                "#
            )
            .bind(page_id)
            .bind(element_id)
            .bind(order as i32)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;
    Ok(website_id)
}
