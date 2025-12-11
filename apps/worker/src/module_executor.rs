use anyhow::Result;
use asap_core_domain::events::{Event, EventType};
use asap_core_domain::ConfigSchema;
use sqlx::PgPool;

// ============================================================================
// Module Info Trait - Metadata about a module
// ============================================================================

/// Trait providing metadata about a module executor.
/// 
/// This trait should be implemented alongside `ModuleExecutor` to provide
/// information for logging, debugging, and module discovery.
/// 
/// The `config_schema()` method returns the UI schema for configuration,
/// which is defined in code (not in the database) to ensure:
/// - Type safety at compile time
/// - Co-location with module logic
/// - Automatic versioning with the module
#[allow(dead_code)]
pub trait ModuleInfo {
    /// The unique slug identifier for this module (e.g., "github-sync")
    fn slug(&self) -> &'static str;
    
    /// Human-readable name of the module
    fn name(&self) -> &'static str;
    
    /// Semantic version of the module (e.g., "1.0.0")
    fn version(&self) -> &'static str;
    
    /// Brief description of what the module does
    fn description(&self) -> &'static str;
    
    /// Module category for grouping in UI
    fn category(&self) -> &'static str {
        "other"
    }
    
    /// List of event types this module handles
    fn handled_events(&self) -> Vec<EventType>;
    
    /// Configuration schema for the module UI
    /// 
    /// This defines the fields, actions, and data displays for the module
    /// configuration page. Returns None if the module has no configuration.
    fn config_schema(&self) -> Option<ConfigSchema> {
        None
    }
    
    /// Default settings for when the module is first activated
    fn default_settings(&self) -> serde_json::Value {
        serde_json::json!({})
    }
}

// ============================================================================
// Module Executor Trait - Core execution logic
// ============================================================================

/// Trait for module executors that process events.
/// 
/// Implementors should also implement `ModuleInfo` for metadata.
#[async_trait::async_trait]
#[allow(dead_code)]
pub trait ModuleExecutor: ModuleInfo + Send + Sync {
    /// Execute the module logic for the given event.
    /// 
    /// This method is called when an event matching `can_handle` is received.
    /// It should be idempotent when possible to handle retries gracefully.
    async fn execute(&self, event: &Event) -> Result<()>;
    
    /// Check if this executor can handle the given event type.
    /// 
    /// Default implementation uses `handled_events()` from `ModuleInfo`.
    fn can_handle(&self, event_type: &EventType) -> bool {
        self.handled_events().contains(event_type)
    }
    
    /// Called before event execution (optional hook).
    /// 
    /// Can be used for validation, logging, or setup.
    #[allow(unused_variables)]
    async fn before_execute(&self, event: &Event) -> Result<()> {
        Ok(())
    }
    
    /// Called after successful event execution (optional hook).
    /// 
    /// Can be used for cleanup, notifications, or metrics.
    #[allow(unused_variables)]
    async fn after_execute(&self, event: &Event) -> Result<()> {
        Ok(())
    }
}

pub struct ModuleExecutorRegistry {
    executors: Vec<Box<dyn ModuleExecutor>>,
}

impl ModuleExecutorRegistry {
    pub fn new() -> Self {
        Self {
            executors: Vec::new(),
        }
    }

    pub fn register(&mut self, executor: Box<dyn ModuleExecutor>) {
        self.executors.push(executor);
    }

    /// Execute all modules that can handle the given event
    pub async fn execute_for_event(&self, event: &Event) -> Result<()> {
        let mut handled = false;
        
        for executor in &self.executors {
            if executor.can_handle(&event.event_type) {
                tracing::info!(
                    "Executing module for event {} (type: {:?})",
                    event.id,
                    event.event_type
                );
                
                executor.execute(event).await?;
                handled = true;
            }
        }

        if !handled {
            tracing::debug!(
                "No executor found for event type {:?}",
                event.event_type
            );
        }

        Ok(())
    }
}

/// GitHub Integration Module Executor
pub struct GitHubIntegrationExecutor {
    pool: PgPool,
    #[allow(dead_code)]
    core_api_url: String,
}

impl GitHubIntegrationExecutor {
    pub fn new(pool: PgPool, core_api_url: String) -> Self {
        Self {
            pool,
            core_api_url,
        }
    }
}

