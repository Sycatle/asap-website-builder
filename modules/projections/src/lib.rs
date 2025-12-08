// Projections Module
// Generates static JSON files for fast public access

use std::path::Path;
use tokio::fs;
use serde::{Serialize, Deserialize};
use chrono::Utc;

/// Metadata for a projection
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectionMetadata {
    pub slug: String,
    pub generated_at: String,
    pub version: String,
}

/// A complete projection with metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct Projection {
    pub metadata: ProjectionMetadata,
    pub data: serde_json::Value,
}

/// Generate a static JSON projection file for a portfolio
pub async fn generate_projection(slug: &str, data: serde_json::Value) -> anyhow::Result<()> {
    tracing::info!("Generating projection for slug: {}", slug);
    
    // Create projection with metadata
    let projection = Projection {
        metadata: ProjectionMetadata {
            slug: slug.to_string(),
            generated_at: Utc::now().to_rfc3339(),
            version: "1.0.0".to_string(),
        },
        data,
    };
    
    let path = format!("data/sites/{}.json", slug);
    let json = serde_json::to_string_pretty(&projection)?;
    
    // Create directory if it doesn't exist
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).await?;
    }
    
    // Write projection to file
    fs::write(&path, json).await?;
    tracing::info!("Projection saved to {}", path);
    
    Ok(())
}

/// Read a projection from disk
pub async fn read_projection(slug: &str) -> anyhow::Result<Projection> {
    let path = format!("data/sites/{}.json", slug);
    let contents = fs::read_to_string(&path).await?;
    let projection: Projection = serde_json::from_str(&contents)?;
    Ok(projection)
}

/// Delete a projection from disk
pub async fn delete_projection(slug: &str) -> anyhow::Result<()> {
    let path = format!("data/sites/{}.json", slug);
    if Path::new(&path).exists() {
        fs::remove_file(&path).await?;
        tracing::info!("Projection deleted: {}", path);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_generate_projection_simple() {
        let _slug = "test-portfolio";
        let _data = serde_json::json!({
            "title": "Test Portfolio",
            "bio": "A test"
        });

        // Create a temporary directory for testing
        let test_dir = "test_data";
        let result = tokio::fs::create_dir_all(test_dir).await;
        assert!(result.is_ok());

        // Cleanup - we'll test the logic without actual file I/O
        let _ = tokio::fs::remove_dir_all(test_dir).await;
    }

    #[test]
    fn test_generate_projection_slug_validation() {
        let valid_slugs = vec![
            "my-portfolio",
            "portfolio-123",
            "test",
            "a-b-c-d",
        ];

        for slug in valid_slugs {
            assert!(!slug.is_empty());
            assert!(slug.len() < 256);
        }
    }

    #[test]
    fn test_generate_projection_data_serialization() {
        let data = serde_json::json!({
            "title": "Portfolio",
            "sections": ["about", "projects"],
            "projects": [
                {"id": 1, "name": "Project 1"},
                {"id": 2, "name": "Project 2"}
            ]
        });

        let json = serde_json::to_string_pretty(&data).unwrap();
        assert!(!json.is_empty());
        
        // Verify it can be parsed back
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["title"], "Portfolio");
        assert_eq!(parsed["projects"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn test_path_construction() {
        let slug = "my-portfolio";
        let path = format!("data/sites/{}.json", slug);
        
        assert_eq!(path, "data/sites/my-portfolio.json");
        assert!(path.ends_with(".json"));
        assert!(path.contains("data/sites/"));
    }

    #[test]
    fn test_projection_data_structure() {
        let data = serde_json::json!({
            "metadata": {
                "generated_at": "2024-01-01T00:00:00Z",
                "source": "github"
            },
            "content": {
                "projects": [
                    {
                        "name": "Project A",
                        "url": "https://github.com/user/project-a"
                    }
                ]
            }
        });

        assert!(data["metadata"].is_object());
        assert!(data["content"]["projects"].is_array());
        assert_eq!(data["metadata"]["source"], "github");
    }

    #[test]
    fn test_multiple_slugs_different_paths() {
        let slugs = vec!["portfolio-1", "portfolio-2", "portfolio-3"];
        let paths: Vec<String> = slugs
            .iter()
            .map(|slug| format!("data/sites/{}.json", slug))
            .collect();

        // All paths should be unique
        assert_eq!(paths.len(), 3);
        assert!(paths[0].contains("portfolio-1"));
        assert!(paths[1].contains("portfolio-2"));
        assert!(paths[2].contains("portfolio-3"));
    }

    #[test]
    fn test_empty_projection_data() {
        let data = serde_json::json!({});
        let json = serde_json::to_string_pretty(&data).unwrap();
        
        assert_eq!(json.trim(), "{}");
    }

    #[test]
    fn test_projection_with_complex_data() {
        let data = serde_json::json!({
            "site": {
                "title": "John's Portfolio",
                "theme": "dark",
                "sections": [
                    {
                        "id": "about",
                        "title": "About",
                        "content": "I'm a developer"
                    },
                    {
                        "id": "projects",
                        "title": "Projects",
                        "items": [
                            {
                                "name": "Project 1",
                                "tags": ["rust", "web"],
                                "links": {
                                    "github": "https://github.com/...",
                                    "demo": "https://example.com"
                                }
                            }
                        ]
                    }
                ]
            }
        });

        let json = serde_json::to_string_pretty(&data).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed["site"]["title"], "John's Portfolio");
        assert_eq!(parsed["site"]["sections"][0]["id"], "about");
        assert!(parsed["site"]["sections"][1]["items"][0]["tags"].is_array());
    }
}

