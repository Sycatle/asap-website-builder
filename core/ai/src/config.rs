//! AI Configuration

use serde::{Deserialize, Serialize};

/// AI module configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    /// OpenAI configuration
    pub openai: OpenAIConfig,

    /// Anthropic configuration
    pub anthropic: AnthropicConfig,

    /// Default provider to use
    #[serde(default = "default_provider")]
    pub default_provider: String,

    /// Fallback chain (provider names in order)
    #[serde(default = "default_fallback_chain")]
    pub fallback_chain: Vec<String>,

    /// Rate limiting configuration
    pub rate_limits: RateLimitConfig,

    /// Context limits by plan
    pub context_limits: ContextLimitsConfig,
}

fn default_provider() -> String {
    "openai".to_string()
}

fn default_fallback_chain() -> Vec<String> {
    vec!["openai".to_string(), "anthropic".to_string()]
}

/// OpenAI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    /// API key (from env: OPENAI_API_KEY)
    #[serde(default)]
    pub api_key: String,

    /// Base URL for API calls
    #[serde(default = "default_openai_base_url")]
    pub base_url: String,

    /// Default model for chat (fast, for intent analysis)
    #[serde(default = "default_openai_model")]
    pub model: String,

    /// Model for final response (higher quality)
    #[serde(default = "default_openai_response_model")]
    pub response_model: String,

    /// Default model for image generation
    #[serde(default = "default_image_model")]
    pub image_model: String,

    /// Request timeout in seconds
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,

    /// Max tokens for final response (default: 4096)
    #[serde(default = "default_max_tokens")]
    pub max_response_tokens: u32,

    /// Temperature for final response (default: 0.7)
    #[serde(default = "default_temperature")]
    pub response_temperature: f32,
}

fn default_openai_base_url() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_openai_model() -> String {
    "gpt-4o-mini".to_string()
}

fn default_openai_response_model() -> String {
    "gpt-4o".to_string()
}

fn default_image_model() -> String {
    "dall-e-3".to_string()
}

fn default_timeout() -> u64 {
    60
}

fn default_max_tokens() -> u32 {
    4096
}

fn default_temperature() -> f32 {
    0.7
}

/// Anthropic provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    /// API key (from env: ANTHROPIC_API_KEY)
    #[serde(default)]
    pub api_key: String,

    /// Base URL for API calls
    #[serde(default = "default_anthropic_base_url")]
    pub base_url: String,

    /// Default model
    #[serde(default = "default_anthropic_model")]
    pub model: String,

    /// Request timeout in seconds
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_anthropic_base_url() -> String {
    "https://api.anthropic.com/v1".to_string()
}

fn default_anthropic_model() -> String {
    "claude-3-5-sonnet-20241022".to_string()
}

/// Rate limit configuration per plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub free: PlanLimits,
    pub pro: PlanLimits,
    pub business: PlanLimits,
    pub enterprise: PlanLimits,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            free: PlanLimits {
                messages_per_day: 20,
                images_per_month: 5,
                voice_minutes_per_month: 10,
            },
            pro: PlanLimits {
                messages_per_day: 200,
                images_per_month: 50,
                voice_minutes_per_month: 60,
            },
            business: PlanLimits {
                messages_per_day: 1000,
                images_per_month: 200,
                voice_minutes_per_month: 300,
            },
            enterprise: PlanLimits {
                messages_per_day: i64::MAX,
                images_per_month: i64::MAX,
                voice_minutes_per_month: i64::MAX,
            },
        }
    }
}

/// Limits for a specific plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanLimits {
    pub messages_per_day: i64,
    pub images_per_month: i64,
    pub voice_minutes_per_month: i64,
}

/// Context token limits by plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextLimitsConfig {
    pub free: usize,
    pub pro: usize,
    pub business: usize,
    pub enterprise: usize,
}

impl Default for ContextLimitsConfig {
    fn default() -> Self {
        Self {
            free: 4_000,
            pro: 16_000,
            business: 32_000,
            enterprise: 128_000,
        }
    }
}

impl AIConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        Self {
            openai: OpenAIConfig {
                api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
                base_url: std::env::var("OPENAI_BASE_URL")
                    .unwrap_or_else(|_| default_openai_base_url()),
                model: std::env::var("OPENAI_MODEL").unwrap_or_else(|_| default_openai_model()),
                response_model: std::env::var("OPENAI_RESPONSE_MODEL")
                    .unwrap_or_else(|_| default_openai_response_model()),
                image_model: std::env::var("OPENAI_IMAGE_MODEL")
                    .unwrap_or_else(|_| default_image_model()),
                timeout_secs: std::env::var("OPENAI_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(default_timeout()),
                max_response_tokens: std::env::var("OPENAI_MAX_RESPONSE_TOKENS")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(default_max_tokens()),
                response_temperature: std::env::var("OPENAI_RESPONSE_TEMPERATURE")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(default_temperature()),
            },
            anthropic: AnthropicConfig {
                api_key: std::env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
                base_url: std::env::var("ANTHROPIC_BASE_URL")
                    .unwrap_or_else(|_| default_anthropic_base_url()),
                model: std::env::var("ANTHROPIC_MODEL")
                    .unwrap_or_else(|_| default_anthropic_model()),
                timeout_secs: std::env::var("ANTHROPIC_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(default_timeout()),
            },
            default_provider: std::env::var("AI_DEFAULT_PROVIDER")
                .unwrap_or_else(|_| default_provider()),
            fallback_chain: std::env::var("AI_FALLBACK_CHAIN")
                .map(|s| s.split(',').map(|s| s.trim().to_string()).collect())
                .unwrap_or_else(|_| default_fallback_chain()),
            rate_limits: RateLimitConfig::default(),
            context_limits: ContextLimitsConfig::default(),
        }
    }

    /// Check if OpenAI is configured
    pub fn openai_configured(&self) -> bool {
        !self.openai.api_key.is_empty()
    }

    /// Check if Anthropic is configured
    pub fn anthropic_configured(&self) -> bool {
        !self.anthropic.api_key.is_empty()
    }

    /// Get limits for a plan
    pub fn get_plan_limits(&self, plan: &str) -> &PlanLimits {
        match plan.to_lowercase().as_str() {
            "pro" => &self.rate_limits.pro,
            "business" => &self.rate_limits.business,
            "enterprise" => &self.rate_limits.enterprise,
            _ => &self.rate_limits.free,
        }
    }

    /// Get context limit for a plan
    pub fn get_context_limit(&self, plan: &str) -> usize {
        match plan.to_lowercase().as_str() {
            "pro" => self.context_limits.pro,
            "business" => self.context_limits.business,
            "enterprise" => self.context_limits.enterprise,
            _ => self.context_limits.free,
        }
    }
}

impl Default for AIConfig {
    fn default() -> Self {
        Self::from_env()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AIConfig::default();
        assert_eq!(config.default_provider, "openai");
        assert_eq!(config.fallback_chain, vec!["openai", "anthropic"]);
    }

    #[test]
    fn test_plan_limits() {
        let config = AIConfig::default();
        assert_eq!(config.get_plan_limits("free").messages_per_day, 20);
        assert_eq!(config.get_plan_limits("pro").messages_per_day, 200);
        assert_eq!(config.get_plan_limits("business").messages_per_day, 1000);
    }

    #[test]
    fn test_context_limits() {
        let config = AIConfig::default();
        assert_eq!(config.get_context_limit("free"), 4_000);
        assert_eq!(config.get_context_limit("pro"), 16_000);
    }
}
