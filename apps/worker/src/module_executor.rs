use anyhow::Result;
use asap_core_domain::events::{Event, EventType};
use sqlx::PgPool;

/// Trait for module executors
#[async_trait::async_trait]
pub trait ModuleExecutor: Send + Sync {
    /// Execute the module logic for the given event
    async fn execute(&self, event: &Event) -> Result<()>;
    
    /// Check if this executor can handle the given event type
    fn can_handle(&self, event_type: &EventType) -> bool;
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

#[async_trait::async_trait]
impl ModuleExecutor for GitHubIntegrationExecutor {
    fn can_handle(&self, event_type: &EventType) -> bool {
        matches!(event_type, EventType::UserIntegrationAdded | EventType::ModuleActivated)
    }

    async fn execute(&self, event: &Event) -> Result<()> {
        tracing::info!("Processing GitHub integration for event {}", event.id);

        // Check if this is a GitHub integration event
        let integration_type = event.payload.get("integration_type")
            .and_then(|v| v.as_str());
        
        if integration_type != Some("github") {
            tracing::debug!("Skipping non-GitHub integration event");
            return Ok(());
        }

        // Extract user_id from the event payload
        let user_id = event.payload["user_id"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing user_id in event payload"))?;

        // Extract GitHub username directly from event payload
        let github_username = event.payload["username"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing username in event payload"))?;

        tracing::info!("Fetching GitHub repos for user: {} (user_id: {})", github_username, user_id);

        // Fetch repos from GitHub (using the github-generator module)
        let github_client = asap_github_generator::GitHubClient::new()?;
        let repos = github_client.fetch_repos(github_username).await?;

        tracing::info!("Fetched {} repositories from GitHub", repos.len());

        // Generate website content from repos
        let website_content = asap_github_generator::generate_portfolio_content(repos).await?;

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

#[async_trait::async_trait]
impl ModuleExecutor for WebsiteModuleExecutor {
    fn can_handle(&self, event_type: &EventType) -> bool {
        matches!(
            event_type,
            EventType::WebsiteCreated |
            EventType::WebsitePublished |
            EventType::WebsiteUpdated |
            EventType::WebsiteDeleted |
            EventType::SectionCreated |
            EventType::SectionUpdated |
            EventType::SectionDeleted |
            EventType::SectionReordered |
            EventType::PresetApplied
        )
    }

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
