// GitHub Sync Collection Integration
// Converts GitHub data to collection items for the Collections system

use asap_core_domain::collections::{CollectionItem, SyncStatus, WebsiteCollection};
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

/// Language statistics computed from repositories
#[derive(Debug, Clone)]
pub struct LanguageStats {
    pub name: String,
    pub repo_count: usize,
    pub total_stars: u64,
    pub total_forks: u64,
    pub percentage: f64,
}

/// Compute detailed language statistics from repositories
pub fn compute_language_stats(repos: &[Value]) -> Vec<LanguageStats> {
    use std::collections::HashMap;

    let mut lang_data: HashMap<String, (usize, u64, u64)> = HashMap::new();
    let total_repos = repos.len();

    for repo in repos {
        if let Some(lang) = repo["language"].as_str() {
            if !lang.is_empty() {
                let stars = repo["stargazers_count"].as_u64().unwrap_or(0);
                let forks = repo["forks_count"].as_u64().unwrap_or(0);

                let entry = lang_data.entry(lang.to_string()).or_insert((0, 0, 0));
                entry.0 += 1; // repo count
                entry.1 += stars;
                entry.2 += forks;
            }
        }
    }

    let mut stats: Vec<LanguageStats> = lang_data
        .into_iter()
        .map(|(name, (repo_count, total_stars, total_forks))| {
            let percentage = if total_repos > 0 {
                (repo_count as f64 / total_repos as f64) * 100.0
            } else {
                0.0
            };
            LanguageStats {
                name,
                repo_count,
                total_stars,
                total_forks,
                percentage,
            }
        })
        .collect();

    // Sort by repo count descending
    stats.sort_by(|a, b| b.repo_count.cmp(&a.repo_count));
    stats
}

/// Create a collection of language statistics
pub fn create_github_languages_collection(website_id: Uuid, repos: &[Value]) -> WebsiteCollection {
    let stats = compute_language_stats(repos);
    let now = Utc::now();

    let items: Vec<CollectionItem> = stats
        .iter()
        .enumerate()
        .map(|(idx, stat)| {
            let id = format!("lang_{}", stat.name.to_lowercase().replace(' ', "_"));
            CollectionItem {
                id: id.clone(),
                data: json!({
                    "name": stat.name,
                    "repo_count": stat.repo_count,
                    "total_stars": stat.total_stars,
                    "total_forks": stat.total_forks,
                    "percentage": (stat.percentage * 10.0).round() / 10.0, // Round to 1 decimal
                    "rank": idx + 1,
                }),
                created_at: now,
                updated_at: now,
                source_id: Some(id),
            }
        })
        .collect();

    let total_count = items.len() as i32;

    WebsiteCollection {
        id: Uuid::new_v4(),
        website_id,
        collection_slug: "github_languages".to_string(),
        items,
        source_extension: "github-sync".to_string(),
        source_version: Some("1.0.0".to_string()),
        total_count,
        sync_status: SyncStatus::Idle,
        sync_error: None,
        synced_at: Some(now),
        created_at: now,
        updated_at: now,
    }
}

/// Compute GitHub variables from repositories
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
    let total_open_issues: u64 = repos
        .iter()
        .map(|r| r["open_issues_count"].as_u64().unwrap_or(0))
        .sum();
    let total_watchers: u64 = repos
        .iter()
        .map(|r| r["watchers_count"].as_u64().unwrap_or(0))
        .sum();

    // Compute language statistics
    let lang_stats = compute_language_stats(repos);
    let top_language = lang_stats
        .first()
        .map(|s| s.name.clone())
        .unwrap_or_default();
    let languages_count = lang_stats.len();

    // Top 5 languages as JSON array
    let top_languages: Vec<Value> = lang_stats
        .iter()
        .take(5)
        .map(|s| {
            json!({
                "name": s.name,
                "count": s.repo_count,
                "percentage": (s.percentage * 10.0).round() / 10.0,
            })
        })
        .collect();

    vec![
        ("github_total_repos".to_string(), json!(total_repos)),
        ("github_total_stars".to_string(), json!(total_stars)),
        ("github_total_forks".to_string(), json!(total_forks)),
        ("github_total_issues".to_string(), json!(total_open_issues)),
        ("github_total_watchers".to_string(), json!(total_watchers)),
        ("github_top_language".to_string(), json!(top_language)),
        ("github_languages_count".to_string(), json!(languages_count)),
        ("github_top_languages".to_string(), json!(top_languages)),
    ]
}

