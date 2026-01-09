//! Rate Limiter for AI requests

use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use tracing::{debug, warn};

use crate::config::AIConfig;
use crate::error::{AIError, AIResult};

/// Resource types for rate limiting
#[derive(Debug, Clone, Copy)]
pub enum RateLimitResource {
    Messages,
    Images,
    VoiceMinutes,
}

impl RateLimitResource {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Messages => "messages",
            Self::Images => "images",
            Self::VoiceMinutes => "voice",
        }
    }

    fn window_seconds(&self) -> i64 {
        match self {
            Self::Messages => 86400,       // 24 hours
            Self::Images => 30 * 86400,    // 30 days
            Self::VoiceMinutes => 30 * 86400, // 30 days
        }
    }
}

/// Rate limiter using Redis
pub struct AIRateLimiter {
    redis: ConnectionManager,
    config: AIConfig,
}

impl AIRateLimiter {
    /// Create a new rate limiter
    pub fn new(redis: ConnectionManager, config: AIConfig) -> Self {
        Self { redis, config }
    }

    /// Check if the account can make a request for the given resource
    pub async fn check(&self, account_id: &str, plan: &str, resource: RateLimitResource) -> AIResult<RateLimitStatus> {
        let key = self.key(account_id, resource);
        let limit = self.get_limit(plan, resource);

        let mut conn = self.redis.clone();
        let current: i64 = conn.get(&key).await.unwrap_or(0);

        let remaining = (limit - current).max(0);
        let ttl: i64 = conn.ttl(&key).await.unwrap_or(resource.window_seconds());

        Ok(RateLimitStatus {
            limit,
            remaining,
            reset_after_secs: ttl.max(0) as u64,
            resource,
        })
    }

    /// Check if allowed and consume one unit if so
    pub async fn check_and_consume(
        &self,
        account_id: &str,
        plan: &str,
        resource: RateLimitResource,
    ) -> AIResult<RateLimitStatus> {
        let key = self.key(account_id, resource);
        let limit = self.get_limit(plan, resource);
        let window = resource.window_seconds();

        let mut conn = self.redis.clone();

        // Use INCR and check
        let current: i64 = conn.incr(&key, 1).await?;

        // Set expiry on first increment
        if current == 1 {
            let _: () = conn.expire(&key, window).await?;
        }

        let ttl: i64 = conn.ttl(&key).await.unwrap_or(window);

        if current > limit {
            // Exceeded - decrement back
            let _: () = conn.decr(&key, 1).await?;
            
            warn!(
                account_id = account_id,
                resource = resource.as_str(),
                limit = limit,
                "Rate limit exceeded"
            );

            return Err(AIError::RateLimitExceeded {
                retry_after_secs: ttl.max(1) as u64,
            });
        }

        debug!(
            account_id = account_id,
            resource = resource.as_str(),
            current = current,
            limit = limit,
            "Rate limit consumed"
        );

        Ok(RateLimitStatus {
            limit,
            remaining: (limit - current).max(0),
            reset_after_secs: ttl.max(0) as u64,
            resource,
        })
    }

    /// Consume multiple units (e.g., for voice minutes)
    pub async fn consume_multiple(
        &self,
        account_id: &str,
        plan: &str,
        resource: RateLimitResource,
        amount: i64,
    ) -> AIResult<RateLimitStatus> {
        let key = self.key(account_id, resource);
        let limit = self.get_limit(plan, resource);
        let window = resource.window_seconds();

        let mut conn = self.redis.clone();

        // Check current first
        let current: i64 = conn.get(&key).await.unwrap_or(0);

        if current + amount > limit {
            let ttl: i64 = conn.ttl(&key).await.unwrap_or(window);
            return Err(AIError::RateLimitExceeded {
                retry_after_secs: ttl.max(1) as u64,
            });
        }

        // Increment
        let new_value: i64 = conn.incr(&key, amount).await?;

        // Set expiry if first time
        if new_value == amount {
            let _: () = conn.expire(&key, window).await?;
        }

        let ttl: i64 = conn.ttl(&key).await.unwrap_or(window);

        Ok(RateLimitStatus {
            limit,
            remaining: (limit - new_value).max(0),
            reset_after_secs: ttl.max(0) as u64,
            resource,
        })
    }

    /// Get the Redis key for a resource
    fn key(&self, account_id: &str, resource: RateLimitResource) -> String {
        format!("ratelimit:ai:{}:{}", resource.as_str(), account_id)
    }

    /// Get the limit for a plan and resource
    fn get_limit(&self, plan: &str, resource: RateLimitResource) -> i64 {
        let limits = self.config.get_plan_limits(plan);
        match resource {
            RateLimitResource::Messages => limits.messages_per_day,
            RateLimitResource::Images => limits.images_per_month,
            RateLimitResource::VoiceMinutes => limits.voice_minutes_per_month,
        }
    }
}

/// Rate limit status information
#[derive(Debug, Clone)]
pub struct RateLimitStatus {
    pub limit: i64,
    pub remaining: i64,
    pub reset_after_secs: u64,
    pub resource: RateLimitResource,
}

impl RateLimitStatus {
    /// Get HTTP headers for rate limit
    pub fn headers(&self) -> Vec<(&'static str, String)> {
        vec![
            ("X-RateLimit-Limit", self.limit.to_string()),
            ("X-RateLimit-Remaining", self.remaining.to_string()),
            ("X-RateLimit-Reset", self.reset_after_secs.to_string()),
            ("X-RateLimit-Resource", format!("ai-{}", self.resource.as_str())),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_key() {
        let key = format!("ratelimit:ai:{}:{}", "messages", "account-123");
        assert_eq!(key, "ratelimit:ai:messages:account-123");
    }

    #[test]
    fn test_rate_limit_status_headers() {
        let status = RateLimitStatus {
            limit: 200,
            remaining: 150,
            reset_after_secs: 3600,
            resource: RateLimitResource::Messages,
        };

        let headers = status.headers();
        assert_eq!(headers.len(), 4);
        assert_eq!(headers[0], ("X-RateLimit-Limit", "200".to_string()));
        assert_eq!(headers[1], ("X-RateLimit-Remaining", "150".to_string()));
    }

    #[test]
    fn test_window_seconds() {
        assert_eq!(RateLimitResource::Messages.window_seconds(), 86400);
        assert_eq!(RateLimitResource::Images.window_seconds(), 30 * 86400);
    }
}
