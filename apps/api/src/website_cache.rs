use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::time::Duration;

use crate::cache::CacheService;

/// Website cache entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedWebsite {
    pub id: String,
    pub tenant_id: String,
    pub slug: String,
    pub title: String,
    pub tagline: String,
    pub status: String,
    pub creation_mode: String,
    pub preset_id: Option<String>,
    pub metadata: serde_json::Value,
    pub data: serde_json::Value,
}

/// Website caching service
pub struct WebsiteCacheService {
    db_pool: PgPool,
    cache: CacheService,
    cache_ttl: Duration,
}

impl WebsiteCacheService {
    /// Create a new website cache service
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

    /// Get cache key for a website slug
    fn website_cache_key(slug: &str) -> String {
        format!("website:public:{}", slug)
    }

    /// Get published website with caching
    pub async fn get_public_website(
        &self,
        slug: &str,
    ) -> Result<Option<CachedWebsite>, Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = Self::website_cache_key(slug);

        // Try cache first
        if let Ok(Some(cached)) = self.cache.get(&cache_key).await {
            if let Ok(website) = serde_json::from_str::<CachedWebsite>(&cached) {
                tracing::info!("Cache HIT for website: {}", slug);
                return Ok(Some(website));
            }
        }

        // Cache miss, fetch from DB
        tracing::info!("Cache MISS for website: {}, fetching from DB", slug);
        let website = self.fetch_from_db(slug).await?;

        // Cache the result if found
        if let Some(ref w) = website {
            if let Ok(json_str) = serde_json::to_string(w) {
                let _ = self
                    .cache
                    .set_with_ttl(&cache_key, json_str, self.cache_ttl)
                    .await;
            }
        }

        Ok(website)
    }

    /// Fetch website directly from database
    async fn fetch_from_db(&self, slug: &str) -> Result<Option<CachedWebsite>, Box<dyn std::error::Error + Send + Sync>> {
        let result = sqlx::query_as::<_, (uuid::Uuid, uuid::Uuid, String, String, String, String, String, Option<uuid::Uuid>, serde_json::Value, serde_json::Value)>(
            r#"
            SELECT 
                w.id, w.tenant_id, w.slug, w.title, w.tagline, w.status, 
                w.creation_mode, w.preset_id, w.metadata,
                COALESCE(wd.data, '{}'::jsonb) as data
            FROM websites w
            LEFT JOIN website_data wd ON w.id = wd.website_id
            WHERE w.slug = $1 AND w.status = 'published'
            "#
        )
        .bind(slug)
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(result.map(|(id, tenant_id, slug, title, tagline, status, creation_mode, preset_id, metadata, data)| {
            CachedWebsite {
                id: id.to_string(),
                tenant_id: tenant_id.to_string(),
                slug,
                title,
                tagline,
                status,
                creation_mode,
                preset_id: preset_id.map(|p| p.to_string()),
                metadata,
                data,
            }
        }))
    }

    /// Invalidate cache for a website
    pub async fn invalidate_website(&self, slug: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = Self::website_cache_key(slug);
        self.cache.delete(&cache_key).await?;
        tracing::info!("Cache invalidated for website: {}", slug);
        Ok(())
    }

    /// Invalidate cache for multiple websites
    pub async fn invalidate_websites(
        &self,
        slugs: &[&str],
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let keys: Vec<String> = slugs
            .iter()
            .map(|slug| Self::website_cache_key(slug))
            .collect();

        let key_refs: Vec<&str> = keys.iter().map(|k| k.as_str()).collect();
        self.cache.delete_many(&key_refs).await?;
        
        tracing::info!("Cache invalidated for {} websites", slugs.len());
        Ok(())
    }

    /// Clear all website cache (use with caution)
    pub async fn clear_all(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // We could use a pattern match here if we have many website caches
        // For now, we'll be conservative and not flush everything
        tracing::warn!("Website cache clear_all requested (not implemented - use invalidate_website instead)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_website_cache_key() {
        let key = WebsiteCacheService::website_cache_key("my-website");
        assert_eq!(key, "website:public:my-website");
    }

    #[test]
    fn test_cached_website_serialization() {
        let website = CachedWebsite {
            id: "123".to_string(),
            tenant_id: "456".to_string(),
            slug: "test".to_string(),
            title: "Test".to_string(),
            tagline: "Test website".to_string(),
            status: "published".to_string(),
            creation_mode: "from_scratch".to_string(),
            preset_id: None,
            metadata: serde_json::json!({}),
            data: serde_json::json!({}),
        };

        let json = serde_json::to_string(&website).unwrap();
        let deserialized: CachedWebsite = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.slug, "test");
        assert_eq!(deserialized.status, "published");
        assert_eq!(deserialized.creation_mode, "from_scratch");
    }

    #[test]
    fn test_cached_website_with_preset() {
        let website = CachedWebsite {
            id: "123".to_string(),
            tenant_id: "456".to_string(),
            slug: "test".to_string(),
            title: "Test".to_string(),
            tagline: "Test website".to_string(),
            status: "published".to_string(),
            creation_mode: "from_preset".to_string(),
            preset_id: Some("789".to_string()),
            metadata: serde_json::json!({}),
            data: serde_json::json!({}),
        };

        let json = serde_json::to_string(&website).unwrap();
        let deserialized: CachedWebsite = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.creation_mode, "from_preset");
        assert_eq!(deserialized.preset_id, Some("789".to_string()));
    }
}
