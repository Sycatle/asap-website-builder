mod config;
mod db;
mod cache;
mod website_cache;
mod pool;
mod websocket;
mod redis_pubsub;

use std::net::SocketAddr;
use std::sync::Arc;
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

    // Sync module catalog to database
    match asap_core_api::queries::sync_modules_catalog(&pool).await {
        Ok(count) => tracing::info!("Synced {} modules from catalog to database", count),
        Err(e) => tracing::warn!("Failed to sync module catalog: {}", e),
    }

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

    // Create WebSocket state
    let ws_state = Arc::new(websocket::WsState::new());
    tracing::info!("WebSocket state initialized");

    // Start Redis Pub/Sub subscriber for real-time notifications
    if let Ok(redis_url) = std::env::var("REDIS_URL") {
        redis_pubsub::spawn_redis_subscriber(ws_state.clone(), redis_url);
        tracing::info!("Redis Pub/Sub subscriber started for real-time notifications");
    } else {
        tracing::warn!("REDIS_URL not set. Real-time notifications via Pub/Sub disabled.");
    }

    // Create API router with WebSocket broadcaster
    let api_router = asap_core_api::create_router_with_ws(
        pool.clone(),
        shared_config,
        Some(ws_state.clone() as asap_core_api::SharedWsBroadcaster)
    );
    
    // Create health routes with pool state
    let health_router = Router::new()
        .route("/health", get(health))
        .route("/health/pool", get(health_pool))
        .with_state(pool.clone());

    // Create WebSocket router with ws_state
    let ws_router = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .with_state(ws_state);
    
    // Create main app router by merging routers
    let app = Router::new()
        .merge(health_router)
        .merge(ws_router)
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
