//! Collections & Variables Domain Types
//!
//! This module defines the core types for the Collections & Variables system
//! that bridges extensions (data providers) and the Studio (visual editor).
//!
//! # Architecture
//!
//! - **Collections**: Typed arrays of items produced by extensions (e.g., github_repos)
//! - **Variables**: Single values that can be manual, synced, or computed from collections
//!
//! # Example
//!
//! ```rust,ignore
//! // Extension produces a collection
//! let items = vec![
//!     CollectionItem::new("1", json!({"name": "asap", "stars": 847})),
//!     CollectionItem::new("2", json!({"name": "portfolio", "stars": 234})),
//! ];
//! ctx.upsert_collection("github_repos", items).await?;
//!
//! // Studio consumes with filtering
//! let binding = DataBinding::collection("github_repos")
//!     .filter("stars", FilterOperator::Gte, 100)
//!     .sort("stars", SortOrder::Desc)
//!     .limit(6);
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Collection Schema Types (defined by extensions)
// ============================================================================

/// Defines a collection that an extension can produce
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionDefinition {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub sync_mode: SyncMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_frequency: Option<SyncFrequency>,
    pub schema: CollectionSchema,
}

/// How the collection is synced
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SyncMode {
    /// User must manually trigger sync
    #[default]
    Manual,
    /// System automatically syncs based on frequency
    Auto,
}

/// Frequency for auto-sync collections
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncFrequency {
    Hourly,
    Daily,
    Weekly,
}

/// Schema definition for a collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionSchema {
    /// Primary key field (usually "id")
    pub primary_key: String,
    /// Field used as display title
    pub display_field: String,
    /// Fields shown in previews/cards
    pub preview_fields: Vec<String>,
    /// All field definitions
    pub fields: Vec<CollectionFieldDef>,
}

/// Definition of a field in a collection schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionFieldDef {
    pub key: String,
    #[serde(rename = "type")]
    pub field_type: CollectionFieldType,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<serde_json::Value>,
    #[serde(default)]
    pub filterable: bool,
    #[serde(default)]
    pub sortable: bool,
    #[serde(default)]
    pub searchable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

impl CollectionFieldDef {
    /// Create a new field definition
    pub fn new(key: &str, field_type: CollectionFieldType, label: &str) -> Self {
        Self {
            key: key.to_string(),
            field_type,
            label: label.to_string(),
            description: None,
            required: false,
            default_value: None,
            filterable: false,
            sortable: false,
            searchable: false,
            format: None,
            icon: None,
        }
    }

    /// Builder: set as required
    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    /// Builder: set as filterable
    pub fn filterable(mut self) -> Self {
        self.filterable = true;
        self
    }

    /// Builder: set as sortable
    pub fn sortable(mut self) -> Self {
        self.sortable = true;
        self
    }

    /// Builder: set as searchable
    pub fn searchable(mut self) -> Self {
        self.searchable = true;
        self
    }

    /// Builder: set description
    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }

    /// Builder: set format hint
    pub fn with_format(mut self, format: &str) -> Self {
        self.format = Some(format.to_string());
        self
    }

    /// Builder: set icon
    pub fn with_icon(mut self, icon: &str) -> Self {
        self.icon = Some(icon.to_string());
        self
    }
}

/// Supported field types for collection fields
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CollectionFieldType {
    String,
    Number,
    Boolean,
    Date,
    DateTime,
    Url,
    Email,
    Image,
    RichText,
    Json,
    Array,
    /// Reference to another collection
    Reference {
        collection: String,
    },
}

// ============================================================================
// Collection Instance Types (stored per website)
// ============================================================================

/// A collection instance for a specific website
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteCollection {
    pub id: Uuid,
    pub website_id: Uuid,
    pub collection_slug: String,

    /// The actual items in the collection
    pub items: Vec<CollectionItem>,

    /// Metadata about the collection
    pub source_extension: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_version: Option<String>,
    pub total_count: i32,

    /// Sync status
    pub sync_status: SyncStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub synced_at: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Status of collection sync
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    #[default]
    Idle,
    Syncing,
    Error,
}

