//! Preset queries

use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use super::types::PresetRow;

/// Batch insert data for pages
struct PageBatch {
    id: Uuid,
    website_id: Uuid,
    slug: String,
    title: String,
    description: String,
    is_homepage: bool,
    order: i32,
}

/// Batch insert data for elements
struct ElementBatch {
    id: Uuid,
    website_id: Uuid,
    element_type: String,
    slug: String,
    title: String,
    order: i32,
    layout: String,
    settings: JsonValue,
}

/// Batch insert data for page-element links
struct PageElementBatch {
    page_id: Uuid,
    element_id: Uuid,
    order: i32,
}

/// List available presets
pub async fn list_presets(
    pool: &PgPool,
) -> Result<Vec<PresetRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            String,
            String,
            String,
            JsonValue,
            Option<String>,
        ),
    >(
        r#"
        SELECT id, name, slug, description, category, config, thumbnail_url
        FROM presets
        WHERE enabled = true
        ORDER BY name
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(
            |(id, name, slug, description, category, config, thumbnail_url)| PresetRow {
                id,
                name,
                slug,
                description,
                category,
                config,
                thumbnail_url,
            },
        )
        .collect())
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
    let preset: Option<(JsonValue,)> =
        sqlx::query_as("SELECT config FROM presets WHERE id = $1 AND enabled = true")
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
        "#,
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
    sqlx::query("INSERT INTO website_data (website_id) VALUES ($1)")
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
    // Collect all data first, then batch insert for performance (100+ queries → 3 queries)
    let mut page_batches: Vec<PageBatch> = Vec::new();
    let mut element_batches: Vec<ElementBatch> = Vec::new();
    let mut page_element_batches: Vec<PageElementBatch> = Vec::new();

    if let Some(pages) = config.get("pages").and_then(|p| p.as_array()) {
        for (page_order, page) in pages.iter().enumerate() {
            let page_slug = page.get("slug").and_then(|s| s.as_str()).unwrap_or("");
            let page_title = page.get("title").and_then(|s| s.as_str()).unwrap_or("Page");
            let page_description = page
                .get("description")
                .and_then(|s| s.as_str())
                .unwrap_or("");
            let is_homepage = page
                .get("is_homepage")
                .and_then(|h| h.as_bool())
                .unwrap_or(false);

            let page_id = Uuid::new_v4();
            page_batches.push(PageBatch {
                id: page_id,
                website_id,
                slug: page_slug.to_string(),
                title: page_title.to_string(),
                description: page_description.to_string(),
                is_homepage,
                order: page_order as i32,
            });

            // Collect elements for this page (supports both "elements" and "sections" keys)
            if let Some(elements) = page
                .get("elements")
                .and_then(|s| s.as_array())
                .or_else(|| page.get("sections").and_then(|s| s.as_array()))
            {
                for (element_order, element) in elements.iter().enumerate() {
                    let element_type = element
                        .get("element_type")
                        .and_then(|s| s.as_str())
                        .or_else(|| element.get("section_type").and_then(|s| s.as_str()))
                        .unwrap_or("custom");
                    let element_slug = element
                        .get("slug")
                        .and_then(|s| s.as_str())
                        .unwrap_or("element");
                    let element_title = element
                        .get("title")
                        .and_then(|s| s.as_str())
                        .unwrap_or("Element");
                    let layout = element
                        .get("layout")
                        .and_then(|l| l.as_str())
                        .unwrap_or("full");
                    let default_settings = serde_json::json!({});
                    let settings = element.get("settings").unwrap_or(&default_settings).clone();

                    let element_id = Uuid::new_v4();
                    element_batches.push(ElementBatch {
                        id: element_id,
                        website_id,
                        element_type: element_type.to_string(),
                        slug: element_slug.to_string(),
                        title: element_title.to_string(),
                        order: element_order as i32,
                        layout: layout.to_string(),
                        settings,
                    });

                    page_element_batches.push(PageElementBatch {
                        page_id,
                        element_id,
                        order: element_order as i32,
                    });
                }
            }
        }
    } else if let Some(elements) = config
        .get("elements")
        .and_then(|s| s.as_array())
        .or_else(|| config.get("sections").and_then(|s| s.as_array()))
    {
        // Fallback: Legacy support for old presets with elements/sections at root level
        let page_id = Uuid::new_v4();
        page_batches.push(PageBatch {
            id: page_id,
            website_id,
            slug: String::new(),
            title: "Accueil".to_string(),
            description: "Page d'accueil".to_string(),
            is_homepage: true,
            order: 0,
        });

        for (order, element) in elements.iter().enumerate() {
            let element_type = element
                .get("element_type")
                .and_then(|s| s.as_str())
                .or_else(|| element.get("section_type").and_then(|s| s.as_str()))
                .unwrap_or("custom");
            let element_slug = element
                .get("slug")
                .and_then(|s| s.as_str())
                .unwrap_or("element");
            let element_title = element
                .get("title")
                .and_then(|s| s.as_str())
                .unwrap_or("Element");
            let layout = element
                .get("layout")
                .and_then(|l| l.as_str())
                .unwrap_or("full");
            let default_settings = serde_json::json!({});
            let settings = element.get("settings").unwrap_or(&default_settings).clone();

            let element_id = Uuid::new_v4();
            element_batches.push(ElementBatch {
                id: element_id,
                website_id,
                element_type: element_type.to_string(),
                slug: element_slug.to_string(),
                title: element_title.to_string(),
                order: order as i32,
                layout: layout.to_string(),
                settings,
            });

            page_element_batches.push(PageElementBatch {
                page_id,
                element_id,
                order: order as i32,
            });
        }
    }

    // Batch insert pages (single query with UNNEST)
    if !page_batches.is_empty() {
        let ids: Vec<Uuid> = page_batches.iter().map(|p| p.id).collect();
        let website_ids: Vec<Uuid> = page_batches.iter().map(|p| p.website_id).collect();
        let slugs: Vec<String> = page_batches.iter().map(|p| p.slug.clone()).collect();
        let titles: Vec<String> = page_batches.iter().map(|p| p.title.clone()).collect();
        let descriptions: Vec<String> =
            page_batches.iter().map(|p| p.description.clone()).collect();
        let is_homepages: Vec<bool> = page_batches.iter().map(|p| p.is_homepage).collect();
        let orders: Vec<i32> = page_batches.iter().map(|p| p.order).collect();

        sqlx::query(
            r#"
            INSERT INTO website_pages (id, website_id, slug, title, description, is_homepage, "order", visible)
            SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::bool[], $7::int[], ARRAY_FILL(true, ARRAY[$8::int]))
            "#
        )
        .bind(&ids)
        .bind(&website_ids)
        .bind(&slugs)
        .bind(&titles)
        .bind(&descriptions)
        .bind(&is_homepages)
        .bind(&orders)
        .bind(ids.len() as i32)
        .execute(&mut *tx)
        .await?;
    }

    // Batch insert elements (single query with UNNEST)
    if !element_batches.is_empty() {
        let ids: Vec<Uuid> = element_batches.iter().map(|e| e.id).collect();
        let website_ids: Vec<Uuid> = element_batches.iter().map(|e| e.website_id).collect();
        let element_types: Vec<String> = element_batches
            .iter()
            .map(|e| e.element_type.clone())
            .collect();
        let slugs: Vec<String> = element_batches.iter().map(|e| e.slug.clone()).collect();
        let titles: Vec<String> = element_batches.iter().map(|e| e.title.clone()).collect();
        let orders: Vec<i32> = element_batches.iter().map(|e| e.order).collect();
        let layouts: Vec<String> = element_batches.iter().map(|e| e.layout.clone()).collect();
        let settings: Vec<JsonValue> = element_batches.iter().map(|e| e.settings.clone()).collect();

        sqlx::query(
            r#"
            INSERT INTO website_elements (id, website_id, element_type, slug, title, "order", layout, settings)
            SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::int[], $7::text[], $8::jsonb[])
            "#
        )
        .bind(&ids)
        .bind(&website_ids)
        .bind(&element_types)
        .bind(&slugs)
        .bind(&titles)
        .bind(&orders)
        .bind(&layouts)
        .bind(&settings)
        .execute(&mut *tx)
        .await?;
    }

    // Batch insert page-element links (single query with UNNEST)
    if !page_element_batches.is_empty() {
        let page_ids: Vec<Uuid> = page_element_batches.iter().map(|pe| pe.page_id).collect();
        let element_ids: Vec<Uuid> = page_element_batches
            .iter()
            .map(|pe| pe.element_id)
            .collect();
        let orders: Vec<i32> = page_element_batches.iter().map(|pe| pe.order).collect();

        sqlx::query(
            r#"
            INSERT INTO page_elements (page_id, element_id, "order", visible)
            SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::int[], ARRAY_FILL(true, ARRAY[$4::int]))
            "#
        )
        .bind(&page_ids)
        .bind(&element_ids)
        .bind(&orders)
        .bind(page_ids.len() as i32)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(website_id)
}
