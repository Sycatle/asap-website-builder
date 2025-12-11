//! Website section queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;

use super::types::WebsiteSectionRow;

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
