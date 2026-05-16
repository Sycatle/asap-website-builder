//! Redis-based caching for AI context data
//!
//! This module provides caching for frequently accessed data during AI chat:
//! - Website context (sections, theme, settings)
//! - User context (profile, preferences)
//!
//! Cache TTL: 5 minutes (balances freshness with performance)

use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Cache TTL in seconds (5 minutes)
const CACHE_TTL_SECONDS: i64 = 300;

/// AI Context Cache using Redis
pub struct AIContextCache {
    redis: redis::aio::ConnectionManager,
}

impl AIContextCache {
    pub fn new(redis: redis::aio::ConnectionManager) -> Arc<Self> {
        Arc::new(Self { redis })
    }

    /// Get cached website context
    pub async fn get_website_context<T: DeserializeOwned>(&self, website_id: Uuid) -> Option<T> {
        let key = format!("ai:ctx:website:{}", website_id);
        let mut conn = self.redis.clone();

        match conn.get::<_, Option<String>>(&key).await {
            Ok(Some(data)) => match serde_json::from_str(&data) {
                Ok(ctx) => {
                    tracing::debug!("AI context cache HIT for website {}", website_id);
                    Some(ctx)
                }
                Err(e) => {
                    tracing::warn!("Failed to deserialize cached context: {}", e);
                    None
                }
            },
            Ok(None) => {
                tracing::debug!("AI context cache MISS for website {}", website_id);
                None
            }
            Err(e) => {
                tracing::warn!("Redis get error: {}", e);
                None
            }
        }
    }

    /// Cache website context
    pub async fn set_website_context<T: Serialize>(
        &self,
        website_id: Uuid,
        context: &T,
    ) -> Result<(), redis::RedisError> {
        let key = format!("ai:ctx:website:{}", website_id);
        let data = match serde_json::to_string(context) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("Failed to serialize context: {}", e);
                return Ok(()); // Silently skip caching on serialization error
            }
        };

        let mut conn = self.redis.clone();
        conn.set_ex::<_, _, ()>(&key, &data, CACHE_TTL_SECONDS as u64)
            .await?;

        tracing::debug!(
            "Cached AI context for website {} (TTL: {}s)",
            website_id,
            CACHE_TTL_SECONDS
        );
        Ok(())
    }

    /// Invalidate website context cache
    /// Call this when website data is updated
    pub async fn invalidate_website_context(
        &self,
        website_id: Uuid,
    ) -> Result<(), redis::RedisError> {
        let key = format!("ai:ctx:website:{}", website_id);
        let mut conn = self.redis.clone();
        conn.del::<_, ()>(&key).await?;

        tracing::debug!("Invalidated AI context cache for website {}", website_id);
        Ok(())
    }

    /// Get cached user context
    pub async fn get_user_context<T: DeserializeOwned>(&self, account_id: Uuid) -> Option<T> {
        let key = format!("ai:ctx:user:{}", account_id);
        let mut conn = self.redis.clone();

        match conn.get::<_, Option<String>>(&key).await {
            Ok(Some(data)) => serde_json::from_str(&data).ok(),
            _ => None,
        }
    }

    /// Cache user context
    pub async fn set_user_context<T: Serialize>(
        &self,
        account_id: Uuid,
        context: &T,
    ) -> Result<(), redis::RedisError> {
        let key = format!("ai:ctx:user:{}", account_id);
        let data = match serde_json::to_string(context) {
            Ok(d) => d,
            Err(_) => return Ok(()), // Silently skip on error
        };

        let mut conn = self.redis.clone();
        conn.set_ex::<_, _, ()>(&key, &data, CACHE_TTL_SECONDS as u64)
            .await?;

        Ok(())
    }

    /// Invalidate user context cache
    pub async fn invalidate_user_context(&self, account_id: Uuid) -> Result<(), redis::RedisError> {
        let key = format!("ai:ctx:user:{}", account_id);
        let mut conn = self.redis.clone();
        conn.del::<_, ()>(&key).await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    // Tests would require a Redis connection
    // In production, use mockall or similar for unit tests
}