/// Compute extended profile variables from user data
pub fn compute_profile_variables(user: &Value) -> Vec<(String, Value)> {
    vec![
        (
            "github_username".to_string(),
            json!(user["login"].as_str().unwrap_or("")),
        ),
        (
            "github_name".to_string(),
            json!(user["name"].as_str().unwrap_or("")),
        ),
        (
            "github_bio".to_string(),
            json!(user["bio"].as_str().unwrap_or("")),
        ),
        (
            "github_company".to_string(),
            json!(user["company"].as_str().unwrap_or("")),
        ),
        (
            "github_location".to_string(),
            json!(user["location"].as_str().unwrap_or("")),
        ),
        (
            "github_blog".to_string(),
            json!(user["blog"].as_str().unwrap_or("")),
        ),
        (
            "github_twitter".to_string(),
            json!(user["twitter_username"].as_str().unwrap_or("")),
        ),
        (
            "github_avatar_url".to_string(),
            json!(user["avatar_url"].as_str().unwrap_or("")),
        ),
        (
            "github_profile_url".to_string(),
            json!(user["html_url"].as_str().unwrap_or("")),
        ),
        (
            "github_followers".to_string(),
            json!(user["followers"].as_u64().unwrap_or(0)),
        ),
        (
            "github_following".to_string(),
            json!(user["following"].as_u64().unwrap_or(0)),
        ),
        (
            "github_public_repos".to_string(),
            json!(user["public_repos"].as_u64().unwrap_or(0)),
        ),
        (
            "github_public_gists".to_string(),
            json!(user["public_gists"].as_u64().unwrap_or(0)),
        ),
        (
            "github_created_at".to_string(),
            json!(user["created_at"].as_str().unwrap_or("")),
        ),
        (
            "github_hireable".to_string(),
            json!(user["hireable"].as_bool().unwrap_or(false)),
        ),
        (
            "github_email".to_string(),
            json!(user["email"].as_str().unwrap_or("")),
        ),
    ]
}

/// Convert GitHub gists to collection items
pub fn gists_to_collection_items(gists: &[Value]) -> Vec<CollectionItem> {
    gists
        .iter()
        .map(|gist| {
            let id = gist["id"].as_str().unwrap_or("").to_string();
            let now = Utc::now();

            // Extract files info
            let files: Vec<Value> = gist["files"]
                .as_object()
                .map(|f| {
                    f.values()
                        .map(|file| {
                            json!({
                                "filename": file["filename"].as_str().unwrap_or(""),
                                "language": file["language"].as_str(),
                                "size": file["size"].as_u64().unwrap_or(0),
                            })
                        })
                        .collect()
                })
                .unwrap_or_default();

            let primary_language = gist["files"]
                .as_object()
                .and_then(|f| f.values().next())
                .and_then(|file| file["language"].as_str())
                .unwrap_or("");

            CollectionItem {
                id: id.clone(),
                data: json!({
                    "id": id,
                    "description": gist["description"].as_str().unwrap_or("Untitled Gist"),
                    "url": gist["html_url"].as_str().unwrap_or(""),
                    "files": files,
                    "file_count": files.len(),
                    "language": primary_language,
                    "comments": gist["comments"].as_u64().unwrap_or(0),
                    "created_at": gist["created_at"].as_str().unwrap_or(""),
                    "updated_at": gist["updated_at"].as_str().unwrap_or(""),
                }),
                created_at: now,
                updated_at: now,
                source_id: Some(id),
            }
        })
        .collect()
}

/// Create a WebsiteCollection from GitHub gists
pub fn create_github_gists_collection(website_id: Uuid, gists: &[Value]) -> WebsiteCollection {
    let items = gists_to_collection_items(gists);
    let total_count = items.len() as i32;
    let now = Utc::now();

    WebsiteCollection {
        id: Uuid::new_v4(),
        website_id,
        collection_slug: "github_gists".to_string(),
        items,
        source_extension: "github-sync".to_string(),
        source_version: Some("1.0.0".to_string()),
        total_count,
        sync_status: SyncStatus::Idle,
        sync_error: None,
        synced_at: Some(now),
        created_at: now,
        updated_at: now,
    }
}

/// Convert GitHub organizations to collection items
pub fn orgs_to_collection_items(orgs: &[Value]) -> Vec<CollectionItem> {
    orgs.iter()
        .map(|org| {
            let id = org["id"].as_u64().unwrap_or(0).to_string();
            let login = org["login"].as_str().unwrap_or("");
            let now = Utc::now();

            CollectionItem {
                id: id.clone(),
                data: json!({
                    "id": id,
                    "login": login,
                    "name": login, // API doesn't always return name, use login
                    "description": org["description"].as_str().unwrap_or(""),
                    "avatar_url": org["avatar_url"].as_str().unwrap_or(""),
                    "url": format!("https://github.com/{}", login),
                }),
                created_at: now,
                updated_at: now,
                source_id: Some(id),
            }
        })
        .collect()
}

