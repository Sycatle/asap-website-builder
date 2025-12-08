use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::time::Duration;

use crate::cache::CacheService;

/// Portfolio cache entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedPortfolio {
    pub id: String,
    pub tenant_id: String,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub metadata: serde_json::Value,
    pub data: serde_json::Value,
}

/// Portfolio caching service
pub struct PortfolioCacheService {
    db_pool: PgPool,
    cache: CacheService,
    cache_ttl: Duration,
}

impl PortfolioCacheService {
    /// Create a new portfolio cache service
    pub fn new(db_pool: PgPool, cache: CacheService) -> Self {
        Self {
            db_pool,
            cache,
            cache_ttl: Duration::from_secs(3600), // 1 hour
        }
    }

    /// Create with custom TTL
    pub fn new_with_ttl(db_pool: PgPool, cache: CacheService, ttl_secs: u64) -> Self {
        Self {
            db_pool,
            cache,
            cache_ttl: Duration::from_secs(ttl_secs),
        }
    }

    /// Get cache key for a portfolio slug
    fn portfolio_cache_key(slug: &str) -> String {
        format!("portfolio:public:{}", slug)
    }

    /// Get published portfolio with caching
    pub async fn get_public_portfolio(
        &self,
        slug: &str,
    ) -> Result<Option<CachedPortfolio>, Box<dyn std::error::Error>> {
        let cache_key = Self::portfolio_cache_key(slug);

        // Try cache first
        if let Ok(Some(cached)) = self.cache.get(&cache_key).await {
            if let Ok(portfolio) = serde_json::from_str::<CachedPortfolio>(&cached) {
                tracing::info!("Cache HIT for portfolio: {}", slug);
                return Ok(Some(portfolio));
            }
        }

        // Cache miss, fetch from DB
        tracing::info!("Cache MISS for portfolio: {}, fetching from DB", slug);
        let portfolio = self.fetch_from_db(slug).await?;

        // Cache the result if found
        if let Some(ref p) = portfolio {
            if let Ok(json_str) = serde_json::to_string(p) {
                let _ = self
                    .cache
                    .set_with_ttl(&cache_key, json_str, self.cache_ttl)
                    .await;
            }
        }

        Ok(portfolio)
    }

    /// Fetch portfolio directly from database
    async fn fetch_from_db(&self, slug: &str) -> Result<Option<CachedPortfolio>, Box<dyn std::error::Error>> {
        let result = sqlx::query!(
            r#"
            SELECT 
                p.id, p.tenant_id, p.slug, p.title, p.tagline, p.status, p.metadata,
                COALESCE(pd.data, '{}'::jsonb) as "data!"
            FROM portfolios p
            LEFT JOIN portfolio_data pd ON p.id = pd.portfolio_id
            WHERE p.slug = $1 AND p.status = 'published'
            "#,
            slug
        )
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(result.map(|row| CachedPortfolio {
            id: row.id.to_string(),
            tenant_id: row.tenant_id.to_string(),
            slug: row.slug,
            title: row.title,
            tagline: row.tagline,
            status: row.status,
            metadata: row.metadata,
            data: row.data,
        }))
    }

    /// Invalidate cache for a portfolio
    pub async fn invalidate_portfolio(&self, slug: &str) -> Result<(), Box<dyn std::error::Error>> {
        let cache_key = Self::portfolio_cache_key(slug);
        self.cache.delete(&cache_key).await?;
        tracing::info!("Cache invalidated for portfolio: {}", slug);
        Ok(())
    }

    /// Invalidate cache for multiple portfolios
    pub async fn invalidate_portfolios(
        &self,
        slugs: &[&str],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let keys: Vec<String> = slugs
            .iter()
            .map(|slug| Self::portfolio_cache_key(slug))
            .collect();

        let key_refs: Vec<&str> = keys.iter().map(|k| k.as_str()).collect();
        self.cache.delete_many(&key_refs).await?;
        
        tracing::info!("Cache invalidated for {} portfolios", slugs.len());
        Ok(())
    }

    /// Clear all portfolio cache (use with caution)
    pub async fn clear_all(&self) -> Result<(), Box<dyn std::error::Error>> {
        // We could use a pattern match here if we have many portfolio caches
        // For now, we'll be conservative and not flush everything
        tracing::warn!("Portfolio cache clear_all requested (not implemented - use invalidate_portfolio instead)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_portfolio_cache_key() {
        let key = PortfolioCacheService::portfolio_cache_key("my-portfolio");
        assert_eq!(key, "portfolio:public:my-portfolio");
    }

    #[test]
    fn test_cached_portfolio_serialization() {
        let portfolio = CachedPortfolio {
            id: "123".to_string(),
            tenant_id: "456".to_string(),
            slug: "test".to_string(),
            title: "Test".to_string(),
            tagline: "Test portfolio".to_string(),
            status: "published".to_string(),
            metadata: serde_json::json!({}),
            data: serde_json::json!({}),
        };

        let json = serde_json::to_string(&portfolio).unwrap();
        let deserialized: CachedPortfolio = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.slug, "test");
        assert_eq!(deserialized.status, "published");
    }
}
