use anyhow::Result;
use asap_core_domain::events::{Event, EventType};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

pub struct EventProcessor {
    pool: PgPool,
}

impl EventProcessor {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Fetch all unprocessed events from the database
    pub async fn fetch_unprocessed_events(&self) -> Result<Vec<Event>> {
        let events: Vec<EventRow> = sqlx::query_as(
            "SELECT id, tenant_id, event_type, payload, created_at, processed_at FROM events WHERE processed_at IS NULL ORDER BY created_at ASC"
        )
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

    /// Mark an event as failed (for retry logic)
    pub async fn mark_failed(&self, event_id: Uuid, error: &str) -> Result<()> {
        tracing::error!("Event {} failed: {}", event_id, error);
        // TODO: Implement proper retry mechanism with exponential backoff
        // For now, we mark as processed to avoid infinite retries
        // Future: Add retry_count field and failed_events table
        self.mark_processed(event_id).await
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
