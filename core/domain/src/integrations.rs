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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_github_integration_creation() {
        let username = "octocat".to_string();
        let integration = GitHubIntegration::new(username.clone());

        assert_eq!(integration.username, username);
        assert!(integration.token.is_none());
        assert!(integration.last_sync.is_none());
    }

    #[test]
    fn test_github_integration_with_token() {
        let username = "octocat".to_string();
        let mut integration = GitHubIntegration::new(username.clone());

        integration.token = Some("gh_token_12345".to_string());

        assert_eq!(integration.username, username);
        assert_eq!(integration.token, Some("gh_token_12345".to_string()));
        assert!(integration.last_sync.is_none());
    }

    #[test]
    fn test_github_integration_with_sync_date() {
        let username = "octocat".to_string();
        let mut integration = GitHubIntegration::new(username);
        let sync_time = Utc::now();
        integration.last_sync = Some(sync_time);

        assert!(integration.last_sync.is_some());
        assert_eq!(integration.last_sync.unwrap(), sync_time);
    }

    #[test]
    fn test_github_integration_serialization() {
        let mut integration = GitHubIntegration::new("octocat".to_string());
        integration.token = Some("gh_token".to_string());
        integration.last_sync = Some(Utc::now());

        let serialized = serde_json::to_string(&integration).unwrap();
        let deserialized: GitHubIntegration = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.username, "octocat");
        assert_eq!(deserialized.token, Some("gh_token".to_string()));
        assert!(deserialized.last_sync.is_some());
    }

    #[test]
    fn test_github_integration_clone() {
        let mut integration = GitHubIntegration::new("octocat".to_string());
        integration.token = Some("token".to_string());

        let cloned = integration.clone();
        assert_eq!(integration.username, cloned.username);
        assert_eq!(integration.token, cloned.token);
    }

    #[test]
    fn test_integration_enum_github() {
        let github = GitHubIntegration::new("octocat".to_string());
        let integration = Integration::GitHub(github);

        match integration {
            Integration::GitHub(gh) => {
                assert_eq!(gh.username, "octocat");
            }
        }
    }

    #[test]
    fn test_integration_serialization() {
        let github = GitHubIntegration {
            username: "octocat".to_string(),
            token: Some("token123".to_string()),
            last_sync: Some(Utc::now()),
        };

        let integration = Integration::GitHub(github);
        let serialized = serde_json::to_string(&integration).unwrap();
        let deserialized: Integration = serde_json::from_str(&serialized).unwrap();

        match deserialized {
            Integration::GitHub(gh) => {
                assert_eq!(gh.username, "octocat");
                assert!(gh.token.is_some());
            }
        }
    }

    #[test]
    fn test_github_integration_token_update() {
        let mut integration = GitHubIntegration::new("user".to_string());
        assert!(integration.token.is_none());

        integration.token = Some("new_token".to_string());
        assert_eq!(integration.token, Some("new_token".to_string()));

        integration.token = Some("updated_token".to_string());
        assert_eq!(integration.token, Some("updated_token".to_string()));
    }

    #[test]
    fn test_github_integration_multiple_instances() {
        let integration1 = GitHubIntegration::new("user1".to_string());
        let integration2 = GitHubIntegration::new("user2".to_string());

        assert_ne!(integration1.username, integration2.username);
        assert_eq!(integration1.token, integration2.token);
    }
}
