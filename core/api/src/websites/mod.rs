//! Website API Handlers
//!
//! This module is organized into submodules for maintainability:
//! - `core` - Core website CRUD operations
//! - `extensions` - Website extension management
//! - `elements` - Website element management
//! - `pages` - Website page management
//! - `presets` - Preset templates
//! - `catalog` - Extension catalog (available extensions)

mod core;
mod extensions;
mod elements;
mod pages;
mod presets;
mod catalog;

// Re-export all public items
pub use self::core::*;
pub use extensions::*;
pub use elements::*;
pub use pages::*;
pub use presets::*;
pub use catalog::*;
