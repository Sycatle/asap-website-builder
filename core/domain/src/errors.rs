use thiserror::Error;

pub type Result<T> = std::result::Result<T, DomainError>;

#[derive(Debug, Error)]
pub enum DomainError {
    // ========== Validation Errors ==========
    #[error("Invalid email format: {0}")]
    InvalidEmail(String),

    #[error("Invalid slug format: {0}")]
    InvalidSlug(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    // ========== Not Found Errors ==========
    #[error("Website not found: {0}")]
    WebsiteNotFound(String),

    #[error("Account not found: {0}")]
    AccountNotFound(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Extension not found: {0}")]
    ExtensionNotFound(String),

    #[error("Collection not found: {0}")]
    CollectionNotFound(String),

    // ========== Auth Errors ==========
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Token expired")]
    TokenExpired,

    // ========== Conflict Errors ==========
    #[error("Slug already exists: {0}")]
    SlugAlreadyExists(String),

    #[error("Email already exists: {0}")]
    EmailAlreadyExists(String),

    #[error("Resource already exists: {0}")]
    Conflict(String),

    // ========== Rate Limiting ==========
    #[error("Rate limit exceeded: {0}")]
    RateLimited(String),

    // ========== Quota/Plan Errors ==========
    #[error("Storage quota exceeded")]
    QuotaExceeded,

    #[error("Feature not available on current plan: {0}")]
    PlanRestricted(String),

    // ========== External Service Errors ==========
    #[error("External service error: {0}")]
    ExternalServiceError(String),

    #[error("GitHub API error: {0}")]
    GitHubError(String),

    // ========== Internal Errors ==========
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),
}

impl DomainError {
    /// Check if this error should be retried
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            DomainError::DatabaseError(_)
                | DomainError::ExternalServiceError(_)
                | DomainError::GitHubError(_)
                | DomainError::RateLimited(_)
        )
    }

    /// Check if this is a client error (4xx)
    pub fn is_client_error(&self) -> bool {
        matches!(
            self,
            DomainError::InvalidEmail(_)
                | DomainError::InvalidSlug(_)
                | DomainError::ValidationError(_)
                | DomainError::NotFound(_)
                | DomainError::WebsiteNotFound(_)
                | DomainError::AccountNotFound(_)
                | DomainError::ExtensionNotFound(_)
                | DomainError::CollectionNotFound(_)
                | DomainError::InvalidCredentials
                | DomainError::Unauthorized(_)
                | DomainError::Forbidden(_)
                | DomainError::TokenExpired
                | DomainError::SlugAlreadyExists(_)
                | DomainError::EmailAlreadyExists(_)
                | DomainError::Conflict(_)
                | DomainError::RateLimited(_)
                | DomainError::QuotaExceeded
                | DomainError::PlanRestricted(_)
        )
    }
}
