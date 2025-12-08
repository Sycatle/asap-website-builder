use anyhow::Result;

pub async fn generate_portfolio_content(repos: Vec<serde_json::Value>) -> Result<serde_json::Value> {
    // TODO: Transform GitHub repos into portfolio content
    tracing::info!("Processing {} repositories", repos.len());
    Ok(serde_json::json!({
        "projects": []
    }))
}
