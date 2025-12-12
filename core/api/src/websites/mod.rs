//! Website API Handlers
//!
//! This module is organized into submodules for maintainability:
//! - `core` - Core website CRUD operations
//! - `modules` - Website module management
//! - `sections` - Website section management
//! - `presets` - Preset templates
//! - `catalog` - Module catalog (available modules)

mod core;
mod modules;
mod sections;
mod presets;
mod catalog;

// Re-export all public items
pub use self::core::*;
pub use modules::*;
pub use sections::*;
pub use presets::*;
pub use catalog::*;
