//! Module Registry - Centralized module registration and discovery
//!
//! This module provides a centralized way to register and discover module executors.
//! It supports:
//! - Declarative module registration
//! - Module metadata (slug, version, handled events)
//! - Logging of registered modules at startup

use anyhow::Result;
use sqlx::PgPool;
use asap_core_domain::events::EventType;

use crate::module_executor::{
    ModuleExecutorRegistry, 
    GitHubIntegrationExecutor, 
    WebsiteModuleExecutor,
    ModuleInfo,
};

/// Configuration for module registration
pub struct ModuleRegistryConfig {
    pub pool: PgPool,
    pub core_api_url: String,
    pub enable_github: bool,
    pub enable_website: bool,
}

impl ModuleRegistryConfig {
    pub fn new(pool: PgPool, core_api_url: String) -> Self {
        Self {
            pool,
            core_api_url,
            enable_github: true,
            enable_website: true,
        }
    }

    /// Disable GitHub module (useful for testing)
    #[allow(dead_code)]
    pub fn without_github(mut self) -> Self {
        self.enable_github = false;
        self
    }

    /// Disable Website module
    #[allow(dead_code)]
    pub fn without_website(mut self) -> Self {
        self.enable_website = false;
        self
    }
}

/// Register all available module executors with the registry
///
/// This function centralizes the registration of all module executors,
/// making it easy to add new modules and see which modules are active.
///
/// # Example
/// ```ignore
/// let config = ModuleRegistryConfig::new(pool, api_url);
/// let registry = register_all_modules(config)?;
/// ```
pub fn register_all_modules(config: ModuleRegistryConfig) -> Result<ModuleExecutorRegistry> {
    let mut registry = ModuleExecutorRegistry::new();
    let mut registered_count = 0;

    // =========================================================================
    // GitHub Integration Module
    // =========================================================================
    if config.enable_github {
        let github_executor = GitHubIntegrationExecutor::new(
            config.pool.clone(),
            config.core_api_url.clone(),
        );
        
        log_module_registration(&github_executor);
        registry.register(Box::new(github_executor));
        registered_count += 1;
    }

    // =========================================================================
    // Website Module (handles website lifecycle events)
    // =========================================================================
    if config.enable_website {
        let website_executor = WebsiteModuleExecutor::new(config.pool.clone());
        
        log_module_registration(&website_executor);
        registry.register(Box::new(website_executor));
        registered_count += 1;
    }

    // =========================================================================
    // Future modules can be added here:
    // =========================================================================
    // 
    // // Blog Engine Module
    // if config.enable_blog {
    //     let blog_executor = BlogEngineExecutor::new(config.pool.clone());
    //     log_module_registration(&blog_executor);
    //     registry.register(Box::new(blog_executor));
    //     registered_count += 1;
    // }
    //
    // // Analytics Module
    // if config.enable_analytics {
    //     let analytics_executor = AnalyticsExecutor::new(config.pool.clone());
    //     log_module_registration(&analytics_executor);
    //     registry.register(Box::new(analytics_executor));
    //     registered_count += 1;
    // }
    //
    // // Contact Form Module
    // if config.enable_contact {
    //     let contact_executor = ContactFormExecutor::new(config.pool.clone());
    //     log_module_registration(&contact_executor);
    //     registry.register(Box::new(contact_executor));
    //     registered_count += 1;
    // }

    tracing::info!(
        "Module registry initialized with {} module(s)",
        registered_count
    );

    Ok(registry)
}

/// Log module registration with metadata
fn log_module_registration<T: ModuleInfo>(module: &T) {
    let events: Vec<String> = module
        .handled_events()
        .iter()
        .map(|e| format!("{:?}", e))
        .collect();

    tracing::info!(
        "Registering module: {} v{} (slug: {}) - handles: [{}]",
        module.name(),
        module.version(),
        module.slug(),
        events.join(", ")
    );
}

/// Get a summary of all available modules (for debugging/admin)
#[allow(dead_code)]
pub fn get_available_modules() -> Vec<ModuleSummary> {
    vec![
        ModuleSummary {
            slug: "github-sync".to_string(),
            name: "GitHub Integration".to_string(),
            version: "1.0.0".to_string(),
            description: "Syncs GitHub repositories and profile data".to_string(),
            handled_events: vec![
                EventType::UserIntegrationAdded,
                EventType::ModuleActivated,
                EventType::GitHubSyncRequested,
            ],
        },
        ModuleSummary {
            slug: "website-lifecycle".to_string(),
            name: "Website Lifecycle".to_string(),
            version: "1.0.0".to_string(),
            description: "Handles website creation, publication, and updates".to_string(),
            handled_events: vec![
                EventType::WebsiteCreated,
                EventType::WebsitePublished,
                EventType::WebsiteUpdated,
                EventType::WebsiteDeleted,
                EventType::SectionCreated,
                EventType::SectionUpdated,
                EventType::SectionDeleted,
                EventType::SectionReordered,
                EventType::PresetApplied,
            ],
        },
    ]
}

/// Summary information about a module
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ModuleSummary {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub handled_events: Vec<EventType>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_summary() {
        let modules = get_available_modules();
        assert!(modules.len() >= 2);
        
        let github = modules.iter().find(|m| m.slug == "github-sync");
        assert!(github.is_some());
        
        let website = modules.iter().find(|m| m.slug == "website-lifecycle");
        assert!(website.is_some());
    }

    #[test]
    fn test_module_events() {
        let modules = get_available_modules();
        
        let github = modules.iter().find(|m| m.slug == "github-sync").unwrap();
        assert!(github.handled_events.contains(&EventType::GitHubSyncRequested));
        
        let website = modules.iter().find(|m| m.slug == "website-lifecycle").unwrap();
        assert!(website.handled_events.contains(&EventType::WebsitePublished));
    }
}
