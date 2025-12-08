use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Event types that can be emitted by the core
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventType {
    UserCreated,
    UserIntegrationAdded,
    UserIntegrationUpdated,
    PortfolioCreated,
    PortfolioPublished,
    PortfolioUpdated,
    ModuleConfigChanged,
}

/// Event represents a system event that can trigger module actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub event_type: EventType,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

impl Event {
    pub fn new(tenant_id: Uuid, event_type: EventType, payload: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4(),
            tenant_id,
            event_type,
            payload,
            created_at: Utc::now(),
            processed_at: None,
        }
    }

    pub fn is_processed(&self) -> bool {
        self.processed_at.is_some()
    }
}
