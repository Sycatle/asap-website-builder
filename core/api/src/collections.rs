//! Collections & Variables API
//!
//! Endpoints for managing website collections and variables. Collections are
//! typed arrays of items produced by extensions. Variables are single values
//! that can be manual, synced, or computed from a collection.
//!
//! Submodules:
//! - [`types`]: request/response DTOs.
//! - [`helpers`]: shared ownership/claims checks (crate-private).
//! - [`filters`]: pure filter/sort/aggregate logic (crate-private).
//! - [`items`]: HTTP handlers for collections.
//! - [`variables`]: HTTP handlers for variables.

mod filters;
mod helpers;
pub mod items;
pub mod types;
pub mod variables;

pub use items::{
    delete_collection, get_collection, list_collections, trigger_collection_sync, upsert_collection,
};
pub use types::{
    CollectionQueryParams, CollectionResponse, CollectionSummary, CreateComputedVariableRequest,
    SetVariableRequest, TriggerSyncRequest, UpsertCollectionRequest, VariableResponse,
    VariablesListResponse,
};
pub use variables::{
    delete_variable, get_variable, list_variables, recompute_variables, set_variable,
};
