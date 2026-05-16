//! ASAP Core Notifications Extension
//!
//! This extension handles user notifications with support for:
//! - In-app notifications
//! - Push notifications (PWA)
//! - Read/unread state management
//! - Notification categories and priorities

pub mod service;
pub mod types;

pub use service::*;
pub use types::*;