/// Create a WebsiteCollection from GitHub organizations
pub fn create_github_orgs_collection(website_id: Uuid, orgs: &[Value]) -> WebsiteCollection {
    let items = orgs_to_collection_items(orgs);
    let total_count = items.len() as i32;
    let now = Utc::now();

    WebsiteCollection {
        id: Uuid::new_v4(),
        website_id,
        collection_slug: "github_organizations".to_string(),
        items,
        source_extension: "github-sync".to_string(),
        source_version: Some("1.0.0".to_string()),
        total_count,
        sync_status: SyncStatus::Idle,
        sync_error: None,
        synced_at: Some(now),
        created_at: now,
        updated_at: now,
    }
}

/// Convert starred repositories to collection items
pub fn starred_to_collection_items(starred: &[Value]) -> Vec<CollectionItem> {
    starred
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
                    "stars": repo["stargazers_count"].as_u64().unwrap_or(0),
                    "language": repo["language"].as_str(),
                    "topics": repo["topics"].as_array().cloned().unwrap_or_default(),
                    "owner": {
                        "login": repo["owner"]["login"].as_str().unwrap_or(""),
                        "avatar_url": repo["owner"]["avatar_url"].as_str().unwrap_or(""),
                    },
                }),
                created_at: now,
                updated_at: now,
                source_id: Some(id),
            }
        })
        .collect()
}

/// Create a WebsiteCollection from starred repositories
pub fn create_github_starred_collection(website_id: Uuid, starred: &[Value]) -> WebsiteCollection {
    let items = starred_to_collection_items(starred);
    let total_count = items.len() as i32;
    let now = Utc::now();

    WebsiteCollection {
        id: Uuid::new_v4(),
        website_id,
        collection_slug: "github_starred".to_string(),
        items,
        source_extension: "github-sync".to_string(),
        source_version: Some("1.0.0".to_string()),
        total_count,
        sync_status: SyncStatus::Idle,
        sync_error: None,
        synced_at: Some(now),
        created_at: now,
        updated_at: now,
    }
}

/// Types of GitHub events that count as contributions
const CONTRIBUTION_EVENTS: &[&str] = &[
    "PushEvent",
    "CreateEvent",
    "PullRequestEvent",
    "PullRequestReviewEvent",
    "IssuesEvent",
    "IssueCommentEvent",
    "CommitCommentEvent",
];

/// Compute contribution data from GitHub events
/// Returns a map of date (YYYY-MM-DD) to contribution count
pub fn compute_contributions_from_events(events: &[Value]) -> Value {
    use chrono::{DateTime, Duration, Utc};
    use std::collections::HashMap;

    // Initialize contribution map for the last 365 days
    let today = Utc::now().date_naive();
    let start_date = today - Duration::days(364);

    let mut contribution_map: HashMap<String, i64> = HashMap::new();

    // Initialize all days to 0
    let mut current = start_date;
    while current <= today {
        contribution_map.insert(current.format("%Y-%m-%d").to_string(), 0);
        current += Duration::days(1);
    }

    // Process events
    for event in events {
        let event_type = event["type"].as_str().unwrap_or("");

        if CONTRIBUTION_EVENTS.contains(&event_type) {
            if let Some(created_at) = event["created_at"].as_str() {
                if let Ok(dt) = DateTime::parse_from_rfc3339(created_at) {
                    let date_key = dt.format("%Y-%m-%d").to_string();

                    if let Some(count) = contribution_map.get_mut(&date_key) {
                        // PushEvent has commits array
                        let contribution_count = if event_type == "PushEvent" {
                            event["payload"]["commits"]
                                .as_array()
                                .map(|c| c.len() as i64)
                                .unwrap_or(1)
                        } else {
                            1
                        };

                        *count += contribution_count;
                    }
                }
            }
        }
    }

    // Convert to sorted array format for frontend
    let mut contributions: Vec<Value> = contribution_map
        .into_iter()
        .map(|(date, count)| {
            // Determine level based on count
            let level = if count == 0 {
                0
            } else if count < 3 {
                1
            } else if count < 6 {
                2
            } else if count < 10 {
                3
            } else {
                4
            };

            json!({
                "date": date,
                "count": count,
                "level": level
            })
        })
        .collect();

    contributions.sort_by(|a, b| {
        a["date"]
            .as_str()
            .unwrap_or("")
            .cmp(b["date"].as_str().unwrap_or(""))
    });

    // Calculate total
    let total: i64 = contributions
        .iter()
        .map(|c| c["count"].as_i64().unwrap_or(0))
        .sum();

    json!({
        "contributions": contributions,
        "total": total
    })
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
