//! Website API Handlers
//!
//! This module is organized into submodules for maintainability:
//! - `core` - Core website CRUD operations
//! - `extensions` - Website extension management
//! - `elements` - Website element management
//! - `pages` - Website page management
//! - `presets` - Preset templates
//! - `catalog` - Extension catalog (available extensions)

mod catalog;
mod core;
mod elements;
mod extensions;
mod pages;
mod presets;

// Re-export all public items
pub use self::core::*;
pub use catalog::*;
pub use elements::*;
pub use extensions::*;
pub use pages::*;
pub use presets::*;
