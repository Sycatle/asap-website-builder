use anyhow::Result;
use asap_core_domain::events::{Event, EventType};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

/// Maximum number of retry attempts before marking event as permanently failed
const MAX_RETRY_ATTEMPTS: i32 = 5;

/// Base backoff time in seconds (exponential backoff: 10, 20, 40, 80, 160 seconds)
const BASE_BACKOFF_SECONDS: i64 = 10;

pub struct EventProcessor {
    pool: PgPool,
}

impl EventProcessor {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Fetch all unprocessed events from the database, including those ready for retry
    pub async fn fetch_unprocessed_events(&self) -> Result<Vec<Event>> {
        let now = Utc::now();
        
        let events: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, event_type, payload, created_at, processed_at, retry_count, failed_at, error_message
            FROM events 
            WHERE processed_at IS NULL 
              AND (
                failed_at IS NULL 
                OR (retry_count < $1 AND failed_at + (POWER(2, retry_count) * INTERVAL '10 seconds') <= $2)
              )
            ORDER BY created_at ASC
            "#
        )
        .bind(MAX_RETRY_ATTEMPTS)
        .bind(now)
        .fetch_all(&self.pool)
        .await?;

        Ok(events.into_iter().map(|row| row.into()).collect())
    }

    /// Mark an event as processed
    pub async fn mark_processed(&self, event_id: Uuid) -> Result<()> {
        sqlx::query(
            "UPDATE events SET processed_at = $1 WHERE id = $2"
        )
        .bind(Utc::now())
        .bind(event_id)
        .execute(&self.pool)
        .await?;

        tracing::debug!("Event {} marked as processed", event_id);
        Ok(())
    }

    /// Mark an event as failed with exponential backoff retry logic
    pub async fn mark_failed(&self, event_id: Uuid, error: &str) -> Result<()> {
        // Get current retry count
        let row: Option<RetryCountRow> = sqlx::query_as(
            "SELECT retry_count FROM events WHERE id = $1"
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        let retry_count = row.map(|r| r.retry_count).unwrap_or(0);
        let new_retry_count = retry_count + 1;

        if new_retry_count >= MAX_RETRY_ATTEMPTS {
            // Permanently failed - mark as processed to stop retries
            tracing::error!(
                "Event {} permanently failed after {} attempts: {}",
                event_id,
                new_retry_count,
                error
            );
            
            sqlx::query(
                r#"
                UPDATE events 
                SET processed_at = $1, 
                    retry_count = $2, 
                    failed_at = $1,
                    error_message = $3
                WHERE id = $4
                "#
            )
            .bind(Utc::now())
            .bind(new_retry_count)
            .bind(error)
            .bind(event_id)
            .execute(&self.pool)
            .await?;
        } else {
            // Calculate next retry time with exponential backoff
            let backoff_seconds = BASE_BACKOFF_SECONDS * 2_i64.pow(retry_count as u32);
            let next_retry = Utc::now() + Duration::seconds(backoff_seconds);
            
            tracing::warn!(
                "Event {} failed (attempt {}/{}): {}. Next retry in {} seconds at {}",
                event_id,
                new_retry_count,
                MAX_RETRY_ATTEMPTS,
                error,
                backoff_seconds,
                next_retry.format("%Y-%m-%d %H:%M:%S")
            );
            
            sqlx::query(
                r#"
                UPDATE events 
                SET retry_count = $1, 
                    failed_at = $2,
                    error_message = $3
                WHERE id = $4
                "#
            )
            .bind(new_retry_count)
            .bind(Utc::now())
            .bind(error)
            .bind(event_id)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}

// Helper struct for SQLx query mapping
#[derive(Debug, sqlx::FromRow)]
struct EventRow {
    id: Uuid,
    tenant_id: Uuid,
    event_type: String,
    payload: serde_json::Value,
    created_at: chrono::DateTime<Utc>,
    processed_at: Option<chrono::DateTime<Utc>>,
    retry_count: i32,
    failed_at: Option<chrono::DateTime<Utc>>,
    error_message: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct RetryCountRow {
    retry_count: i32,
}

impl From<EventRow> for Event {
    fn from(row: EventRow) -> Self {
        let event_type = match row.event_type.as_str() {
            "USER_CREATED" => EventType::UserCreated,
            "USER_INTEGRATION_ADDED" => EventType::UserIntegrationAdded,
            "USER_INTEGRATION_UPDATED" => EventType::UserIntegrationUpdated,
            "PORTFOLIO_CREATED" => EventType::PortfolioCreated,
            "PORTFOLIO_PUBLISHED" => EventType::PortfolioPublished,
            "PORTFOLIO_UPDATED" => EventType::PortfolioUpdated,
            "MODULE_CONFIG_CHANGED" => EventType::ModuleConfigChanged,
            _ => {
                tracing::warn!("Unknown event type: {}, defaulting to USER_CREATED", row.event_type);
                EventType::UserCreated
            }
        };

        Event {
            id: row.id,
            tenant_id: row.tenant_id,
            event_type,
            payload: row.payload,
            created_at: row.created_at,
            processed_at: row.processed_at,
        }
    }
}
