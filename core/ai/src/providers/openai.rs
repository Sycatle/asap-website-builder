//! OpenAI Provider implementation

use async_trait::async_trait;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, instrument};

use crate::config::OpenAIConfig;
use crate::error::{AIError, AIResult};
use crate::types::{GeneratedImage, ImageGenRequest, ImageSize, ImageStyle, Message, Role, TokenUsage};

use super::traits::{AIProvider, ChatCompletion, TokenStream};

/// OpenAI API provider
pub struct OpenAIProvider {
    client: Client,
    config: OpenAIConfig,
}

impl OpenAIProvider {
    /// Create a new OpenAI provider
    pub fn new(config: OpenAIConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, config }
    }

    /// Build the messages array for the API
    fn build_messages(&self, messages: &[Message]) -> Vec<OpenAIMessage> {
        messages
            .iter()
            .map(|m| OpenAIMessage {
                role: match m.role {
                    Role::System => "system".to_string(),
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                },
                content: m.content.clone(),
            })
            .collect()
    }
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    fn id(&self) -> &str {
        "openai"
    }

    fn name(&self) -> &str {
        "OpenAI"
    }

    fn is_available(&self) -> bool {
        !self.config.api_key.is_empty()
    }

    #[instrument(skip(self, messages), fields(provider = "openai"))]
    async fn chat(&self, messages: Vec<Message>, model: Option<&str>) -> AIResult<ChatCompletion> {
        let model = model.unwrap_or(&self.config.model);
        let url = format!("{}/chat/completions", self.config.base_url);

        let request = OpenAIChatRequest {
            model: model.to_string(),
            messages: self.build_messages(&messages),
            stream: false,
            temperature: Some(0.7),
            max_tokens: None,
        };

        debug!("Sending chat request to OpenAI: model={}", model);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {} - {}", status, error_text);

            if status.as_u16() == 429 {
                return Err(AIError::RateLimitExceeded {
                    retry_after_secs: 60,
                });
            }

            return Err(AIError::ProviderError {
                provider: "openai".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        let response: OpenAIChatResponse = response.json().await?;

        let content = response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        let usage = TokenUsage {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
            estimated_cost: calculate_cost(
                model,
                response.usage.prompt_tokens,
                response.usage.completion_tokens,
            ),
        };

        Ok(ChatCompletion {
            content,
            usage,
            finish_reason: response.choices.first().and_then(|c| c.finish_reason.clone()),
        })
    }

    #[instrument(skip(self, messages), fields(provider = "openai"))]
    async fn chat_stream(
        &self,
        messages: Vec<Message>,
        model: Option<&str>,
    ) -> AIResult<TokenStream> {
        let model = model.unwrap_or(&self.config.model).to_string();
        let url = format!("{}/chat/completions", self.config.base_url);

        let request = OpenAIChatRequest {
            model: model.clone(),
            messages: self.build_messages(&messages),
            stream: true,
            temperature: Some(0.7),
            max_tokens: None,
        };

        debug!("Sending streaming chat request to OpenAI: model={}", model);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {} - {}", status, error_text);

            if status.as_u16() == 429 {
                return Err(AIError::RateLimitExceeded {
                    retry_after_secs: 60,
                });
            }

            return Err(AIError::ProviderError {
                provider: "openai".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        // Parse SSE stream
        let stream = response.bytes_stream();
        let parsed_stream = parse_sse_stream(stream);

        Ok(Box::pin(parsed_stream))
    }

    #[instrument(skip(self, request), fields(provider = "openai"))]
    async fn generate_image(&self, request: ImageGenRequest) -> AIResult<Vec<GeneratedImage>> {
        let url = format!("{}/images/generations", self.config.base_url);

        let size = request.size.unwrap_or(ImageSize::Square).as_str();
        let style = match request.style.unwrap_or(ImageStyle::Natural) {
            ImageStyle::Natural => "natural",
            ImageStyle::Vivid => "vivid",
        };

        let api_request = OpenAIImageRequest {
            model: self.config.image_model.clone(),
            prompt: request.prompt.clone(),
            n: request.count.min(4) as u32,
            size: size.to_string(),
            style: style.to_string(),
            response_format: "url".to_string(),
        };

        debug!(
            "Generating {} images with DALL-E: size={}, style={}",
            request.count, size, style
        );

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&api_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI Image API error: {} - {}", status, error_text);

            return Err(AIError::ProviderError {
                provider: "openai".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        let response: OpenAIImageResponse = response.json().await?;

        let images = response
            .data
            .into_iter()
            .map(|img| GeneratedImage {
                url: img.url,
                revised_prompt: img.revised_prompt.unwrap_or_default(),
            })
            .collect();

        Ok(images)
    }
}

/// Parse SSE stream from OpenAI
fn parse_sse_stream(
    stream: impl Stream<Item = Result<Bytes, reqwest::Error>> + Send + 'static,
) -> impl Stream<Item = AIResult<String>> + Send {
    stream.filter_map(|result| async move {
        match result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                
                // Parse SSE format: data: {...}\n\n
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        
                        // Check for stream end
                        if data == "[DONE]" {
                            return None;
                        }

                        // Parse JSON chunk
                        if let Ok(chunk) = serde_json::from_str::<OpenAIStreamChunk>(data) {
                            if let Some(choice) = chunk.choices.first() {
                                if let Some(content) = &choice.delta.content {
                                    return Some(Ok(content.clone()));
                                }
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

/// Calculate estimated cost for OpenAI models
fn calculate_cost(model: &str, prompt_tokens: u32, completion_tokens: u32) -> f64 {
    let (prompt_rate, completion_rate) = match model {
        "gpt-4o" | "gpt-4o-2024-08-06" => (0.005, 0.015), // per 1K tokens
        "gpt-4o-mini" => (0.00015, 0.0006),
        "gpt-4-turbo" => (0.01, 0.03),
        "gpt-4" => (0.03, 0.06),
        "gpt-3.5-turbo" => (0.0005, 0.0015),
        _ => (0.005, 0.015), // Default to gpt-4o pricing
    };

    (prompt_tokens as f64 / 1000.0 * prompt_rate)
        + (completion_tokens as f64 / 1000.0 * completion_rate)
}

// OpenAI API types

#[derive(Debug, Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIChatResponse {
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChunk {
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChoice {
    delta: OpenAIDelta,
}

#[derive(Debug, Deserialize)]
struct OpenAIDelta {
    content: Option<String>,
}

#[derive(Debug, Serialize)]
struct OpenAIImageRequest {
    model: String,
    prompt: String,
    n: u32,
    size: String,
    style: String,
    response_format: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIImageResponse {
    data: Vec<OpenAIImageData>,
}

#[derive(Debug, Deserialize)]
struct OpenAIImageData {
    url: String,
    revised_prompt: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cost_calculation() {
        // GPT-4o: $0.005/1K input, $0.015/1K output
        let cost = calculate_cost("gpt-4o", 1000, 500);
        assert!((cost - 0.0125).abs() < 0.001); // 0.005 + 0.0075

        // GPT-3.5 Turbo: $0.0005/1K input, $0.0015/1K output
        let cost = calculate_cost("gpt-3.5-turbo", 1000, 500);
        assert!((cost - 0.00125).abs() < 0.0001); // 0.0005 + 0.00075
    }

    #[test]
    fn test_build_messages() {
        let config = OpenAIConfig {
            api_key: "test".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4o".to_string(),
            image_model: "dall-e-3".to_string(),
            timeout_secs: 60,
        };
        let provider = OpenAIProvider::new(config);

        let messages = vec![
            Message::system("You are helpful"),
            Message::user("Hello"),
        ];

        let openai_messages = provider.build_messages(&messages);
        assert_eq!(openai_messages.len(), 2);
        assert_eq!(openai_messages[0].role, "system");
        assert_eq!(openai_messages[1].role, "user");
    }
}
