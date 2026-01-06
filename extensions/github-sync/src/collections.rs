// GitHub Sync Collection Integration
// Converts GitHub data to collection items for the Collections system

use asap_core_domain::collections::{CollectionItem, WebsiteCollection, SyncStatus};
use chrono::Utc;
use serde_json::{json, Value};
use uuid::Uuid;

/// Convert GitHub repositories to collection items
pub fn repos_to_collection_items(repos: &[Value]) -> Vec<CollectionItem> {
    repos
        .iter()
        .map(|repo| {
            let id = repo["id"].as_u64().unwrap_or(0).to_string();
            let now = Utc::now();
            
            CollectionItem {
                id: id.clone(),
                data: json!({
                    "id": id,
                    "name": repo["name"].as_str().unwrap_or(""),
                    "full_name": repo["full_name"].as_str().unwrap_or(""),
                    "description": repo["description"].as_str().unwrap_or(""),
                    "url": repo["html_url"].as_str().unwrap_or(""),
                    "homepage": repo["homepage"].as_str().unwrap_or(""),
                    "language": repo["language"].as_str(),
                    "stars": repo["stargazers_count"].as_u64().unwrap_or(0),
                    "forks": repo["forks_count"].as_u64().unwrap_or(0),
                    "open_issues": repo["open_issues_count"].as_u64().unwrap_or(0),
                    "topics": repo["topics"].as_array().cloned().unwrap_or_default(),
                    "is_fork": repo["fork"].as_bool().unwrap_or(false),
                    "is_archived": repo["archived"].as_bool().unwrap_or(false),
                    "created_at": repo["created_at"].as_str().unwrap_or(""),
                    "updated_at": repo["updated_at"].as_str().unwrap_or(""),
                    "pushed_at": repo["pushed_at"].as_str(),
                }),
                created_at: now,
                updated_at: now,
                source_id: Some(id),
            }
        })
        .collect()
}

/// Create a WebsiteCollection from GitHub repos
pub fn create_github_repos_collection(
    website_id: Uuid,
    repos: &[Value],
    _github_username: &str,
) -> WebsiteCollection {
    let items = repos_to_collection_items(repos);
    let total_count = items.len() as i32;
    let now = Utc::now();
    
    WebsiteCollection {
        id: Uuid::new_v4(),
        website_id,
        collection_slug: "github_repos".to_string(),
        items,
        source_extension: "github-sync".to_string(),
        source_version: Some("1.0.0".to_string()),
        total_count,
        sync_status: SyncStatus::Idle, // Idle means successfully synced, not currently syncing
        sync_error: None,
        synced_at: Some(now),
        created_at: now,
        updated_at: now,
    }
}

