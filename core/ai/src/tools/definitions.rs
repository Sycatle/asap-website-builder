//! Tool Definitions
//!
//! JSON Schema definitions for AI tools (function calling).

use super::types::{FunctionDefinition, ToolDefinition};
use serde_json::json;

/// Get all tool definitions for AI function calling
pub fn get_tool_definitions() -> Vec<ToolDefinition> {
    vec![
        search_collections_tool(),
        search_variables_tool(),
        get_sections_tool(),
        get_theme_tool(),
        get_settings_tool(),
        list_extensions_tool(),
        get_page_content_tool(),
        request_visual_analysis_tool(),
    ]
}

/// Tool to search within collections (repos, languages, etc.)
fn search_collections_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "search_collections".to_string(),
            description: "Search within website collections (e.g., GitHub repos, languages, gists). Use this to find specific items or filter by criteria.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "collection": {
                        "type": "string",
                        "description": "Collection slug to search in. Examples: 'github_repos', 'github_languages', 'github_gists', 'github_organizations'. Leave empty to search all."
                    },
                    "query": {
                        "type": "string",
                        "description": "Search query to match against item names, descriptions, and other text fields."
                    },
                    "filters": {
                        "type": "object",
                        "description": "Key-value filters to match exactly. Example: {\"language\": \"Rust\", \"stars\": {\"$gt\": 100}}"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 10, max: 50)",
                        "default": 10
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to search website variables
fn search_variables_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "search_variables".to_string(),
            description: "Search website variables (profile data, stats, settings). Variables store single values like 'github_username', 'github_bio', 'github_total_stars'.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "description": "Filter by source extension. Examples: 'github-sync', 'manual', 'linkedin-sync'"
                    },
                    "pattern": {
                        "type": "string",
                        "description": "Key pattern to match. Supports wildcards: 'github_*' matches all GitHub variables."
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to get website sections
fn get_sections_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "get_website_sections".to_string(),
            description: "Get information about website sections (hero, projects, skills, contact, etc.). Use this to understand the page structure before making changes.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "section_type": {
                        "type": "string",
                        "description": "Filter by section type. Examples: 'hero', 'projects', 'skills', 'experience', 'contact', 'faq'"
                    },
                    "include_content": {
                        "type": "boolean",
                        "description": "Include full section content (default: false, returns summary only)",
                        "default": false
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to get website theme/design
fn get_theme_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "get_website_theme".to_string(),
            description: "Get website design theme (colors, fonts, spacing, etc.). Use this before suggesting or making design changes.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "property": {
                        "type": "string",
                        "description": "Specific property to get. Options: 'colors', 'fonts', 'spacing', 'borders'. Leave empty for all."
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to get website settings
fn get_settings_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "get_website_settings".to_string(),
            description: "Get website settings (SEO, social links, analytics, domain). Use this to understand current configuration.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Specific category. Options: 'seo', 'social', 'analytics', 'domain'. Leave empty for all."
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to list active extensions
fn list_extensions_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "list_extensions".to_string(),
            description: "List extensions installed on the website and what data they provide.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "active_only": {
                        "type": "boolean",
                        "description": "Only list active extensions (default: true)",
                        "default": true
                    }
                },
                "required": []
            }),
        },
    }
}

/// Tool to get page content
fn get_page_content_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "get_page_content".to_string(),
            description: "Get content of a specific page including its sections and layout.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "page": {
                        "type": "string",
                        "description": "Page slug. Examples: 'home', 'about', 'projects', 'contact'"
                    },
                    "include_sections": {
                        "type": "boolean",
                        "description": "Include detailed section information (default: false)",
                        "default": false
                    }
                },
                "required": ["page"]
            }),
        },
    }
}

/// Tool to request visual analysis of the website preview
/// This is a special "async" tool that triggers frontend capture
fn request_visual_analysis_tool() -> ToolDefinition {
    ToolDefinition {
        tool_type: "function".to_string(),
        function: FunctionDefinition {
            name: "request_visual_analysis".to_string(),
            description: "Request a visual analysis of the website preview. This captures a screenshot and analyzes the design, layout, colors, and UX. Use this when the user asks about how their site looks, design feedback, or visual improvements.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "viewport": {
                        "type": "string",
                        "enum": ["desktop", "tablet", "mobile"],
                        "description": "Which viewport/device to capture. Default: desktop",
                        "default": "desktop"
                    },
                    "focus": {
                        "type": "string",
                        "enum": ["layout", "colors", "typography", "spacing", "overall", "specific_section"],
                        "description": "What aspect to focus the analysis on"
                    },
                    "section": {
                        "type": "string",
                        "description": "If focus is 'specific_section', which section to analyze (e.g., 'hero', 'footer')"
                    },
                    "question": {
                        "type": "string",
                        "description": "Specific question about the design to answer"
                    }
                },
                "required": ["focus"]
            }),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_definitions_valid() {
        let tools = get_tool_definitions();
        assert_eq!(tools.len(), 8);
        
        for tool in &tools {
            assert_eq!(tool.tool_type, "function");
            assert!(!tool.function.name.is_empty());
            assert!(!tool.function.description.is_empty());
        }
    }

    #[test]
    fn test_tool_names_unique() {
        let tools = get_tool_definitions();
        let names: Vec<&str> = tools.iter().map(|t| t.function.name.as_str()).collect();
        
        let mut unique_names = names.clone();
        unique_names.sort();
        unique_names.dedup();
        
        assert_eq!(names.len(), unique_names.len(), "Tool names must be unique");
    }
    
    #[test]
    fn test_visual_analysis_tool_exists() {
        let tools = get_tool_definitions();
        let visual_tool = tools.iter().find(|t| t.function.name == "request_visual_analysis");
        assert!(visual_tool.is_some(), "Visual analysis tool should exist");
    }
}
