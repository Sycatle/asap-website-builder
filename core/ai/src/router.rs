//! Model Router with fallback chain

use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, warn};

use crate::config::AIConfig;
use crate::error::{AIError, AIResult};
use crate::providers::{AIProvider, AnthropicProvider, OpenAIProvider};
use crate::types::Message;

use crate::providers::traits::{ChatCompletion, TokenStream};

/// Router that manages multiple AI providers with fallback support
pub struct ModelRouter {
    providers: HashMap<String, Arc<dyn AIProvider>>,
    fallback_chain: Vec<String>,
    default_provider: String,
}

impl ModelRouter {
    /// Create a new router from configuration
    pub fn from_config(config: &AIConfig) -> Self {
        let mut providers: HashMap<String, Arc<dyn AIProvider>> = HashMap::new();

        // Initialize OpenAI provider if configured
        if config.openai_configured() {
            let openai = OpenAIProvider::new(config.openai.clone());
            providers.insert("openai".to_string(), Arc::new(openai));
            debug!("OpenAI provider initialized");
        }

        // Initialize Anthropic provider if configured
        if config.anthropic_configured() {
            let anthropic = AnthropicProvider::new(config.anthropic.clone());
            providers.insert("anthropic".to_string(), Arc::new(anthropic));
            debug!("Anthropic provider initialized");
        }

        // Filter fallback chain to only include available providers
        let fallback_chain: Vec<String> = config
            .fallback_chain
            .iter()
            .filter(|p| providers.contains_key(*p))
            .cloned()
            .collect();

        // Determine default provider
        let default_provider = if providers.contains_key(&config.default_provider) {
            config.default_provider.clone()
        } else {
            fallback_chain.first().cloned().unwrap_or_default()
        };

        Self {
            providers,
            fallback_chain,
            default_provider,
        }
    }

    /// Get available providers
    pub fn available_providers(&self) -> Vec<&str> {
        self.providers
            .values()
            .filter(|p| p.is_available())
            .map(|p| p.id())
            .collect()
    }

    /// Get a specific provider by ID
    pub fn get_provider(&self, id: &str) -> Option<Arc<dyn AIProvider>> {
        self.providers.get(id).cloned()
    }

    /// Get the default provider
    pub fn default_provider(&self) -> Option<Arc<dyn AIProvider>> {
        self.providers.get(&self.default_provider).cloned()
    }

    /// Route a chat request with automatic fallback
    pub async fn chat(
        &self,
        messages: Vec<Message>,
        max_tokens: Option<u32>,
        model: Option<&str>,
    ) -> AIResult<ChatCompletion> {
        // Build the chain of providers to try
        let mut chain = self.build_provider_chain(None);

        if chain.is_empty() {
            return Err(AIError::ProviderUnavailable(
                "No AI providers available".to_string(),
            ));
        }

        let mut last_error = None;

        // Note: max_tokens is passed but providers currently ignore it
        // This is a placeholder for future provider-level max_tokens support
        let _ = max_tokens;

        for provider_id in chain.drain(..) {
            if let Some(provider) = self.providers.get(&provider_id) {
                if !provider.is_available() {
                    continue;
                }

                debug!("Trying provider: {}", provider_id);

                match provider.chat(messages.clone(), model).await {
                    Ok(response) => {
                        debug!("Success with provider: {}", provider_id);
                        return Ok(response);
                    }
                    Err(e) => {
                        warn!("Provider {} failed: {}", provider_id, e);

                        // Don't fallback on certain errors
                        if !e.is_retryable() && !matches!(e, AIError::ProviderUnavailable(_)) {
                            return Err(e);
                        }

                        last_error = Some(e);
                    }
                }
            }
        }

        Err(last_error
            .unwrap_or_else(|| AIError::ProviderUnavailable("All providers failed".to_string())))
    }

