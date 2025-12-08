use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub stargazers_count: u64,
    pub forks_count: u64,
    pub language: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub pushed_at: Option<String>,
    pub fork: bool,
    pub archived: bool,
}

pub struct GitHubClient {
    client: reqwest::Client,
}

impl GitHubClient {
    pub fn new() -> Result<Self> {
        let client = reqwest::Client::builder()
            .user_agent("asap-portfolio-generator/0.1")
            .build()?;
        
        Ok(Self { client })
    }

    /// Fetch public repositories for a given GitHub username
    pub async fn fetch_repos(&self, username: &str) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Fetching repos for user: {}", username);
        
        let url = format!("https://api.github.com/users/{}/repos", username);
        
        let response = self
            .client
            .get(&url)
            .query(&[
                ("type", "owner"),
                ("sort", "updated"),
                ("per_page", "100"),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!(
                "GitHub API request failed with status {}: {}",
                status,
                body
            );
        }

        let repos: Vec<GitHubRepo> = response.json().await?;
        
        // Filter out forks and archived repos
        let filtered_repos: Vec<GitHubRepo> = repos
            .into_iter()
            .filter(|repo| !repo.fork && !repo.archived)
            .collect();

        tracing::info!(
            "Fetched {} repositories (after filtering forks and archived)",
            filtered_repos.len()
        );

        // Convert to JSON values for flexibility
        let json_repos: Vec<serde_json::Value> = filtered_repos
            .into_iter()
            .map(|repo| serde_json::to_value(repo))
            .collect::<Result<Vec<_>, _>>()?;
            
        Ok(json_repos)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_github_repo_creation() {
        let repo = GitHubRepo {
            id: 123,
            name: "my-repo".to_string(),
            full_name: "user/my-repo".to_string(),
            description: Some("A test repository".to_string()),
            html_url: "https://github.com/user/my-repo".to_string(),
            stargazers_count: 10,
            forks_count: 2,
            language: Some("Rust".to_string()),
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            pushed_at: Some("2024-01-01T00:00:00Z".to_string()),
            fork: false,
            archived: false,
        };

        assert_eq!(repo.id, 123);
        assert_eq!(repo.name, "my-repo");
        assert!(!repo.fork);
        assert!(!repo.archived);
    }

    #[test]
    fn test_github_repo_fork_filter() {
        let original = GitHubRepo {
            id: 1,
            name: "original".to_string(),
            full_name: "user/original".to_string(),
            description: None,
            html_url: "https://github.com/user/original".to_string(),
            stargazers_count: 0,
            forks_count: 0,
            language: None,
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            pushed_at: None,
            fork: false,
            archived: false,
        };

        let forked = GitHubRepo {
            fork: true,
            ..original.clone()
        };

        let repos = vec![original, forked];
        let filtered: Vec<_> = repos
            .into_iter()
            .filter(|r| !r.fork && !r.archived)
            .collect();

        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].name, "original");
    }

    #[test]
    fn test_github_repo_archived_filter() {
        let repo = GitHubRepo {
            id: 1,
            name: "archived".to_string(),
            full_name: "user/archived".to_string(),
            description: None,
            html_url: "https://github.com/user/archived".to_string(),
            stargazers_count: 5,
            forks_count: 0,
            language: Some("Python".to_string()),
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            pushed_at: None,
            fork: false,
            archived: true,
        };

        let is_valid = !repo.fork && !repo.archived;
        assert!(!is_valid);
    }

    #[test]
    fn test_github_repo_serialization() {
        let repo = GitHubRepo {
            id: 123,
            name: "test".to_string(),
            full_name: "user/test".to_string(),
            description: Some("Test repo".to_string()),
            html_url: "https://github.com/user/test".to_string(),
            stargazers_count: 10,
            forks_count: 2,
            language: Some("Rust".to_string()),
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            pushed_at: Some("2024-01-01T00:00:00Z".to_string()),
            fork: false,
            archived: false,
        };

        let json = serde_json::to_value(&repo).unwrap();
        assert_eq!(json["name"], "test");
        assert_eq!(json["stargazers_count"], 10);
    }

    #[test]
    fn test_github_repo_clone() {
        let repo = GitHubRepo {
            id: 123,
            name: "test".to_string(),
            full_name: "user/test".to_string(),
            description: Some("Test".to_string()),
            html_url: "https://github.com/user/test".to_string(),
            stargazers_count: 5,
            forks_count: 1,
            language: Some("Go".to_string()),
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            pushed_at: None,
            fork: false,
            archived: false,
        };

        let cloned = repo.clone();
        assert_eq!(repo.id, cloned.id);
        assert_eq!(repo.name, cloned.name);
    }

    #[test]
    fn test_github_client_new() {
        let client = GitHubClient::new();
        assert!(client.is_ok());
    }

    #[test]
    fn test_multiple_repos_filtering() {
        let repos = vec![
            GitHubRepo {
                id: 1,
                name: "repo1".to_string(),
                full_name: "user/repo1".to_string(),
                description: None,
                html_url: "https://github.com/user/repo1".to_string(),
                stargazers_count: 0,
                forks_count: 0,
                language: None,
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
                pushed_at: None,
                fork: false,
                archived: false,
            },
            GitHubRepo {
                id: 2,
                name: "repo2".to_string(),
                full_name: "user/repo2".to_string(),
                description: None,
                html_url: "https://github.com/user/repo2".to_string(),
                stargazers_count: 0,
                forks_count: 0,
                language: None,
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
                pushed_at: None,
                fork: true, // This is a fork
                archived: false,
            },
            GitHubRepo {
                id: 3,
                name: "repo3".to_string(),
                full_name: "user/repo3".to_string(),
                description: None,
                html_url: "https://github.com/user/repo3".to_string(),
                stargazers_count: 0,
                forks_count: 0,
                language: None,
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
                pushed_at: None,
                fork: false,
                archived: true, // This is archived
            },
        ];

        let filtered: Vec<_> = repos
            .into_iter()
            .filter(|r| !r.fork && !r.archived)
            .collect();

        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].name, "repo1");
    }
}
