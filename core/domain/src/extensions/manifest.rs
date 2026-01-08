//! Extension Manifest Types
//!
//! This module defines the comprehensive types for extension manifests.
//! These types are the source of truth for manifest.toml parsing and validation.
//!
//! ## Design Principles
//!
//! 1. **Single Source of Truth**: All manifest structure defined here
//! 2. **Serde Compatibility**: Full TOML/JSON serialization support
//! 3. **Type Safety**: Strong typing with validation at parse time
//! 4. **Backward Compatibility**: Optional fields with sensible defaults

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Core Extension Metadata
// ============================================================================

/// Complete extension manifest structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    /// Core extension metadata (required)
    pub extension: ExtensionMetadata,

    /// Permission requirements
    #[serde(default)]
    pub permissions: Option<Permissions>,

    /// Default configuration values
    #[serde(default)]
    pub default_settings: Option<HashMap<String, serde_json::Value>>,

    /// Configuration fields for UI generation
    #[serde(default)]
    pub fields: Vec<ManifestField>,

    /// Logical grouping of fields
    #[serde(default)]
    pub sections: Vec<ManifestSection>,

    /// User-triggerable actions
    #[serde(default)]
    pub actions: Vec<ManifestAction>,

    /// Data visualization components
    #[serde(default)]
    pub data_display: Vec<ManifestDataDisplay>,

    /// Webhook configurations
    #[serde(default)]
    pub webhooks: Vec<ManifestWebhook>,

    /// Lifecycle hooks
    #[serde(default)]
    pub lifecycle: Option<ManifestLifecycle>,

    /// Extension assets (icons, screenshots)
    #[serde(default)]
    pub assets: Option<ManifestAssets>,

    /// Pricing configuration
    #[serde(default)]
    pub pricing: Option<ManifestPricing>,
}

/// Core extension metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionMetadata {
    /// Unique identifier (kebab-case)
    pub slug: String,

    /// Display name
    pub name: String,

    /// Semantic version
    pub version: String,

    /// Short description
    pub description: String,

    /// Detailed description with markdown support
    #[serde(default)]
    pub long_description: Option<String>,

    /// Extension category
    pub category: ExtensionCategory,

    /// Search tags
    #[serde(default)]
    pub tags: Vec<String>,

    /// Icon name (lucide) or URL
    #[serde(default)]
    pub icon: Option<String>,

    /// Author information
    #[serde(default)]
    pub author: Option<ExtensionAuthor>,

    /// Repository URL
    #[serde(default)]
    pub repository: Option<String>,

    /// Homepage URL
    #[serde(default)]
    pub homepage: Option<String>,

    /// Documentation URL
    #[serde(default)]
    pub documentation: Option<String>,

    /// Whether users can configure this extension
    #[serde(default = "default_true")]
    pub user_configurable: bool,

    /// Order in sidebar navigation
    #[serde(default)]
    pub sidebar_order: Option<i32>,

    /// Label shown in sidebar
    #[serde(default)]
    pub sidebar_label: Option<String>,

    /// Minimum plan required
    #[serde(default)]
    pub min_plan: PlanTier,

    /// Beta status
    #[serde(default)]
    pub beta: bool,

    /// Deprecated status
    #[serde(default)]
    pub deprecated: bool,

    /// Replacement extension slug if deprecated
    #[serde(default)]
    pub successor: Option<String>,
}

/// Extension author information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionAuthor {
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub verified: bool,
}

/// Extension category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ExtensionCategory {
    #[default]
    Utility,
    Integration,
    Analytics,
    Marketing,
    Design,
    Seo,
    Security,
    Performance,
    Social,
    Ai,
}

impl std::fmt::Display for ExtensionCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExtensionCategory::Utility => write!(f, "utility"),
            ExtensionCategory::Integration => write!(f, "integration"),
            ExtensionCategory::Analytics => write!(f, "analytics"),
            ExtensionCategory::Marketing => write!(f, "marketing"),
            ExtensionCategory::Design => write!(f, "design"),
            ExtensionCategory::Seo => write!(f, "seo"),
            ExtensionCategory::Security => write!(f, "security"),
            ExtensionCategory::Performance => write!(f, "performance"),
            ExtensionCategory::Social => write!(f, "social"),
            ExtensionCategory::Ai => write!(f, "ai"),
        }
    }
}

/// Plan tier requirement
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum PlanTier {
    #[default]
    Free,
    Starter,
    Pro,
    Business,
}

// ============================================================================
// Permissions
// ============================================================================

