//! Anthropic (Claude) Provider implementation

use async_trait::async_trait;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, instrument};

use crate::config::AnthropicConfig;
use crate::error::{AIError, AIResult};
use crate::types::{Message, Role, TokenUsage};

use super::traits::{AIProvider, ChatCompletion, TokenStream};

/// Anthropic Claude API provider
pub struct AnthropicProvider {
    client: Client,
    config: AnthropicConfig,
}

impl AnthropicProvider {
    /// Create a new Anthropic provider
    pub fn new(config: AnthropicConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, config }
    }

    /// Extract system message from messages list
    fn extract_system(&self, messages: &[Message]) -> Option<String> {
        messages
            .iter()
            .find(|m| m.role == Role::System)
            .map(|m| m.content.clone())
    }

    /// Build the messages array for Anthropic API (excludes system)
    fn build_messages(&self, messages: &[Message]) -> Vec<AnthropicMessage> {
        messages
            .iter()
            .filter(|m| m.role != Role::System)
            .map(|m| AnthropicMessage {
                role: match m.role {
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                    Role::System => unreachable!(),
                },
                content: m.content.clone(),
            })
            .collect()
    }
}

#[async_trait]
impl AIProvider for AnthropicProvider {
    fn id(&self) -> &str {
        "anthropic"
    }

    fn name(&self) -> &str {
        "Anthropic Claude"
    }

    fn is_available(&self) -> bool {
        !self.config.api_key.is_empty()
    }

    #[instrument(skip(self, messages), fields(provider = "anthropic"))]
    async fn chat(&self, messages: Vec<Message>, model: Option<&str>) -> AIResult<ChatCompletion> {
        let model = model.unwrap_or(&self.config.model);
        let url = format!("{}/messages", self.config.base_url);

        let system = self.extract_system(&messages);
        let api_messages = self.build_messages(&messages);

        let request = AnthropicChatRequest {
            model: model.to_string(),
            messages: api_messages,
            system,
            max_tokens: 4096,
            stream: false,
        };

        debug!("Sending chat request to Anthropic: model={}", model);

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("Anthropic API error: {} - {}", status, error_text);

            if status.as_u16() == 429 {
                return Err(AIError::RateLimitExceeded {
                    retry_after_secs: 60,
                });
            }

            return Err(AIError::ProviderError {
                provider: "anthropic".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        let response: AnthropicChatResponse = response.json().await?;

        let content = response
            .content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        let usage = TokenUsage {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens,
            estimated_cost: calculate_cost(
                model,
                response.usage.input_tokens,
                response.usage.output_tokens,
            ),
        };

        Ok(ChatCompletion {
            content,
            usage,
            finish_reason: Some(response.stop_reason),
        })
    }

    #[instrument(skip(self, messages), fields(provider = "anthropic"))]
    async fn chat_stream(
        &self,
        messages: Vec<Message>,
        model: Option<&str>,
    ) -> AIResult<TokenStream> {
        let model = model.unwrap_or(&self.config.model).to_string();
        let url = format!("{}/messages", self.config.base_url);

        let system = self.extract_system(&messages);
        let api_messages = self.build_messages(&messages);

        let request = AnthropicChatRequest {
            model: model.clone(),
            messages: api_messages,
            system,
            max_tokens: 4096,
            stream: true,
        };

        debug!(
            "Sending streaming chat request to Anthropic: model={}",
            model
        );

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("Anthropic API error: {} - {}", status, error_text);

            if status.as_u16() == 429 {
                return Err(AIError::RateLimitExceeded {
                    retry_after_secs: 60,
                });
            }

            return Err(AIError::ProviderError {
                provider: "anthropic".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        // Parse SSE stream
        let stream = response.bytes_stream();
        let parsed_stream = parse_sse_stream(stream);

        Ok(Box::pin(parsed_stream))
    }
}

/// Parse SSE stream from Anthropic
fn parse_sse_stream(
    stream: impl Stream<Item = Result<Bytes, reqwest::Error>> + Send + 'static,
) -> impl Stream<Item = AIResult<String>> + Send {
    stream.filter_map(|result| async move {
        match result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);

                // Parse SSE format
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let data = &line[6..];

                        // Parse JSON chunk
                        if let Ok(event) = serde_json::from_str::<AnthropicStreamEvent>(data) {
                            match event {
                                AnthropicStreamEvent::ContentBlockDelta { delta } => {
                                    if let Some(text) = delta.text {
                                        return Some(Ok(text));
                                    }
                                }
                                AnthropicStreamEvent::MessageStop => {
                                    return None;
                                }
                                _ => {}
                            }
                        }
                    }
                }
                None
            }
            Err(e) => Some(Err(AIError::HttpError(e))),
        }
    })
}

/// Calculate estimated cost for Anthropic models
fn calculate_cost(model: &str, input_tokens: u32, output_tokens: u32) -> f64 {
    let (input_rate, output_rate) = match model {
        m if m.contains("claude-3-5-sonnet") => (0.003, 0.015), // per 1K tokens
        m if m.contains("claude-3-opus") => (0.015, 0.075),
        m if m.contains("claude-3-sonnet") => (0.003, 0.015),
        m if m.contains("claude-3-haiku") => (0.00025, 0.00125),
        _ => (0.003, 0.015), // Default to Sonnet pricing
    };

    (input_tokens as f64 / 1000.0 * input_rate) + (output_tokens as f64 / 1000.0 * output_rate)
}

// Anthropic API types

#[derive(Debug, Serialize)]
struct AnthropicChatRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    max_tokens: u32,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicChatResponse {
    content: Vec<AnthropicContent>,
    stop_reason: String,
    usage: AnthropicUsage,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum AnthropicStreamEvent {
    MessageStart,
    ContentBlockStart,
    ContentBlockDelta { delta: AnthropicDelta },
    ContentBlockStop,
    MessageDelta,
    MessageStop,
    Ping,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
struct AnthropicDelta {
    text: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cost_calculation() {
        // Claude 3.5 Sonnet: $0.003/1K input, $0.015/1K output
        let cost = calculate_cost("claude-3-5-sonnet-20241022", 1000, 500);
        assert!((cost - 0.0105).abs() < 0.001); // 0.003 + 0.0075
    }

    #[test]
    fn test_extract_system() {
        let config = AnthropicConfig {
            api_key: "test".to_string(),
            base_url: "https://api.anthropic.com/v1".to_string(),
            model: "claude-3-5-sonnet-20241022".to_string(),
            timeout_secs: 60,
        };
        let provider = AnthropicProvider::new(config);

        let messages = vec![
            Message::system("You are helpful"),
            Message::user("Hello"),
        ];

        let system = provider.extract_system(&messages);
        assert_eq!(system, Some("You are helpful".to_string()));
    }

    #[test]
    fn test_build_messages_excludes_system() {
        let config = AnthropicConfig {
            api_key: "test".to_string(),
            base_url: "https://api.anthropic.com/v1".to_string(),
            model: "claude-3-5-sonnet-20241022".to_string(),
            timeout_secs: 60,
        };
        let provider = AnthropicProvider::new(config);

        let messages = vec![
            Message::system("You are helpful"),
            Message::user("Hello"),
            Message::assistant("Hi!"),
        ];

        let anthropic_messages = provider.build_messages(&messages);
        assert_eq!(anthropic_messages.len(), 2); // System excluded
        assert_eq!(anthropic_messages[0].role, "user");
        assert_eq!(anthropic_messages[1].role, "assistant");
    }
}
