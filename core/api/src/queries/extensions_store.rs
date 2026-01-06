//! Extension Store v2 Queries
//!
//! Repository pattern for the new Extension Store system.
//! Uses extensions_v2, account_extensions, website_extensions_v2 tables.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

// ============================================================================
// Types
// ============================================================================

/// Extension from the store catalog
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExtensionStoreRow {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub long_description: Option<String>,
    pub icon: Option<String>,
    pub banner: Option<String>,
    pub category: String,
    pub tags: Vec<String>,
    pub min_plan: String,
    pub author_name: Option<String>,
    pub author_verified: Option<bool>,
    pub featured: bool,
    pub beta: bool,
    pub deprecated: bool,
    pub install_count: i32,
    pub rating_average: Option<f64>,
    pub rating_count: i32,
    pub manifest: JsonValue,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Installed extension for an account
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountExtensionRow {
    pub id: Uuid,
    pub account_id: Uuid,
    pub extension_slug: String,
    pub installed_version: String,
    pub settings: JsonValue,
    pub granted_permissions: Vec<String>,
    pub enabled: bool,
    pub installed_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Activated extension for a website
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WebsiteExtensionV2Row {
    pub id: Uuid,
    pub website_id: Uuid,
    pub account_extension_id: Uuid,
    pub extension_slug: String,
    pub extension_name: String,
    pub settings: JsonValue,
    pub enabled: bool,
    pub activated_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Extension review
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExtensionReviewRow {
    pub id: Uuid,
    pub extension_slug: String,
    pub account_id: Uuid,
    pub rating: i32,
    pub title: Option<String>,
    pub body: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

/// Filter options for store listing
#[derive(Debug, Default)]
pub struct ExtensionStoreFilter {
    pub category: Option<String>,
    pub min_plan: Option<String>,
    pub tags: Option<Vec<String>>,
    pub search: Option<String>,
    pub featured_only: bool,
    pub include_beta: bool,
    pub include_deprecated: bool,
}

/// Pagination options
#[derive(Debug)]
pub struct Pagination {
    pub page: u32,
    pub per_page: u32,
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
        }
    }
}

/// Sort options for store listing
#[derive(Debug, Default)]
pub enum ExtensionSort {
    #[default]
    Popular,
    Newest,
    Rating,
    Name,
}

// ============================================================================
// Store Catalog Queries
// ============================================================================

/// List extensions from the store with filters
pub async fn list_store_extensions(
    pool: &PgPool,
    filter: ExtensionStoreFilter,
    sort: ExtensionSort,
    pagination: Pagination,
) -> Result<(Vec<ExtensionStoreRow>, i64), sqlx::Error> {
    let offset = ((pagination.page - 1) * pagination.per_page) as i64;
    let limit = pagination.per_page as i64;

    // Build dynamic query
    let mut conditions = vec!["status = 'active'".to_string()];
    
    if let Some(ref category) = filter.category {
        conditions.push(format!("category = '{}'", category));
    }
    
    if let Some(ref min_plan) = filter.min_plan {
        // Filter extensions that require at most this plan
        let plans = match min_plan.as_str() {
            "free" => vec!["free"],
            "starter" => vec!["free", "starter"],
            "pro" => vec!["free", "starter", "pro"],
            "business" => vec!["free", "starter", "pro", "business"],
            _ => vec!["free"],
        };
        let plan_list = plans.iter().map(|p| format!("'{}'", p)).collect::<Vec<_>>().join(", ");
        conditions.push(format!("min_plan IN ({})", plan_list));
    }
    
    if filter.featured_only {
        conditions.push("featured = true".to_string());
    }
    
    if !filter.include_beta {
        conditions.push("beta = false".to_string());
    }
    
    if !filter.include_deprecated {
        conditions.push("deprecated = false".to_string());
    }
    
    if let Some(ref search) = filter.search {
        conditions.push(format!(
            "(name ILIKE '%{}%' OR description ILIKE '%{}%' OR '{}' = ANY(tags))",
            search, search, search.to_lowercase()
        ));
    }
    
    if let Some(ref tags) = filter.tags {
        if !tags.is_empty() {
            let tag_array = tags.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(", ");
            conditions.push(format!("tags && ARRAY[{}]", tag_array));
        }
    }

    let where_clause = conditions.join(" AND ");
    
    let order_clause = match sort {
        ExtensionSort::Popular => "install_count DESC, rating_average DESC",
        ExtensionSort::Newest => "created_at DESC",
        ExtensionSort::Rating => "rating_average DESC, rating_count DESC",
        ExtensionSort::Name => "name ASC",
    };

    // Count total
    let count_query = format!(
        "SELECT COUNT(*) FROM extensions_v2 WHERE {}",
        where_clause
    );
    let (total,): (i64,) = sqlx::query_as(&count_query)
        .fetch_one(pool)
        .await?;

    // Fetch page
    let query = format!(
        r#"
        SELECT slug, name, version, description, long_description, icon, banner,
               category, tags, min_plan, author_name, author_verified, featured,
               beta, deprecated, install_count, rating_average::float8, rating_count,
               manifest, created_at, updated_at
        FROM extensions_v2
        WHERE {}
        ORDER BY {}
        LIMIT {} OFFSET {}
        "#,
        where_clause, order_clause, limit, offset
    );
    
    let rows = sqlx::query_as::<_, ExtensionStoreRow>(&query)
        .fetch_all(pool)
        .await?;

    Ok((rows, total))
}

/// Get a single extension by slug
pub async fn get_store_extension(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<ExtensionStoreRow>, sqlx::Error> {
    sqlx::query_as::<_, ExtensionStoreRow>(
        r#"
        SELECT slug, name, version, description, long_description, icon, banner,
               category, tags, min_plan, author_name, author_verified, featured,
               beta, deprecated, install_count, rating_average::float8, rating_count,
               manifest, created_at, updated_at
        FROM extensions_v2
        WHERE slug = $1 AND status = 'active'
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
}

/// Get featured extensions
pub async fn get_featured_extensions(
    pool: &PgPool,
    limit: i32,
) -> Result<Vec<ExtensionStoreRow>, sqlx::Error> {
    sqlx::query_as::<_, ExtensionStoreRow>(
        r#"
        SELECT slug, name, version, description, long_description, icon, banner,
               category, tags, min_plan, author_name, author_verified, featured,
               beta, deprecated, install_count, rating_average::float8, rating_count,
               manifest, created_at, updated_at
        FROM extensions_v2
        WHERE featured = true AND status = 'active' AND deprecated = false
        ORDER BY install_count DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// Get all categories with extension counts
pub async fn get_extension_categories(
    pool: &PgPool,
) -> Result<Vec<(String, i64)>, sqlx::Error> {
    sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT category, COUNT(*) as count
        FROM extensions_v2
        WHERE status = 'active' AND deprecated = false
        GROUP BY category
        ORDER BY count DESC
        "#,
    )
    .fetch_all(pool)
    .await
}

// ============================================================================
// Account Extensions (Installation)
// ============================================================================

/// Install an extension for an account
pub async fn install_extension(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
    granted_permissions: Vec<String>,
) -> Result<AccountExtensionRow, sqlx::Error> {
    // Get extension details
    let extension = get_store_extension(pool, extension_slug)
        .await?
        .ok_or_else(|| sqlx::Error::RowNotFound)?;

    // Get default settings from manifest
    let default_settings = extension.manifest
        .get("default_settings")
        .cloned()
        .unwrap_or(JsonValue::Object(serde_json::Map::new()));

    sqlx::query_as::<_, AccountExtensionRow>(
        r#"
        INSERT INTO account_extensions 
            (account_id, extension_slug, installed_version, settings, granted_permissions, enabled)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (account_id, extension_slug) 
        DO UPDATE SET 
            installed_version = EXCLUDED.installed_version,
            granted_permissions = EXCLUDED.granted_permissions,
            enabled = true,
            updated_at = NOW()
        RETURNING id, account_id, extension_slug, installed_version, settings, 
                  granted_permissions, enabled, installed_at, updated_at
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .bind(&extension.version)
    .bind(&default_settings)
    .bind(&granted_permissions)
    .fetch_one(pool)
    .await
}

/// Uninstall an extension from an account
pub async fn uninstall_extension(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        DELETE FROM account_extensions
        WHERE account_id = $1 AND extension_slug = $2
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// List installed extensions for an account
pub async fn list_account_extensions(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<Vec<AccountExtensionRow>, sqlx::Error> {
    sqlx::query_as::<_, AccountExtensionRow>(
        r#"
        SELECT id, account_id, extension_slug, installed_version, settings,
               granted_permissions, enabled, installed_at, updated_at
        FROM account_extensions
        WHERE account_id = $1
        ORDER BY installed_at DESC
        "#,
    )
    .bind(account_id)
    .fetch_all(pool)
    .await
}

/// Get a specific installed extension
pub async fn get_account_extension(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
) -> Result<Option<AccountExtensionRow>, sqlx::Error> {
    sqlx::query_as::<_, AccountExtensionRow>(
        r#"
        SELECT id, account_id, extension_slug, installed_version, settings,
               granted_permissions, enabled, installed_at, updated_at
        FROM account_extensions
        WHERE account_id = $1 AND extension_slug = $2
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .fetch_optional(pool)
    .await
}

/// Update account-level extension settings
pub async fn update_account_extension_settings(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
    settings: JsonValue,
) -> Result<AccountExtensionRow, sqlx::Error> {
    sqlx::query_as::<_, AccountExtensionRow>(
        r#"
        UPDATE account_extensions
        SET settings = $3, updated_at = NOW()
        WHERE account_id = $1 AND extension_slug = $2
        RETURNING id, account_id, extension_slug, installed_version, settings,
                  granted_permissions, enabled, installed_at, updated_at
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .bind(&settings)
    .fetch_one(pool)
    .await
}

/// Toggle extension enabled state
pub async fn toggle_account_extension(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
    enabled: bool,
) -> Result<AccountExtensionRow, sqlx::Error> {
    sqlx::query_as::<_, AccountExtensionRow>(
        r#"
        UPDATE account_extensions
        SET enabled = $3, updated_at = NOW()
        WHERE account_id = $1 AND extension_slug = $2
        RETURNING id, account_id, extension_slug, installed_version, settings,
                  granted_permissions, enabled, installed_at, updated_at
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .bind(enabled)
    .fetch_one(pool)
    .await
}

// ============================================================================
// Website Extensions (Activation)
// ============================================================================

/// Activate an extension on a website
pub async fn activate_website_extension_v2(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    extension_slug: &str,
    settings: Option<JsonValue>,
) -> Result<WebsiteExtensionV2Row, sqlx::Error> {
    // Get account extension ID
    let account_ext = get_account_extension(pool, account_id, extension_slug)
        .await?
        .ok_or_else(|| sqlx::Error::RowNotFound)?;

    let settings = settings.unwrap_or(JsonValue::Object(serde_json::Map::new()));

    sqlx::query_as::<_, WebsiteExtensionV2Row>(
        r#"
        WITH inserted AS (
            INSERT INTO website_extensions_v2 
                (website_id, account_extension_id, settings, enabled)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (website_id, account_extension_id)
            DO UPDATE SET 
                settings = EXCLUDED.settings,
                enabled = true,
                updated_at = NOW()
            RETURNING id, website_id, account_extension_id, settings, enabled, activated_at, updated_at
        )
        SELECT i.id, i.website_id, i.account_extension_id, 
               ae.extension_slug, e.name as extension_name,
               i.settings, i.enabled, i.activated_at, i.updated_at
        FROM inserted i
        JOIN account_extensions ae ON i.account_extension_id = ae.id
        JOIN extensions_v2 e ON ae.extension_slug = e.slug
        "#,
    )
    .bind(website_id)
    .bind(account_ext.id)
    .bind(&settings)
    .fetch_one(pool)
    .await
}

/// Deactivate an extension from a website
pub async fn deactivate_website_extension_v2(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    extension_slug: &str,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        DELETE FROM website_extensions_v2 we
        USING account_extensions ae
        WHERE we.account_extension_id = ae.id
          AND we.website_id = $1
          AND ae.account_id = $2
          AND ae.extension_slug = $3
        "#,
    )
    .bind(website_id)
    .bind(account_id)
    .bind(extension_slug)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// List extensions activated on a website
pub async fn list_website_extensions_v2(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Vec<WebsiteExtensionV2Row>, sqlx::Error> {
    sqlx::query_as::<_, WebsiteExtensionV2Row>(
        r#"
        SELECT we.id, we.website_id, we.account_extension_id,
               ae.extension_slug, e.name as extension_name,
               we.settings, we.enabled, we.activated_at, we.updated_at
        FROM website_extensions_v2 we
        JOIN account_extensions ae ON we.account_extension_id = ae.id
        JOIN extensions_v2 e ON ae.extension_slug = e.slug
        WHERE we.website_id = $1
        ORDER BY we.activated_at DESC
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
}

/// Toggle website extension enabled state
pub async fn toggle_website_extension_v2(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    extension_slug: &str,
    enabled: bool,
) -> Result<WebsiteExtensionV2Row, sqlx::Error> {
    sqlx::query_as::<_, WebsiteExtensionV2Row>(
        r#"
        UPDATE website_extensions_v2 we
        SET enabled = $4, updated_at = NOW()
        FROM account_extensions ae
        WHERE we.account_extension_id = ae.id
          AND we.website_id = $1
          AND ae.account_id = $2
          AND ae.extension_slug = $3
        RETURNING we.id, we.website_id, we.account_extension_id,
                  ae.extension_slug, (SELECT name FROM extensions_v2 WHERE slug = ae.extension_slug) as extension_name,
                  we.settings, we.enabled, we.activated_at, we.updated_at
        "#,
    )
    .bind(website_id)
    .bind(account_id)
    .bind(extension_slug)
    .bind(enabled)
    .fetch_one(pool)
    .await
}

/// Update website-specific extension settings
pub async fn update_website_extension_settings_v2(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    extension_slug: &str,
    settings: JsonValue,
) -> Result<WebsiteExtensionV2Row, sqlx::Error> {
    sqlx::query_as::<_, WebsiteExtensionV2Row>(
        r#"
        UPDATE website_extensions_v2 we
        SET settings = $4, updated_at = NOW()
        FROM account_extensions ae
        WHERE we.account_extension_id = ae.id
          AND we.website_id = $1
          AND ae.account_id = $2
          AND ae.extension_slug = $3
        RETURNING we.id, we.website_id, we.account_extension_id,
                  ae.extension_slug, (SELECT name FROM extensions_v2 WHERE slug = ae.extension_slug) as extension_name,
                  we.settings, we.enabled, we.activated_at, we.updated_at
        "#,
    )
    .bind(website_id)
    .bind(account_id)
    .bind(extension_slug)
    .bind(&settings)
    .fetch_one(pool)
    .await
}

// ============================================================================
// Reviews
// ============================================================================

/// Add or update a review
pub async fn upsert_review(
    pool: &PgPool,
    extension_slug: &str,
    account_id: Uuid,
    rating: i32,
    title: Option<String>,
    body: Option<String>,
) -> Result<ExtensionReviewRow, sqlx::Error> {
    sqlx::query_as::<_, ExtensionReviewRow>(
        r#"
        INSERT INTO extension_reviews (extension_slug, account_id, rating, title, body)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (extension_slug, account_id)
        DO UPDATE SET 
            rating = EXCLUDED.rating,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            updated_at = NOW()
        RETURNING id, extension_slug, account_id, rating, title, body, status, created_at
        "#,
    )
    .bind(extension_slug)
    .bind(account_id)
    .bind(rating)
    .bind(&title)
    .bind(&body)
    .fetch_one(pool)
    .await
}

/// List reviews for an extension
pub async fn list_extension_reviews(
    pool: &PgPool,
    extension_slug: &str,
    pagination: Pagination,
) -> Result<Vec<ExtensionReviewRow>, sqlx::Error> {
    let offset = ((pagination.page - 1) * pagination.per_page) as i64;
    let limit = pagination.per_page as i64;

    sqlx::query_as::<_, ExtensionReviewRow>(
        r#"
        SELECT id, extension_slug, account_id, rating, title, body, status, created_at
        FROM extension_reviews
        WHERE extension_slug = $1 AND status = 'published'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(extension_slug)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

/// Check if extension is installed for an account
pub async fn is_extension_installed(
    pool: &PgPool,
    account_id: Uuid,
    extension_slug: &str,
) -> Result<bool, sqlx::Error> {
    let result: Option<(i32,)> = sqlx::query_as(
        r#"
        SELECT 1 FROM account_extensions
        WHERE account_id = $1 AND extension_slug = $2
        "#,
    )
    .bind(account_id)
    .bind(extension_slug)
    .fetch_optional(pool)
    .await?;

    Ok(result.is_some())
}