/// Extension permission requirements
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Permissions {
    /// Permission scopes
    #[serde(default)]
    pub scopes: Vec<PermissionScope>,

    /// Specific data types accessed
    #[serde(default)]
    pub data_access: Vec<String>,

    /// External services used
    #[serde(default)]
    pub external_services: Vec<String>,
}

/// Available permission scopes
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PermissionScope {
    #[serde(rename = "website:read")]
    WebsiteRead,
    #[serde(rename = "website:write")]
    WebsiteWrite,
    #[serde(rename = "account:read")]
    AccountRead,
    #[serde(rename = "account:write")]
    AccountWrite,
    #[serde(rename = "analytics:read")]
    AnalyticsRead,
    #[serde(rename = "analytics:write")]
    AnalyticsWrite,
    #[serde(rename = "storage:read")]
    StorageRead,
    #[serde(rename = "storage:write")]
    StorageWrite,
    #[serde(rename = "notifications:send")]
    NotificationsSend,
    #[serde(rename = "webhooks:manage")]
    WebhooksManage,
    #[serde(rename = "integrations:github")]
    IntegrationsGithub,
    #[serde(rename = "integrations:stripe")]
    IntegrationsStripe,
    #[serde(rename = "integrations:analytics")]
    IntegrationsAnalytics,
}

// ============================================================================
// Configuration Fields
// ============================================================================

/// A configuration field definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestField {
    /// Unique field identifier (snake_case)
    pub id: String,

    /// Field input type
    #[serde(rename = "type")]
    pub field_type: ManifestFieldType,

    /// Display label
    pub label: String,

    /// Help text
    #[serde(default)]
    pub description: Option<String>,

    /// Placeholder text
    #[serde(default)]
    pub placeholder: Option<String>,

    /// Whether required
    #[serde(default)]
    pub required: bool,

    /// Default value
    #[serde(default)]
    pub default: Option<serde_json::Value>,

    /// Options for select fields
    #[serde(default)]
    pub options: Vec<ManifestSelectOption>,

    /// Validation rules
    #[serde(default)]
    pub validation: Option<ManifestFieldValidation>,

    /// Conditional visibility
    #[serde(default)]
    pub conditions: Option<ManifestFieldConditions>,

    /// Group identifier
    #[serde(default)]
    pub group: Option<String>,

    /// Show in advanced settings
    #[serde(default)]
    pub advanced: bool,

    /// Sensitive (mask/encrypt)
    #[serde(default)]
    pub sensitive: bool,
}

/// Supported field types
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ManifestFieldType {
    #[default]
    Text,
    Textarea,
    Number,
    Boolean,
    Select,
    Multiselect,
    Url,
    Email,
    Password,
    Color,
    Date,
    Datetime,
    File,
    Image,
    Json,
    Code,
    Markdown,
}

/// Option for select/multiselect fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestSelectOption {
    pub value: String,
    pub label: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub disabled: bool,
}

/// Field validation rules
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManifestFieldValidation {
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
    #[serde(default)]
    pub pattern: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub allowed_extensions: Vec<String>,
    #[serde(default)]
    pub max_size: Option<u64>,
}

/// Conditional visibility rules
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManifestFieldConditions {
    #[serde(default)]
    pub show_when: Option<HashMap<String, serde_json::Value>>,
    #[serde(default)]
    pub hide_when: Option<HashMap<String, serde_json::Value>>,
    #[serde(default)]
    pub require_when: Option<HashMap<String, serde_json::Value>>,
}

// ============================================================================
// Sections
// ============================================================================

/// Logical grouping of fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestSection {
    /// Unique section identifier
    pub id: String,

    /// Section title
    pub title: String,

    /// Section description
    #[serde(default)]
    pub description: Option<String>,

    /// Section icon
    #[serde(default)]
    pub icon: Option<String>,

    /// Field IDs in this section
    #[serde(default)]
    pub fields: Vec<String>,

    /// Whether collapsible
    #[serde(default)]
    pub collapsible: bool,

    /// Whether collapsed by default
    #[serde(default)]
    pub collapsed_by_default: bool,

    /// Conditional visibility
    #[serde(default)]
    pub conditions: Option<ManifestFieldConditions>,
}

// ============================================================================
// Actions
// ============================================================================

/// User-triggerable action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestAction {
    /// Unique action identifier
    pub id: String,

    /// Button label
    pub label: String,

    /// Action description
    #[serde(default)]
    pub description: Option<String>,

    /// API endpoint to call
    pub endpoint: String,

    /// HTTP method
    #[serde(default)]
    pub method: ManifestHttpMethod,

    /// Button icon
    #[serde(default)]
    pub icon: Option<String>,

    /// Primary action styling
    #[serde(default)]
    pub primary: bool,

    /// Destructive action styling
    #[serde(default)]
    pub destructive: bool,

    /// Confirmation message
    #[serde(default)]
    pub confirm: Option<String>,

    /// Refresh data after action
    #[serde(default)]
    pub refresh_after: bool,

    /// Success toast message
    #[serde(default)]
    pub success_message: Option<String>,

    /// Error toast message
    #[serde(default)]
    pub error_message: Option<String>,

    /// Conditional visibility
    #[serde(default)]
    pub conditions: Option<ManifestFieldConditions>,
}

