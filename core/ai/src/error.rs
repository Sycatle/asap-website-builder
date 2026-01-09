//! AI Error types

use thiserror::Error;

/// Result type alias for AI operations
pub type AIResult<T> = Result<T, AIError>;

/// AI-specific errors
#[derive(Debug, Error)]
pub enum AIError {
    #[error("Rate limit exceeded. Retry after {retry_after_secs} seconds")]
    RateLimitExceeded { retry_after_secs: u64 },

    #[error("Context too long: {tokens} tokens exceeds limit of {limit}")]
    ContextTooLong { tokens: usize, limit: usize },

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Provider error: {provider} - {message}")]
    ProviderError { provider: String, message: String },

    #[error("Provider unavailable: {0}")]
    ProviderUnavailable(String),

    #[error("Authentication error: {0}")]
    AuthenticationError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Website not found: {0}")]
    WebsiteNotFound(uuid::Uuid),

    #[error("Section not found: {0}")]
    SectionNotFound(uuid::Uuid),

    #[error("Invalid action: {0}")]
    InvalidAction(String),

    #[error("Content filtered: {0}")]
    ContentFiltered(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Redis error: {0}")]
    RedisError(#[from] redis::RedisError),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AIError {
    /// Get the error code for API responses
    pub fn code(&self) -> &'static str {
        match self {
            Self::RateLimitExceeded { .. } => "RATE_LIMIT_EXCEEDED",
            Self::ContextTooLong { .. } => "CONTEXT_TOO_LONG",
            Self::InvalidRequest(_) => "INVALID_REQUEST",
            Self::ProviderError { .. } => "PROVIDER_ERROR",
            Self::ProviderUnavailable(_) => "PROVIDER_UNAVAILABLE",
            Self::AuthenticationError(_) => "AUTHENTICATION_ERROR",
            Self::PermissionDenied(_) => "PERMISSION_DENIED",
            Self::WebsiteNotFound(_) => "WEBSITE_NOT_FOUND",
            Self::SectionNotFound(_) => "SECTION_NOT_FOUND",
            Self::InvalidAction(_) => "INVALID_ACTION",
            Self::ContentFiltered(_) => "CONTENT_FILTERED",
            Self::ConfigError(_) => "CONFIG_ERROR",
            Self::SerializationError(_) => "SERIALIZATION_ERROR",
            Self::HttpError(_) => "HTTP_ERROR",
            Self::RedisError(_) => "REDIS_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    /// Whether this error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::RateLimitExceeded { .. }
                | Self::ProviderUnavailable(_)
                | Self::HttpError(_)
                | Self::RedisError(_)
        )
    }

    /// Get retry delay in seconds (if applicable)
    pub fn retry_after(&self) -> Option<u64> {
        match self {
            Self::RateLimitExceeded { retry_after_secs } => Some(*retry_after_secs),
            Self::ProviderUnavailable(_) => Some(5),
            Self::HttpError(_) => Some(2),
            _ => None,
        }
    }
}
