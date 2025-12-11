pub mod auth;
pub mod config;
pub mod errors;
pub mod module_catalog;

// Re-export commonly used types
pub use auth::{generate_token, validate_token, Claims};
pub use config::SharedConfig;
pub use errors::SharedError;
pub use module_catalog::{
    ModuleDefinition, 
    get_module_catalog, 
    get_module_by_slug,
    get_user_modules,
};
