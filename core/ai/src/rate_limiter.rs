//! Rate Limiter for AI requests
//!
//! Provides rate limiting for AI resources including messages, images, and voice.
//! Supports both simple count-based limits and cost-based token tracking.

use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

use crate::config::AIConfig;
use crate::error::{AIError, AIResult};

/// Resource types for rate limiting
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RateLimitResource {
    Messages,
    Images,
    VoiceMinutes,
    /// Token-based limit (tracks actual cost, not just message count)
    Tokens,
}

impl RateLimitResource {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Messages => "messages",
            Self::Images => "images",
            Self::VoiceMinutes => "voice",
            Self::Tokens => "tokens",
        }
    }

    fn window_seconds(&self) -> i64 {
        match self {
            Self::Messages => 86400,       // 24 hours
            Self::Images => 30 * 86400,    // 30 days
            Self::VoiceMinutes => 30 * 86400, // 30 days
            Self::Tokens => 86400,         // 24 hours (daily token budget)
        }
    }
}

/// Model tier for cost-based rate limiting
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ModelTier {
    /// Fast, cheap models (gpt-4o-mini, claude-3-haiku)
    Fast,
    /// Standard models (gpt-4o, claude-3-sonnet)
    Standard,
    /// Premium models (gpt-4-turbo, claude-3-opus)
    Premium,
}

impl ModelTier {
    /// Get tier from model name
    pub fn from_model(model: &str) -> Self {
        let model_lower = model.to_lowercase();
        if model_lower.contains("mini") || model_lower.contains("haiku") || model_lower.contains("flash") {
            Self::Fast
        } else if model_lower.contains("opus") || model_lower.contains("turbo") {
            Self::Premium
        } else {
            Self::Standard
        }
    }

    /// Cost multiplier for token-based limits
    /// Fast models count as 1x, Standard as 3x, Premium as 10x
    pub fn cost_multiplier(&self) -> i64 {
        match self {
            Self::Fast => 1,
            Self::Standard => 3,
            Self::Premium => 10,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Fast => "fast",
            Self::Standard => "standard",
            Self::Premium => "premium",
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
            model_tier: None,
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
            model_tier: None,
        })
    }

    /// Check and consume with model-aware cost tracking
    /// 
    /// This method applies a cost multiplier based on the model tier:
    /// - Fast (gpt-4o-mini): 1x
    /// - Standard (gpt-4o): 3x  
    /// - Premium (gpt-4-turbo): 10x
    ///
    /// This ensures fair billing where expensive models consume more of the quota.
    pub async fn check_and_consume_with_model(
        &self,
        account_id: &str,
        plan: &str,
        model: &str,
    ) -> AIResult<RateLimitStatus> {
        let tier = ModelTier::from_model(model);
        let cost = tier.cost_multiplier();
        
        let key = self.key(account_id, RateLimitResource::Tokens);
        let limit = self.get_limit(plan, RateLimitResource::Tokens);
        let window = RateLimitResource::Tokens.window_seconds();

        let mut conn = self.redis.clone();

        // Check current usage first
        let current: i64 = conn.get(&key).await.unwrap_or(0);

        if current + cost > limit {
            let ttl: i64 = conn.ttl(&key).await.unwrap_or(window);
            warn!(
                account_id = account_id,
                model = model,
                tier = tier.as_str(),
                cost = cost,
                current = current,
                limit = limit,
                "Token rate limit would be exceeded"
            );
            return Err(AIError::RateLimitExceeded {
                retry_after_secs: ttl.max(1) as u64,
            });
        }

        // Increment by cost
        let new_value: i64 = conn.incr(&key, cost).await?;

        // Set expiry on first increment
        if new_value == cost {
            let _: () = conn.expire(&key, window).await?;
        }

        let ttl: i64 = conn.ttl(&key).await.unwrap_or(window);

        info!(
            account_id = account_id,
            model = model,
            tier = tier.as_str(),
            cost = cost,
            new_total = new_value,
            limit = limit,
            "Token consumption recorded"
        );

        Ok(RateLimitStatus {
            limit,
            remaining: (limit - new_value).max(0),
            reset_after_secs: ttl.max(0) as u64,
            resource: RateLimitResource::Tokens,
            model_tier: Some(tier),
        })
    }

    /// Record actual token usage after a request completes
    /// 
    /// This is used for post-hoc tracking to get accurate cost data.
    /// Call this after receiving the response to track actual tokens used.
    pub async fn record_token_usage(
        &self,
        account_id: &str,
        model: &str,
        prompt_tokens: u32,
        completion_tokens: u32,
    ) -> AIResult<()> {
        let tier = ModelTier::from_model(model);
        let total_tokens = prompt_tokens + completion_tokens;
        
        // Calculate weighted cost (completion tokens are typically more expensive)
        let weighted_cost = ((prompt_tokens as i64) + (completion_tokens as i64 * 2)) 
            * tier.cost_multiplier() / 1000; // Per 1K tokens
        
        let key = format!("usage:ai:tokens:{}", account_id);
        let detail_key = format!("usage:ai:detail:{}:{}", account_id, chrono::Utc::now().format("%Y-%m-%d"));
        
        let mut conn = self.redis.clone();
        
        // Track total usage
        let _: () = conn.incr(&key, weighted_cost.max(1)).await?;
        let _: () = conn.expire(&key, 86400 * 30).await?; // Keep for 30 days
        
        // Track detailed usage for analytics
        let detail = serde_json::json!({
            "model": model,
            "tier": tier.as_str(),
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "weighted_cost": weighted_cost,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });
        let _: () = conn.rpush(&detail_key, detail.to_string()).await?;
        let _: () = conn.expire(&detail_key, 86400 * 7).await?; // Keep details for 7 days
        
        debug!(
            account_id = account_id,
            model = model,
            prompt_tokens = prompt_tokens,
            completion_tokens = completion_tokens,
            weighted_cost = weighted_cost,
            "Token usage recorded"
        );

        Ok(())
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
            model_tier: None,
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
            // Token limit = messages * 100 (assuming ~100 token cost per message on average)
            RateLimitResource::Tokens => limits.messages_per_day * 100,
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
    /// Model tier if this was a model-aware check
    pub model_tier: Option<ModelTier>,
}

