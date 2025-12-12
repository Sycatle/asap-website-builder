use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod event_processor;
mod module_executor;
mod file_cleanup;
mod parallel_processor;
mod registry;
mod payment_reconciliation;

use config::Config;
use event_processor::EventProcessor;
use registry::{ModuleRegistryConfig, register_all_modules};
use file_cleanup::FileCleanupTask;
use parallel_processor::{ParallelProcessorConfig, process_events_parallel};
use payment_reconciliation::PaymentReconciliation;
use std::sync::Arc;

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

    // Check for CLI commands
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && args[1] == "payments:reconcile" {
        return run_payment_reconciliation().await;
    }

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
    let event_processor = Arc::new(EventProcessor::new(pool.clone()));

    // Create module executor registry using centralized registration
    let registry_config = ModuleRegistryConfig::new(
        pool.clone(),
        config.core_api_url.clone(),
    );
    let registry = Arc::new(register_all_modules(registry_config)?);

    // Create file cleanup task
    let cleanup_task = FileCleanupTask::new(pool.clone());

    // Start file cleanup task in background
    let _cleanup_handle = tokio::spawn(async move {
        cleanup_task.start().await;
    });

    // Create payment reconciliation task
    let _reconciliation = match PaymentReconciliation::new(pool.clone()) {
        Ok(recon) => {
            let recon_arc = Arc::new(recon);
            // Start daily reconciliation task (every 24 hours)
            let recon_clone = recon_arc.clone();
            tokio::spawn(async move {
                recon_clone.start_background_task(24).await;
            });
            tracing::info!("Payment reconciliation task started (runs every 24h)");
            Some(recon_arc)
        }
        Err(e) => {
            tracing::warn!("Failed to initialize payment reconciliation: {}. Continuing without it.", e);
            None
        }
    };

    // Configure parallel event processing
    let parallel_config = ParallelProcessorConfig::default();
    tracing::info!(
        "Parallel event processing enabled with max {} concurrent tasks",
        parallel_config.max_concurrency
    );

    // Main event loop
    let polling_interval = std::time::Duration::from_secs(config.polling_interval_secs);
    
    loop {
        tracing::debug!("Polling for unprocessed events...");
        
        match process_events_parallel_wrapper(&event_processor, &registry, &parallel_config).await {
            Ok(stats) => {
                if stats.total_events > 0 {
                    tracing::info!(
                        "Processed {} events: {} successful, {} failed in {}ms",
                        stats.total_events,
                        stats.successful,
                        stats.failed,
                        stats.duration_ms
                    );
                }
            }
            Err(e) => {
                tracing::error!("Error processing events: {}", e);
            }
        }

        tokio::time::sleep(polling_interval).await;
    }
}

async fn process_events_parallel_wrapper(
    event_processor: &Arc<EventProcessor>,
    registry: &Arc<module_executor::ModuleExecutorRegistry>,
    config: &ParallelProcessorConfig,
) -> anyhow::Result<parallel_processor::ProcessingStats> {
    // Fetch unprocessed events
    let events = event_processor.fetch_unprocessed_events().await?;
    
    if events.is_empty() {
        return Ok(parallel_processor::ProcessingStats::default());
    }

    // Process events in parallel
    process_events_parallel(
        event_processor.clone(),
        registry.clone(),
        events,
        config.clone(),
    )
    .await
}

/// Run payment reconciliation command
async fn run_payment_reconciliation() -> anyhow::Result<()> {
    tracing::info!("Running payment reconciliation command");

    // Load configuration
    let config = Config::from_env()?;
    
    // Create database pool
    let pool = db::create_pool(&config.database_url).await?;
    
    // Create reconciliation service
    let reconciliation = PaymentReconciliation::new(pool)?;
    
    // Run reconciliation
    let stats = reconciliation.reconcile_all().await?;
    
    println!("Payment reconciliation completed:");
    println!("  Total accounts: {}", stats.total_tenants);
    println!("  Successful: {}", stats.successful);
    println!("  Failed: {}", stats.failed);
    
    Ok(())
}
