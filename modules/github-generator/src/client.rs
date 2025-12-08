use anyhow::Result;

pub struct GitHubClient {
    client: reqwest::Client,
}

impl GitHubClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub async fn fetch_repos(&self, username: &str) -> Result<Vec<serde_json::Value>> {
        // TODO: Implement GitHub API calls
        tracing::info!("Fetching repos for user: {}", username);
        Ok(vec![])
    }
}
