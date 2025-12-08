use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
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
