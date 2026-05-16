use anyhow::Result;
use asap_core_domain::events::{Event, EventType};
use asap_core_domain::ConfigSchema;
use sqlx::PgPool;

// ============================================================================
// Extension Info Trait - Metadata about an extension
// ============================================================================

/// Trait providing metadata about an extension executor.
///
/// This trait should be implemented alongside `ExtensionExecutor` to provide
/// information for logging, debugging, and extension discovery.
///
/// The `config_schema()` method returns the UI schema for configuration,
/// which is defined in code (not in the database) to ensure:
/// - Type safety at compile time
/// - Co-location with extension logic
/// - Automatic versioning with the extension
#[allow(dead_code)]
pub trait ExtensionInfo {
    /// The unique slug identifier for this extension (e.g., "github-sync")
    fn slug(&self) -> &'static str;

    /// Human-readable name of the extension
    fn name(&self) -> &'static str;

    /// Semantic version of the extension (e.g., "1.0.0")
    fn version(&self) -> &'static str;

    /// Brief description of what the extension does
    fn description(&self) -> &'static str;

    /// Extension category for grouping in UI
    fn category(&self) -> &'static str {
        "other"
    }

    /// List of event types this extension handles
    fn handled_events(&self) -> Vec<EventType>;

    /// Configuration schema for the extension UI
    ///
    /// This defines the fields, actions, and data displays for the extension
    /// configuration page. Returns None if the extension has no configuration.
    fn config_schema(&self) -> Option<ConfigSchema> {
        None
    }

    /// Default settings for when the extension is first activated
    fn default_settings(&self) -> serde_json::Value {
        serde_json::json!({})
    }
}

// ============================================================================
// Extension Executor Trait - Core execution logic
// ============================================================================

/// Trait for extension executors that process events.
///
/// Implementors should also implement `ExtensionInfo` for metadata.
#[async_trait::async_trait]
#[allow(dead_code)]
pub trait ExtensionExecutor: ExtensionInfo + Send + Sync {
    /// Execute the extension logic for the given event.
    ///
    /// This method is called when an event matching `can_handle` is received.
    /// It should be idempotent when possible to handle retries gracefully.
    async fn execute(&self, event: &Event) -> Result<()>;

    /// Check if this executor can handle the given event type.
    ///
    /// Default implementation uses `handled_events()` from `ExtensionInfo`.
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

pub struct ExtensionExecutorRegistry {
    executors: Vec<Box<dyn ExtensionExecutor>>,
}

impl ExtensionExecutorRegistry {
    pub fn new() -> Self {
        Self {
            executors: Vec::new(),
        }
    }

    pub fn register(&mut self, executor: Box<dyn ExtensionExecutor>) {
        self.executors.push(executor);
    }

    /// Execute all extensions that can handle the given event
    pub async fn execute_for_event(&self, event: &Event) -> Result<()> {
        let mut handled = false;

        for executor in &self.executors {
            if executor.can_handle(&event.event_type) {
                tracing::info!(
                    "Executing extension for event {} (type: {:?})",
                    event.id,
                    event.event_type
                );

                executor.execute(event).await?;
                handled = true;
            }
        }

        if !handled {
            tracing::debug!("No executor found for event type {:?}", event.event_type);
        }

        Ok(())
    }
}

/// Github Sync Extension Executor
pub struct GitHubIntegrationExecutor {
    pool: PgPool,
    #[allow(dead_code)]
    core_api_url: String,
    /// Reusable HTTP client for GitHub API (avoids TLS/connection overhead per request)
    github_client: asap_github_sync::GitHubClient,
}

impl GitHubIntegrationExecutor {
    pub fn new(pool: PgPool, core_api_url: String) -> Result<Self> {
        Ok(Self {
            pool,
            core_api_url,
            github_client: asap_github_sync::GitHubClient::new()?,
        })
    }
}

impl ExtensionInfo for GitHubIntegrationExecutor {
    fn slug(&self) -> &'static str {
        "github-sync"
    }

