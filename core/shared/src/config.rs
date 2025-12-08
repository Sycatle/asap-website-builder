use std::env;
use anyhow::{Context, Result};

/// Shared configuration that can be used across all components
#[derive(Debug, Clone)]
pub struct SharedConfig {
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
}

impl SharedConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| {
                tracing::warn!("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)");
                "dev-secret-change-in-production".to_string()
            });

        let jwt_expiration_hours = env::var("JWT_EXPIRATION_HOURS")
            .unwrap_or_else(|_| "24".to_string())
            .parse()
            .context("JWT_EXPIRATION_HOURS must be a valid number")?;

        Ok(Self {
            jwt_secret,
            jwt_expiration_hours,
        })
    }

    /// Create a default configuration (for testing)
    pub fn default() -> Self {
        Self {
            jwt_secret: "dev-secret-change-in-production".to_string(),
            jwt_expiration_hours: 24,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = SharedConfig::default();
        assert!(!config.jwt_secret.is_empty());
        assert_eq!(config.jwt_expiration_hours, 24);
    }

    #[test]
    fn test_config_jwt_expiration() {
        let config = SharedConfig::default();
        assert!(config.jwt_expiration_hours > 0);
        assert!(config.jwt_expiration_hours <= 168); // Max 1 week
    }
}
