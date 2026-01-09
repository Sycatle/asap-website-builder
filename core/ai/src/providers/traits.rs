//! AI Provider trait

use async_trait::async_trait;
use futures::Stream;
use std::pin::Pin;

use crate::error::AIResult;
use crate::types::{GeneratedImage, ImageGenRequest, Message, TokenUsage};

/// Stream of tokens from AI provider
pub type TokenStream = Pin<Box<dyn Stream<Item = AIResult<String>> + Send>>;

/// Chat completion response from provider
#[derive(Debug, Clone)]
pub struct ChatCompletion {
    pub content: String,
    pub usage: TokenUsage,
    pub finish_reason: Option<String>,
}

/// Trait for AI providers (OpenAI, Anthropic, etc.)
#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Provider identifier
    fn id(&self) -> &str;

    /// Provider display name
    fn name(&self) -> &str;

    /// Check if provider is available (has API key configured)
    fn is_available(&self) -> bool;

    /// Send a chat completion request (non-streaming)
    async fn chat(&self, messages: Vec<Message>, model: Option<&str>) -> AIResult<ChatCompletion>;

    /// Send a chat completion request with streaming
    async fn chat_stream(
        &self,
        messages: Vec<Message>,
        model: Option<&str>,
    ) -> AIResult<TokenStream>;

    /// Generate images (optional - not all providers support this)
    async fn generate_image(&self, request: ImageGenRequest) -> AIResult<Vec<GeneratedImage>> {
        let _ = request;
        Err(crate::error::AIError::ProviderError {
            provider: self.id().to_string(),
            message: "Image generation not supported by this provider".to_string(),
        })
    }

    /// Estimate token count for messages (rough estimate)
    fn estimate_tokens(&self, messages: &[Message]) -> usize {
        // Rough estimate: ~4 chars per token
        messages.iter().map(|m| m.content.len() / 4).sum()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    /// Mock provider for testing
    pub struct MockProvider {
        pub id: String,
        pub available: bool,
        pub responses: Arc<Mutex<Vec<String>>>,
    }

    impl MockProvider {
        pub fn new(id: &str, responses: Vec<String>) -> Self {
            Self {
                id: id.to_string(),
                available: true,
                responses: Arc::new(Mutex::new(responses)),
            }
        }
    }

    #[async_trait]
    impl AIProvider for MockProvider {
        fn id(&self) -> &str {
            &self.id
        }

        fn name(&self) -> &str {
            "Mock Provider"
        }

        fn is_available(&self) -> bool {
            self.available
        }

        async fn chat(
            &self,
            _messages: Vec<Message>,
            _model: Option<&str>,
        ) -> AIResult<ChatCompletion> {
            let mut responses = self.responses.lock().await;
            let content = responses.pop().unwrap_or_else(|| "Mock response".to_string());
            Ok(ChatCompletion {
                content,
                usage: TokenUsage::default(),
                finish_reason: Some("stop".to_string()),
            })
        }

        async fn chat_stream(
            &self,
            _messages: Vec<Message>,
            _model: Option<&str>,
        ) -> AIResult<TokenStream> {
            let responses = self.responses.lock().await;
            let content = responses.last().cloned().unwrap_or_else(|| "Mock".to_string());
            
            let stream = futures::stream::iter(
                content
                    .chars()
                    .map(|c| Ok(c.to_string()))
                    .collect::<Vec<_>>(),
            );
            
            Ok(Box::pin(stream))
        }
    }
}
