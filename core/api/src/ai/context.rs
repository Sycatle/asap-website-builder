//! Context loading for AI chat
//!
//! Functions to load user context, website context, and data
//! for AI personalization and awareness.

use axum::http::StatusCode;
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_ai::{
    ActiveExtension, CollectionSummary, SectionInfo, UserContext, UserQuota, VariableGroup,
    WebsiteContext, WebsiteDataContext, WebsiteInfo,
};

// ============================================================================
// Row Types for SQL Queries
// ============================================================================

#[derive(sqlx::FromRow)]
pub struct WebsiteRow {
    pub id: Uuid,
    pub title: Option<String>,
    pub slug: String,
    pub preset_id: Option<Uuid>,
    pub data: Option<serde_json::Value>,
}

#[derive(sqlx::FromRow)]
pub struct ElementRow {
    pub id: Uuid,
    pub element_type: String,
    pub order: i32,
    pub settings: serde_json::Value,
    pub data: serde_json::Value,
}

#[derive(sqlx::FromRow)]
pub struct AccountRow {
    pub id: Uuid,
    pub plan: String,
}

#[derive(sqlx::FromRow)]
pub struct AccountDataRow {
    pub data: serde_json::Value,
}

// ============================================================================
// User Context Loading
// ============================================================================

/// Load user context for AI personalization
pub async fn load_user_context(
    pool: &PgPool,
    account_id: Uuid,
    plan_daily_limit: u32,
    plan_daily_used: u32,
) -> Result<UserContext, StatusCode> {
    // Fetch account info (plan)
    let account: AccountRow = sqlx::query_as("SELECT id, plan FROM accounts WHERE id = $1")
        .bind(account_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to load account: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Fetch account_data for name, preferences and integrations
    let account_data: Option<AccountDataRow> =
        sqlx::query_as("SELECT data FROM account_data WHERE account_id = $1")
            .bind(account_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to load account_data: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

    // Extract user info from account_data
    let mut name: Option<String> = None;
    let mut integrations = vec![];
    let mut language = "en".to_string();

    if let Some(ref data_row) = account_data {
        // Get display name
        if let Some(display_name) = data_row.data.get("display_name").and_then(|v| v.as_str()) {
            name = Some(display_name.to_string());
        } else if let Some(given_name) = data_row.data.get("given_name").and_then(|v| v.as_str()) {
            name = Some(given_name.to_string());
        }

        // Check for GitHub integration
        if data_row.data.get("github").is_some() {
            integrations.push("github".to_string());
        }
        // Check for Google OAuth (indicates google integration)
        if data_row
            .data
            .get("oauth")
            .and_then(|o| o.get("google"))
            .is_some()
        {
            integrations.push("google".to_string());
        }
        // Check for language preference
        if let Some(lang) = data_row.data.get("language").and_then(|v| v.as_str()) {
            language = lang.to_string();
        }
    }

    Ok(UserContext {
        name,
        language,
        plan: account.plan,
        quota: Some(UserQuota {
            daily_limit: plan_daily_limit,
            daily_used: plan_daily_used,
            daily_remaining: plan_daily_limit.saturating_sub(plan_daily_used),
        }),
        integrations,
    })
}

// ============================================================================
// Website Data Loading
// ============================================================================

/// Load website variables and collections for AI context (generic, not extension-specific)
pub async fn load_website_data(
    pool: &PgPool,
    _account_id: Uuid,
    website_id: Uuid,
) -> Result<Option<WebsiteDataContext>, StatusCode> {
    // Load ALL variables grouped by source
    // Use source_ref (extension slug) when source is 'extension', otherwise use source itself
    let all_vars: Vec<(String, String, serde_json::Value)> = sqlx::query_as(
        r#"
        SELECT COALESCE(source_ref, source) as effective_source, key, value 
        FROM website_variables 
        WHERE website_id = $1
        ORDER BY effective_source, key
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website variables: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Load ALL collections with their items
    let all_collections: Vec<(String, String, i32, serde_json::Value)> = sqlx::query_as(
        r#"
        SELECT collection_slug, source_extension, total_count, items
        FROM website_collections
        WHERE website_id = $1
        ORDER BY source_extension, collection_slug
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website collections: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // If no data, return None
    if all_vars.is_empty() && all_collections.is_empty() {
        return Ok(None);
    }

    // Group variables by source
    let mut variables_by_source: std::collections::HashMap<
        String,
        Vec<(String, serde_json::Value)>,
    > = std::collections::HashMap::new();

    for (source, key, value) in all_vars {
        variables_by_source
            .entry(source)
            .or_default()
            .push((key, value));
    }

    // Build VariableGroups
    let variables: Vec<VariableGroup> = variables_by_source
        .into_iter()
        .map(|(source, vars)| VariableGroup {
            source: source.clone(),
            variables: vars.into_iter().collect(),
        })
        .collect();

    // Build CollectionSummaries with item previews
    let collections: Vec<CollectionSummary> = all_collections
        .into_iter()
        .map(|(slug, source, total_count, items)| {
            let items_array = items.as_array().cloned().unwrap_or_default();
            // Use total_count from DB if available, otherwise count items array
            let count = if total_count > 0 {
                total_count
            } else {
                items_array.len() as i32
            };

            // Extract preview fields from first few items (up to 5)
            let preview: Vec<serde_json::Value> = items_array
                .iter()
                .take(5)
                .filter_map(|item| {
                    let data = item.get("data")?;
                    let mut preview_obj = serde_json::Map::new();

                    // Extract common identifying fields for preview
                    for key in &[
                        "name",
                        "title",
                        "id",
                        "slug",
                        "description",
                        "language",
                        "stars",
                        "url",
                    ] {
                        if let Some(val) = data.get(*key) {
                            // Truncate long strings for preview
                            let truncated = if let Some(s) = val.as_str() {
                                if s.len() > 100 {
                                    serde_json::Value::String(format!("{}...", &s[..100]))
                                } else {
                                    val.clone()
                                }
                            } else {
                                val.clone()
                            };
                            preview_obj.insert((*key).to_string(), truncated);
                        }
                    }

                    if preview_obj.is_empty() {
                        None
                    } else {
                        Some(serde_json::Value::Object(preview_obj))
                    }
                })
                .collect();

            CollectionSummary {
                slug,
                source,
                count,
                preview,
            }
        })
        .collect();

    let data_context = WebsiteDataContext {
        variables,
        collections,
    };

    // Log summary for debugging
    let var_count: usize = data_context
        .variables
        .iter()
        .map(|g| g.variables.len())
        .sum();
    let col_count = data_context.collections.len();
    tracing::debug!(
        "Website data loaded: {} variables in {} groups, {} collections",
        var_count,
        data_context.variables.len(),
        col_count
    );

    Ok(Some(data_context))
}

// ============================================================================
// Website Context Loading
// ============================================================================

/// Load website context for AI
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `account_id` - Account ID for security context (used for audit logging)
/// * `website_id` - Website ID to load context for
pub async fn load_website_context(
    pool: &PgPool,
    account_id: Uuid,
    website_id: Uuid,
) -> Result<WebsiteContext, StatusCode> {
    // Fetch website info
    let website_row: WebsiteRow = sqlx::query_as(
        r#"
        SELECT 
            w.id, w.title, w.slug, w.preset_id,
            COALESCE(wd.data, '{}'::jsonb) as data
        FROM websites w
        LEFT JOIN website_data wd ON wd.website_id = w.id
        WHERE w.id = $1
        "#,
    )
    .bind(website_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load website: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Fetch elements/sections
    let elements: Vec<ElementRow> = sqlx::query_as(
        r#"
        SELECT 
            id, element_type, "order", 
            settings, data
        FROM website_elements
        WHERE website_id = $1
        ORDER BY "order"
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load elements: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Build sections info
    let sections: Vec<SectionInfo> = elements
        .into_iter()
        .map(|e| {
            // Merge settings and data for full properties
            let mut properties = e.settings.clone();
            if let (Some(props), Some(data)) = (properties.as_object_mut(), e.data.as_object()) {
                for (k, v) in data {
                    props.insert(k.clone(), v.clone());
                }
            }
            SectionInfo {
                id: e.id,
                section_type: e.element_type.clone(),
                variant: e
                    .settings
                    .get("variant")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                position: e.order,
                properties,
                schema: None, // TODO: Load schema from section registry
            }
        })
        .collect();

    // Extract theme from website data
    let theme = website_row
        .data
        .as_ref()
        .and_then(|d| d.get("theme"))
        .cloned()
        .unwrap_or(serde_json::json!({}));

    // Load active extensions for this website
    let extensions: Vec<ActiveExtension> = sqlx::query_as::<_, (String, bool, serde_json::Value)>(
        r#"
        SELECT 
            ae.extension_slug,
            we.enabled,
            COALESCE(we.settings, '{}'::jsonb) as settings
        FROM website_extensions_v2 we
        JOIN account_extensions ae ON ae.id = we.account_extension_id
        WHERE we.website_id = $1
        ORDER BY ae.extension_slug
        "#,
    )
    .bind(website_id)
    .fetch_all(pool)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(|(slug, enabled, settings)| {
                // Format extension name from slug (e.g., "github-sync" -> "GitHub Sync")
                let name = slug
                    .split('-')
                    .map(|word| {
                        let mut chars: Vec<char> = word.chars().collect();
                        if let Some(first) = chars.first_mut() {
                            *first = first.to_ascii_uppercase();
                        }
                        chars.into_iter().collect::<String>()
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                ActiveExtension {
                    slug,
                    name,
                    enabled,
                    settings,
                }
            })
            .collect()
    })
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to load extensions: {}", e);
        Vec::new()
    });

    Ok(WebsiteContext {
        website: WebsiteInfo {
            id: website_id,
            slug: website_row.slug,
            title: website_row.title,
            preset: website_row.preset_id.map(|id| id.to_string()),
        },
        sections,
        theme,
        available_section_types: vec![
            "hero".to_string(),
            "projects".to_string(),
            "skills".to_string(),
            "experience".to_string(),
            "contact".to_string(),
            "about".to_string(),
            "testimonials".to_string(),
            "gallery".to_string(),
            "features".to_string(),
            "pricing".to_string(),
            "faq".to_string(),
            "cta".to_string(),
        ],
        user: None, // Will be set by caller
        data: None, // Will be set by caller
        extensions,
        account_id: Some(account_id),
    })
}
