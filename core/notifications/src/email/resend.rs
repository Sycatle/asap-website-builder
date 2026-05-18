use async_trait::async_trait;
use serde::Serialize;
use std::time::Duration;

use super::messages::EmailMessage;
use super::provider::{EmailError, EmailProvider};

/// Resend HTTP API client config.
#[derive(Debug, Clone)]
pub struct ResendConfig {
    pub api_key: String,
    pub default_from: String,
    pub api_base: String,
}

impl ResendConfig {
    pub const DEFAULT_API_BASE: &'static str = "https://api.resend.com";

    /// Build the config from process env. Returns `None` when `RESEND_API_KEY`
    /// is missing — the caller decides whether to refuse to start (production)
    /// or fall back to a noop provider (dev/tests).
    pub fn from_env() -> Option<Self> {
        let api_key = std::env::var("RESEND_API_KEY").ok()?;
        let default_from =
            std::env::var("EMAIL_FROM").unwrap_or_else(|_| "ASAP <noreply@asap.cool>".to_string());
        let api_base =
            std::env::var("RESEND_API_BASE").unwrap_or_else(|_| Self::DEFAULT_API_BASE.to_string());
        Some(Self {
            api_key,
            default_from,
            api_base,
        })
    }

    pub fn default_from(&self) -> String {
        self.default_from.clone()
    }
}

pub struct ResendProvider {
    config: ResendConfig,
    http: reqwest::Client,
}

impl ResendProvider {
    pub fn new(config: ResendConfig) -> Result<Self, EmailError> {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .user_agent("asap-notifications/0.1")
            .build()
            .map_err(|e| EmailError::Transport(e.to_string()))?;
        Ok(Self { config, http })
    }

    pub fn default_from(&self) -> String {
        self.config.default_from()
    }
}

#[derive(Serialize)]
struct ResendPayload<'a> {
    from: &'a str,
    to: [&'a str; 1],
    subject: &'a str,
    html: &'a str,
    text: &'a str,
}

#[async_trait]
impl EmailProvider for ResendProvider {
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        let url = format!("{}/emails", self.config.api_base);
        let payload = ResendPayload {
            from: &message.from,
            to: [message.to.as_str()],
            subject: &message.subject,
            html: &message.html,
            text: &message.text,
        };

        let response = self
            .http
            .post(&url)
            .bearer_auth(&self.config.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| EmailError::Transport(e.to_string()))?;

        let status = response.status();
        if status.is_success() {
            tracing::info!(
                to = %message.to,
                subject = %message.subject,
                "email delivered via resend"
            );
            Ok(())
        } else {
            let status_u16 = status.as_u16();
            let body = response.text().await.unwrap_or_default();
            tracing::warn!(
                to = %message.to,
                status = status_u16,
                body = %body,
                "resend rejected email"
            );
            Err(EmailError::Rejected {
                status: status_u16,
                body,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::email::messages::PasswordResetEmail;

    #[tokio::test]
    async fn resend_provider_serialises_payload() {
        // Smoke: build the provider and a rendered message; ensures no panic in
        // construction. Real delivery is covered by the integration suite.
        let config = ResendConfig {
            api_key: "test".into(),
            default_from: "ASAP <noreply@asap.test>".into(),
            api_base: "http://127.0.0.1:1".into(), // unreachable on purpose
        };
        let provider = ResendProvider::new(config).expect("build provider");
        let msg = PasswordResetEmail {
            to: "user@example.com",
            reset_url: "https://app.example.com/reset?token=abc",
            app_name: "ASAP",
        }
        .render(provider.default_from());
        let err = provider.send(msg).await.expect_err("unreachable host");
        match err {
            EmailError::Transport(_) => {}
            other => panic!("unexpected: {other}"),
        }
    }
}
