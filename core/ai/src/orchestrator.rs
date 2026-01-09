//! AI Orchestrator
//!
//! Main entry point for AI operations. Coordinates providers, rate limiting,
//! context building, and action execution.

use std::sync::Arc;
use tracing::{debug, info, instrument};
use uuid::Uuid;

use crate::actions::{ActionExecutor, ActionParser};
use crate::config::AIConfig;
use crate::context::{build_system_prompt, ContextBuilder};
use crate::error::AIResult;
use crate::providers::traits::TokenStream;
use crate::rate_limiter::{AIRateLimiter, RateLimitResource, RateLimitStatus};
use crate::router::ModelRouter;
use crate::types::{AIChatRequest, AIChatResponse, Message, WebsiteContext};

/// Main AI orchestrator
pub struct AIOrchestrator {
    router: ModelRouter,
    rate_limiter: Option<Arc<AIRateLimiter>>,
    action_parser: ActionParser,
    action_executor: ActionExecutor,
    context_builder: ContextBuilder,
    config: AIConfig,
}

impl AIOrchestrator {
    /// Create a new orchestrator with rate limiter
    pub fn new(config: AIConfig, rate_limiter: Option<Arc<AIRateLimiter>>) -> Self {
        let router = ModelRouter::from_config(&config);

        Self {
            router,
            rate_limiter,
            action_parser: ActionParser::new(),
            action_executor: ActionExecutor::new(),
            context_builder: ContextBuilder::new(),
            config,
        }
    }

    /// Create orchestrator without rate limiter (for testing)
    pub fn new_without_rate_limiter(config: AIConfig) -> Self {
        Self::new(config, None)
    }

    /// Process a chat request (non-streaming)
    #[instrument(skip(self, request, context), fields(website_id = %request.website_id))]
    pub async fn chat(
        &self,
        request: &AIChatRequest,
        context: WebsiteContext,
        account_id: Uuid,
        plan: &str,
    ) -> AIResult<(AIChatResponse, Option<RateLimitStatus>)> {
        // Check rate limit
        let rate_status = if let Some(limiter) = &self.rate_limiter {
            Some(
                limiter
                    .check_and_consume(&account_id.to_string(), plan, RateLimitResource::Messages)
                    .await?,
            )
        } else {
            None
        };

        // Build messages with history
        let system_prompt = build_system_prompt(&context);
        let mut messages = vec![Message::system(system_prompt)];
        
        // Add conversation history
        for msg in &request.history {
            messages.push(msg.clone());
        }
        
        // Add current user message
        messages.push(Message::user(&request.message));

        info!(
            account_id = %account_id,
            message_length = request.message.len(),
            history_length = request.history.len(),
            "Processing chat request"
        );

        // Call AI provider
        let completion = self.router.chat(messages, None, None).await?;

        // Parse actions from response
        let actions = self.action_parser.extract_actions(&completion.content);
        let text = self.action_parser.extract_text(&completion.content);

        // Execute actions
        if !actions.is_empty() {
            debug!("Executing {} actions", actions.len());
            let results = self
                .action_executor
                .execute_batch(&actions, request.website_id, account_id)
                .await;

            // Log any failures
            for (i, result) in results.iter().enumerate() {
                if let Err(e) = result {
                    tracing::warn!("Action {} failed: {}", i, e);
                }
            }
        }

        let response = AIChatResponse {
            id: Uuid::new_v4(),
            conversation_id: request.conversation_id.unwrap_or_else(Uuid::new_v4),
            message: text,
            actions,
            suggestions: vec![],
            usage: completion.usage,
        };

        Ok((response, rate_status))
    }

    /// Process a chat request with streaming
    #[instrument(skip(self, request, context), fields(website_id = %request.website_id))]
    pub async fn chat_stream(
        &self,
        request: &AIChatRequest,
        context: WebsiteContext,
        account_id: Uuid,
        plan: &str,
    ) -> AIResult<(TokenStream, Option<RateLimitStatus>)> {
        // Check rate limit
        let rate_status = if let Some(limiter) = &self.rate_limiter {
            Some(
                limiter
                    .check_and_consume(&account_id.to_string(), plan, RateLimitResource::Messages)
                    .await?,
            )
        } else {
            None
        };

        // Build messages with history
        let system_prompt = build_system_prompt(&context);
        let mut messages = vec![Message::system(system_prompt)];
        
        // Add conversation history
        for msg in &request.history {
            messages.push(msg.clone());
        }
        
        // Add current user message
        messages.push(Message::user(&request.message));

        info!(
            account_id = %account_id,
            message_length = request.message.len(),
            history_length = request.history.len(),
            "Processing streaming chat request"
        );

        // Get stream from provider
        let stream = self.router.chat_stream(messages, None, None).await?;

        Ok((stream, rate_status))
    }

    /// Get the action parser (for extracting actions from streamed content)
    pub fn action_parser(&self) -> &ActionParser {
        &self.action_parser
    }

    /// Get the action executor
    pub fn action_executor(&self) -> &ActionExecutor {
        &self.action_executor
    }

    /// Get the context builder
    pub fn context_builder(&self) -> &ContextBuilder {
        &self.context_builder
    }

    /// Get the model router (for intent analysis)
    pub fn router(&self) -> &ModelRouter {
        &self.router
    }

    /// Get available providers
    pub fn available_providers(&self) -> Vec<&str> {
        self.router.available_providers()
    }

    /// Check if any AI provider is configured
    pub fn is_configured(&self) -> bool {
        !self.router.available_providers().is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{AnthropicConfig, OpenAIConfig};
    use serde_json::json;

    fn test_config() -> AIConfig {
        AIConfig {
            openai: OpenAIConfig {
                api_key: String::new(), // No real key for tests
                ..Default::default()
            },
            anthropic: AnthropicConfig {
                api_key: String::new(),
                ..Default::default()
            },
            ..Default::default()
        }
    }

    fn test_context() -> WebsiteContext {
        let builder = ContextBuilder::new();
        builder.build(
            Uuid::new_v4(),
            "test-site",
            Some("Test Site"),
            None,
            vec![],
            json!({}),
        )
    }

    #[test]
    fn test_orchestrator_creation() {
        let config = test_config();
        let orchestrator = AIOrchestrator::new_without_rate_limiter(config);
        
        // No providers configured (no API keys)
        assert!(!orchestrator.is_configured());
    }

    #[test]
    fn test_action_parsing_integration() {
        let config = test_config();
        let orchestrator = AIOrchestrator::new_without_rate_limiter(config);

        let response = r#"
I'll update that for you.

```json
{"type": "UPDATE_SECTION_PROPERTY", "section_id": "550e8400-e29b-41d4-a716-446655440000", "property": "headline", "value": "Hello World"}
```
"#;

        let actions = orchestrator.action_parser().extract_actions(response);
        assert_eq!(actions.len(), 1);
    }
}
