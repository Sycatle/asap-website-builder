use anyhow::Result;

pub async fn generate_website_content(
    repos: Vec<serde_json::Value>,
    user: Option<serde_json::Value>,
    orgs: Option<Vec<serde_json::Value>>,
) -> Result<serde_json::Value> {
    tracing::info!("Processing {} repositories", repos.len());

    // Transform repos into website projects
    let mut projects: Vec<serde_json::Value> = repos
        .into_iter()
        .map(|repo| {
            serde_json::json!({
                "name": repo["name"].as_str().unwrap_or(""),
                "description": repo["description"].as_str().unwrap_or("No description"),
                "url": repo["html_url"].as_str().unwrap_or(""),
                "language": repo["language"].as_str(),
                "stars": repo["stargazers_count"].as_u64().unwrap_or(0),
                "forks": repo["forks_count"].as_u64().unwrap_or(0),
                "created_at": repo["created_at"].as_str().unwrap_or(""),
                "updated_at": repo["updated_at"].as_str().unwrap_or(""),
            })
        })
        .collect();

    // Sort by stars (descending)
    projects.sort_by(|a, b| {
        let stars_a = a["stars"].as_u64().unwrap_or(0);
        let stars_b = b["stars"].as_u64().unwrap_or(0);
        stars_b.cmp(&stars_a)
    });

    tracing::info!("Generated website content with {} projects", projects.len());

    // Build profile from user data
    let profile = user.map(|u| {
        serde_json::json!({
            "username": u["login"].as_str().unwrap_or(""),
            "name": u["name"].as_str(),
            "avatar_url": u["avatar_url"].as_str().unwrap_or(""),
            "bio": u["bio"].as_str(),
            "company": u["company"].as_str(),
            "location": u["location"].as_str(),
            "blog": u["blog"].as_str(),
            "twitter": u["twitter_username"].as_str(),
            "public_repos": u["public_repos"].as_u64().unwrap_or(0),
            "followers": u["followers"].as_u64().unwrap_or(0),
            "following": u["following"].as_u64().unwrap_or(0),
            "url": u["html_url"].as_str().unwrap_or(""),
        })
    });

    // Build organizations list
    let organizations: Vec<serde_json::Value> = orgs
        .unwrap_or_default()
        .into_iter()
        .map(|org| {
            serde_json::json!({
                "name": org["login"].as_str().unwrap_or(""),
                "avatar_url": org["avatar_url"].as_str().unwrap_or(""),
                "description": org["description"].as_str(),
            })
        })
        .collect();

    Ok(serde_json::json!({
        "profile": profile,
        "organizations": organizations,
        "projects": projects,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "source": "github"
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_website_content_empty() {
        let repos: Vec<serde_json::Value> = vec![];
        let result = generate_website_content(repos, None, None).await.unwrap();

        assert_eq!(result["projects"].as_array().unwrap().len(), 0);
        assert_eq!(result["source"], "github");
        assert!(result["generated_at"].as_str().is_some());
    }

    #[tokio::test]
    async fn test_generate_website_content_single_repo() {
        let repos = vec![serde_json::json!({
            "name": "my-project",
            "description": "A test project",
            "html_url": "https://github.com/user/my-project",
            "stargazers_count": 10,
            "forks_count": 2,
            "language": "Rust",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        })];

        let result = generate_website_content(repos, None, None).await.unwrap();
        let projects = result["projects"].as_array().unwrap();

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0]["name"], "my-project");
        assert_eq!(projects[0]["stars"], 10);
        assert_eq!(projects[0]["language"], "Rust");
    }

    #[tokio::test]
    async fn test_generate_website_content_multiple_repos() {
        let repos = vec![
            serde_json::json!({
                "name": "project-a",
                "description": "Project A",
                "html_url": "https://github.com/user/project-a",
                "stargazers_count": 5,
                "forks_count": 1,
                "language": "Python",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }),
            serde_json::json!({
                "name": "project-b",
                "description": "Project B",
                "html_url": "https://github.com/user/project-b",
                "stargazers_count": 15,
                "forks_count": 3,
                "language": "Rust",
                "created_at": "2023-06-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }),
        ];

        let result = generate_website_content(repos, None, None).await.unwrap();
        let projects = result["projects"].as_array().unwrap();

        assert_eq!(projects.len(), 2);
        // Should be sorted by stars descending
        assert_eq!(projects[0]["name"], "project-b");
        assert_eq!(projects[0]["stars"], 15);
        assert_eq!(projects[1]["name"], "project-a");
        assert_eq!(projects[1]["stars"], 5);
    }

    #[tokio::test]
    async fn test_generate_website_content_sorting() {
        let repos = vec![
            serde_json::json!({
                "name": "low-stars",
                "description": "Low stars project",
                "html_url": "https://github.com/user/low-stars",
                "stargazers_count": 1,
                "forks_count": 0,
                "language": "JavaScript",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }),
            serde_json::json!({
                "name": "high-stars",
                "description": "High stars project",
                "html_url": "https://github.com/user/high-stars",
                "stargazers_count": 100,
                "forks_count": 10,
                "language": "Rust",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }),
            serde_json::json!({
                "name": "mid-stars",
                "description": "Mid stars project",
                "html_url": "https://github.com/user/mid-stars",
                "stargazers_count": 50,
                "forks_count": 5,
                "language": "Go",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }),
        ];

        let result = generate_website_content(repos, None, None).await.unwrap();
        let projects = result["projects"].as_array().unwrap();

        assert_eq!(projects[0]["stars"], 100);
        assert_eq!(projects[1]["stars"], 50);
        assert_eq!(projects[2]["stars"], 1);
    }

    #[tokio::test]
    async fn test_generate_website_content_missing_fields() {
        let repos = vec![serde_json::json!({
            "name": "minimal-repo",
            // Missing description, language, etc.
            "html_url": "https://github.com/user/minimal",
            "stargazers_count": 5,
            "forks_count": 0,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        })];

        let result = generate_website_content(repos, None, None).await.unwrap();
        let projects = result["projects"].as_array().unwrap();

        assert_eq!(projects[0]["name"], "minimal-repo");
        assert_eq!(projects[0]["description"], "No description");
        assert!(projects[0]["language"].is_null());
    }

    #[tokio::test]
    async fn test_generate_website_content_structure() {
        let repos = vec![serde_json::json!({
            "name": "test-repo",
            "description": "A test",
            "html_url": "https://github.com/user/test",
            "stargazers_count": 0,
            "forks_count": 0,
            "language": "Rust",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        })];

        let result = generate_website_content(repos, None, None).await.unwrap();

        // Verify structure
        assert!(result["projects"].is_array());
        assert!(result["generated_at"].is_string());
        assert!(result["source"].is_string());
        assert_eq!(result["source"], "github");
    }

    #[tokio::test]
    async fn test_generate_website_content_with_profile() {
        let repos: Vec<serde_json::Value> = vec![];
        let user = Some(serde_json::json!({
            "login": "testuser",
            "name": "Test User",
            "avatar_url": "https://avatars.githubusercontent.com/u/123",
            "bio": "A test user",
            "company": "Test Inc",
            "location": "Earth",
            "blog": "https://test.com",
            "twitter_username": "testuser",
            "public_repos": 10,
            "followers": 100,
            "following": 50,
            "html_url": "https://github.com/testuser",
        }));
        let orgs = Some(vec![serde_json::json!({
            "login": "testorg",
            "avatar_url": "https://avatars.githubusercontent.com/o/456",
            "description": "A test org",
        })]);

        let result = generate_website_content(repos, user, orgs).await.unwrap();

        let profile = &result["profile"];
        assert_eq!(profile["username"], "testuser");
        assert_eq!(profile["name"], "Test User");
        assert_eq!(profile["followers"], 100);

        let organizations = result["organizations"].as_array().unwrap();
        assert_eq!(organizations.len(), 1);
        assert_eq!(organizations[0]["name"], "testorg");
    }
}
