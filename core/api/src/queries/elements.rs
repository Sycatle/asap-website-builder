//! Website element queries

use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use super::types::WebsiteElementRow;

type ElementRowTuple = (
    Uuid,
    Uuid,
    Option<Uuid>,
    String,
    String,
    String,
    i32,
    String,
    JsonValue,
    JsonValue,
    bool,
    Option<String>,
    Option<String>,
    JsonValue,
    JsonValue,
);

fn map_element_row(tuple: ElementRowTuple) -> WebsiteElementRow {
    let (
        id,
        website_id,
        extension_id,
        element_type,
        slug,
        title,
        order,
        layout,
        settings,
        data,
        visible,
        source_code,
        compiled_js,
        data_bindings,
        knobs_schema,
    ) = tuple;
    WebsiteElementRow {
        id,
        website_id,
        extension_id,
        element_type,
        slug,
        title,
        order,
        layout,
        settings,
        data,
        visible,
        source_code,
        compiled_js,
        data_bindings,
        knobs_schema,
    }
}

/// List elements for a website
pub async fn list_website_elements(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<Vec<WebsiteElementRow>, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
        return Err("Website not found".into());
    }

    let rows = sqlx::query_as::<_, ElementRowTuple>(
        r#"
        SELECT
            id, website_id, extension_id, element_type, slug, title,
            "order", layout, settings, data, visible,
            source_code, compiled_js, data_bindings, knobs_schema
        FROM website_elements
        WHERE website_id = $1
        ORDER BY "order"
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(map_element_row).collect())
}

/// Input bundle for [`create_website_element`].
pub struct CreateElementInput<'a> {
    pub website_id: Uuid,
    pub account_id: Uuid,
    pub extension_id: Option<Uuid>,
    pub element_type: &'a str,
    pub slug: &'a str,
    pub title: &'a str,
    pub order: i32,
    pub layout: &'a str,
    pub settings: &'a JsonValue,
    pub data: &'a JsonValue,
}

/// Create an element for a website
pub async fn create_website_element(
    pool: &PgPool,
    input: CreateElementInput<'_>,
) -> Result<Uuid, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, input.website_id, input.account_id).await? {
        return Err("Website not found".into());
    }

    let element_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO website_elements (id, website_id, extension_id, element_type, slug, title, "order", layout, settings, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#
    )
    .bind(element_id)
    .bind(input.website_id)
    .bind(input.extension_id)
    .bind(input.element_type)
    .bind(input.slug)
    .bind(input.title)
    .bind(input.order)
    .bind(input.layout)
    .bind(input.settings)
    .bind(input.data)
    .execute(pool)
    .await?;

    Ok(element_id)
}

/// Update a website element. AI-codegen fields (`source_code` / `compiled_js`
/// / `data_bindings` / `knobs_schema`) are written by the codegen endpoint,
/// not this generic update — they always travel as a single atomic bundle.
#[allow(clippy::too_many_arguments)]
pub async fn update_website_element(
    pool: &PgPool,
    element_id: Uuid,
    website_id: Uuid,
    account_id: Uuid,
    title: Option<&str>,
    layout: Option<&str>,
    settings: Option<&JsonValue>,
    data: Option<&JsonValue>,
    visible: Option<bool>,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
        return Ok(false);
    }

    let mut tx = pool.begin().await?;

    if let Some(t) = title {
        sqlx::query(
            "UPDATE website_elements SET title = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(t)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(l) = layout {
        sqlx::query(
            "UPDATE website_elements SET layout = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(l)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(s) = settings {
        sqlx::query(
            "UPDATE website_elements SET settings = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(s)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(d) = data {
        sqlx::query(
            "UPDATE website_elements SET data = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(d)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(v) = visible {
        sqlx::query(
            "UPDATE website_elements SET visible = $1, updated_at = now() WHERE id = $2 AND website_id = $3"
        )
        .bind(v)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(true)
}

/// Delete a website element
pub async fn delete_website_element(
    pool: &PgPool,
    element_id: Uuid,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
        return Ok(false);
    }

    let result = sqlx::query("DELETE FROM website_elements WHERE id = $1 AND website_id = $2")
        .bind(element_id)
        .bind(website_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

/// Reorder elements
pub async fn reorder_website_elements(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    element_ids: &[Uuid],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Verify website access (owner or active administrator)
    if !super::verify_website_access(pool, website_id, account_id).await? {
        return Err("Website not found".into());
    }

    let mut tx = pool.begin().await?;

    for (order, element_id) in element_ids.iter().enumerate() {
        sqlx::query(
            r#"UPDATE website_elements SET "order" = $1, updated_at = now() WHERE id = $2 AND website_id = $3"#
        )
        .bind(order as i32)
        .bind(element_id)
        .bind(website_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

/// List public elements for a website (no account verification, for published sites)
pub async fn list_public_website_elements(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Vec<WebsiteElementRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, ElementRowTuple>(
        r#"
        SELECT
            id, website_id, extension_id, element_type, slug, title,
            "order", layout, settings, data, visible,
            source_code, compiled_js, data_bindings, knobs_schema
        FROM website_elements
        WHERE website_id = $1 AND visible = true
        ORDER BY "order"
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(map_element_row).collect())
}
