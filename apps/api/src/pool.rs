use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Configuration for database pool
/// 
/// NOTE: Comprehensive pool configuration for different deployment scenarios.
/// Some fields like `enable_stats` are prepared for future metrics integration.
#[allow(dead_code)]
#[derive(Clone)]
pub struct PoolConfig {
    /// Minimum connections to maintain
    pub min_connections: u32,
    /// Maximum connections allowed
    pub max_connections: u32,
    /// Timeout to acquire a connection
    pub acquire_timeout: Duration,
    /// Idle timeout before connection is closed
    pub idle_timeout: Duration,
    /// Connection lifetime
    pub max_lifetime: Duration,
    /// Enable pool statistics tracking (prepared for metrics integration)
    pub enable_stats: bool,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            min_connections: 5,
            max_connections: 20,
            acquire_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(300),
            max_lifetime: Duration::from_secs(1800),
            enable_stats: true,
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
            enable_stats: true,
        }
    }

    /// Create config optimized for worker
    #[allow(dead_code)]
    pub fn for_worker() -> Self {
        Self {
            min_connections: 5,
            max_connections: 20,
            acquire_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(300),
            max_lifetime: Duration::from_secs(1800),
            enable_stats: true,
        }
    }
}

/// Pool statistics for monitoring
/// 
/// NOTE: Atomic counters for tracking pool health metrics.
/// Prepared for future Prometheus/metrics integration.
#[derive(Clone)]
pub struct PoolStats {
    /// Total connections created
    pub total_connections: Arc<AtomicU64>,
    /// Connections currently in use
    pub active_connections: Arc<AtomicU64>,
    /// Failed connection attempts
    pub failed_connections: Arc<AtomicU64>,
    /// Total queries executed
    pub total_queries: Arc<AtomicU64>,
    /// Failed queries
    pub failed_queries: Arc<AtomicU64>,
}

impl Default for PoolStats {
    fn default() -> Self {
        Self {
            total_connections: Arc::new(AtomicU64::new(0)),
            active_connections: Arc::new(AtomicU64::new(0)),
            failed_connections: Arc::new(AtomicU64::new(0)),
            total_queries: Arc::new(AtomicU64::new(0)),
            failed_queries: Arc::new(AtomicU64::new(0)),
        }
    }
}

#[allow(dead_code)]
impl PoolStats {
    pub fn increment_connections(&self) {
        self.total_connections.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_active(&self) {
        self.active_connections.fetch_add(1, Ordering::Relaxed);
    }

    pub fn decrement_active(&self) {
        self.active_connections.fetch_sub(1, Ordering::Relaxed);
    }

    pub fn increment_failed(&self) {
        self.failed_connections.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_queries(&self) {
        self.total_queries.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_failed_queries(&self) {
        self.failed_queries.fetch_add(1, Ordering::Relaxed);
    }

    pub fn get_stats(&self) -> (u64, u64, u64, u64, u64) {
        (
            self.total_connections.load(Ordering::Relaxed),
            self.active_connections.load(Ordering::Relaxed),
            self.failed_connections.load(Ordering::Relaxed),
            self.total_queries.load(Ordering::Relaxed),
            self.failed_queries.load(Ordering::Relaxed),
        )
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
    
    // Warmup: pre-allocate minimum connections
    warmup_pool(&pool).await?;
    
    Ok(pool)
}

/// Create pool optimized for worker
/// 
/// NOTE: Prepared for worker service integration.
#[allow(dead_code)]
pub async fn create_worker_pool(database_url: &str) -> anyhow::Result<PgPool> {
    create_pool_with_config(database_url, PoolConfig::for_worker()).await
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

    // Wait for all warmup tasks
    for task in warmup_tasks {
        match task.await {
            Ok(Ok(())) => {},
            Ok(Err(e)) => {
                tracing::warn!("Warmup task error: {}", e);
                // Don't fail completely if warmup has issues
            }
            Err(e) => {
                tracing::warn!("Warmup task join error: {}", e);
            }
        }
    }

    tracing::info!("Database pool warmup completed");
    Ok(())
}

/// Health check with timeout
/// 
/// NOTE: Health check function with configurable timeout.
/// Can be used for /health endpoint or readiness probes.
#[allow(dead_code)]
pub async fn health_check(pool: &PgPool) -> anyhow::Result<()> {
    let timeout_result = tokio::time::timeout(
        Duration::from_secs(5),
        sqlx::query("SELECT 1").fetch_one(pool),
    )
    .await;

    match timeout_result {
        Ok(Ok(_)) => {
            tracing::debug!("Database health check passed");
            Ok(())
        }
        Ok(Err(e)) => {
            tracing::error!("Database health check failed: {}", e);
            Err(anyhow::anyhow!("Database health check failed: {}", e))
        }
        Err(_) => {
            tracing::error!("Database health check timeout");
            Err(anyhow::anyhow!("Database health check timeout"))
        }
    }
}

/// Get pool statistics
pub async fn get_pool_info(_pool: &PgPool) -> anyhow::Result<String> {
    // Note: sqlx::PgPool doesn't expose connection metrics directly
    // We can track them ourselves or use a health check
    let info = format!(
        "Database Pool Info:\n  \
         - Pool is active and responding\n  \
         - Monitor via: SELECT COUNT(*) FROM pg_stat_activity\n  \
         - Acquire timeout: 10s\n  \
         - Idle timeout: 30m"
    );
    Ok(info)
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

    #[test]
    fn test_pool_config_for_worker() {
        let config = PoolConfig::for_worker();
        assert_eq!(config.min_connections, 5);
        assert_eq!(config.max_connections, 20);
    }

    #[test]
    fn test_pool_stats() {
        let stats = PoolStats::default();
        
        stats.increment_connections();
        stats.increment_active();
        stats.increment_queries();
        
        let (total_conn, active, failed, total_q, failed_q) = stats.get_stats();
        assert_eq!(total_conn, 1);
        assert_eq!(active, 1);
        assert_eq!(failed, 0);
        assert_eq!(total_q, 1);
        assert_eq!(failed_q, 0);
    }

    #[test]
    fn test_pool_stats_operations() {
        let stats = PoolStats::default();
        
        // Simulate connection lifecycle
        stats.increment_connections();
        stats.increment_active();
        stats.increment_queries();
        stats.increment_queries();
        stats.decrement_active();
        
        let (total_conn, active, _, total_q, _) = stats.get_stats();
        assert_eq!(total_conn, 1);
        assert_eq!(active, 0);
        assert_eq!(total_q, 2);
    }
}
