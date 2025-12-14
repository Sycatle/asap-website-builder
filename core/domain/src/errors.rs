use thiserror::Error;

pub type Result<T> = std::result::Result<T, DomainError>;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Invalid email format: {0}")]
    InvalidEmail(String),

    #[error("Invalid slug format: {0}")]
    InvalidSlug(String),

    #[error("Website not found: {0}")]
    WebsiteNotFound(String),

    #[error("Account not found: {0}")]
    AccountNotFound(String),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Slug already exists: {0}")]
    SlugAlreadyExists(String),

    #[error("Email already exists: {0}")]
    EmailAlreadyExists(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}
