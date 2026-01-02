use std::env;
use anyhow::{Context, Result};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub server_host: String,
    pub server_port: u16,
    pub allowed_origins: Vec<String>,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Config {
            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL must be set. Example: postgresql://user:pass@localhost:5432/dbname")?,
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| {
                    tracing::warn!("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)");
                    "dev-secret-change-in-production".to_string()
                }),
            jwt_expiration_hours: env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .context("JWT_EXPIRATION_HOURS must be a valid number")?,
            server_host: env::var("ASAP_API_HOST")
                .or_else(|_| env::var("SERVER_HOST"))
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("ASAP_API_PORT")
                .or_else(|_| env::var("SERVER_PORT"))
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .context("ASAP_API_PORT/SERVER_PORT must be a valid port number (0-65535)")?,
            allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .or_else(|_| env::var("ALLOWED_ORIGINS"))
                .unwrap_or_else(|_| "http://localhost:4321,http://localhost:4322,http://localhost:4323".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:4321".to_string()),
        })
    }
}
