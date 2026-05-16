//! Module Configuration Schema Types
//!
//! This module defines the schema for module configuration UI generation.
//! The schema is defined in Rust code alongside the module, ensuring:
//! - Type safety at compile time
//! - Co-location with module logic
//! - Automatic versioning with the module
//! - No database migrations for schema changes

use serde::{Deserialize, Serialize};

// ============================================================================
// Field Types
// ============================================================================

/// Supported field types for configuration forms
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    Text,
    Textarea,
    Number,
    Boolean,
    Select,
    Url,
    Email,
    Password,
    Color,
    Date,
}

/// Validation rules for a configuration field
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FieldValidation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Option for select fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectOption {
    pub value: String,
    pub label: String,
}

/// A single configuration field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigField {
    pub key: String,
    #[serde(rename = "type")]
    pub field_type: FieldType,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<SelectOption>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation: Option<FieldValidation>,
}

impl ConfigField {
    /// Create a new text field
    pub fn text(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            field_type: FieldType::Text,
            label: label.to_string(),
            description: None,
            placeholder: None,
            required: None,
            default: None,
            options: None,
            validation: None,
        }
    }

    /// Create a new boolean field
    pub fn boolean(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            field_type: FieldType::Boolean,
            label: label.to_string(),
            description: None,
            placeholder: None,
            required: None,
            default: Some(serde_json::Value::Bool(false)),
            options: None,
            validation: None,
        }
    }

    /// Create a new number field
    pub fn number(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            field_type: FieldType::Number,
            label: label.to_string(),
            description: None,
            placeholder: None,
            required: None,
            default: None,
            options: None,
            validation: None,
        }
    }

    /// Create a new select field
    pub fn select(key: &str, label: &str, options: Vec<SelectOption>) -> Self {
        Self {
            key: key.to_string(),
            field_type: FieldType::Select,
            label: label.to_string(),
            description: None,
            placeholder: None,
            required: None,
            default: None,
            options: Some(options),
            validation: None,
        }
    }

    /// Builder: Set description
    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }

    /// Builder: Set placeholder
    pub fn with_placeholder(mut self, placeholder: &str) -> Self {
        self.placeholder = Some(placeholder.to_string());
        self
    }

    /// Builder: Set required
    pub fn required(mut self) -> Self {
        self.required = Some(true);
        self
    }

    /// Builder: Set default value
    pub fn with_default<T: Serialize>(mut self, value: T) -> Self {
        self.default = Some(serde_json::to_value(value).unwrap_or_default());
        self
    }

    /// Builder: Set validation
    pub fn with_validation(mut self, validation: FieldValidation) -> Self {
        self.validation = Some(validation);
        self
    }
}

// ============================================================================
// Actions
// ============================================================================

/// HTTP method for action endpoints
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
}

/// Button style for actions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ActionStyle {
    Primary,
    Secondary,
    Danger,
}

/// An action button (e.g., "Synchronize", "Test connection")
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigAction {
    pub key: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub endpoint: String,
    pub method: HttpMethod,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<ActionStyle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confirm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "refreshAfter")]
    pub refresh_after: Option<bool>,
}

impl ConfigAction {
    /// Create a new POST action
    pub fn post(key: &str, label: &str, endpoint: &str) -> Self {
        Self {
            key: key.to_string(),
            label: label.to_string(),
            description: None,
            endpoint: endpoint.to_string(),
            method: HttpMethod::Post,
            style: None,
            confirm: None,
            refresh_after: None,
        }
    }

    /// Builder: Set as primary style
    pub fn primary(mut self) -> Self {
        self.style = Some(ActionStyle::Primary);
        self
    }

    /// Builder: Set as danger style
    pub fn danger(mut self) -> Self {
        self.style = Some(ActionStyle::Danger);
        self
    }

    /// Builder: Add confirmation dialog
    pub fn with_confirm(mut self, message: &str) -> Self {
        self.confirm = Some(message.to_string());
        self
    }

    /// Builder: Refresh data after action
    pub fn refresh_after(mut self) -> Self {
        self.refresh_after = Some(true);
        self
    }

    /// Builder: Set description
    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }
}

// ============================================================================
// Data Display
// ============================================================================

/// Type of data display component
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DataDisplayType {
    List,
    Table,
    Stats,
    Profile,
    AvatarList,
    Custom,
}

/// Field type in data display
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DisplayFieldType {
    Text,
    Link,
    Badge,
    Date,
    Number,
    Image,
    Title,
    Subtitle,
    Meta,
    Stat,
    Description,
}

/// A field in data display
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DataDisplayField {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub field_type: Option<DisplayFieldType>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "linkKey")]
    pub link_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "colorKey")]
    pub color_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prefix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "linkPrefix")]
    pub link_prefix: Option<String>,
}

impl DataDisplayField {
    pub fn new(key: &str) -> Self {
        Self {
            key: key.to_string(),
            label: None,
            field_type: None,
            link_key: None,
            color_key: None,
            icon: None,
            prefix: None,
            link_prefix: None,
        }
    }

