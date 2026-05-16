//! Request/response DTOs for the collections & variables API.

use asap_core_domain::{CollectionItem, VariableComputation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct CollectionResponse {
    pub id: String,
    pub website_id: String,
    pub collection_slug: String,
    pub items: Vec<CollectionItem>,
    pub source_extension: String,
    pub source_version: Option<String>,
    pub total_count: i32,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct CollectionSummary {
    pub collection_slug: String,
    pub source_extension: String,
    pub total_count: i32,
    pub sync_status: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VariableResponse {
    pub id: String,
    pub website_id: String,
    pub key: String,
    pub value: serde_json::Value,
    pub value_type: String,
    pub source: String,
    pub source_ref: Option<String>,
    pub stale: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct VariablesListResponse {
    pub variables: Vec<VariableResponse>,
    /// Quick lookup map: key → value
    pub values: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CollectionQueryParams {
    /// Filter as JSON string: [{"field": "language", "operator": "eq", "value": "TypeScript"}]
    pub filter: Option<String>,
    /// Sort field with optional - prefix for desc: "-stars" or "name"
    pub sort: Option<String>,
    /// Maximum items to return
    pub limit: Option<i32>,
    /// Offset for pagination
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertCollectionRequest {
    pub collection_slug: String,
    pub items: Vec<CollectionItem>,
    pub source_extension: String,
    pub source_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetVariableRequest {
    pub value: serde_json::Value,
    pub value_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComputedVariableRequest {
    pub key: String,
    pub value_type: String,
    pub computation: VariableComputation,
}

#[derive(Debug, Deserialize)]
pub struct TriggerSyncRequest {
    pub extension_slug: Option<String>,
}
