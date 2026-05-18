//! Transactional email — Resend HTTP API only.
//!
//! All ASAP transactional email (password reset, admin invitations, future
//! notifications) is sent through Resend. The `EmailProvider` trait exists so
//! tests can substitute an in-memory capturer; **do not add SMTP / SendGrid /
//! Mailgun** implementations — the platform standardised on Resend.

mod messages;
mod provider;
mod resend;

pub use messages::{AdminInvitationEmail, EmailMessage, PasswordResetEmail};
pub use provider::{CapturingEmailProvider, EmailError, EmailProvider, NoopEmailProvider};
pub use resend::{ResendConfig, ResendProvider};

use std::sync::Arc;

/// Shared handle used by Axum layers.
pub type SharedEmailProvider = Arc<dyn EmailProvider>;