impl ModuleInfo for GitHubIntegrationExecutor {
    fn slug(&self) -> &'static str {
        "github-sync"
    }

    fn name(&self) -> &'static str {
        "GitHub Integration"
    }

    fn version(&self) -> &'static str {
        "1.0.0"
    }

    fn description(&self) -> &'static str {
        "Syncs GitHub repositories and profile data to generate portfolio content"
    }

    fn handled_events(&self) -> Vec<EventType> {
        vec![
            EventType::UserIntegrationAdded,
            EventType::ModuleActivated,
            EventType::GitHubSyncRequested,
        ]
    }

    fn category(&self) -> &'static str {
        "integration"
    }

    fn config_schema(&self) -> Option<ConfigSchema> {
        use asap_core_domain::{
            ConfigField, ConfigAction, ConfigSection, 
            DataDisplay, DataDisplayField, FieldValidation,
        };

        Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::text("github_username", "Nom d'utilisateur GitHub")
                    .with_description("Votre nom d'utilisateur GitHub pour synchroniser vos projets")
                    .with_placeholder("ex: octocat")
                    .required(),
                ConfigField::boolean("auto_sync", "Synchronisation automatique")
                    .with_description("Synchroniser automatiquement vos projets toutes les 24h")
                    .with_default(false),
                ConfigField::boolean("include_forks", "Inclure les forks")
                    .with_description("Inclure les repositories forkés dans la liste")
                    .with_default(false),
                ConfigField::number("max_repos", "Nombre maximum de repos")
                    .with_description("Limite du nombre de projets à afficher")
                    .with_default(10)
                    .with_validation(FieldValidation {
                        min: Some(1),
                        max: Some(50),
                        ..Default::default()
                    }),
            ])
            .with_actions(vec![
                ConfigAction::post("sync", "Synchroniser maintenant", "/sync")
                    .with_description("Récupérer les dernières données depuis GitHub")
                    .primary()
                    .refresh_after(),
            ])
            .with_data_display(vec![
                DataDisplay::list("projects")
                    .with_title("Projets synchronisés")
                    .with_empty_message("Aucun projet synchronisé. Configurez votre nom d'utilisateur GitHub et lancez une synchronisation.")
                    .with_fields(vec![
                        DataDisplayField::link("name", "Nom", "url"),
                        DataDisplayField::text("description", "Description"),
                        DataDisplayField::badge("language", "Langage"),
                        DataDisplayField::number("stars", "Stars"),
                        DataDisplayField::number("forks", "Forks"),
                    ]),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "github_config",
                    "Configuration GitHub",
                    vec!["github_username", "auto_sync", "include_forks", "max_repos"]
                ).with_description("Connectez votre compte GitHub pour synchroniser vos projets"),
            ]))
    }

    fn default_settings(&self) -> serde_json::Value {
        serde_json::json!({
            "github_username": "",
            "auto_sync": false,
            "include_forks": false,
            "max_repos": 10
        })
    }
}

#[async_trait::async_trait]
impl ModuleExecutor for GitHubIntegrationExecutor {

    async fn execute(&self, event: &Event) -> Result<()> {
        tracing::info!("Processing GitHub integration for event {}", event.id);

        // For GitHubSyncRequested, we always process it
        if event.event_type != EventType::GitHubSyncRequested {
            // Check if this is a GitHub integration event
            let integration_type = event.payload.get("integration_type")
                .and_then(|v| v.as_str());
            
            if integration_type != Some("github") {
                tracing::debug!("Skipping non-GitHub integration event");
                return Ok(());
            }
        }

        // Extract GitHub username - try different sources depending on event type
        let github_username = if event.event_type == EventType::GitHubSyncRequested {
            // For sync requests, first check payload, then fetch from tenant_modules settings
            let from_payload = event.payload["github_username"]
                .as_str()
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());
            
            match from_payload {
                Some(username) => username,
                None => {
                    // Fetch from tenant_modules settings
                    let settings: Option<(serde_json::Value,)> = sqlx::query_as(
                        r#"
                        SELECT tm.settings 
                        FROM tenant_modules tm
                        JOIN modules m ON tm.module_id = m.id
                        WHERE tm.tenant_id = $1 AND m.slug = 'github-sync'
                        "#
                    )
                    .bind(event.tenant_id)
                    .fetch_optional(&self.pool)
                    .await?;

                    settings
                        .and_then(|(s,)| s.get("github_username").and_then(|v| v.as_str()).map(|s| s.to_string()))
                        .ok_or_else(|| anyhow::anyhow!("GitHub username not configured"))?
                }
            }
        } else {
            // For other events, get from payload
            event.payload["username"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("Missing username in event payload"))?
                .to_string()
        };

        // Extract user_id from the event payload (optional for sync requests)
        let user_id = event.payload["user_id"]
            .as_str()
            .or_else(|| event.payload["requested_by"].as_str())
            .unwrap_or("unknown");

        tracing::info!("Fetching GitHub repos for user: {} (user_id: {})", github_username, user_id);

        // Fetch repos from GitHub (using the github-generator module)
        let github_client = asap_github_generator::GitHubClient::new()?;
        
