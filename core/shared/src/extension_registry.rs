//! Extension Registry - Dynamic TOML-based extension loading
//!
//! This module replaces the hardcoded extension catalog with a dynamic loader
//! that reads extension definitions from TOML files in each extension directory.
//!
//! Usage:
//! ```
//! use asap_core_shared::extension_registry::ExtensionRegistry;
//! 
//! let registry = ExtensionRegistry::load_from_workspace()?;
//! let github_ext = registry.get_by_slug("github-sync")?;
//! ```

use asap_core_domain::{
    ConfigSchema, ConfigField, ConfigAction, ConfigSection,
    DataDisplay, DataDisplayField, FieldValidation,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Extension definition loaded from TOML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionDefinition {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub icon: Option<String>,
    pub default_settings: serde_json::Value,
    pub config_schema: Option<ConfigSchema>,
    pub user_configurable: bool,
    pub sidebar_order: i32,
    pub sidebar_label: Option<String>,
}

/// TOML structure for extension.toml files
#[derive(Debug, Deserialize)]
struct ExtensionToml {
    extension: ExtensionMetadata,
    default_settings: HashMap<String, toml::Value>,
    #[serde(default)]
    fields: Vec<FieldToml>,
    #[serde(default)]
    actions: Vec<ActionToml>,
    #[serde(default)]
    data_display: Vec<DataDisplayToml>,
    #[serde(default)]
    sections: Vec<SectionToml>,
}

#[derive(Debug, Deserialize)]
struct ExtensionMetadata {
    slug: String,
    name: String,
    version: String,
    description: String,
    category: String,
    icon: Option<String>,
    user_configurable: bool,
    sidebar_order: i32,
    sidebar_label: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FieldToml {
    id: String,
    #[serde(rename = "type")]
    field_type: String,
    label: String,
    description: Option<String>,
    placeholder: Option<String>,
    required: Option<bool>,
    default: Option<toml::Value>,
    validation: Option<ValidationToml>,
}

#[derive(Debug, Deserialize)]
struct ValidationToml {
    min: Option<i64>,
    max: Option<i64>,
    pattern: Option<String>,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ActionToml {
    id: String,
    label: String,
    endpoint: String,
    description: Option<String>,
    primary: Option<bool>,
    refresh_after: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct DataDisplayToml {
    id: String,
    #[serde(rename = "type")]
    display_type: String,
    title: Option<String>,
    empty_message: Option<String>,
    #[allow(dead_code)]
    limit: Option<i32>,
    #[allow(dead_code)]
    period: Option<String>,
    fields: Vec<DataDisplayFieldToml>,
}

#[derive(Debug, Deserialize)]
struct DataDisplayFieldToml {
    id: String,
    #[serde(rename = "type")]
    field_type: String,
    label: String,
    link_to: Option<String>,
    #[allow(dead_code)]
    period: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SectionToml {
    id: String,
    title: String,
    description: Option<String>,
    fields: Vec<String>,
}

/// Extension registry that manages all available extensions
pub struct ExtensionRegistry {
    extensions: HashMap<String, ExtensionDefinition>,
}

impl ExtensionRegistry {
    /// Load extensions from the workspace root's extensions/ directory
    pub fn load_from_workspace() -> anyhow::Result<Self> {
        // Try to find workspace root by looking for Cargo.toml
        let current_dir = std::env::current_dir()?;
        let extensions_dir = Self::find_extensions_dir(&current_dir)?;
        Self::load_from_dir(&extensions_dir)
    }

    /// Load extensions from a specific directory
    pub fn load_from_dir(extensions_dir: &Path) -> anyhow::Result<Self> {
        let mut extensions = HashMap::new();

        if !extensions_dir.exists() {
            tracing::warn!("Extensions directory not found: {:?}", extensions_dir);
            return Ok(Self { extensions });
        }

        // Read all subdirectories in extensions/
        for entry in fs::read_dir(extensions_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                let toml_path = path.join("extension.toml");
                if toml_path.exists() {
                    match Self::load_extension(&toml_path) {
                        Ok(ext) => {
                            tracing::info!("Loaded extension: {} v{}", ext.slug, ext.version);
                            extensions.insert(ext.slug.clone(), ext);
                        }
                        Err(e) => {
                            tracing::error!(
                                "Failed to load extension from {:?}: {}",
                                toml_path,
                                e
                            );
                        }
                    }
                }
            }
        }

        Ok(Self { extensions })
    }

    /// Find the extensions directory by walking up from current dir
    fn find_extensions_dir(start: &Path) -> anyhow::Result<PathBuf> {
        let mut current = start.to_path_buf();
        loop {
            let extensions_dir = current.join("extensions");
            if extensions_dir.exists() && extensions_dir.is_dir() {
                return Ok(extensions_dir);
            }

            if !current.pop() {
                anyhow::bail!("Could not find extensions directory");
            }
        }
    }

    /// Load a single extension from its TOML file
    fn load_extension(toml_path: &Path) -> anyhow::Result<ExtensionDefinition> {
        let content = fs::read_to_string(toml_path)?;
        let toml: ExtensionToml = toml::from_str(&content)?;

        // Convert default_settings to JSON
        let default_settings_map: toml::map::Map<String, toml::Value> = 
            toml.default_settings.into_iter().collect();
        let default_settings = Self::toml_to_json(toml::Value::Table(default_settings_map))?;

        // Build config schema
        let config_schema = if !toml.fields.is_empty()
            || !toml.actions.is_empty()
            || !toml.data_display.is_empty()
        {
            Some(Self::build_config_schema(
                toml.fields,
                toml.actions,
                toml.data_display,
                toml.sections,
            )?)
        } else {
            None
        };

        Ok(ExtensionDefinition {
            slug: toml.extension.slug,
            name: toml.extension.name,
            version: toml.extension.version,
            description: toml.extension.description,
            category: toml.extension.category,
            icon: toml.extension.icon,
            default_settings,
            config_schema,
            user_configurable: toml.extension.user_configurable,
            sidebar_order: toml.extension.sidebar_order,
            sidebar_label: toml.extension.sidebar_label,
        })
    }

    /// Build ConfigSchema from TOML structures
    fn build_config_schema(
        fields: Vec<FieldToml>,
        actions: Vec<ActionToml>,
        data_displays: Vec<DataDisplayToml>,
        sections: Vec<SectionToml>,
    ) -> anyhow::Result<ConfigSchema> {
        let mut schema = ConfigSchema::new();

        // Convert fields
        let config_fields: Vec<ConfigField> = fields
            .into_iter()
            .map(|f| Self::convert_field(f))
            .collect::<Result<_, _>>()?;
        schema = schema.with_fields(config_fields);

        // Convert actions
        let config_actions: Vec<ConfigAction> = actions
            .into_iter()
            .map(|a| Self::convert_action(a))
            .collect();
        if !config_actions.is_empty() {
            schema = schema.with_actions(config_actions);
        }

        // Convert data displays
        let displays: Vec<DataDisplay> = data_displays
            .into_iter()
            .map(|d| Self::convert_data_display(d))
            .collect::<Result<_, _>>()?;
        if !displays.is_empty() {
            schema = schema.with_data_display(displays);
        }

        // Convert sections
        let config_sections: Vec<ConfigSection> = sections
            .into_iter()
            .map(|s| Self::convert_section(s))
            .collect();
        if !config_sections.is_empty() {
            schema = schema.with_sections(config_sections);
        }

        Ok(schema)
    }

    fn convert_field(field: FieldToml) -> anyhow::Result<ConfigField> {
        let mut config_field = match field.field_type.as_str() {
            "text" => ConfigField::text(&field.id, &field.label),
            "boolean" => ConfigField::boolean(&field.id, &field.label),
            "number" => ConfigField::number(&field.id, &field.label),
            "select" => {
                // For select fields without options, treat as text
                ConfigField::text(&field.id, &field.label)
            }
            "textarea" => ConfigField::text(&field.id, &field.label),  // Treat as text
            "array" => ConfigField::text(&field.id, &field.label),     // Treat as text
            other => anyhow::bail!("Unknown field type: {}", other),
        };

        if let Some(desc) = field.description {
            config_field = config_field.with_description(&desc);
        }
        if let Some(placeholder) = field.placeholder {
            config_field = config_field.with_placeholder(&placeholder);
        }
        if field.required == Some(true) {
            config_field = config_field.required();
        }
        if let Some(default) = field.default {
            config_field = config_field.with_default(Self::toml_to_json(default)?);
        }
        if let Some(validation) = field.validation {
            config_field = config_field.with_validation(FieldValidation {
                min: validation.min,
                max: validation.max,
                pattern: validation.pattern,
                message: validation.message,
                ..Default::default()
            });
        }

        Ok(config_field)
    }

    fn convert_action(action: ActionToml) -> ConfigAction {
        let mut config_action = ConfigAction::post(&action.id, &action.label, &action.endpoint);

        if let Some(desc) = action.description {
            config_action = config_action.with_description(&desc);
        }
        if action.primary == Some(true) {
            config_action = config_action.primary();
        }
        if action.refresh_after == Some(true) {
            config_action = config_action.refresh_after();
        }

        config_action
    }

    fn convert_data_display(display: DataDisplayToml) -> anyhow::Result<DataDisplay> {
        let fields: Vec<DataDisplayField> = display
            .fields
            .into_iter()
            .map(|f| Self::convert_data_display_field(f))
            .collect::<Result<_, _>>()?;

        let mut data_display = match display.display_type.as_str() {
            "list" => DataDisplay::list(&display.id),
            "stats" => DataDisplay::stats(&display.id),
            "table" => DataDisplay::list(&display.id),  // Treat table as list
            other => anyhow::bail!("Unknown data display type: {}", other),
        };

        if let Some(title) = display.title {
            data_display = data_display.with_title(&title);
        }
        if let Some(msg) = display.empty_message {
            data_display = data_display.with_empty_message(&msg);
        }
        data_display = data_display.with_fields(fields);

        Ok(data_display)
    }

    fn convert_data_display_field(field: DataDisplayFieldToml) -> anyhow::Result<DataDisplayField> {
        let display_field = match field.field_type.as_str() {
            "text" => DataDisplayField::text(&field.id, &field.label),
            "link" => {
                let link_to = field
                    .link_to
                    .ok_or_else(|| anyhow::anyhow!("link field requires link_to"))?;
                DataDisplayField::link(&field.id, &field.label, &link_to)
            }
            "badge" => DataDisplayField::badge(&field.id, &field.label),
            "number" => DataDisplayField::number(&field.id, &field.label),
            "duration" => DataDisplayField::text(&field.id, &field.label),    // Treat as text
            "percentage" => DataDisplayField::number(&field.id, &field.label), // Treat as number
            other => anyhow::bail!("Unknown data display field type: {}", other),
        };

        Ok(display_field)
    }

    fn convert_section(section: SectionToml) -> ConfigSection {
        let field_refs: Vec<&str> = section.fields.iter().map(|s| s.as_str()).collect();
        let mut config_section = ConfigSection::new(&section.id, &section.title, field_refs);

        if let Some(desc) = section.description {
            config_section = config_section.with_description(&desc);
        }

        config_section
    }

    /// Convert TOML value to JSON value
    fn toml_to_json(value: toml::Value) -> anyhow::Result<serde_json::Value> {
        let json_str = serde_json::to_string(&value)?;
        Ok(serde_json::from_str(&json_str)?)
    }

    /// Get all extensions
    pub fn get_all(&self) -> Vec<ExtensionDefinition> {
        self.extensions.values().cloned().collect()
    }

    /// Get extension by slug
    pub fn get_by_slug(&self, slug: &str) -> Option<&ExtensionDefinition> {
        self.extensions.get(slug)
    }

    /// Get only user-configurable extensions
    pub fn get_user_extensions(&self) -> Vec<ExtensionDefinition> {
        self.extensions
            .values()
            .filter(|e| e.user_configurable)
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toml_to_json() {
        let toml_val = toml::Value::Boolean(true);
        let json_val = ExtensionRegistry::toml_to_json(toml_val).unwrap();
        assert_eq!(json_val, serde_json::json!(true));
    }
}
