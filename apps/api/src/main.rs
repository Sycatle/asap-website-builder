mod config;
mod db;
mod cache;
mod portfolio_cache;
mod pool;

use std::net::SocketAddr;
use axum::{Router, routing::get, Json, extract::State};
use serde_json::json;
use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

async fn health(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let db_status = match db::health_check(&pool).await {
        Ok(_) => "ok",
        Err(_) => "error",
    };

    Json(json!({
        "status": "ok",
        "service": "asap-api",
        "version": env!("CARGO_PKG_VERSION"),
        "database": db_status
    }))
}

async fn health_pool(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let pool_info = match pool::get_pool_info(&pool).await {
        Ok(info) => info,
        Err(e) => format!("Error: {}", e),
    };

    Json(json!({
        "status": "ok",
        "pool_status": "healthy",
        "pool_info": pool_info
    }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "asap_api=debug,tower_http=debug,sqlx=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ASAP Core API");

    // Load configuration
    let config = config::Config::from_env()?;
    tracing::info!("Configuration loaded");

    // Create shared config
    let shared_config = asap_core_api::SharedConfig::from_env()?;
    tracing::info!("Shared configuration initialized");

    // Create database pool with optimized configuration
    let pool = pool::create_api_pool(&config.database_url).await?;
    tracing::info!("Database pool created and warmed up");

    // Log pool info
    if let Ok(pool_info) = pool::get_pool_info(&pool).await {
        tracing::info!("{}", pool_info);
    }

    // Create Redis cache (optional - will log warning if not available)
    let _cache = match std::env::var("REDIS_URL") {
        Ok(redis_url) => {
            match db::create_redis_cache(&redis_url).await {
                Ok(cache_service) => {
                    tracing::info!("Redis cache initialized");
                    Some(cache_service)
                }
                Err(e) => {
                    tracing::warn!("Redis cache initialization failed: {}. Continuing without caching.", e);
                    None
                }
            }
        }
        Err(_) => {
            tracing::info!("REDIS_URL not set. Caching disabled.");
            None
        }
    };

    // Create API router
    let api_router = asap_core_api::create_router(pool.clone(), shared_config);
    
    // Create main app router
    let app = Router::new()
        .route("/health", get(health))
        .route("/health/pool", get(health_pool))
        .with_state(pool.clone())
        .nest("/api", api_router)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::from((
        config.server_host.parse::<std::net::IpAddr>()?,
        config.server_port
    ));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
