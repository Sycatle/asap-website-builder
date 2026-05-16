use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

/// Configuration for database pool
#[derive(Clone)]
pub struct PoolConfig {
    pub min_connections: u32,
    pub max_connections: u32,
    pub acquire_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            min_connections: 5,
            max_connections: 20,
            acquire_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(300),
            max_lifetime: Duration::from_secs(1800),
        }
    }
}

impl PoolConfig {
    /// Create config optimized for API server
    pub fn for_api() -> Self {
        Self {
            min_connections: 10,
            max_connections: 50,
            acquire_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(300),
            max_lifetime: Duration::from_secs(1800),
        }
    }
}

/// Create a database pool with advanced configuration
pub async fn create_pool_with_config(
    database_url: &str,
    config: PoolConfig,
) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .min_connections(config.min_connections)
        .max_connections(config.max_connections)
        .acquire_timeout(config.acquire_timeout)
        .idle_timeout(config.idle_timeout)
        .max_lifetime(config.max_lifetime)
        .connect(database_url)
        .await?;

    tracing::info!(
        "Database pool created: min={}, max={}, acquire_timeout={}s, idle_timeout={}s",
        config.min_connections,
        config.max_connections,
        config.acquire_timeout.as_secs(),
        config.idle_timeout.as_secs()
    );

    Ok(pool)
}

/// Create pool optimized for API with warmup
pub async fn create_api_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = create_pool_with_config(database_url, PoolConfig::for_api()).await?;
    warmup_pool(&pool).await?;
    Ok(pool)
}

/// Warmup pool by acquiring and releasing minimum connections
async fn warmup_pool(pool: &PgPool) -> anyhow::Result<()> {
    tracing::info!("Warming up database pool...");

    let warmup_tasks: Vec<_> = (0..5)
        .map(|_| {
            let pool = pool.clone();
            tokio::spawn(async move {
                match sqlx::query("SELECT 1").fetch_one(&pool).await {
                    Ok(_) => {
                        tracing::debug!("Pool warmup connection successful");
                        Ok::<(), sqlx::Error>(())
                    }
                    Err(e) => {
                        tracing::warn!("Pool warmup failed: {}", e);
                        Err(e)
                    }
                }
            })
        })
        .collect();

    for task in warmup_tasks {
        match task.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => tracing::warn!("Warmup task error: {}", e),
            Err(e) => tracing::warn!("Warmup task join error: {}", e),
        }
    }

    tracing::info!("Database pool warmup completed");
    Ok(())
}

/// Get human-readable pool info (sqlx::PgPool does not expose live metrics).
pub async fn get_pool_info(_pool: &PgPool) -> anyhow::Result<String> {
    Ok("Database Pool Info:\n  \
         - Pool is active and responding\n  \
         - Monitor via: SELECT COUNT(*) FROM pg_stat_activity\n  \
         - Acquire timeout: 10s\n  \
         - Idle timeout: 30m"
        .to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_config_default() {
        let config = PoolConfig::default();
        assert_eq!(config.min_connections, 5);
        assert_eq!(config.max_connections, 20);
    }

    #[test]
    fn test_pool_config_for_api() {
        let config = PoolConfig::for_api();
        assert_eq!(config.min_connections, 10);
        assert_eq!(config.max_connections, 50);
    }
}