        // Fetch user profile, organizations and repos in parallel
        let (user_result, orgs_result, repos) = tokio::join!(
            github_client.fetch_user(&github_username),
            github_client.fetch_orgs(&github_username),
            github_client.fetch_repos(&github_username)
        );

        let repos = repos?;
        let user = user_result.ok();
        let orgs = orgs_result.ok();

        tracing::info!("Fetched {} repositories from GitHub", repos.len());

        // Generate website content from repos, user profile and orgs
        let website_content = asap_github_generator::generate_portfolio_content(repos, user, orgs).await?;

        tracing::debug!("Generated website content");

        // Find the user's website
        let website: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM websites WHERE tenant_id = $1 LIMIT 1"
        )
        .bind(event.tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        let website_id = match website {
            Some((id,)) => id,
            None => {
                return Err(anyhow::anyhow!(
                    "No website found for tenant {}",
                    event.tenant_id
                ));
            }
        };

        // Update website_data with the generated content
        sqlx::query(
            "UPDATE website_data SET data = data || $1 WHERE website_id = $2"
        )
        .bind(&website_content)
        .bind(website_id)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            "Successfully updated website {} with GitHub data",
            website_id
        );

        // Create a new event to indicate repos have been synced
        sqlx::query(
            "INSERT INTO events (id, tenant_id, event_type, payload) VALUES ($1, $2, 'GITHUB_REPOS_SYNCED', $3)"
        )
        .bind(uuid::Uuid::new_v4())
        .bind(event.tenant_id)
        .bind(serde_json::json!({
            "website_id": website_id,
            "repo_count": website_content["projects"].as_array().map(|a| a.len()).unwrap_or(0)
        }))
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

/// Website Module Executor - handles website-related events
/// 
/// NOTE: Prepared for handling website lifecycle events.
/// Will be fully integrated when website event processing is implemented.
#[allow(dead_code)]
pub struct WebsiteModuleExecutor {
    pool: PgPool,
}

#[allow(dead_code)]
impl WebsiteModuleExecutor {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl ModuleInfo for WebsiteModuleExecutor {
    fn slug(&self) -> &'static str {
        "website-lifecycle"
    }

    fn name(&self) -> &'static str {
        "Website Lifecycle"
    }

    fn version(&self) -> &'static str {
        "1.0.0"
    }

    fn description(&self) -> &'static str {
        "Handles website creation, publication, updates, and section management"
    }

    fn category(&self) -> &'static str {
        "system"
    }

    fn handled_events(&self) -> Vec<EventType> {
        vec![
            EventType::WebsiteCreated,
            EventType::WebsitePublished,
            EventType::WebsiteUpdated,
            EventType::WebsiteDeleted,
            EventType::SectionCreated,
            EventType::SectionUpdated,
            EventType::SectionDeleted,
            EventType::SectionReordered,
            EventType::PresetApplied,
        ]
    }

    // No config_schema - this is a system module, not user-configurable
}

#[async_trait::async_trait]
impl ModuleExecutor for WebsiteModuleExecutor {
    async fn execute(&self, event: &Event) -> Result<()> {
        match event.event_type {
            EventType::WebsiteCreated => {
                tracing::info!("Processing website creation for event {}", event.id);
                // Website creation logic - could trigger initial setup
            }
            EventType::WebsitePublished => {
                tracing::info!("Processing website publication for event {}", event.id);
                // Could trigger static site generation, CDN invalidation, etc.
                let website_id = event.payload["website_id"]
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("Missing website_id in event payload"))?;
                tracing::info!("Website {} was published", website_id);
            }
            EventType::WebsiteUpdated => {
                tracing::info!("Processing website update for event {}", event.id);
                // Could trigger re-rendering or cache invalidation
            }
            EventType::WebsiteDeleted => {
                tracing::info!("Processing website deletion for event {}", event.id);
                // Could trigger cleanup of associated resources
            }
            EventType::SectionCreated | EventType::SectionUpdated | EventType::SectionDeleted | EventType::SectionReordered => {
                tracing::info!("Processing section change for event {}", event.id);
                // Could trigger partial re-rendering
            }
            EventType::PresetApplied => {
                tracing::info!("Processing preset application for event {}", event.id);
                let website_id = event.payload["website_id"]
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("Missing website_id in event payload"))?;
                let preset_id = event.payload["preset_id"]
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("Missing preset_id in event payload"))?;
                tracing::info!("Preset {} applied to website {}", preset_id, website_id);
            }
            _ => {
                tracing::debug!("Unhandled event type in WebsiteModuleExecutor: {:?}", event.event_type);
            }
        }
        Ok(())
    }
}