impl std::fmt::Display for SyncStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncStatus::Idle => write!(f, "idle"),
            SyncStatus::Syncing => write!(f, "syncing"),
            SyncStatus::Error => write!(f, "error"),
        }
    }
}

impl std::str::FromStr for SyncStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "idle" => Ok(SyncStatus::Idle),
            "syncing" => Ok(SyncStatus::Syncing),
            "error" => Ok(SyncStatus::Error),
            _ => Err(format!("Invalid sync status: {}", s)),
        }
    }
}

/// A single item in a collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionItem {
    /// Unique ID within the collection
    pub id: String,
    /// The actual data fields
    pub data: serde_json::Value,
    /// When this item was added to the collection
    #[serde(rename = "_created_at")]
    pub created_at: DateTime<Utc>,
    /// When this item was last updated
    #[serde(rename = "_updated_at")]
    pub updated_at: DateTime<Utc>,
    /// Original ID from the source (e.g., GitHub repo ID)
    #[serde(rename = "_source_id", skip_serializing_if = "Option::is_none")]
    pub source_id: Option<String>,
}

impl CollectionItem {
    /// Create a new collection item
    pub fn new(id: impl Into<String>, data: serde_json::Value) -> Self {
        let now = Utc::now();
        Self {
            id: id.into(),
            data,
            created_at: now,
            updated_at: now,
            source_id: None,
        }
    }

    /// Create with source ID tracking
    pub fn with_source_id(mut self, source_id: impl Into<String>) -> Self {
        self.source_id = Some(source_id.into());
        self
    }
}

// ============================================================================
// Variable Types
// ============================================================================

/// Definition of a variable that an extension provides
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDefinition {
    pub key: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub value_type: VariableType,
    pub source: VariableSourceDef,
}

impl VariableDefinition {
    /// Create a manual variable definition
    pub fn manual(key: &str, name: &str, value_type: VariableType) -> Self {
        Self {
            key: key.to_string(),
            name: name.to_string(),
            description: None,
            value_type,
            source: VariableSourceDef::Manual,
        }
    }

    /// Create a variable synced from extension settings
    pub fn synced(key: &str, name: &str, value_type: VariableType, setting_key: &str) -> Self {
        Self {
            key: key.to_string(),
            name: name.to_string(),
            description: None,
            value_type,
            source: VariableSourceDef::Extension {
                setting_key: setting_key.to_string(),
            },
        }
    }

    /// Create a computed variable
    pub fn computed(
        key: &str,
        name: &str,
        value_type: VariableType,
        computation: VariableComputation,
    ) -> Self {
        Self {
            key: key.to_string(),
            name: name.to_string(),
            description: None,
            value_type,
            source: VariableSourceDef::Computed { computation },
        }
    }

    /// Builder: add description
    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }
}

/// Source definition for a variable
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum VariableSourceDef {
    /// Set manually by user
    Manual,
    /// Synced from extension settings
    Extension { setting_key: String },
    /// Computed from a collection
    Computed { computation: VariableComputation },
}

/// Computation definition for computed variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableComputation {
    pub operation: ComputeOperation,
    pub collection: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<Vec<FilterClause>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<SortClause>,
}

impl VariableComputation {
    /// Count items in a collection
    pub fn count(collection: &str) -> Self {
        Self {
            operation: ComputeOperation::Count,
            collection: collection.to_string(),
            field: None,
            filter: None,
            sort: None,
        }
    }

    /// Sum a numeric field
    pub fn sum(collection: &str, field: &str) -> Self {
        Self {
            operation: ComputeOperation::Sum,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: None,
        }
    }

    /// Average a numeric field
    pub fn avg(collection: &str, field: &str) -> Self {
        Self {
            operation: ComputeOperation::Avg,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: None,
        }
    }