    pub fn text(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            label: Some(label.to_string()),
            field_type: Some(DisplayFieldType::Text),
            ..Default::default()
        }
    }

    pub fn link(key: &str, label: &str, link_key: &str) -> Self {
        Self {
            key: key.to_string(),
            label: Some(label.to_string()),
            field_type: Some(DisplayFieldType::Link),
            link_key: Some(link_key.to_string()),
            ..Default::default()
        }
    }

    pub fn badge(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            label: Some(label.to_string()),
            field_type: Some(DisplayFieldType::Badge),
            ..Default::default()
        }
    }

    pub fn number(key: &str, label: &str) -> Self {
        Self {
            key: key.to_string(),
            label: Some(label.to_string()),
            field_type: Some(DisplayFieldType::Number),
            ..Default::default()
        }
    }
}

/// Stat item for stats display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatItem {
    pub key: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

/// Data display configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataDisplay {
    #[serde(rename = "type")]
    pub display_type: DataDisplayType,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "emptyMessage")]
    pub empty_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<DataDisplayField>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stats: Option<Vec<StatItem>>,
}

impl DataDisplay {
    pub fn list(source: &str) -> Self {
        Self {
            display_type: DataDisplayType::List,
            source: source.to_string(),
            title: None,
            empty_message: None,
            fields: None,
            stats: None,
        }
    }

    pub fn stats(source: &str) -> Self {
        Self {
            display_type: DataDisplayType::Stats,
            source: source.to_string(),
            title: None,
            empty_message: None,
            fields: None,
            stats: None,
        }
    }

    pub fn with_title(mut self, title: &str) -> Self {
        self.title = Some(title.to_string());
        self
    }

    pub fn with_empty_message(mut self, msg: &str) -> Self {
        self.empty_message = Some(msg.to_string());
        self
    }

    pub fn with_fields(mut self, fields: Vec<DataDisplayField>) -> Self {
        self.fields = Some(fields);
        self
    }

    pub fn with_stats(mut self, stats: Vec<StatItem>) -> Self {
        self.stats = Some(stats);
        self
    }
}

// ============================================================================
// Sections
// ============================================================================

/// A section grouping fields together
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSection {
    pub key: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub fields: Vec<String>,
}

impl ConfigSection {
    pub fn new(key: &str, title: &str, fields: Vec<&str>) -> Self {
        Self {
            key: key.to_string(),
            title: title.to_string(),
            description: None,
            fields: fields.into_iter().map(|s| s.to_string()).collect(),
        }
    }

    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }
}

// ============================================================================
// Complete Schema
// ============================================================================

/// Complete configuration schema for a module
///
/// This is defined in code alongside the module and returned via the API.
/// The frontend uses this to dynamically render the configuration UI.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConfigSchema {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<ConfigField>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<ConfigAction>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "dataDisplay")]
    pub data_display: Option<Vec<DataDisplay>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sections: Option<Vec<ConfigSection>>,
}

impl ConfigSchema {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_fields(mut self, fields: Vec<ConfigField>) -> Self {
        self.fields = Some(fields);
        self
    }

    pub fn with_actions(mut self, actions: Vec<ConfigAction>) -> Self {
        self.actions = Some(actions);
        self
    }

    pub fn with_data_display(mut self, displays: Vec<DataDisplay>) -> Self {
        self.data_display = Some(displays);
        self
    }

    pub fn with_sections(mut self, sections: Vec<ConfigSection>) -> Self {
        self.sections = Some(sections);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_field_builder() {
        let field = ConfigField::text("username", "Username")
            .with_description("Your GitHub username")
            .with_placeholder("octocat")
            .required();

        assert_eq!(field.key, "username");
        assert_eq!(field.field_type, FieldType::Text);
        assert!(field.required.unwrap());
    }

    #[test]
    fn test_config_action_builder() {
        let action = ConfigAction::post("sync", "Synchronize", "/sync")
            .primary()
            .with_confirm("Are you sure?")
            .refresh_after();

        assert_eq!(action.key, "sync");
        assert_eq!(action.method, HttpMethod::Post);
        assert_eq!(action.style, Some(ActionStyle::Primary));
        assert!(action.refresh_after.unwrap());
    }

    #[test]
    fn test_schema_serialization() {
        let schema = ConfigSchema::new()
            .with_fields(vec![
                ConfigField::text("github_username", "GitHub Username")
                    .with_description("Your GitHub username")
                    .required(),
                ConfigField::boolean("auto_sync", "Auto Sync")
                    .with_description("Sync automatically every 24h")
                    .with_default(false),
            ])
            .with_actions(vec![ConfigAction::post("sync", "Sync Now", "/sync")
                .primary()
                .refresh_after()]);

        let json = serde_json::to_string_pretty(&schema).unwrap();
        assert!(json.contains("github_username"));
        assert!(json.contains("auto_sync"));

        // Verify it can be deserialized back
        let _: ConfigSchema = serde_json::from_str(&json).unwrap();
    }
}
