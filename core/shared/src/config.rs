use crate::errors::SharedError;
use std::env;

pub type Result<T> = std::result::Result<T, SharedError>;

/// Shared configuration that can be used across all components
#[derive(Debug, Clone)]
pub struct SharedConfig {
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
}

impl SharedConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        // Check if we're in production
        let is_production = env::var("ENVIRONMENT")
            .or_else(|_| env::var("NODE_ENV"))
            .map(|v| v == "production" || v == "prod")
            .unwrap_or(false);

        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(secret) => secret,
            Err(_) => {
                if is_production {
                    return Err(SharedError::ConfigError(
                        "JWT_SECRET must be set in production environment".to_string(),
                    ));
                }
                tracing::warn!("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)");
                "dev-secret-change-in-production".to_string()
            }
        };

        let jwt_expiration_hours = env::var("JWT_EXPIRATION_HOURS")
            .unwrap_or_else(|_| "24".to_string())
            .parse::<i64>()?;

        Ok(Self {
            jwt_secret,
            jwt_expiration_hours,
        })
    }

}

impl Default for SharedConfig {
    /// Default configuration for tests. Production callers must use `from_env`.
    fn default() -> Self {
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