    /// Get minimum value
    pub fn min(collection: &str, field: &str) -> Self {
        Self {
            operation: ComputeOperation::Min,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: None,
        }
    }

    /// Get maximum value
    pub fn max(collection: &str, field: &str) -> Self {
        Self {
            operation: ComputeOperation::Max,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: None,
        }
    }

    /// Get first item's field value (requires sort)
    pub fn first(collection: &str, field: &str, sort_field: &str, order: SortOrder) -> Self {
        Self {
            operation: ComputeOperation::First,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: Some(SortClause {
                field: sort_field.to_string(),
                order,
            }),
        }
    }

    /// Get most common value
    pub fn mode(collection: &str, field: &str) -> Self {
        Self {
            operation: ComputeOperation::Mode,
            collection: collection.to_string(),
            field: Some(field.to_string()),
            filter: None,
            sort: None,
        }
    }

    /// Add filter to computation
    pub fn with_filter(mut self, filter: Vec<FilterClause>) -> Self {
        self.filter = Some(filter);
        self
    }
}

/// Supported computation operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComputeOperation {
    Count,
    Sum,
    Avg,
    Min,
    Max,
    First,
    Last,
    Mode,
}

/// Variable value type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum VariableType {
    #[default]
    String,
    Number,
    Boolean,
    Date,
    DateTime,
    Json,
}

impl std::fmt::Display for VariableType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VariableType::String => write!(f, "string"),
            VariableType::Number => write!(f, "number"),
            VariableType::Boolean => write!(f, "boolean"),
            VariableType::Date => write!(f, "date"),
            VariableType::DateTime => write!(f, "datetime"),
            VariableType::Json => write!(f, "json"),
        }
    }
}

/// A variable instance for a specific website
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteVariable {
    pub id: Uuid,
    pub website_id: Uuid,
    pub key: String,
    pub value: serde_json::Value,
    pub value_type: VariableType,
    pub source: VariableSource,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_ref: Option<String>,
    pub stale: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub computation: Option<VariableComputation>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Runtime source of a variable
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum VariableSource {
    #[default]
    Manual,
    Extension,
    Computed,
}

impl std::fmt::Display for VariableSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VariableSource::Manual => write!(f, "manual"),
            VariableSource::Extension => write!(f, "extension"),
            VariableSource::Computed => write!(f, "computed"),
        }
    }
}

impl std::str::FromStr for VariableSource {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "manual" => Ok(VariableSource::Manual),
            "extension" => Ok(VariableSource::Extension),
            "computed" => Ok(VariableSource::Computed),
            _ => Err(format!("Invalid variable source: {}", s)),
        }
    }
}

// ============================================================================
// Data Binding Types (used by Studio)
// ============================================================================

/// Binding configuration for Studio components
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DataBinding {
    /// Collection binding
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection: Option<CollectionBinding>,
    /// Field mapping (component prop → collection field)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mapping: Option<serde_json::Value>,
    /// Variable bindings (template key → variable key)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variables: Option<serde_json::Value>,
}

/// Collection binding configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionBinding {
    pub slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<Vec<FilterClause>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<SortClause>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i32>,
}

/// Filter clause for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterClause {
    pub field: String,
    pub operator: FilterOperator,
    pub value: serde_json::Value,
}

impl FilterClause {
    pub fn new(field: &str, operator: FilterOperator, value: impl Into<serde_json::Value>) -> Self {
        Self {
            field: field.to_string(),
            operator,
            value: value.into(),
        }
    }

    pub fn eq(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Eq, value)
    }

    pub fn neq(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Neq, value)
    }

    pub fn gt(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Gt, value)
    }

    pub fn gte(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Gte, value)
    }

    pub fn lt(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Lt, value)
    }

    pub fn lte(field: &str, value: impl Into<serde_json::Value>) -> Self {
        Self::new(field, FilterOperator::Lte, value)
    }
}

