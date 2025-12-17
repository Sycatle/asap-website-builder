//! Optimized prepared queries and batch operations for ASAP Core API
//!
//! This module is organized into submodules:
//! - `types` - Shared data types and structs
//! - `websites` - Website CRUD queries
//! - `extensions` - Extension-related queries
//! - `sections` - Website section queries
//! - `presets` - Preset queries
//! - `events` - Event batch operations

mod types;
mod websites;
mod extensions;
mod sections;
mod presets;
mod events;

// Re-export all public items
pub use types::*;
pub use websites::*;
pub use extensions::*;
pub use sections::*;
pub use presets::*;
pub use events::*;
