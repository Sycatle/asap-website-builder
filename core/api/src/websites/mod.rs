//! Website API Handlers
//!
//! This module is organized into submodules for maintainability:
//! - `core` - Core website CRUD operations
//! - `modules` - Website module management
//! - `sections` - Website section management
//! - `pages` - Website page management
//! - `presets` - Preset templates
//! - `catalog` - Module catalog (available modules)

mod core;
mod modules;
mod sections;
mod pages;
mod presets;
mod catalog;

// Re-export all public items
pub use self::core::*;
pub use modules::*;
pub use sections::*;
pub use pages::*;
pub use presets::*;
pub use catalog::*;