/// Compute GitHub variables from collection items
pub fn compute_github_variables(repos: &[Value]) -> Vec<(String, Value)> {
    let total_repos = repos.len();
    let total_stars: u64 = repos
        .iter()
        .map(|r| r["stargazers_count"].as_u64().unwrap_or(0))
        .sum();
    let total_forks: u64 = repos
        .iter()
        .map(|r| r["forks_count"].as_u64().unwrap_or(0))
        .sum();
    
    // Compute top language (mode)
    let mut language_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for repo in repos {
        if let Some(lang) = repo["language"].as_str() {
            if !lang.is_empty() {
                *language_counts.entry(lang.to_string()).or_insert(0) += 1;
            }
        }
    }
    let top_language = language_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(lang, _)| lang)
        .unwrap_or_default();

    vec![
        ("github_total_repos".to_string(), json!(total_repos)),
        ("github_total_stars".to_string(), json!(total_stars)),
        ("github_total_forks".to_string(), json!(total_forks)),
        ("github_top_language".to_string(), json!(top_language)),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_repos() -> Vec<Value> {
        vec![
            json!({
                "id": 123456,
                "name": "awesome-project",
                "full_name": "user/awesome-project",
                "description": "An awesome project",
                "html_url": "https://github.com/user/awesome-project",
                "homepage": "https://awesome.dev",
                "stargazers_count": 100,
                "forks_count": 20,
                "open_issues_count": 5,
                "language": "Rust",
                "topics": ["rust", "cli", "tool"],
                "fork": false,
                "archived": false,
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "pushed_at": "2024-01-15T00:00:00Z"
            }),
            json!({
                "id": 789012,
                "name": "another-project",
                "full_name": "user/another-project",
                "description": "Another project",
                "html_url": "https://github.com/user/another-project",
                "homepage": null,
                "stargazers_count": 50,
                "forks_count": 10,
                "open_issues_count": 2,
                "language": "Rust",
                "topics": ["rust", "library"],
                "fork": false,
                "archived": false,
                "created_at": "2023-06-01T00:00:00Z",
                "updated_at": "2024-01-10T00:00:00Z",
                "pushed_at": "2024-01-10T00:00:00Z"
            }),
            json!({
                "id": 345678,
                "name": "python-tool",
                "full_name": "user/python-tool",
                "description": "A Python tool",
                "html_url": "https://github.com/user/python-tool",
                "homepage": null,
                "stargazers_count": 25,
                "forks_count": 5,
                "open_issues_count": 0,
                "language": "Python",
                "topics": ["python"],
                "fork": false,
                "archived": false,
                "created_at": "2022-01-01T00:00:00Z",
                "updated_at": "2023-06-01T00:00:00Z",
                "pushed_at": "2023-06-01T00:00:00Z"
            }),
        ]
    }

    #[test]
    fn test_repos_to_collection_items() {
        let repos = sample_repos();
        let items = repos_to_collection_items(&repos);
        
        assert_eq!(items.len(), 3);
        
        // Check first item
        assert_eq!(items[0].id, "123456");
        assert_eq!(items[0].source_id, Some("123456".to_string()));
        assert_eq!(items[0].data["name"], "awesome-project");
        assert_eq!(items[0].data["stars"], 100);
        assert_eq!(items[0].data["language"], "Rust");
        
        // Check second item
        assert_eq!(items[1].id, "789012");
        assert_eq!(items[2].id, "345678");
    }

    #[test]
    fn test_create_github_repos_collection() {
        let repos = sample_repos();
        let website_id = Uuid::new_v4();
        
        let collection = create_github_repos_collection(website_id, &repos, "testuser");
        
        assert_eq!(collection.website_id, website_id);
        assert_eq!(collection.collection_slug, "github_repos");
        assert_eq!(collection.source_extension, "github-sync");
        assert_eq!(collection.items.len(), 3);
        assert_eq!(collection.total_count, 3);
        assert!(matches!(collection.sync_status, SyncStatus::Idle));
        assert!(collection.synced_at.is_some());
        assert!(collection.sync_error.is_none());
    }

    #[test]
    fn test_compute_github_variables() {
        let repos = sample_repos();
        let variables = compute_github_variables(&repos);
        
        let vars: std::collections::HashMap<String, Value> = variables.into_iter().collect();
        
        assert_eq!(vars["github_total_repos"], json!(3));
        assert_eq!(vars["github_total_stars"], json!(175)); // 100 + 50 + 25
        assert_eq!(vars["github_total_forks"], json!(35)); // 20 + 10 + 5
        assert_eq!(vars["github_top_language"], json!("Rust")); // Rust appears 2x, Python 1x
    }

    #[test]
    fn test_compute_github_variables_empty() {
        let repos: Vec<Value> = vec![];
        let variables = compute_github_variables(&repos);
        
        let vars: std::collections::HashMap<String, Value> = variables.into_iter().collect();
        
        assert_eq!(vars["github_total_repos"], json!(0));
        assert_eq!(vars["github_total_stars"], json!(0));
        assert_eq!(vars["github_total_forks"], json!(0));
        assert_eq!(vars["github_top_language"], json!(""));
    }
}
