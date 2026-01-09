use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value;

/// User-saved section configuration template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementTemplate {
    pub id: Uuid,
    pub account_id: Uuid,
    
    /// Template display name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    
    /// Section type (hero, features, pricing, etc.)
    pub element_type: String,
    /// Visual variant (centered, split, minimal, etc.)
    pub variant: Option<String>,
    /// Complete settings snapshot
    pub settings: Value,
    
    /// Optional preview image (base64 or URL)
    pub preview_image: Option<String>,
    
    /// User-defined tags for organization
    pub tags: Vec<String>,
    /// Whether template is marked as favorite
    pub is_favorite: bool,
    
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create a new element template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateElementTemplateRequest {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub element_type: String,
    #[serde(default)]
    pub variant: Option<String>,
    pub settings: Value,
    #[serde(default)]
    pub preview_image: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Request to update an element template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateElementTemplateRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default)]
    pub settings: Option<Value>,
    #[serde(default)]
    pub preview_image: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub is_favorite: Option<bool>,
}

/// Query parameters for listing templates
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ListElementTemplatesQuery {
    /// Filter by element type
    #[serde(default)]
    pub element_type: Option<String>,
    /// Filter by tag
    #[serde(default)]
    pub tag: Option<String>,
    /// Show only favorites
    #[serde(default)]
    pub favorites_only: bool,
    /// Search in name/description
    #[serde(default)]
    pub search: Option<String>,
    /// Pagination: offset
    #[serde(default)]
    pub offset: i64,
    /// Pagination: limit (default 50)
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    50
}

/// Summary response for template listings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementTemplateSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub element_type: String,
    pub variant: Option<String>,
    pub preview_image: Option<String>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
}

impl From<ElementTemplate> for ElementTemplateSummary {
    fn from(template: ElementTemplate) -> Self {
        Self {
            id: template.id,
            name: template.name,
            description: template.description,
            element_type: template.element_type,
            variant: template.variant,
            preview_image: template.preview_image,
            tags: template.tags,
            is_favorite: template.is_favorite,
            created_at: template.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_element_template_serialization() {
        let template = ElementTemplate {
            id: Uuid::new_v4(),
            account_id: Uuid::new_v4(),
            name: "My Hero".to_string(),
            description: Some("A custom hero section".to_string()),
            element_type: "hero".to_string(),
            variant: Some("centered".to_string()),
            settings: json!({
                "title": "Welcome",
                "subtitle": "To my site",
                "showCta": true
            }),
            preview_image: None,
            tags: vec!["landing".to_string(), "marketing".to_string()],
            is_favorite: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&template).unwrap();
        let deserialized: ElementTemplate = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.name, "My Hero");
        assert_eq!(deserialized.element_type, "hero");
        assert_eq!(deserialized.tags.len(), 2);
    }

    #[test]
    fn test_create_request_with_defaults() {
        let json = r#"{
            "name": "Test Template",
            "element_type": "features",
            "settings": {"columns": 3}
        }"#;
        
        let request: CreateElementTemplateRequest = serde_json::from_str(json).unwrap();
        
        assert_eq!(request.name, "Test Template");
        assert!(request.description.is_none());
        assert!(request.variant.is_none());
        assert!(request.tags.is_empty());
    }

    #[test]
    fn test_summary_from_template() {
        let template = ElementTemplate {
            id: Uuid::new_v4(),
            account_id: Uuid::new_v4(),
            name: "Pricing Table".to_string(),
            description: None,
            element_type: "pricing".to_string(),
            variant: Some("comparison".to_string()),
            settings: json!({}),
            preview_image: Some("data:image/png;base64,...".to_string()),
            tags: vec![],
            is_favorite: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let summary: ElementTemplateSummary = template.into();
        
        assert_eq!(summary.element_type, "pricing");
        assert_eq!(summary.variant, Some("comparison".to_string()));
    }
}
