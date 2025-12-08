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
        matches!(event_type, EventType::UserIntegrationAdded)
    }

    async fn execute(&self, event: &Event) -> Result<()> {
        tracing::info!("Processing GitHub integration for event {}", event.id);

        // Extract user_id from the event payload
        let user_id = event.payload["user_id"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing user_id in event payload"))?;

        tracing::debug!("Fetching GitHub username for user {}", user_id);

        // Fetch user data from the database to get GitHub username
        let user_data: (serde_json::Value,) = sqlx::query_as(
            "SELECT data FROM user_data WHERE user_id = $1"
        )
        .bind(uuid::Uuid::parse_str(user_id)?)
        .fetch_one(&self.pool)
        .await?;

        // Extract GitHub username from user data
        let github_username = user_data.0["integrations"]["github"]["username"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("GitHub username not found in user data"))?;

        tracing::info!("Fetching GitHub repos for user: {}", github_username);

        // Fetch repos from GitHub (using the github-generator module)
        let github_client = asap_github_generator::GitHubClient::new()?;
        let repos = github_client.fetch_repos(github_username).await?;

        tracing::info!("Fetched {} repositories from GitHub", repos.len());

        // Generate portfolio content from repos
        let portfolio_content = asap_github_generator::generate_portfolio_content(repos).await?;

        tracing::debug!("Generated portfolio content");

        // Find the user's portfolio
        let portfolio: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM portfolios WHERE tenant_id = $1 LIMIT 1"
        )
        .bind(event.tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        let portfolio_id = match portfolio {
            Some((id,)) => id,
            None => {
                return Err(anyhow::anyhow!(
                    "No portfolio found for tenant {}",
                    event.tenant_id
                ));
            }
        };

        // Update portfolio_data with the generated content
        sqlx::query(
            "UPDATE portfolio_data SET data = data || $1 WHERE portfolio_id = $2"
        )
        .bind(&portfolio_content)
        .bind(portfolio_id)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            "Successfully updated portfolio {} with GitHub data",
            portfolio_id
        );

        // Create a new event to indicate repos have been synced
        sqlx::query(
            "INSERT INTO events (id, tenant_id, event_type, payload) VALUES ($1, $2, 'GITHUB_REPOS_SYNCED', $3)"
        )
        .bind(uuid::Uuid::new_v4())
        .bind(event.tenant_id)
        .bind(serde_json::json!({
            "portfolio_id": portfolio_id,
            "repo_count": portfolio_content["projects"].as_array().map(|a| a.len()).unwrap_or(0)
        }))
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
