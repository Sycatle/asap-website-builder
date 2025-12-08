use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Integration represents an external service connection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Integration {
    GitHub(GitHubIntegration),
}

/// GitHub integration details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubIntegration {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    pub last_sync: Option<DateTime<Utc>>,
}

impl GitHubIntegration {
    pub fn new(username: String) -> Self {
        Self {
            username,
            token: None,
            last_sync: None,
        }
    }
}
