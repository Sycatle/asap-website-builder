//! Optimized prepared queries and batch operations for ASAP Core API
//!
//! This module is organized into submodules:
//! - `types` - Shared data types and structs
//! - `websites` - Website CRUD queries
//! - `modules` - Module-related queries
//! - `tenant_modules` - Tenant module queries
//! - `sections` - Website section queries
//! - `presets` - Preset queries
//! - `events` - Event batch operations

mod types;
mod websites;
mod modules;
mod tenant_modules;
mod sections;
mod presets;
mod events;

// Re-export all public items
pub use types::*;
pub use websites::*;
pub use modules::*;
pub use tenant_modules::*;
pub use sections::*;
pub use presets::*;
pub use events::*;
