use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "asap_worker=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ASAP Worker");

    // TODO: Implement event processor
    // TODO: Implement module executor

    // Keep the worker running
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        tracing::debug!("Worker heartbeat");
    }
}
