use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod event_processor;
mod module_executor;
mod file_cleanup;

use config::Config;
use event_processor::EventProcessor;
use module_executor::{ModuleExecutorRegistry, GitHubIntegrationExecutor};
use file_cleanup::FileCleanupTask;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "asap_worker=debug,asap_github_generator=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ASAP Worker");

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded successfully");

    // Create database pool
    let pool = db::create_pool(&config.database_url).await?;
    tracing::info!("Database pool created");

    // Check database health
    db::health_check(&pool).await?;
    tracing::info!("Database health check passed");

    // Create event processor
    let event_processor = EventProcessor::new(pool.clone());

    // Create module executor registry
    let mut registry = ModuleExecutorRegistry::new();
    
    // Register GitHub integration executor
    registry.register(Box::new(GitHubIntegrationExecutor::new(
        pool.clone(),
        config.core_api_url.clone(),
    )));

    tracing::info!("Module executors registered");

    // Create file cleanup task
    let cleanup_task = FileCleanupTask::new(pool.clone());

    // Start file cleanup task in background
    let cleanup_handle = tokio::spawn(async move {
        cleanup_task.start().await;
    });

    // Main event loop
    let polling_interval = std::time::Duration::from_secs(config.polling_interval_secs);
    
    loop {
        tracing::debug!("Polling for unprocessed events...");
        
        match process_events(&event_processor, &registry).await {
            Ok(count) => {
                if count > 0 {
                    tracing::info!("Processed {} events", count);
                }
            }
            Err(e) => {
                tracing::error!("Error processing events: {}", e);
            }
        }

        tokio::time::sleep(polling_interval).await;
    }
}

async fn process_events(
    event_processor: &EventProcessor,
    registry: &ModuleExecutorRegistry,
) -> anyhow::Result<usize> {
    // Fetch unprocessed events
    let events = event_processor.fetch_unprocessed_events().await?;
    let count = events.len();

    for event in events {
        tracing::info!(
            "Processing event {} (type: {:?})",
            event.id,
            event.event_type
        );

        match registry.execute_for_event(&event).await {
            Ok(_) => {
                event_processor.mark_processed(event.id).await?;
                tracing::info!("Event {} processed successfully", event.id);
            }
            Err(e) => {
                tracing::error!("Error executing event {}: {}", event.id, e);
                event_processor.mark_failed(event.id, &e.to_string()).await?;
            }
        }
    }

    Ok(count)
}
