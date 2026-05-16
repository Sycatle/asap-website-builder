use anyhow::{anyhow, Context, Result};
use std::env;

fn is_production() -> bool {
    env::var("ASAP_ENV")
        .or_else(|_| env::var("RUST_ENV"))
        .map(|v| v.eq_ignore_ascii_case("production") || v.eq_ignore_ascii_case("prod"))
        .unwrap_or(false)
}

const JWT_SECRET_MIN_LEN: usize = 32;
const JWT_SECRET_BANNED: &[&str] = &["dev-secret-change-in-production", "change-me", "secret"];

fn load_jwt_secret() -> Result<String> {
    let is_prod = is_production();

    match env::var("JWT_SECRET") {
        Ok(s) => {
            let trimmed = s.trim();
            if trimmed.len() < JWT_SECRET_MIN_LEN {
                return Err(anyhow!(
                    "JWT_SECRET must be at least {} bytes (got {})",
                    JWT_SECRET_MIN_LEN,
                    trimmed.len()
                ));
            }
            if JWT_SECRET_BANNED
                .iter()
                .any(|b| b.eq_ignore_ascii_case(trimmed))
            {
                return Err(anyhow!("JWT_SECRET is set to a known insecure placeholder"));
            }
            Ok(trimmed.to_string())
        }
        Err(_) if is_prod => Err(anyhow!("JWT_SECRET is required in production")),
        Err(_) => {
            tracing::warn!(
                "JWT_SECRET not set — generating an ephemeral secret for this process. \
                 Tokens will be invalidated on restart. Set JWT_SECRET for stable dev sessions."
            );
            use std::time::{SystemTime, UNIX_EPOCH};
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0);
            let pid = std::process::id();
            Ok(format!("dev-ephemeral-{pid}-{nanos:032x}"))
        }
    }
}

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
            database_url: env::var("DATABASE_URL").context(
                "DATABASE_URL must be set. Example: postgresql://user:pass@localhost:5432/dbname",
            )?,
            jwt_secret: load_jwt_secret()?,
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
            allowed_origins: {
                let raw = env::var("CORS_ALLOWED_ORIGINS")
                    .or_else(|_| env::var("ALLOWED_ORIGINS"))
                    .ok();
                let raw = match (raw, is_production()) {
                    (Some(v), _) => v,
                    (None, true) => {
                        return Err(anyhow!("CORS_ALLOWED_ORIGINS must be set in production"));
                    }
                    (None, false) => {
                        "http://localhost:4321,http://localhost:4322,http://localhost:4323"
                            .to_string()
                    }
                };
                let origins: Vec<String> = raw
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                if origins.iter().any(|o| o == "*") && is_production() {
                    return Err(anyhow!(
                        "CORS_ALLOWED_ORIGINS cannot contain '*' in production (incompatible with credentials)"
                    ));
                }
                if origins.is_empty() {
                    return Err(anyhow!("CORS_ALLOWED_ORIGINS resolved to an empty list"));
                }
                origins
            },
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:4321".to_string()),
        })
    }
}