    fn name(&self) -> &'static str {
        "Github Sync"
    }

    fn version(&self) -> &'static str {
        "1.0.0"
    }

    fn description(&self) -> &'static str {
        "Syncs GitHub repositories and profile data to generate website content"
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
            ConfigAction, ConfigField, ConfigSection, DataDisplay, DataDisplayField,
            FieldValidation,
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
impl ExtensionExecutor for GitHubIntegrationExecutor {
    async fn execute(&self, event: &Event) -> Result<()> {
        tracing::info!("Processing GitHub integration for event {}", event.id);

        // For GitHubSyncRequested, we always process it
        if event.event_type != EventType::GitHubSyncRequested {
            // Check if this is a GitHub integration event
            let integration_type = event
                .payload
                .get("integration_type")
                .and_then(|v| v.as_str());

            if integration_type != Some("github") {
                tracing::debug!("Skipping non-GitHub integration event");
                return Ok(());
            }
        }

        // Extract GitHub username - try different sources depending on event type
        let github_username = if event.event_type == EventType::GitHubSyncRequested {
            // For sync requests, first check payload, then fetch from module_configs settings
            let from_payload = event.payload["github_username"]
                .as_str()
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());

            match from_payload {
                Some(username) => username,
                None => {
                    // Fetch from module_configs settings
                    let settings: Option<(serde_json::Value,)> = sqlx::query_as(
                        r#"
                        SELECT mc.config 
                        FROM module_configs mc
                        JOIN extensions m ON mc.module_id = m.id
                        WHERE mc.account_id = $1 AND m.slug = 'github-sync'
                        "#,
                    )
                    .bind(event.account_id)
                    .fetch_optional(&self.pool)
                    .await?;

                    settings
                        .and_then(|(s,)| {
                            s.get("github_username")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                        })
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

        // Extract account_id from the event payload (optional for sync requests)
        let account_id = event.payload["account_id"]
            .as_str()
            .or_else(|| event.payload["requested_by"].as_str())
            .unwrap_or("unknown");

        tracing::info!(
            "Fetching GitHub repos for account: {} (account_id: {})",
            github_username,
            account_id
        );

        // Fetch repos from GitHub (using the github-sync extension)
        // Reuse the stored client to avoid TLS/connection overhead

        // Fetch all data in parallel for efficiency
        let (
            user_result,
            orgs_result,
            repos,
            events_result,
            gists_result,
            starred_result,
            readme_result,
            contributions_result,
        ) = tokio::join!(
            self.github_client.fetch_user(&github_username),
            self.github_client.fetch_orgs(&github_username),
            self.github_client.fetch_repos(&github_username),
            self.github_client.fetch_events(&github_username),
            self.github_client.fetch_gists(&github_username),
            self.github_client.fetch_starred(&github_username, 50), // Limit to 50 starred repos
            self.github_client.fetch_profile_readme(&github_username),
            self.github_client.fetch_contributions(&github_username)
        );

        let repos = repos?;
        let user = user_result.ok();
        let orgs = orgs_result.unwrap_or_default();
        let events = events_result.unwrap_or_default();
        let gists = gists_result.unwrap_or_default();
        let starred = starred_result.unwrap_or_default();
        let profile_readme = readme_result.unwrap_or(None);
        let contributions = contributions_result.ok();

        tracing::info!(
            "Fetched GitHub data: {} repos, {} events, {} orgs, {} gists, {} starred",
            repos.len(),
            events.len(),
            orgs.len(),
            gists.len(),
            starred.len()
        );

        // Generate website content from repos, user profile and orgs
        let website_content = asap_github_sync::generate_website_content(
            repos.clone(),
            user.clone(),
            Some(orgs.clone()),
        )
        .await?;

        tracing::debug!("Generated website content");

        // Find the user's website (try from payload first, then fallback)
        let website_id = if let Some(website_id_str) =
            event.payload.get("website_id").and_then(|v| v.as_str())
        {
            uuid::Uuid::parse_str(website_id_str)?
        } else {
            let website: Option<(uuid::Uuid,)> =
                sqlx::query_as("SELECT id FROM websites WHERE account_id = $1 LIMIT 1")
                    .bind(event.account_id)
                    .fetch_optional(&self.pool)
                    .await?;

            match website {
                Some((id,)) => id,
                None => {
                    return Err(anyhow::anyhow!(
                        "No website found for account {}",
                        event.account_id
                    ));
                }
            }
        };

        // Save to website_data (legacy support)
        sqlx::query("UPDATE website_data SET data = data || $1 WHERE website_id = $2")
            .bind(&website_content)
            .bind(website_id)
            .execute(&self.pool)
            .await?;

        // Create repos collection using the github-sync extension helpers
        let repos_collection =
            asap_github_sync::create_github_repos_collection(website_id, &repos, &github_username);

        // Upsert the repos collection into database
        sqlx::query(
            r#"
            INSERT INTO website_collections 
                (id, website_id, collection_slug, items, source_extension, source_version, total_count, sync_status, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (website_id, collection_slug) 
            DO UPDATE SET 
                items = EXCLUDED.items,
                source_version = EXCLUDED.source_version,
                total_count = EXCLUDED.total_count,
                sync_status = EXCLUDED.sync_status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(repos_collection.id)
        .bind(repos_collection.website_id)
        .bind(&repos_collection.collection_slug)
        .bind(serde_json::to_value(&repos_collection.items)?)
        .bind(&repos_collection.source_extension)
        .bind(&repos_collection.source_version)
        .bind(repos_collection.total_count)
        .bind("idle")
        .bind(repos_collection.synced_at)
        .bind(repos_collection.created_at)
        .bind(repos_collection.updated_at)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            "Saved github_repos collection with {} items",
            repos_collection.total_count
        );

        // Create languages collection
        let languages_collection =
            asap_github_sync::create_github_languages_collection(website_id, &repos);

        // Upsert the languages collection into database
        sqlx::query(
            r#"
            INSERT INTO website_collections 
                (id, website_id, collection_slug, items, source_extension, source_version, total_count, sync_status, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (website_id, collection_slug) 
            DO UPDATE SET 
                items = EXCLUDED.items,
                source_version = EXCLUDED.source_version,
                total_count = EXCLUDED.total_count,
                sync_status = EXCLUDED.sync_status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(languages_collection.id)
        .bind(languages_collection.website_id)
        .bind(&languages_collection.collection_slug)
        .bind(serde_json::to_value(&languages_collection.items)?)
        .bind(&languages_collection.source_extension)
        .bind(&languages_collection.source_version)
        .bind(languages_collection.total_count)
        .bind("idle")
        .bind(languages_collection.synced_at)
        .bind(languages_collection.created_at)
        .bind(languages_collection.updated_at)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            "Saved github_languages collection with {} items",
            languages_collection.total_count
        );

        // Create gists collection
        let gists_collection = asap_github_sync::create_github_gists_collection(website_id, &gists);
        sqlx::query(
            r#"
            INSERT INTO website_collections 
                (id, website_id, collection_slug, items, source_extension, source_version, total_count, sync_status, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (website_id, collection_slug) 
            DO UPDATE SET 
                items = EXCLUDED.items,
                source_version = EXCLUDED.source_version,
                total_count = EXCLUDED.total_count,
                sync_status = EXCLUDED.sync_status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(gists_collection.id)
        .bind(gists_collection.website_id)
        .bind(&gists_collection.collection_slug)
        .bind(serde_json::to_value(&gists_collection.items)?)
        .bind(&gists_collection.source_extension)
        .bind(&gists_collection.source_version)
        .bind(gists_collection.total_count)
        .bind("idle")
        .bind(gists_collection.synced_at)
        .bind(gists_collection.created_at)
        .bind(gists_collection.updated_at)
        .execute(&self.pool)
        .await?;
        tracing::info!(
            "Saved github_gists collection with {} items",
            gists_collection.total_count
        );

        // Create organizations collection
        let orgs_collection = asap_github_sync::create_github_orgs_collection(website_id, &orgs);
        sqlx::query(
            r#"
            INSERT INTO website_collections 
                (id, website_id, collection_slug, items, source_extension, source_version, total_count, sync_status, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (website_id, collection_slug) 
            DO UPDATE SET 
                items = EXCLUDED.items,
                source_version = EXCLUDED.source_version,
                total_count = EXCLUDED.total_count,
                sync_status = EXCLUDED.sync_status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(orgs_collection.id)
        .bind(orgs_collection.website_id)
        .bind(&orgs_collection.collection_slug)
        .bind(serde_json::to_value(&orgs_collection.items)?)
        .bind(&orgs_collection.source_extension)
        .bind(&orgs_collection.source_version)
        .bind(orgs_collection.total_count)
        .bind("idle")
        .bind(orgs_collection.synced_at)
        .bind(orgs_collection.created_at)
        .bind(orgs_collection.updated_at)
        .execute(&self.pool)
        .await?;
        tracing::info!(
            "Saved github_organizations collection with {} items",
            orgs_collection.total_count
        );

        // Create starred repos collection
        let starred_collection =
            asap_github_sync::create_github_starred_collection(website_id, &starred);
        sqlx::query(
            r#"
            INSERT INTO website_collections 
                (id, website_id, collection_slug, items, source_extension, source_version, total_count, sync_status, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (website_id, collection_slug) 
            DO UPDATE SET 
                items = EXCLUDED.items,
                source_version = EXCLUDED.source_version,
                total_count = EXCLUDED.total_count,
                sync_status = EXCLUDED.sync_status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(starred_collection.id)
        .bind(starred_collection.website_id)
        .bind(&starred_collection.collection_slug)
        .bind(serde_json::to_value(&starred_collection.items)?)
        .bind(&starred_collection.source_extension)
        .bind(&starred_collection.source_version)
        .bind(starred_collection.total_count)
        .bind("idle")
        .bind(starred_collection.synced_at)
        .bind(starred_collection.created_at)
        .bind(starred_collection.updated_at)
        .execute(&self.pool)
        .await?;
        tracing::info!(
            "Saved github_starred collection with {} items",
            starred_collection.total_count
        );

        // Compute and save repo-based variables
        let repo_variables = asap_github_sync::compute_github_variables(&repos);
        let now = chrono::Utc::now();

        for (key, value) in &repo_variables {
            sqlx::query(
                r#"
                INSERT INTO website_variables 
                    (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (website_id, key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    source_ref = EXCLUDED.source_ref,
                    stale = EXCLUDED.stale,
                    updated_at = EXCLUDED.updated_at
                "#
            )
            .bind(uuid::Uuid::new_v4())
            .bind(website_id)
            .bind(key)
            .bind(value)
            .bind(if value.is_number() { "number" } else { "string" })
            .bind("extension")
            .bind("github-sync")
            .bind(false)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await?;
        }

        // Save profile variables using compute_profile_variables
        if let Some(ref user_data) = user {
            // Save complete profile as JSON
            let profile_value = serde_json::json!({
                "username": user_data["login"].as_str().unwrap_or(""),
                "name": user_data["name"].as_str(),
                "avatar_url": user_data["avatar_url"].as_str().unwrap_or(""),
                "gravatar_id": user_data["gravatar_id"].as_str(),
                "bio": user_data["bio"].as_str(),
                "company": user_data["company"].as_str(),
                "location": user_data["location"].as_str(),
                "blog": user_data["blog"].as_str(),
                "twitter": user_data["twitter_username"].as_str(),
                "email": user_data["email"].as_str(),
                "hireable": user_data["hireable"].as_bool(),
                "public_repos": user_data["public_repos"].as_u64().unwrap_or(0),
                "public_gists": user_data["public_gists"].as_u64().unwrap_or(0),
                "followers": user_data["followers"].as_u64().unwrap_or(0),
                "following": user_data["following"].as_u64().unwrap_or(0),
                "url": user_data["html_url"].as_str().unwrap_or(""),
                "created_at": user_data["created_at"].as_str(),
                "updated_at": user_data["updated_at"].as_str(),
            });

            sqlx::query(
                r#"
                INSERT INTO website_variables 
                    (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (website_id, key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    source_ref = EXCLUDED.source_ref,
                    stale = EXCLUDED.stale,
                    updated_at = EXCLUDED.updated_at
                "#
            )
            .bind(uuid::Uuid::new_v4())
            .bind(website_id)
            .bind("github_profile")
            .bind(&profile_value)
            .bind("json")
            .bind("extension")
            .bind("github-sync")
            .bind(false)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await?;

            // Save individual profile variables for easy access in templates
            let profile_variables = asap_github_sync::compute_profile_variables(user_data);
            for (key, value) in &profile_variables {
                let value_type = if value.is_number() {
                    "number"
                } else if value.is_boolean() {
                    "boolean"
                } else {
                    "string"
                };

                sqlx::query(
                    r#"
                    INSERT INTO website_variables 
                        (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (website_id, key) 
                    DO UPDATE SET 
                        value = EXCLUDED.value,
                        source_ref = EXCLUDED.source_ref,
                        stale = EXCLUDED.stale,
                        updated_at = EXCLUDED.updated_at
                    "#
                )
                .bind(uuid::Uuid::new_v4())
                .bind(website_id)
                .bind(key)
                .bind(value)
                .bind(value_type)
                .bind("extension")
                .bind("github-sync")
                .bind(false)
                .bind(now)
                .bind(now)
                .execute(&self.pool)
                .await?;
            }

            tracing::info!("Saved {} profile variables", profile_variables.len());
        }

        // Use fetched contributions from GitHub profile page, fallback to events-based calculation
        let contributions_data = if let Some(contrib) = contributions {
            let total = contrib.get("total").and_then(|t| t.as_i64()).unwrap_or(0);
            tracing::info!(
                "Using scraped contributions from GitHub profile ({} total)",
                total
            );
            contrib
        } else {
            tracing::info!("Falling back to events-based contributions");
            asap_github_sync::compute_contributions_from_events(&events)
        };
        sqlx::query(
            r#"
            INSERT INTO website_variables 
                (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (website_id, key) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                source_ref = EXCLUDED.source_ref,
                stale = EXCLUDED.stale,
                updated_at = EXCLUDED.updated_at
            "#
        )
        .bind(uuid::Uuid::new_v4())
        .bind(website_id)
        .bind("github_contributions")
        .bind(&contributions_data)
        .bind("json")
        .bind("extension")
        .bind("github-sync")
        .bind(false)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        // Save profile README if available
        if let Some(readme_content) = profile_readme {
            sqlx::query(
                r#"
                INSERT INTO website_variables 
                    (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (website_id, key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    source_ref = EXCLUDED.source_ref,
                    stale = EXCLUDED.stale,
                    updated_at = EXCLUDED.updated_at
                "#
            )
            .bind(uuid::Uuid::new_v4())
            .bind(website_id)
            .bind("github_profile_readme")
            .bind(serde_json::json!(readme_content))
            .bind("string")
            .bind("extension")
            .bind("github-sync")
            .bind(false)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await?;
            tracing::info!("Saved profile README ({} chars)", readme_content.len());
        }

        // Save count variables for collections
        let extra_vars = vec![
            ("github_gists_count", serde_json::json!(gists.len())),
            ("github_organizations_count", serde_json::json!(orgs.len())),
            ("github_starred_count", serde_json::json!(starred.len())),
        ];

        for (key, value) in extra_vars {
            sqlx::query(
                r#"
                INSERT INTO website_variables 
                    (id, website_id, key, value, value_type, source, source_ref, stale, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (website_id, key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    source_ref = EXCLUDED.source_ref,
                    stale = EXCLUDED.stale,
                    updated_at = EXCLUDED.updated_at
                "#
            )
            .bind(uuid::Uuid::new_v4())
            .bind(website_id)
            .bind(key)
            .bind(&value)
            .bind("number")
            .bind("extension")
            .bind("github-sync")
            .bind(false)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await?;
        }

        tracing::info!(
            "Saved GitHub data: {} repo variables, {} contributions, 5 collections",
            repo_variables.len(),
            contributions_data["total"].as_i64().unwrap_or(0)
        );

        tracing::info!(
            "Successfully updated website {} with GitHub data",
            website_id
        );

        // Create a new event to indicate repos have been synced
        sqlx::query(
            "INSERT INTO events (id, account_id, event_type, payload) VALUES ($1, $2, 'GITHUB_REPOS_SYNCED', $3)"
        )
        .bind(uuid::Uuid::new_v4())
        .bind(event.account_id)
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
pub struct WebsiteExtensionExecutor {
    pool: PgPool,
}

#[allow(dead_code)]
impl WebsiteExtensionExecutor {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl ExtensionInfo for WebsiteExtensionExecutor {
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
        "Handles website creation, publication, updates, and element management"
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
            EventType::ElementCreated,
            EventType::ElementUpdated,
            EventType::ElementDeleted,
            EventType::ElementReordered,
            EventType::PresetApplied,
        ]
    }

    // No config_schema - this is a system module, not user-configurable
}

#[async_trait::async_trait]
impl ExtensionExecutor for WebsiteExtensionExecutor {
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
            EventType::ElementCreated
            | EventType::ElementUpdated
            | EventType::ElementDeleted
            | EventType::ElementReordered => {
                tracing::info!("Processing element change for event {}", event.id);
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
                tracing::debug!(
                    "Unhandled event type in WebsiteExtensionExecutor: {:?}",
                    event.event_type
                );
            }
        }
        Ok(())
    }
}
