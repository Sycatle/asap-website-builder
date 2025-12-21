use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Event types that can be emitted by the core
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventType {
    // Account events
    UserCreated,
    UserIntegrationAdded,
    UserIntegrationUpdated,
    
    // Website events
    WebsiteCreated,
    WebsitePublished,
    WebsiteUpdated,
    WebsiteDeleted,
    
    // Module events
    ModuleConfigChanged,
    ModuleActivated,
    ModuleDeactivated,
    ModuleConfigured,
    
    // GitHub events
    GitHubSyncRequested,
    
    // Element events
    ElementCreated,
    ElementUpdated,
    ElementDeleted,
    ElementReordered,
    
    // Preset events
    PresetApplied,
}

/// Event represents a system event that can trigger module actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub account_id: Uuid,
    pub event_type: EventType,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

impl Event {
    pub fn new(account_id: Uuid, event_type: EventType, payload: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4(),
            account_id,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_type_serialization() {
        let event_types = vec![
            EventType::UserCreated,
            EventType::UserIntegrationAdded,
            EventType::WebsiteCreated,
            EventType::WebsitePublished,
            EventType::WebsiteUpdated,
            EventType::WebsiteDeleted,
            EventType::ModuleConfigChanged,
            EventType::ModuleActivated,
            EventType::ModuleDeactivated,
            EventType::ModuleConfigured,
            EventType::ElementCreated,
            EventType::ElementUpdated,
            EventType::ElementDeleted,
            EventType::ElementReordered,
            EventType::PresetApplied,
        ];

        for event_type in event_types {
            let serialized = serde_json::to_string(&event_type).unwrap();
            let deserialized: EventType = serde_json::from_str(&serialized).unwrap();
            assert_eq!(event_type, deserialized);
        }
    }

    #[test]
    fn test_event_creation() {
        let account_id = Uuid::new_v4();
        let payload = serde_json::json!({
            "account_id": Uuid::new_v4(),
            "email": "test@example.com"
        });

        let event = Event::new(
            account_id,
            EventType::UserCreated,
            payload.clone(),
        );

        assert_eq!(event.account_id, account_id);
        assert_eq!(event.event_type, EventType::UserCreated);
        assert_eq!(event.payload, payload);
        assert!(event.processed_at.is_none());
    }

    #[test]
    fn test_event_is_not_processed_initially() {
        let event = Event::new(
            Uuid::new_v4(),
            EventType::UserCreated,
            serde_json::json!({}),
        );

        assert!(!event.is_processed());
    }

    #[test]
    fn test_event_is_processed_when_marked() {
        let mut event = Event::new(
            Uuid::new_v4(),
            EventType::UserCreated,
            serde_json::json!({}),
        );

        assert!(!event.is_processed());
        event.processed_at = Some(Utc::now());
        assert!(event.is_processed());
    }

    #[test]
    fn test_event_with_payload() {
        let payload = serde_json::json!({
            "username": "github_user",
            "repositories": 42,
            "followers": 100
        });

        let event = Event::new(
            Uuid::new_v4(),
            EventType::UserIntegrationAdded,
            payload.clone(),
        );

        assert_eq!(event.payload["username"], "github_user");
        assert_eq!(event.payload["repositories"], 42);
    }

    #[test]
    fn test_event_serialization() {
        let account_id = Uuid::new_v4();
        let event = Event::new(
            account_id,
            EventType::WebsitePublished,
            serde_json::json!({
                "website_slug": "my-website"
            }),
        );

        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: Event = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.account_id, account_id);
        assert_eq!(deserialized.event_type, EventType::WebsitePublished);
    }

    #[test]
    fn test_event_clone() {
        let event = Event::new(
            Uuid::new_v4(),
            EventType::ModuleConfigChanged,
            serde_json::json!({"extension": "github-sync"}),
        );

        let cloned = event.clone();
        assert_eq!(event.id, cloned.id);
        assert_eq!(event.event_type, cloned.event_type);
    }

    #[test]
    fn test_multiple_event_types() {
        let account_id = Uuid::new_v4();

        let events = vec![
            Event::new(account_id, EventType::UserCreated, serde_json::json!({})),
            Event::new(account_id, EventType::UserIntegrationAdded, serde_json::json!({})),
            Event::new(account_id, EventType::UserIntegrationUpdated, serde_json::json!({})),
            Event::new(account_id, EventType::WebsiteCreated, serde_json::json!({})),
            Event::new(account_id, EventType::WebsitePublished, serde_json::json!({})),
            Event::new(account_id, EventType::WebsiteUpdated, serde_json::json!({})),
            Event::new(account_id, EventType::WebsiteDeleted, serde_json::json!({})),
            Event::new(account_id, EventType::ModuleConfigChanged, serde_json::json!({})),
            Event::new(account_id, EventType::ModuleActivated, serde_json::json!({})),
            Event::new(account_id, EventType::ModuleDeactivated, serde_json::json!({})),
            Event::new(account_id, EventType::ModuleConfigured, serde_json::json!({})),
            Event::new(account_id, EventType::ElementCreated, serde_json::json!({})),
            Event::new(account_id, EventType::ElementUpdated, serde_json::json!({})),
            Event::new(account_id, EventType::ElementDeleted, serde_json::json!({})),
            Event::new(account_id, EventType::ElementReordered, serde_json::json!({})),
            Event::new(account_id, EventType::PresetApplied, serde_json::json!({})),
        ];

        assert_eq!(events.len(), 16);
        for event in events {
            assert_eq!(event.account_id, account_id);
            assert!(!event.is_processed());
        }
    }
}