/// Supported filter operators
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FilterOperator {
    Eq,
    Neq,
    Gt,
    Gte,
    Lt,
    Lte,
    In,
    Nin,
    Contains,
    StartsWith,
    EndsWith,
    Exists,
    NotExists,
}

/// Sort clause for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortClause {
    pub field: String,
    pub order: SortOrder,
}

impl SortClause {
    pub fn asc(field: &str) -> Self {
        Self {
            field: field.to_string(),
            order: SortOrder::Asc,
        }
    }

    pub fn desc(field: &str) -> Self {
        Self {
            field: field.to_string(),
            order: SortOrder::Desc,
        }
    }
}

/// Sort order
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    #[default]
    Asc,
    Desc,
}

// ============================================================================
// Request/Response Types for API
// ============================================================================

/// Request to create or update a collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsertCollectionRequest {
    pub collection_slug: String,
    pub items: Vec<CollectionItem>,
    pub source_extension: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_version: Option<String>,
}

/// Request to set a variable
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetVariableRequest {
    pub key: String,
    pub value: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value_type: Option<VariableType>,
}

/// Query parameters for listing collection items
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CollectionQuery {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<Vec<FilterClause>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<SortClause>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i32>,
}

/// Response for collection listing with pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionResponse {
    pub collection: WebsiteCollection,
    pub schema: Option<CollectionSchema>,
    pub pagination: PaginationInfo,
}

/// Pagination information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub total: i32,
    pub limit: i32,
    pub offset: i32,
    pub has_more: bool,
}

/// Response for all variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariablesResponse {
    pub variables: Vec<WebsiteVariable>,
    /// Map for quick lookup: key → value
    pub values: serde_json::Value,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Helper to create a field definition
pub fn field(key: &str, field_type: CollectionFieldType, label: &str) -> CollectionFieldDef {
    CollectionFieldDef::new(key, field_type, label)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_collection_item_creation() {
        let item = CollectionItem::new(
            "repo-123",
            json!({
                "name": "asap",
                "stars": 847,
                "language": "TypeScript"
            }),
        )
        .with_source_id("gh-123456");

        assert_eq!(item.id, "repo-123");
        assert_eq!(item.source_id, Some("gh-123456".to_string()));
        assert_eq!(item.data["stars"], 847);
    }

    #[test]
    fn test_field_builder() {
        let field = CollectionFieldDef::new("stars", CollectionFieldType::Number, "GitHub Stars")
            .required()
            .sortable()
            .filterable()
            .with_description("Number of GitHub stars")
            .with_icon("star");

        assert!(field.required);
        assert!(field.sortable);
        assert!(field.filterable);
        assert!(!field.searchable);
        assert_eq!(
            field.description,
            Some("Number of GitHub stars".to_string())
        );
    }

    #[test]
    fn test_variable_computation() {
        let comp = VariableComputation::sum("github_repos", "stars")
            .with_filter(vec![FilterClause::eq("language", "TypeScript")]);

        assert_eq!(comp.operation, ComputeOperation::Sum);
        assert_eq!(comp.collection, "github_repos");
        assert_eq!(comp.field, Some("stars".to_string()));
        assert!(comp.filter.is_some());
    }

    #[test]
    fn test_filter_clause_helpers() {
        let filter = FilterClause::gte("stars", 100);
        assert_eq!(filter.field, "stars");
        assert_eq!(filter.operator, FilterOperator::Gte);
        assert_eq!(filter.value, json!(100));
    }

    #[test]
    fn test_sync_status_serialization() {
        assert_eq!(SyncStatus::Idle.to_string(), "idle");
        assert_eq!(SyncStatus::Syncing.to_string(), "syncing");
        assert_eq!("error".parse::<SyncStatus>().unwrap(), SyncStatus::Error);
    }

    #[test]
    fn test_variable_type_serialization() {
        assert_eq!(VariableType::Number.to_string(), "number");
        assert_eq!(VariableType::Boolean.to_string(), "boolean");
    }
}