    /// Route a streaming chat request with automatic fallback
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>,
        preferred_provider: Option<&str>,
        model: Option<&str>,
    ) -> AIResult<TokenStream> {
        // Build the chain of providers to try
        let mut chain = self.build_provider_chain(preferred_provider);

        if chain.is_empty() {
            return Err(AIError::ProviderUnavailable(
                "No AI providers available".to_string(),
            ));
        }

        let mut last_error = None;

        for provider_id in chain.drain(..) {
            if let Some(provider) = self.providers.get(&provider_id) {
                if !provider.is_available() {
                    continue;
                }

                debug!("Trying streaming with provider: {}", provider_id);

                match provider.chat_stream(messages.clone(), model).await {
                    Ok(stream) => {
                        debug!("Streaming started with provider: {}", provider_id);
                        return Ok(stream);
                    }
                    Err(e) => {
                        warn!("Provider {} streaming failed: {}", provider_id, e);

                        if !e.is_retryable() && !matches!(e, AIError::ProviderUnavailable(_)) {
                            return Err(e);
                        }

                        last_error = Some(e);
                    }
                }
            }
        }

        Err(last_error.unwrap_or_else(|| {
            AIError::ProviderUnavailable("All providers failed for streaming".to_string())
        }))
    }

    /// Build the chain of providers to try
    fn build_provider_chain(&self, preferred: Option<&str>) -> Vec<String> {
        let mut chain = Vec::new();

        // Add preferred provider first if specified and available
        if let Some(preferred) = preferred {
            if self.providers.contains_key(preferred) {
                chain.push(preferred.to_string());
            }
        }

        // Add default provider if different from preferred
        if !chain.contains(&self.default_provider) {
            chain.push(self.default_provider.clone());
        }

        // Add rest of fallback chain
        for provider in &self.fallback_chain {
            if !chain.contains(provider) {
                chain.push(provider.clone());
            }
        }

        chain
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{AnthropicConfig, OpenAIConfig};

    fn test_config() -> AIConfig {
        AIConfig {
            openai: OpenAIConfig {
                api_key: "test-openai-key".to_string(),
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-4o-mini".to_string(),
                response_model: "gpt-4o".to_string(),
                image_model: "dall-e-3".to_string(),
                timeout_secs: 60,
                max_response_tokens: 4096,
                response_temperature: 0.7,
            },
            anthropic: AnthropicConfig {
                api_key: "test-anthropic-key".to_string(),
                base_url: "https://api.anthropic.com/v1".to_string(),
                model: "claude-3-5-sonnet-20241022".to_string(),
                timeout_secs: 60,
            },
            default_provider: "openai".to_string(),
            fallback_chain: vec!["openai".to_string(), "anthropic".to_string()],
            rate_limits: Default::default(),
            context_limits: Default::default(),
        }
    }

    #[test]
    fn test_router_initialization() {
        let config = test_config();
        let router = ModelRouter::from_config(&config);

        assert_eq!(router.available_providers().len(), 2);
        assert!(router.get_provider("openai").is_some());
        assert!(router.get_provider("anthropic").is_some());
    }

    #[test]
    fn test_provider_chain_building() {
        let config = test_config();
        let router = ModelRouter::from_config(&config);

        // No preference - use default
        let chain = router.build_provider_chain(None);
        assert_eq!(chain[0], "openai");

        // With preference
        let chain = router.build_provider_chain(Some("anthropic"));
        assert_eq!(chain[0], "anthropic");
        assert!(chain.contains(&"openai".to_string()));
    }

    #[test]
    fn test_empty_config() {
        let config = AIConfig {
            openai: OpenAIConfig {
                api_key: String::new(),
                ..Default::default()
            },
            anthropic: AnthropicConfig {
                api_key: String::new(),
                ..Default::default()
            },
            ..Default::default()
        };

        let router = ModelRouter::from_config(&config);
        assert!(router.available_providers().is_empty());
    }
}

impl Default for OpenAIConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4o-mini".to_string(),
            response_model: "gpt-4o".to_string(),
            image_model: "dall-e-3".to_string(),
            timeout_secs: 60,
            max_response_tokens: 4096,
            response_temperature: 0.7,
        }
    }
}

impl Default for AnthropicConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            base_url: "https://api.anthropic.com/v1".to_string(),
            model: "claude-3-5-sonnet-20241022".to_string(),
            timeout_secs: 60,
        }
    }
}

use crate::config::{AnthropicConfig, OpenAIConfig};
