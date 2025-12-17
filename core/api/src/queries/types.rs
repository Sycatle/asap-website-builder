//! Shared data types for queries

use sqlx::FromRow;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};

/// Website with data
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WebsiteWithData {
    pub id: Uuid,
    pub account_id: Uuid,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub creation_mode: String,
    #[sqlx(default)]
    pub preset_id: Option<Uuid>,
    pub metadata: JsonValue,
    #[sqlx(default)]
    pub data: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Website extension response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteExtensionRow {
    pub id: Uuid,
    pub website_id: Uuid,
    pub extension_id: Uuid,
    pub extension_name: String,
    pub extension_slug: String,
    pub settings: JsonValue,
    pub enabled: bool,
    pub activated_at: DateTime<Utc>,
}

/// Website element response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteElementRow {
    pub id: Uuid,
    pub website_id: Uuid,
    pub extension_id: Option<Uuid>,
    pub element_type: String,
    pub slug: String,
    pub title: String,
    pub order: i32,
    pub layout: String,
    pub settings: JsonValue,
    pub data: JsonValue,
    pub visible: bool,
}

/// Preset response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetRow {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub category: String,
    pub config: JsonValue,
    pub thumbnail_url: Option<String>,
}

/// Event for batch operations
#[derive(Debug, Clone)]
pub struct BatchEvent {
    pub account_id: Uuid,
    pub event_type: String,
    pub payload: JsonValue,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_event_creation() {
        let event = BatchEvent {
            account_id: Uuid::new_v4(),
            event_type: "WEBSITE_PUBLISHED".to_string(),
            payload: serde_json::json!({ "website_id": "test" }),
        };

        assert_eq!(event.event_type, "WEBSITE_PUBLISHED");
    }

    #[test]
    fn test_website_with_data_serialization() {
        let website = WebsiteWithData {
            id: Uuid::new_v4(),
            account_id: Uuid::new_v4(),
            slug: "my-website".to_string(),
            title: "My Website".to_string(),
            tagline: "A great website".to_string(),
            status: "draft".to_string(),
            creation_mode: "from_scratch".to_string(),
            preset_id: None,
            metadata: serde_json::json!({}),
            data: Some(serde_json::json!({})),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&website).unwrap();
        assert!(json.contains("my-website"));
        assert!(json.contains("from_scratch"));
    }

    #[test]
    fn test_website_extension_row_serialization() {
        let extension = WebsiteExtensionRow {
            id: Uuid::new_v4(),
            website_id: Uuid::new_v4(),
            extension_id: Uuid::new_v4(),
            extension_name: "GitHub Sync".to_string(),
            extension_slug: "github-sync".to_string(),
            settings: serde_json::json!({"auto_sync": true}),
            enabled: true,
            activated_at: Utc::now(),
        };

        let json = serde_json::to_string(&extension).unwrap();
        assert!(json.contains("github-sync"));
        assert!(json.contains("auto_sync"));
    }

    #[test]
    fn test_website_element_row_serialization() {
        let element = WebsiteElementRow {
            id: Uuid::new_v4(),
            website_id: Uuid::new_v4(),
            extension_id: Some(Uuid::new_v4()),
            element_type: "projects".to_string(),
            slug: "my-projects".to_string(),
            title: "My Projects".to_string(),
            order: 1,
            layout: "grid".to_string(),
            settings: serde_json::json!({}),
            data: serde_json::json!({}),
            visible: true,
        };

        let json = serde_json::to_string(&element).unwrap();
        assert!(json.contains("my-projects"));
        assert!(json.contains("grid"));
    }

    #[test]
    fn test_preset_row_serialization() {
        let preset = PresetRow {
            id: Uuid::new_v4(),
            name: "Developer Website".to_string(),
            slug: "developer-website".to_string(),
            description: "Perfect for developers".to_string(),
            category: "professional".to_string(),
            config: serde_json::json!({
                "extensions": ["github-sync"],
                "elements": []
            }),
            thumbnail_url: Some("https://example.com/thumb.jpg".to_string()),
        };

        let json = serde_json::to_string(&preset).unwrap();
        assert!(json.contains("developer-website"));
        assert!(json.contains("professional"));
    }
}