impl RateLimitStatus {
    /// Get HTTP headers for rate limit
    pub fn headers(&self) -> Vec<(&'static str, String)> {
        let mut headers = vec![
            ("X-RateLimit-Limit", self.limit.to_string()),
            ("X-RateLimit-Remaining", self.remaining.to_string()),
            ("X-RateLimit-Reset", self.reset_after_secs.to_string()),
            ("X-RateLimit-Resource", format!("ai-{}", self.resource.as_str())),
        ];
        
        if let Some(tier) = &self.model_tier {
            headers.push(("X-RateLimit-Model-Tier", tier.as_str().to_string()));
        }
        
        headers
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
            model_tier: None,
        };

        let headers = status.headers();
        assert_eq!(headers.len(), 4);
        assert_eq!(headers[0], ("X-RateLimit-Limit", "200".to_string()));
        assert_eq!(headers[1], ("X-RateLimit-Remaining", "150".to_string()));
    }

    #[test]
    fn test_rate_limit_status_headers_with_tier() {
        let status = RateLimitStatus {
            limit: 10000,
            remaining: 5000,
            reset_after_secs: 3600,
            resource: RateLimitResource::Tokens,
            model_tier: Some(ModelTier::Standard),
        };

        let headers = status.headers();
        assert_eq!(headers.len(), 5);
        assert!(headers.iter().any(|(k, v)| *k == "X-RateLimit-Model-Tier" && v == "standard"));
    }

    #[test]
    fn test_window_seconds() {
        assert_eq!(RateLimitResource::Messages.window_seconds(), 86400);
        assert_eq!(RateLimitResource::Images.window_seconds(), 30 * 86400);
        assert_eq!(RateLimitResource::Tokens.window_seconds(), 86400);
    }

    #[test]
    fn test_model_tier_from_model() {
        assert_eq!(ModelTier::from_model("gpt-4o-mini"), ModelTier::Fast);
        assert_eq!(ModelTier::from_model("gpt-4o"), ModelTier::Standard);
        assert_eq!(ModelTier::from_model("gpt-4-turbo"), ModelTier::Premium);
        assert_eq!(ModelTier::from_model("claude-3-haiku"), ModelTier::Fast);
        assert_eq!(ModelTier::from_model("claude-3-sonnet"), ModelTier::Standard);
        assert_eq!(ModelTier::from_model("claude-3-opus"), ModelTier::Premium);
    }

    #[test]
    fn test_cost_multiplier() {
        assert_eq!(ModelTier::Fast.cost_multiplier(), 1);
        assert_eq!(ModelTier::Standard.cost_multiplier(), 3);
        assert_eq!(ModelTier::Premium.cost_multiplier(), 10);
    }
}