/// HTTP methods for actions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "UPPERCASE")]
pub enum ManifestHttpMethod {
    Get,
    #[default]
    Post,
    Put,
    Delete,
}

// ============================================================================
// Data Display
// ============================================================================

/// Data visualization component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestDataDisplay {
    /// Unique identifier
    pub id: String,

    /// Display type
    #[serde(rename = "type")]
    pub display_type: ManifestDisplayType,

    /// Component title
    #[serde(default)]
    pub title: Option<String>,

    /// Component description
    #[serde(default)]
    pub description: Option<String>,

    /// Data source endpoint
    #[serde(default)]
    pub data_source: Option<String>,

    /// Empty state message
    #[serde(default)]
    pub empty_message: Option<String>,

    /// Fields to display
    #[serde(default)]
    pub fields: Vec<ManifestDataField>,

    /// Available actions per item
    #[serde(default)]
    pub actions: Vec<String>,

    /// Enable pagination
    #[serde(default)]
    pub pagination: bool,

    /// Items per page
    #[serde(default = "default_page_size")]
    pub page_size: u32,

    /// Enable sorting
    #[serde(default)]
    pub sortable: bool,

    /// Enable filtering
    #[serde(default)]
    pub filterable: bool,
}

/// Display component types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ManifestDisplayType {
    #[default]
    List,
    Table,
    Grid,
    Chart,
    Stat,
    Timeline,
    Custom,
}

/// Data field for display components
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestDataField {
    /// Field identifier (maps to data key)
    pub id: String,

    /// Display type
    #[serde(rename = "type")]
    pub field_type: ManifestDataFieldType,

    /// Column/field label
    pub label: String,

    /// Field to use as link URL
    #[serde(default)]
    pub link_to: Option<String>,

    /// Format string
    #[serde(default)]
    pub format: Option<String>,

    /// Enable sorting on this field
    #[serde(default)]
    pub sortable: bool,

    /// Column width
    #[serde(default)]
    pub width: Option<String>,
}

/// Data field display types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ManifestDataFieldType {
    #[default]
    Text,
    Number,
    Date,
    Link,
    Badge,
    Image,
    Boolean,
    Progress,
    Custom,
}

// ============================================================================
// Webhooks
// ============================================================================

/// Webhook configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestWebhook {
    /// Unique identifier
    pub id: String,

    /// Event type to listen for
    pub event: String,

    /// Endpoint to call
    #[serde(default)]
    pub endpoint: Option<String>,

    /// Enable retry
    #[serde(default = "default_true")]
    pub retry: bool,

    /// Maximum retry attempts
    #[serde(default = "default_retries")]
    pub max_retries: u32,
}

// ============================================================================
// Lifecycle
// ============================================================================

/// Extension lifecycle hooks
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManifestLifecycle {
    /// Called when installed
    #[serde(default)]
    pub on_install: Option<String>,

    /// Called when uninstalled
    #[serde(default)]
    pub on_uninstall: Option<String>,

    /// Called when enabled
    #[serde(default)]
    pub on_enable: Option<String>,

    /// Called when disabled
    #[serde(default)]
    pub on_disable: Option<String>,

    /// Called when upgraded
    #[serde(default)]
    pub on_upgrade: Option<String>,

    /// Called when configuration changes
    #[serde(default)]
    pub on_config_change: Option<String>,
}

// ============================================================================
// Assets
// ============================================================================

/// Extension assets
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManifestAssets {
    /// Icon path
    #[serde(default)]
    pub icon: Option<String>,

    /// Screenshots
    #[serde(default)]
    pub screenshots: Vec<ManifestScreenshot>,

    /// Banner image path
    #[serde(default)]
    pub banner: Option<String>,

    /// Demo video URL
    #[serde(default)]
    pub video: Option<String>,
}

/// Screenshot metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestScreenshot {
    /// File path
    pub path: String,

    /// Caption
    #[serde(default)]
    pub caption: Option<String>,

    /// Alt text
    #[serde(default)]
    pub alt: Option<String>,
}

// ============================================================================
// Pricing
// ============================================================================

