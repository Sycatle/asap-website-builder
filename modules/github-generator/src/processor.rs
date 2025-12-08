use anyhow::Result;

pub async fn generate_portfolio_content(repos: Vec<serde_json::Value>) -> Result<serde_json::Value> {
    tracing::info!("Processing {} repositories", repos.len());
    
    // Transform repos into portfolio projects
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

    tracing::info!("Generated portfolio content with {} projects", projects.len());

    Ok(serde_json::json!({
        "projects": projects,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "source": "github"
    }))
}
