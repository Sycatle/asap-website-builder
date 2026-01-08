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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubUser {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
    pub html_url: String,
    pub name: Option<String>,
    pub company: Option<String>,
    pub blog: Option<String>,
    pub location: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub twitter_username: Option<String>,
    pub public_repos: u64,
    pub public_gists: u64,
    pub followers: u64,
    pub following: u64,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubOrg {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubGist {
    pub id: String,
    pub html_url: String,
    pub description: Option<String>,
    pub public: bool,
    pub created_at: String,
    pub updated_at: String,
    pub comments: u64,
    pub files: std::collections::HashMap<String, GistFile>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GistFile {
    pub filename: String,
    pub language: Option<String>,
    pub raw_url: String,
    pub size: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubStarredRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub stargazers_count: u64,
    pub language: Option<String>,
    pub topics: Option<Vec<String>>,
    pub owner: GitHubRepoOwner,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubRepoOwner {
    pub login: String,
    pub avatar_url: String,
    pub html_url: String,
}

pub struct GitHubClient {
    client: reqwest::Client,
}

impl GitHubClient {
    pub fn new() -> Result<Self> {
        let client = reqwest::Client::builder()
            .user_agent("asap-website-generator/0.1")
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

    /// Fetch user profile for a given GitHub username
    pub async fn fetch_user(&self, username: &str) -> Result<serde_json::Value> {
        tracing::info!("Fetching user profile for: {}", username);
        
        let url = format!("https://api.github.com/users/{}", username);
        
        let response = self
            .client
            .get(&url)
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

        let user: GitHubUser = response.json().await?;
        tracing::info!("Fetched user profile: {}", user.login);
        
        Ok(serde_json::to_value(user)?)
    }

    /// Fetch organizations for a given GitHub username
    pub async fn fetch_orgs(&self, username: &str) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Fetching organizations for: {}", username);
        
        let url = format!("https://api.github.com/users/{}/orgs", username);
        
        let response = self
            .client
            .get(&url)
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

        let orgs: Vec<GitHubOrg> = response.json().await?;
        tracing::info!("Fetched {} organizations", orgs.len());
        
        let json_orgs: Vec<serde_json::Value> = orgs
            .into_iter()
            .map(|org| serde_json::to_value(org))
            .collect::<Result<Vec<_>, _>>()?;
            
        Ok(json_orgs)
    }

    /// Fetch public events for a given GitHub username
    /// Returns up to 300 events (3 pages of 100)
    pub async fn fetch_events(&self, username: &str) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Fetching public events for: {}", username);
        
        let mut all_events = Vec::new();
        
        for page in 1..=10 {
            let url = format!(
                "https://api.github.com/users/{}/events/public?per_page=100&page={}",
                username, page
            );
            
            let response = self
                .client
                .get(&url)
                .send()
                .await?;

            if !response.status().is_success() {
                // Don't fail on events, just return what we have
                tracing::warn!("GitHub events API returned status {}", response.status());
                break;
            }

            let events: Vec<serde_json::Value> = response.json().await?;
            
            if events.is_empty() {
                break;
            }
            
            all_events.extend(events);
            
            // If we got less than 100 events, we've reached the end
            if all_events.len() % 100 != 0 {
                break;
            }
        }
        
        tracing::info!("Fetched {} public events", all_events.len());
        Ok(all_events)
    }

    /// Fetch public gists for a given GitHub username
    pub async fn fetch_gists(&self, username: &str) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Fetching gists for: {}", username);
        
        let url = format!("https://api.github.com/users/{}/gists", username);
        
        let response = self
            .client
            .get(&url)
            .query(&[("per_page", "100")])
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

        let gists: Vec<GitHubGist> = response.json().await?;
        
        // Only keep public gists
        let public_gists: Vec<GitHubGist> = gists
            .into_iter()
            .filter(|g| g.public)
            .collect();
        
        tracing::info!("Fetched {} public gists", public_gists.len());
        
        let json_gists: Vec<serde_json::Value> = public_gists
            .into_iter()
            .map(|g| serde_json::to_value(g))
            .collect::<Result<Vec<_>, _>>()?;
            
        Ok(json_gists)
    }

    /// Fetch starred repositories for a given GitHub username
    pub async fn fetch_starred(&self, username: &str, limit: usize) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Fetching starred repos for: {}", username);
        
        let url = format!("https://api.github.com/users/{}/starred", username);
        
        let response = self
            .client
            .get(&url)
            .query(&[("per_page", &limit.min(100).to_string())])
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

        let starred: Vec<GitHubStarredRepo> = response.json().await?;
        tracing::info!("Fetched {} starred repos", starred.len());
        
        let json_starred: Vec<serde_json::Value> = starred
            .into_iter()
            .map(|s| serde_json::to_value(s))
            .collect::<Result<Vec<_>, _>>()?;
            
        Ok(json_starred)
    }

    /// Fetch the profile README content for a user (if exists)
    pub async fn fetch_profile_readme(&self, username: &str) -> Result<Option<String>> {
        tracing::info!("Fetching profile README for: {}", username);
        
        // GitHub profile READMEs are in a repo named after the username
        let url = format!(
            "https://api.github.com/repos/{}/{}/readme",
            username, username
        );
        
        let response = self
            .client
            .get(&url)
            .header("Accept", "application/vnd.github.raw")
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            tracing::info!("No profile README found for {}", username);
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            tracing::warn!("Failed to fetch profile README: {}", status);
            return Ok(None);
        }

        let content = response.text().await?;
        tracing::info!("Fetched profile README ({} chars)", content.len());
        
        Ok(Some(content))
    }

    /// Fetch contribution data by scraping the GitHub profile page
    /// Returns a JSON object with contributions array and total count
    pub async fn fetch_contributions(&self, username: &str) -> Result<serde_json::Value> {
        tracing::info!("Fetching contributions for: {}", username);
        
        // Fetch the contributions calendar from GitHub's contribution page
        // GitHub exposes this as an SVG/HTML that we can parse
        let url = format!(
            "https://github.com/users/{}/contributions",
            username
        );
        
        let response = self
            .client
            .get(&url)
            .header("Accept", "text/html")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            tracing::warn!("Failed to fetch contributions page: {}", status);
            // Return empty contributions instead of failing
            return Ok(serde_json::json!({
                "contributions": [],
                "total": 0
            }));
        }

        let html = response.text().await?;
        
        // Parse the contribution data from the HTML
        // GitHub uses data-date and data-level attributes on td elements
        let mut contributions: Vec<serde_json::Value> = Vec::new();
        let mut total: i64 = 0;
        
        // Parse using regex to extract contribution data
        // Format: <td ... data-date="2024-01-15" data-level="2" ...>
        let date_level_re = regex::Regex::new(
            r#"data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)""#
        )?;
        
        // Also try the reverse order
        let level_date_re = regex::Regex::new(
            r#"data-level="(\d)"[^>]*data-date="(\d{4}-\d{2}-\d{2})""#
        )?;
        
        // Try to extract total from the page (e.g., "1,234 contributions")
        let total_re = regex::Regex::new(r#"([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year"#)?;
        if let Some(cap) = total_re.captures(&html) {
            if let Ok(t) = cap[1].replace(',', "").parse::<i64>() {
                total = t;
            }
        }
        
        // Collect all dates with their levels
        let mut date_map: std::collections::HashMap<String, u8> = std::collections::HashMap::new();
        
        for cap in date_level_re.captures_iter(&html) {
            let date = cap[1].to_string();
            let level: u8 = cap[2].parse().unwrap_or(0);
            date_map.insert(date, level);
        }
        
        for cap in level_date_re.captures_iter(&html) {
            let level: u8 = cap[1].parse().unwrap_or(0);
            let date = cap[2].to_string();
            date_map.entry(date).or_insert(level);
        }
        
        // Convert to sorted contributions array
        let mut dates: Vec<_> = date_map.into_iter().collect();
        dates.sort_by(|a, b| a.0.cmp(&b.0));
        
        for (date, level) in dates {
            // Estimate count based on level (GitHub doesn't expose exact counts in HTML)
            let count = match level {
                0 => 0,
                1 => 1,
                2 => 3,
                3 => 6,
                4 => 10,
                _ => 0,
            };
            contributions.push(serde_json::json!({
                "date": date,
                "count": count,
                "level": level
            }));
        }
        
        tracing::info!(
            "Fetched {} contribution days, total: {}",
            contributions.len(),
            total
        );
        
        Ok(serde_json::json!({
            "contributions": contributions,
            "total": total
        }))
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
