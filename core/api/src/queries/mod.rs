//! Optimized prepared queries and batch operations for ASAP Core API
//!
//! This module is organized into submodules:
//! - `types` - Shared data types and structs
//! - `websites` - Website CRUD queries
//! - `extensions` - Extension-related queries (legacy)
//! - `extensions_store` - Extension Store v2 queries
//! - `elements` - Website element queries
//! - `presets` - Preset queries
//! - `events` - Event batch operations

use sqlx::PgPool;
use uuid::Uuid;

mod types;
mod websites;
mod extensions;
mod extensions_store;
mod elements;
mod presets;
mod events;

// Re-export all public items
pub use types::*;
pub use websites::*;
pub use extensions::*;
pub use extensions_store::*;
pub use elements::*;
pub use presets::*;
pub use events::*;

/// Verify that an account has access to a website (either as owner or active administrator)
pub async fn verify_website_access(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    let count: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*) 
        FROM websites w
        WHERE w.id = $1 
          AND (w.account_id = $2 
               OR EXISTS (
                   SELECT 1 
                   FROM website_administrators wa 
                   WHERE wa.website_id = w.id 
                     AND wa.account_id = $2 
                     AND wa.status = 'active'
               ))
        "#
    )
    .bind(website_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    Ok(count.0 > 0)
}

/// Get all account IDs that have access to a website (owner + active administrators)
/// Used for broadcasting WebSocket events to all relevant users
pub async fn get_website_account_ids(
    pool: &PgPool,
    website_id: Uuid,
) -> Result<Vec<Uuid>, Box<dyn std::error::Error + Send + Sync>> {
    let account_ids: Vec<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT DISTINCT account_id
        FROM (
            SELECT account_id FROM websites WHERE id = $1
            UNION
            SELECT account_id FROM website_administrators 
            WHERE website_id = $1 AND status = 'active'
        ) AS all_accounts
        "#
    )
    .bind(website_id)
    .fetch_all(pool)
    .await?;

    Ok(account_ids.into_iter().map(|(id,)| id).collect())
}
