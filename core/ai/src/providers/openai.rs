//! OpenAI Provider implementation

use async_trait::async_trait;
use bytes::Bytes;
use futures::Stream;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, instrument};

use crate::config::OpenAIConfig;
use crate::error::{AIError, AIResult};
use crate::tools::{ToolCall, ToolDefinition};
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
    
    /// Get config
    pub fn config(&self) -> &OpenAIConfig {
        &self.config
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
                content: Some(m.content.clone()),
                tool_calls: None,
                tool_call_id: None,
            })
            .collect()
    }
    
    /// Send a chat completion request with tools support
    #[instrument(skip(self, messages, tools), fields(provider = "openai"))]
    pub async fn chat_with_tools(
        &self,
        messages: Vec<Message>,
        tools: Option<&[ToolDefinition]>,
        model: Option<&str>,
        max_tokens: Option<u32>,
        temperature: Option<f32>,
    ) -> AIResult<ChatCompletionWithTools> {
        let model = model.unwrap_or(&self.config.response_model);
        let url = format!("{}/chat/completions", self.config.base_url);
        
        let max_tokens = max_tokens.unwrap_or(self.config.max_response_tokens);
        let temperature = temperature.unwrap_or(self.config.response_temperature);

        let request = OpenAIChatRequestWithTools {
            model: model.to_string(),
            messages: self.build_messages(&messages),
            stream: false,
            temperature: Some(temperature),
            max_tokens: Some(max_tokens),
            tools: tools.map(|t| t.to_vec()),
            tool_choice: if tools.is_some() { Some("auto".to_string()) } else { None },
        };

        debug!("Sending chat request with tools to OpenAI: model={}, tools={}", 
            model, tools.map(|t| t.len()).unwrap_or(0));

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

        let response: OpenAIChatResponseWithTools = response.json().await?;

        let choice = response.choices.first().ok_or_else(|| AIError::ProviderError {
            provider: "openai".to_string(),
            message: "No choices in response".to_string(),
        })?;

        let content = choice.message.content.clone();
        
        // Parse tool calls if present
        let tool_calls: Vec<ToolCall> = choice.message.tool_calls.as_ref()
            .map(|calls| {
                calls.iter().map(|tc| ToolCall {
                    id: tc.id.clone(),
                    tool_type: tc.tool_type.clone(),
                    function: crate::tools::FunctionCall {
                        name: tc.function.name.clone(),
                        arguments: tc.function.arguments.clone(),
                    },
                }).collect()
            })
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

        Ok(ChatCompletionWithTools {
            content,
            tool_calls,
            usage,
            finish_reason: choice.finish_reason.clone(),
        })
    }
    
    /// Continue conversation after tool results
    #[instrument(skip(self, messages, tool_results), fields(provider = "openai"))]
    pub async fn continue_with_tool_results(
        &self,
        messages: Vec<Message>,
        assistant_message: &OpenAIMessage,
        tool_results: Vec<crate::tools::ToolResult>,
        model: Option<&str>,
        max_tokens: Option<u32>,
        temperature: Option<f32>,
    ) -> AIResult<ChatCompletion> {
        let model = model.unwrap_or(&self.config.response_model);
        let url = format!("{}/chat/completions", self.config.base_url);
        
        let max_tokens = max_tokens.unwrap_or(self.config.max_response_tokens);
        let temperature = temperature.unwrap_or(self.config.response_temperature);
        
        // Build messages including the assistant's tool call and tool results
        let mut api_messages = self.build_messages(&messages);
        
        // Add assistant message with tool calls
        api_messages.push(assistant_message.clone());
        
        // Add tool results
        for result in tool_results {
            api_messages.push(OpenAIMessage {
                role: "tool".to_string(),
                content: Some(result.content),
                tool_calls: None,
                tool_call_id: Some(result.tool_call_id),
            });
        }

        let request = OpenAIChatRequestWithTools {
            model: model.to_string(),
            messages: api_messages,
            stream: false,
            temperature: Some(temperature),
            max_tokens: Some(max_tokens),
            tools: None,
            tool_choice: None,
        };

        debug!("Continuing conversation after tool results: model={}", model);

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

            return Err(AIError::ProviderError {
                provider: "openai".to_string(),
                message: format!("HTTP {}: {}", status, error_text),
            });
        }

        let response: OpenAIChatResponseWithTools = response.json().await?;

        let content = response
            .choices
            .first()
            .and_then(|c| c.message.content.clone())
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
    
    /// Send a chat completion request with Vision support (images)
    /// Uses GPT-4 Vision to analyze images alongside text
    #[instrument(skip(self, text, image_urls), fields(provider = "openai"))]
    pub async fn chat_with_vision(
        &self,
        text: &str,
        image_urls: Vec<String>,
        system_prompt: Option<&str>,
        model: Option<&str>,
        max_tokens: Option<u32>,
    ) -> AIResult<ChatCompletion> {
        // Use gpt-4o by default for vision (it has vision capabilities)
        let model = model.unwrap_or("gpt-4o");
        let url = format!("{}/chat/completions", self.config.base_url);
        let max_tokens = max_tokens.unwrap_or(2048);
        
        // Build content parts
        let mut content_parts = vec![
            VisionContentPart::Text { text: text.to_string() }
        ];
        
        // Add images
        for img_url in &image_urls {
            content_parts.push(VisionContentPart::ImageUrl {
                image_url: ImageUrlContent {
                    url: img_url.clone(),
                    detail: Some("high".to_string()), // High detail for design analysis
                },
            });
        }
        
        // Build messages
        let mut messages = Vec::new();
        
        // Add system prompt if provided
        if let Some(sys) = system_prompt {
            messages.push(OpenAIMessageVision {
                role: "system".to_string(),
                content: MessageContent::Text(sys.to_string()),
            });
        }
        
        // Add user message with vision content
        messages.push(OpenAIMessageVision {
            role: "user".to_string(),
            content: MessageContent::Parts(content_parts),
        });
        
        let request = serde_json::json!({
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7
        });

        debug!(
            "Sending vision request to OpenAI: model={}, images={}", 
            model, image_urls.len()
        );

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
            error!("OpenAI Vision API error: {} - {}", status, error_text);

            if status.as_u16() == 429 {
                return Err(AIError::RateLimitExceeded {
                    retry_after_secs: 60,
                });
            }

            return Err(AIError::ProviderError {
                provider: "openai".to_string(),
                message: format!("Vision HTTP {}: {}", status, error_text),
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

        debug!(
            "Vision response received: {} tokens, {} chars",
            usage.total_tokens,
            content.len()
        );

        Ok(ChatCompletion {
            content,
            usage,
            finish_reason: response.choices.first().and_then(|c| c.finish_reason.clone()),
        })
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
/// This correctly handles multiple events per chunk and partial chunks
fn parse_sse_stream(
    stream: impl Stream<Item = Result<Bytes, reqwest::Error>> + Send + 'static,
) -> impl Stream<Item = AIResult<String>> + Send {
    use futures::stream::StreamExt;
    
    // Use flat_map to emit multiple tokens from a single chunk
    stream
        .scan(String::new(), |buffer, result| {
            let output = match result {
                Ok(bytes) => {
                    buffer.push_str(&String::from_utf8_lossy(&bytes));
                    
                    let mut tokens = Vec::new();
                    
                    // Process complete lines
                    while let Some(pos) = buffer.find("\n\n") {
                        let event = buffer.drain(..pos + 2).collect::<String>();
                        
                        for line in event.lines() {
                            if let Some(data) = line.strip_prefix("data: ") {
                                // Check for stream end
                                if data == "[DONE]" {
                                    continue;
                                }
                                
                                // Parse JSON chunk
                                if let Ok(chunk) = serde_json::from_str::<OpenAIStreamChunk>(data) {
                                    if let Some(choice) = chunk.choices.first() {
                                        if let Some(content) = &choice.delta.content {
                                            if !content.is_empty() {
                                                tokens.push(Ok(content.clone()));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    tokens
                }
                Err(e) => vec![Err(AIError::HttpError(e))],
            };
            
            async move { Some(output) }
        })
        .flat_map(futures::stream::iter)
}

/// Calculate estimated cost for OpenAI models
fn calculate_cost(model: &str, prompt_tokens: u32, completion_tokens: u32) -> f64 {
    let (prompt_rate, completion_rate) = match model {
        "gpt-4o" | "gpt-4o-2024-08-06" | "gpt-4o-2024-11-20" => (0.0025, 0.01), // Updated pricing
        "gpt-4o-mini" | "gpt-4o-mini-2024-07-18" => (0.00015, 0.0006),
        "gpt-4-turbo" | "gpt-4-turbo-preview" => (0.01, 0.03),
        "gpt-4" | "gpt-4-0613" => (0.03, 0.06),
        "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" => (0.0005, 0.0015),
        "o1" | "o1-2024-12-17" => (0.015, 0.06), // o1 reasoning model
        "o1-mini" | "o1-mini-2024-09-12" => (0.003, 0.012),
        _ => (0.0025, 0.01), // Default to gpt-4o pricing
    };

    (prompt_tokens as f64 / 1000.0 * prompt_rate)
        + (completion_tokens as f64 / 1000.0 * completion_rate)
}

/// Chat completion with tool calls
#[derive(Debug, Clone)]
pub struct ChatCompletionWithTools {
    pub content: Option<String>,
    pub tool_calls: Vec<ToolCall>,
    pub usage: TokenUsage,
    pub finish_reason: Option<String>,
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

#[derive(Debug, Serialize)]
struct OpenAIChatRequestWithTools {
    model: String,
    messages: Vec<OpenAIMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<ToolDefinition>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<String>,
}

// ============================================================================
// Vision Support Types
// ============================================================================

/// Content part for Vision API - can be text or image
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum VisionContentPart {
    /// Text content
    Text { text: String },
    /// Image URL content
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrlContent },
}

/// Image URL content for Vision API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUrlContent {
    /// URL of the image (can be http/https or data: base64)
    pub url: String,
    /// Detail level: "low", "high", or "auto"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Message content that can be either simple text or vision parts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    /// Simple text content
    Text(String),
    /// Array of content parts (for vision)
    Parts(Vec<VisionContentPart>),
}

/// OpenAI message with Vision support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIMessageVision {
    pub role: String,
    pub content: MessageContent,
}

// ============================================================================
// Standard Message Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<OpenAIToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: OpenAIFunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIFunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIChatResponse {
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChatResponseWithTools {
    choices: Vec<OpenAIChoiceWithTools>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessageSimple,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoiceWithTools {
    message: OpenAIMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessageSimple {
    content: String,
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
        // GPT-4o with updated pricing
        let cost = calculate_cost("gpt-4o", 1000, 500);
        assert!((cost - 0.0075).abs() < 0.001); // 0.0025 + 0.005

        // GPT-3.5 Turbo: $0.0005/1K input, $0.0015/1K output
        let cost = calculate_cost("gpt-3.5-turbo", 1000, 500);
        assert!((cost - 0.00125).abs() < 0.0001); // 0.0005 + 0.00075
    }

    #[test]
    fn test_build_messages() {
        let config = OpenAIConfig {
            api_key: "test".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4o-mini".to_string(),
            response_model: "gpt-4o".to_string(),
            image_model: "dall-e-3".to_string(),
            timeout_secs: 60,
            max_response_tokens: 4096,
            response_temperature: 0.7,
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
