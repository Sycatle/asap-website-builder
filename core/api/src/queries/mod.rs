//! Optimized prepared queries and batch operations for ASAP Core API
//!
//! This module is organized into submodules:
//! - `types` - Shared data types and structs
//! - `websites` - Website CRUD queries
//! - `extensions` - Extension-related queries
//! - `elements` - Website element queries
//! - `presets` - Preset queries
//! - `events` - Event batch operations

use sqlx::PgPool;
use uuid::Uuid;

mod types;
mod websites;
mod extensions;
mod elements;
mod presets;
mod events;

// Re-export all public items
pub use types::*;
pub use websites::*;
pub use extensions::*;
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
