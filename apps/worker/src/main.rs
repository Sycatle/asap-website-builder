use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod event_processor;
mod extension_executor;
mod file_cleanup;
mod notification_publisher;
mod parallel_processor;
mod payment_reconciliation;
mod registry;
mod web_push;

use config::Config;
use event_processor::EventProcessor;
use file_cleanup::FileCleanupTask;
use notification_publisher::WorkerNotificationPublisher;
use parallel_processor::{process_events_parallel, ParallelProcessorConfig};
use payment_reconciliation::PaymentReconciliation;
use registry::{register_all_modules, ModuleRegistryConfig};
use std::sync::Arc;
use web_push::WebPushSender;

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
    let registry_config = ModuleRegistryConfig::new(pool.clone(), config.core_api_url.clone());
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
            tracing::warn!(
                "Failed to initialize payment reconciliation: {}. Continuing without it.",
                e
            );
            None
        }
    };

    // Configure parallel event processing
    let parallel_config = ParallelProcessorConfig::default();
    tracing::info!(
        "Parallel event processing enabled with max {} concurrent tasks",
        parallel_config.max_concurrency
    );

    // Initialize Redis notification publisher
    let notification_publisher = match std::env::var("REDIS_URL") {
        Ok(redis_url) => {
            match WorkerNotificationPublisher::new(&redis_url).await {
                Ok(publisher) => {
                    tracing::info!("Redis notification publisher initialized");
                    Some(publisher)
                }
                Err(e) => {
                    tracing::warn!("Failed to initialize Redis publisher: {}. Real-time notifications disabled.", e);
                    None
                }
            }
        }
        Err(_) => {
            tracing::warn!("REDIS_URL not set. Real-time notifications disabled.");
            None
        }
    };

    // Initialize Web Push sender for PWA notifications
    let web_push_sender = match WebPushSender::load_vapid_keys(&pool).await {
        Ok(vapid_keys) => {
            match WebPushSender::new(vapid_keys) {
                Ok(sender) => {
                    tracing::info!("Web Push sender initialized");
                    Some(Arc::new(sender))
                }
                Err(e) => {
                    tracing::warn!("Failed to initialize Web Push sender: {}. PWA push notifications disabled.", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!(
                "VAPID keys not available: {}. PWA push notifications disabled.",
                e
            );
            None
        }
    };

    // Notification queue processing interval (every 10 seconds)
    let notification_queue_interval = std::time::Duration::from_secs(10);
    let mut last_notification_queue_process = std::time::Instant::now();
    let mut last_notification_check = chrono::Utc::now();

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

        // Process notification queue periodically
        if last_notification_queue_process.elapsed() >= notification_queue_interval {
            tracing::debug!("Processing notification queue...");

            // Remember when we started processing
            let process_start = chrono::Utc::now();

            match process_notification_queue_task(&pool).await {
                Ok((processed, created)) => {
                    if created > 0 {
                        tracing::info!(
                            "Notification queue: {} groups processed → {} notifications created",
                            processed,
                            created
                        );

                        // Get new notifications for both Redis pub/sub and Web Push
                        match notification_publisher::get_notifications_created_since(
                            &pool,
                            last_notification_check,
                        )
                        .await
                        {
                            Ok(new_notifications) => {
                                if !new_notifications.is_empty() {
                                    // Publish to Redis for WebSocket (real-time in-app)
                                    if let Some(ref publisher) = notification_publisher {
                                        match notification_publisher::publish_new_notifications(
                                            publisher,
                                            &pool,
                                            new_notifications.clone(),
                                        )
                                        .await
                                        {
                                            Ok(published) => {
                                                tracing::info!(
                                                    "Published {} notifications to Redis",
                                                    published
                                                );
                                            }
                                            Err(e) => {
                                                tracing::error!(
                                                    "Failed to publish notifications to Redis: {}",
                                                    e
                                                );
                                            }
                                        }
                                    }

                                    // Send Web Push notifications (for PWA background/closed)
                                    if let Some(ref push_sender) = web_push_sender {
                                        for notification in &new_notifications {
                                            // Check if push is enabled for this account
                                            let push_enabled = web_push::is_push_enabled(
                                                &pool,
                                                notification.account_id,
                                            )
                                            .await
                                            .unwrap_or(true);

                                            if !push_enabled {
                                                continue;
                                            }

                                            // Check if category is enabled
                                            let category_enabled = web_push::is_category_enabled(
                                                &pool,
                                                notification.account_id,
                                                &notification.category,
                                            )
                                            .await
                                            .unwrap_or(true);

                                            if !category_enabled {
                                                continue;
                                            }

                                            // Build push payload
                                            let payload = web_push::PushPayload {
                                                id: notification.id.to_string(),
                                                title: notification.title.clone(),
                                                body: notification.message.clone(),
                                                icon: notification.icon.clone(),
                                                image: None,
                                                tag: format!("asap-{}", notification.id),
                                                action_url: notification.action_url.clone(),
                                                category: notification.category.clone(),
                                                priority: notification.priority.clone(),
                                            };

                                            // Send to all devices for this account
                                            match push_sender
                                                .send_to_account(
                                                    &pool,
                                                    notification.account_id,
                                                    &payload,
                                                )
                                                .await
                                            {
                                                Ok(result) => {
                                                    if result.sent > 0 {
                                                        tracing::debug!(
                                                            "Sent push notification {} to {} devices for account {}",
                                                            notification.id,
                                                            result.sent,
                                                            notification.account_id
                                                        );
                                                    }
                                                }
                                                Err(e) => {
                                                    tracing::error!(
                                                        "Failed to send push notification {}: {}",
                                                        notification.id,
                                                        e
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::error!("Failed to fetch new notifications: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Error processing notification queue: {}", e);
                }
            }

            last_notification_queue_process = std::time::Instant::now();
            last_notification_check = process_start;
        }

        tokio::time::sleep(polling_interval).await;
    }
}

async fn process_events_parallel_wrapper(
    event_processor: &Arc<EventProcessor>,
    registry: &Arc<extension_executor::ExtensionExecutorRegistry>,
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
    println!("  Total accounts: {}", stats.total_accounts);
    println!("  Successful: {}", stats.successful);
    println!("  Failed: {}", stats.failed);

    Ok(())
}

/// Process notification queue - consolidate and create final notifications
async fn process_notification_queue_task(pool: &sqlx::PgPool) -> anyhow::Result<(i32, i32)> {
    // Consolidation window: 30 seconds
    let consolidation_window_seconds: i32 = 30;

    // Use query_as with a tuple instead of query! to avoid compile-time checking
    let result: (Option<i32>, Option<i32>) =
        sqlx::query_as("SELECT processed_count, created_count FROM process_notification_queue($1)")
            .bind(consolidation_window_seconds)
            .fetch_one(pool)
            .await?;

    let processed = result.0.unwrap_or(0);
    let created = result.1.unwrap_or(0);

    Ok((processed, created))
}