/// Extension pricing configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManifestPricing {
    /// Pricing model
    #[serde(default)]
    pub model: PricingModel,

    /// Price in cents
    #[serde(default)]
    pub price: Option<u64>,

    /// Currency code
    #[serde(default = "default_currency")]
    pub currency: String,

    /// Billing interval
    #[serde(default)]
    pub interval: Option<PricingInterval>,

    /// Trial period in days
    #[serde(default)]
    pub trial_days: u32,

    /// Unit name for usage-based
    #[serde(default)]
    pub usage_unit: Option<String>,

    /// Price per unit in cents
    #[serde(default)]
    pub price_per_unit: Option<u64>,

    /// Free units included
    #[serde(default)]
    pub included_units: Option<u64>,
}

/// Pricing models
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum PricingModel {
    #[default]
    Free,
    OneTime,
    Subscription,
    UsageBased,
}

/// Billing intervals
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PricingInterval {
    Month,
    Year,
}

// ============================================================================
// Default Value Helpers
// ============================================================================

fn default_true() -> bool {
    true
}

fn default_page_size() -> u32 {
    10
}

fn default_retries() -> u32 {
    3
}

fn default_currency() -> String {
    "EUR".to_string()
}

// ============================================================================
// Validation
// ============================================================================

impl ExtensionManifest {
    /// Validate the manifest structure
    pub fn validate(&self) -> Result<(), ManifestValidationError> {
        // Validate slug format
        if !is_valid_slug(&self.extension.slug) {
            return Err(ManifestValidationError::InvalidSlug(
                self.extension.slug.clone(),
            ));
        }

        // Validate version format
        if !is_valid_semver(&self.extension.version) {
            return Err(ManifestValidationError::InvalidVersion(
                self.extension.version.clone(),
            ));
        }

        // Validate field IDs are unique
        let mut field_ids = std::collections::HashSet::new();
        for field in &self.fields {
            if !field_ids.insert(&field.id) {
                return Err(ManifestValidationError::DuplicateFieldId(field.id.clone()));
            }
        }

        // Validate section field references
        for section in &self.sections {
            for field_id in &section.fields {
                if !field_ids.contains(field_id) {
                    return Err(ManifestValidationError::InvalidFieldReference(
                        field_id.clone(),
                        section.id.clone(),
                    ));
                }
            }
        }

        // Validate action IDs are unique
        let mut action_ids = std::collections::HashSet::new();
        for action in &self.actions {
            if !action_ids.insert(&action.id) {
                return Err(ManifestValidationError::DuplicateActionId(
                    action.id.clone(),
                ));
            }
        }

        Ok(())
    }
}

/// Manifest validation errors
#[derive(Debug, Clone, thiserror::Error)]
pub enum ManifestValidationError {
    #[error("Invalid slug format: {0}. Must be kebab-case, 2-50 characters")]
    InvalidSlug(String),

    #[error("Invalid version format: {0}. Must be semantic version (e.g., 1.0.0)")]
    InvalidVersion(String),

    #[error("Duplicate field ID: {0}")]
    DuplicateFieldId(String),

    #[error("Invalid field reference '{0}' in section '{1}'")]
    InvalidFieldReference(String, String),

    #[error("Duplicate action ID: {0}")]
    DuplicateActionId(String),
}

use std::sync::LazyLock;

/// Regex for valid slugs (kebab-case) - compiled once
static SLUG_REGEX: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"^[a-z][a-z0-9-]*[a-z0-9]$").expect("Invalid slug regex")
});

/// Regex for semantic versions - compiled once
static SEMVER_REGEX: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$").expect("Invalid semver regex")
});

/// Check if a string is a valid slug (kebab-case)
fn is_valid_slug(s: &str) -> bool {
    s.len() >= 2 && s.len() <= 50 && SLUG_REGEX.is_match(s)
}

/// Check if a string is a valid semantic version
fn is_valid_semver(s: &str) -> bool {
    SEMVER_REGEX.is_match(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_slug() {
        assert!(is_valid_slug("github-sync"));
        assert!(is_valid_slug("analytics"));
        assert!(is_valid_slug("my-extension-v2"));
        assert!(!is_valid_slug("a")); // too short
        assert!(!is_valid_slug("Invalid")); // uppercase
        assert!(!is_valid_slug("-invalid")); // starts with dash
        assert!(!is_valid_slug("invalid-")); // ends with dash
    }

    #[test]
    fn test_valid_semver() {
        assert!(is_valid_semver("1.0.0"));
        assert!(is_valid_semver("2.1.0"));
        assert!(is_valid_semver("1.0.0-beta.1"));
        assert!(is_valid_semver("0.0.1-alpha"));
        assert!(!is_valid_semver("1.0")); // incomplete
        assert!(!is_valid_semver("v1.0.0")); // has prefix
    }
}
