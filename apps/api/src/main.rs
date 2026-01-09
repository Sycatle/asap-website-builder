mod config;
mod db;
mod cache;
mod website_cache;
mod pool;
mod websocket;
mod redis_pubsub;

use std::net::SocketAddr;
use std::sync::Arc;
use axum::{Router, routing::get, Json, extract::State, middleware::Next, response::Response, body::Body, http::{Request, Method}};
use serde_json::json;
use sqlx::PgPool;
use tower_http::cors::{CorsLayer, AllowOrigin};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Security headers middleware
/// Adds important security headers to all responses
async fn security_headers_middleware(request: Request<Body>, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    
    // Prevent clickjacking
    if let Ok(value) = "DENY".parse() {
        headers.insert("x-frame-options", value);
    }
    
    // Prevent MIME type sniffing
    if let Ok(value) = "nosniff".parse() {
        headers.insert("x-content-type-options", value);
    }
    
    // XSS protection (legacy but still useful)
    if let Ok(value) = "1; mode=block".parse() {
        headers.insert("x-xss-protection", value);
    }
    
    // Only in production: HSTS (requires HTTPS)
    if std::env::var("ENVIRONMENT").map(|e| e == "production").unwrap_or(false) {
        if let Ok(value) = "max-age=31536000; includeSubDomains".parse() {
            headers.insert("strict-transport-security", value);
        }
    }
    
    response
}

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

    // Sync extension catalog to database
    match asap_core_api::queries::sync_extensions_catalog(&pool).await {
        Ok(count) => tracing::info!("Synced {} extensions from catalog to database", count),
        Err(e) => tracing::warn!("Failed to sync extension catalog: {}", e),
    }

    // Log pool info
    if let Ok(pool_info) = pool::get_pool_info(&pool).await {
        tracing::info!("{}", pool_info);
    }

    // Create Redis cache (optional - will log warning if not available)
    let cache = match std::env::var("REDIS_URL") {
        Ok(redis_url) => {
            // Create cache service
            match db::create_redis_cache(&redis_url).await {
                Ok(cache_service) => {
                    tracing::info!("Redis cache initialized successfully");
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
    
    // Store cache for potential future use (e.g., public website caching)
    let _cache = cache;

    // Create WebSocket state with shared config and database pool
    let ws_state = Arc::new(websocket::WsState::new(shared_config.clone(), pool.clone()));
    tracing::info!("WebSocket state initialized with authentication");

    // Start periodic cleanup tasks
    websocket::spawn_cleanup_task(ws_state.clone());
    tracing::info!("WebSocket cleanup task started (runs every 5 minutes)");

    // Start Redis Pub/Sub subscribers for real-time features
    if let Ok(redis_url) = std::env::var("REDIS_URL") {
        // Notification subscriber
        redis_pubsub::spawn_redis_subscriber(ws_state.clone(), redis_url.clone());
        tracing::info!("Redis Pub/Sub subscriber started for real-time notifications");
        
        // Sync subscriber (Phase 4)
        redis_pubsub::spawn_redis_sync_subscriber(ws_state.clone(), redis_url);
        tracing::info!("Redis Pub/Sub subscriber started for real-time sync events (Phase 4)");
    } else {
        tracing::warn!("REDIS_URL not set. Real-time features via Pub/Sub disabled.");
    }

    // Create API router with WebSocket broadcaster
    let api_router = asap_core_api::create_router_with_ws(
        pool.clone(),
        shared_config,
        Some(ws_state.clone() as asap_core_api::SharedWsBroadcaster),
    ).await;
    
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
    // CORS configuration - explicitly list headers for Firefox compatibility
    use axum::http::header::{AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN, HeaderName};
    use tower_http::cors::AllowOrigin;
    
    // Build allowed origins from config
    let allowed_origins: Vec<_> = config.allowed_origins.iter()
        .filter_map(|s| s.parse().ok())
        .collect();
    
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            AUTHORIZATION,
            CONTENT_TYPE,
            ACCEPT,
            ORIGIN,
            HeaderName::from_static("x-requested-with"),
            HeaderName::from_static("x-csrf-token"),
        ])
        .allow_credentials(true)
        .expose_headers([
            HeaderName::from_static("x-request-id"),
        ]);

    let app = Router::new()
        .merge(health_router)
        .merge(ws_router)
        .nest("/api", api_router)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(axum::middleware::from_fn(security_headers_middleware));

    // Start server with graceful shutdown
    let addr = SocketAddr::from((
        config.server_host.parse::<std::net::IpAddr>()?,
        config.server_port
    ));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    // Graceful shutdown signal handler
    let shutdown_signal = async {
        let ctrl_c = async {
            tokio::signal::ctrl_c()
                .await
                .expect("Failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("Failed to install SIGTERM handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {},
            _ = terminate => {},
        }

        tracing::info!("Shutdown signal received, starting graceful shutdown...");
    };
    
    // Serve with graceful shutdown (allows in-flight requests to complete)
    // Use into_make_service_with_connect_info to enable ConnectInfo<SocketAddr> for WebSocket handler
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal)
        .await?;
    
    // Cleanup after server stops
    tracing::info!("Server stopped, cleaning up connections...");
    
    // Close database pool gracefully
    pool.close().await;
    tracing::info!("Database pool closed");
    
    tracing::info!("Graceful shutdown complete");

    Ok(())
}
