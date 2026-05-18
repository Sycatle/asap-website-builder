use async_trait::async_trait;
use std::sync::{Mutex, MutexGuard};
use thiserror::Error;

use super::messages::EmailMessage;

#[derive(Debug, Error)]
pub enum EmailError {
    #[error("email transport error: {0}")]
    Transport(String),
    #[error("email provider rejected the message: {status} {body}")]
    Rejected { status: u16, body: String },
    #[error("email provider not configured")]
    NotConfigured,
}

#[async_trait]
pub trait EmailProvider: Send + Sync {
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError>;
}

/// Fallback used when no provider is configured (dev without RESEND_API_KEY).
/// Logs the email at INFO level and returns Ok so request flows aren't broken,
/// but production startup refuses to use it (see `apps/api/src/config.rs`).
pub struct NoopEmailProvider;

#[async_trait]
impl EmailProvider for NoopEmailProvider {
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        tracing::info!(
            to = %message.to,
            subject = %message.subject,
            "[noop email] dropping message — configure RESEND_API_KEY to deliver"
        );
        Ok(())
    }
}

/// Test double that records every sent message in-memory.
#[derive(Default)]
pub struct CapturingEmailProvider {
    sent: Mutex<Vec<EmailMessage>>,
}

impl CapturingEmailProvider {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn sent(&self) -> MutexGuard<'_, Vec<EmailMessage>> {
        self.sent.lock().expect("email capture mutex poisoned")
    }
}

#[async_trait]
impl EmailProvider for CapturingEmailProvider {
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        self.sent().push(message);
        Ok(())
    }
}
