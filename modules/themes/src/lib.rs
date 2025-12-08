// Theme Module
// Applies themes to portfolio content

use serde::{Deserialize, Serialize};

/// Represents a portfolio theme configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub colors: ThemeColors,
    pub fonts: ThemeFonts,
    pub layout: ThemeLayout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeColors {
    pub primary: String,
    pub secondary: String,
    pub background: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeFonts {
    pub heading: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeLayout {
    pub style: String, // "minimal", "modern", "creative"
    pub sidebar: bool,
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            name: "default".to_string(),
            colors: ThemeColors {
                primary: "#3b82f6".to_string(),
                secondary: "#8b5cf6".to_string(),
                background: "#ffffff".to_string(),
                text: "#1f2937".to_string(),
            },
            fonts: ThemeFonts {
                heading: "Inter".to_string(),
                body: "Inter".to_string(),
            },
            layout: ThemeLayout {
                style: "modern".to_string(),
                sidebar: false,
            },
        }
    }
}

/// Apply theme to portfolio data and generate styled HTML/JSON
pub fn apply_theme(portfolio_data: serde_json::Value, theme: Option<Theme>) -> anyhow::Result<String> {
    let theme = theme.unwrap_or_default();
    
    tracing::info!("Applying theme '{}' to portfolio", theme.name);
    
    // Create a themed portfolio output with metadata
    let themed_output = serde_json::json!({
        "portfolio": portfolio_data,
        "theme": {
            "name": theme.name,
            "colors": theme.colors,
            "fonts": theme.fonts,
            "layout": theme.layout,
        },
        "meta": {
            "generated_at": chrono::Utc::now().to_rfc3339(),
            "theme_version": "1.0.0"
        }
    });
    
    Ok(serde_json::to_string_pretty(&themed_output)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_theme_empty_data() {
        let data = serde_json::json!({});
        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("portfolio"));
        assert!(rendered.contains("theme"));
    }

    #[test]
    fn test_apply_theme_with_portfolio_data() {
        let data = serde_json::json!({
            "title": "My Portfolio",
            "bio": "A developer",
            "projects": [
                {"name": "Project 1"},
                {"name": "Project 2"}
            ]
        });

        let result = apply_theme(data, None).unwrap();
        assert!(result.contains("My Portfolio"));
        assert!(result.contains("A developer"));
    }

    #[test]
    fn test_apply_theme_with_complex_structure() {
        let data = serde_json::json!({
            "metadata": {
                "theme": "dark",
                "layout": "grid"
            },
            "sections": {
                "about": "About me",
                "contact": "Contact info"
            },
            "projects": [
                {
                    "title": "Project A",
                    "description": "Desc A",
                    "tags": ["rust", "web"]
                },
                {
                    "title": "Project B",
                    "description": "Desc B",
                    "tags": ["javascript"]
                }
            ]
        });

        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("Project A"));
        assert!(rendered.contains("rust"));
    }

    #[test]
    fn test_apply_theme_returns_valid_json_string() {
        let data = serde_json::json!({
            "name": "John",
            "age": 30
        });

        let result = apply_theme(data, None).unwrap();
        // Should be valid JSON
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["portfolio"]["name"], "John");
        assert_eq!(parsed["portfolio"]["age"], 30);
    }

    #[test]
    fn test_apply_theme_with_null_values() {
        let data = serde_json::json!({
            "title": "Portfolio",
            "subtitle": null,
            "image": null
        });

        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("null"));
    }

    #[test]
    fn test_apply_theme_with_array() {
        let data = serde_json::json!([
            {"id": 1, "name": "Item 1"},
            {"id": 2, "name": "Item 2"},
            {"id": 3, "name": "Item 3"}
        ]);

        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("Item 1"));
        assert!(rendered.contains("Item 3"));
    }

    #[test]
    fn test_apply_theme_with_numbers() {
        let data = serde_json::json!({
            "stats": {
                "projects": 42,
                "followers": 1000,
                "stars": 5000.5
            }
        });

        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("42"));
        assert!(rendered.contains("1000"));
    }

    #[test]
    fn test_apply_theme_with_unicode() {
        let data = serde_json::json!({
            "name": "José García",
            "bio": "Developer 👨‍💻",
            "location": "São Paulo 🇧🇷"
        });

        let result = apply_theme(data, None);
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("José"));
        assert!(rendered.contains("👨"));
    }

    #[test]
    fn test_default_theme() {
        let theme = Theme::default();
        assert_eq!(theme.name, "default");
        assert_eq!(theme.colors.primary, "#3b82f6");
        assert_eq!(theme.layout.style, "modern");
    }

    #[test]
    fn test_apply_custom_theme() {
        let data = serde_json::json!({
            "title": "My Portfolio"
        });

        let custom_theme = Theme {
            name: "dark".to_string(),
            colors: ThemeColors {
                primary: "#000000".to_string(),
                secondary: "#ffffff".to_string(),
                background: "#1a1a1a".to_string(),
                text: "#ffffff".to_string(),
            },
            fonts: ThemeFonts {
                heading: "Roboto".to_string(),
                body: "Open Sans".to_string(),
            },
            layout: ThemeLayout {
                style: "minimal".to_string(),
                sidebar: true,
            },
        };

        let result = apply_theme(data, Some(custom_theme));
        assert!(result.is_ok());
        let rendered = result.unwrap();
        assert!(rendered.contains("dark"));
        assert!(rendered.contains("#000000"));
        assert!(rendered.contains("Roboto"));
        assert!(rendered.contains("minimal"));
    }
}

