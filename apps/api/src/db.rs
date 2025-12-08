use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .min_connections(5)
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(300))
        .connect(database_url)
        .await?;

    tracing::info!("Database connection pool created successfully with min=5, max=20");
    
    Ok(pool)
}

pub async fn health_check(pool: &PgPool) -> anyhow::Result<()> {
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await?;
    
    Ok(())
}

// Redis cache initialization
pub async fn create_redis_cache(redis_url: &str) -> anyhow::Result<crate::cache::CacheService> {
    let cache = crate::cache::CacheService::new(redis_url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create Redis cache: {}", e))?;
    
    // Perform health check
    cache.health_check()
        .await
        .map_err(|e| anyhow::anyhow!("Redis health check failed: {}", e))?;
    
    tracing::info!("Redis cache initialized successfully");
    Ok(cache)
}
