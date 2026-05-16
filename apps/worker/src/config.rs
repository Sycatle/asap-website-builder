use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Config {
    pub database_url: String,
    pub polling_interval_secs: u64,
    pub max_retries: u32,
    pub retry_backoff_secs: u64,
    pub core_api_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Config {
            database_url: env::var("DATABASE_URL").context(
                "DATABASE_URL must be set. Example: postgresql://user:pass@localhost:5432/dbname",
            )?,
            polling_interval_secs: env::var("POLLING_INTERVAL_SECS")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .context("POLLING_INTERVAL_SECS must be a valid number")?,
            max_retries: env::var("MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .context("MAX_RETRIES must be a valid number")?,
            retry_backoff_secs: env::var("RETRY_BACKOFF_SECS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .context("RETRY_BACKOFF_SECS must be a valid number")?,
            core_api_url: env::var("CORE_API_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
        })
    }
}
