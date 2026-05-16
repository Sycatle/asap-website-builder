use thiserror::Error;

/// Common error types used across ASAP components
#[derive(Debug, Error)]
pub enum SharedError {
    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("JWT error: {0}")]
    JwtError(String),

    #[error("Invalid token: {0}")]
    InvalidToken(String),

    #[error("Token expired")]
    TokenExpired,

    #[error("CSRF error: {0}")]
    CsrfError(String),

    #[error("Cookie error: {0}")]
    CookieError(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<jsonwebtoken::errors::Error> for SharedError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        use jsonwebtoken::errors::ErrorKind;

        match err.kind() {
            ErrorKind::ExpiredSignature => SharedError::TokenExpired,
            ErrorKind::InvalidToken => {
                SharedError::InvalidToken("Invalid token format".to_string())
            }
            _ => SharedError::JwtError(err.to_string()),
        }
    }
}

impl From<std::env::VarError> for SharedError {
    fn from(err: std::env::VarError) -> Self {
        SharedError::ConfigError(err.to_string())
    }
}

impl From<std::num::ParseIntError> for SharedError {
    fn from(err: std::num::ParseIntError) -> Self {
        SharedError::ConfigError(format!("Failed to parse integer: {}", err))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_error() {
        let err = SharedError::ConfigError("Missing env var".to_string());
        assert!(err.to_string().contains("Configuration error"));
    }

    #[test]
    fn test_auth_error() {
        let err = SharedError::AuthError("Invalid credentials".to_string());
        assert!(err.to_string().contains("Authentication error"));
    }

    #[test]
    fn test_token_expired() {
        let err = SharedError::TokenExpired;
        assert_eq!(err.to_string(), "Token expired");
    }
}
