//! Event batch operations

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;

use super::types::BatchEvent;

/// Batch insert events (optimized for high volume)
/// 
/// Uses multi-row INSERT for better performance than individual inserts.
/// 
/// # Safety
/// The format! macro is only used to generate parameter placeholders ($1, $2, etc.),
/// not to interpolate user data. All user data is properly bound via `.bind()` calls,
/// making this safe from SQL injection.
pub async fn batch_insert_events(
    pool: &PgPool,
    events: &[BatchEvent],
) -> Result<u64, sqlx::Error> {
    if events.is_empty() {
        return Ok(0);
    }

    let mut query = String::from(
        "INSERT INTO events (account_id, event_type, payload) VALUES "
    );

    let mut bindings: Vec<(Uuid, String, JsonValue)> = Vec::new();
    
    for (idx, event) in events.iter().enumerate() {
        if idx > 0 {
            query.push_str(", ");
        }
        // Only generating placeholder indices, not interpolating user data
        query.push_str(&format!("(${}, ${}, ${})", idx * 3 + 1, idx * 3 + 2, idx * 3 + 3));
        bindings.push((event.account_id, event.event_type.clone(), event.payload.clone()));
    }

    let mut query_builder = sqlx::query(&query);
    for (account_id, event_type, payload) in bindings {
        query_builder = query_builder.bind(account_id).bind(event_type).bind(payload);
    }

    let result = query_builder.execute(pool).await?;
    Ok(result.rows_affected())
}

/// Batch delete old events (for cleanup operations)
/// Deletes events older than the specified duration
pub async fn batch_delete_old_events(
    pool: &PgPool,
    hours_old: i32,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM events WHERE created_at < now() - INTERVAL '1 hour' * $1"
    )
    .bind(hours_old)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}
