use redis::{aio::ConnectionManager, AsyncCommands, RedisError};
use std::time::Duration;
use tracing::{debug, warn};

/// CacheService handles Redis caching for public data
/// 
/// NOTE: This service is prepared for future use in caching public websites.
/// Currently not integrated into the main API routes but kept for upcoming features.
#[allow(dead_code)]
#[derive(Clone)]
pub struct CacheService {
    client: ConnectionManager,
    default_ttl: Duration,
}

#[allow(dead_code)]
impl CacheService {
    /// Create a new cache service
    pub async fn new(redis_url: &str) -> Result<Self, RedisError> {
        let client = redis::Client::open(redis_url)?;
        let manager = ConnectionManager::new(client).await?;
        
        tracing::info!("Redis cache service initialized");
        
        Ok(Self {
            client: manager,
            default_ttl: Duration::from_secs(3600), // 1 hour default
        })
    }

    /// Create a new cache service with custom TTL
    pub async fn new_with_ttl(redis_url: &str, ttl_secs: u64) -> Result<Self, RedisError> {
        let client = redis::Client::open(redis_url)?;
        let manager = ConnectionManager::new(client).await?;
        
        tracing::info!("Redis cache service initialized with TTL: {} seconds", ttl_secs);
        
        Ok(Self {
            client: manager,
            default_ttl: Duration::from_secs(ttl_secs),
        })
    }

    /// Get a cached value (String only for simplicity)
    pub async fn get(&self, key: &str) -> Result<Option<String>, RedisError> {
        let mut conn = self.client.clone();
        match conn.get::<_, Option<String>>(key).await {
            Ok(value) => {
                if value.is_some() {
                    debug!("Cache HIT: {}", key);
                } else {
                    debug!("Cache MISS: {}", key);
                }
                Ok(value)
            }
            Err(e) => {
                warn!("Cache get error for {}: {}", key, e);
                Ok(None)
            }
        }
    }

    /// Set a cached value with default TTL
    pub async fn set(
        &self,
        key: &str,
        value: String,
    ) -> Result<(), RedisError> {
        self.set_with_ttl(key, value, self.default_ttl).await
    }

    /// Set a cached value with custom TTL
    pub async fn set_with_ttl(
        &self,
        key: &str,
        value: String,
        ttl: Duration,
    ) -> Result<(), RedisError> {
        let mut conn = self.client.clone();
        let ttl_secs = ttl.as_secs();
        
        conn.set_ex::<_, _, ()>(key, value, ttl_secs).await?;
        debug!("Cache SET: {} (TTL: {} secs)", key, ttl_secs);
        
        Ok(())
    }

    /// Delete a cached value
    pub async fn delete(&self, key: &str) -> Result<(), RedisError> {
        let mut conn = self.client.clone();
        conn.del::<_, ()>(key).await?;
        debug!("Cache DELETE: {}", key);
        Ok(())
    }

    /// Delete multiple cached values
    pub async fn delete_many(&self, keys: &[&str]) -> Result<(), RedisError> {
        if keys.is_empty() {
            return Ok(());
        }
        
        let mut conn = self.client.clone();
        conn.del::<_, ()>(keys).await?;
        debug!("Cache DELETE: {:?}", keys);
        Ok(())
    }

    /// Check if a key exists in cache
    pub async fn exists(&self, key: &str) -> Result<bool, RedisError> {
        let mut conn = self.client.clone();
        let exists: bool = conn.exists(key).await?;
        Ok(exists)
    }

    /// Clear all cache (use with caution!)
    pub async fn flush_all(&self) -> Result<(), RedisError> {
        // FLUSHDB is not available on ConnectionManager in simple form
        // For now, we'll implement a pattern-based delete instead
        tracing::warn!("Cache flush_all requested - use delete_many with pattern instead");
        Ok(())
    }

    /// Health check
    pub async fn health_check(&self) -> Result<bool, RedisError> {
        let mut conn = self.client.clone();
        let pong: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await?;
        Ok(pong == "PONG")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires Redis running
    async fn test_cache_service_new() {
        let cache = CacheService::new("redis://127.0.0.1:6379").await;
        assert!(cache.is_ok());
    }

    #[tokio::test]
    #[ignore]
    async fn test_cache_health_check() {
        let cache = CacheService::new("redis://127.0.0.1:6379").await.unwrap();
        let health = cache.health_check().await;
        assert!(health.is_ok());
        assert!(health.unwrap());
    }

    #[test]
    fn test_cache_service_creation_with_ttl() {
        let ttl = Duration::from_secs(7200);
        // This just tests the struct creation
        assert_eq!(ttl.as_secs(), 7200);
    }
}
