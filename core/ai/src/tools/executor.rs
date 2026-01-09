//! Tool Executor
//!
//! Executes AI tool calls against website data.

use serde_json::json;
use std::collections::HashMap;
use tracing::{debug, warn};

use super::types::*;
use crate::types::WebsiteContext;

/// Executor for AI tools
pub struct ToolExecutor;

impl ToolExecutor {
    /// Create a new tool executor
    pub fn new() -> Self {
        Self
    }

    /// Execute a tool call and return the result
    pub fn execute(
        &self,
        tool_call: &ToolCall,
        context: &WebsiteContext,
    ) -> ToolResult {
        let function_name = &tool_call.function.name;
        let args = &tool_call.function.arguments;

        debug!("Executing tool: {} with args: {}", function_name, args);

        let result = match function_name.as_str() {
            "search_collections" => self.search_collections(args, context),
            "search_variables" => self.search_variables(args, context),
            "get_website_sections" => self.get_sections(args, context),
            "get_website_theme" => self.get_theme(context),
            "get_website_settings" => self.get_settings(context),
            "list_extensions" => self.list_extensions(context),
            "get_page_content" => self.get_page_content(args, context),
            _ => Err(format!("Unknown tool: {}", function_name)),
        };

        match result {
            Ok(content) => ToolResult {
                tool_call_id: tool_call.id.clone(),
                success: true,
                content,
                error: None,
            },
            Err(error) => {
                warn!("Tool execution failed: {}", error);
                ToolResult {
                    tool_call_id: tool_call.id.clone(),
                    success: false,
                    content: json!({"error": error}).to_string(),
                    error: Some(error),
                }
            }
        }
    }

    /// Search within collections
    fn search_collections(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: SearchCollectionsParams = serde_json::from_str(args)
            .map_err(|e| format!("Invalid parameters: {}", e))?;

        let data = context.data.as_ref().ok_or("No website data available")?;
        
        let mut results: Vec<CollectionItem> = Vec::new();
        let limit = params.limit.min(50);

        for collection in &data.collections {
            // Filter by collection slug if specified
            if let Some(ref target_collection) = params.collection {
                if &collection.slug != target_collection {
                    continue;
                }
            }

            // Search through preview items (Vec<serde_json::Value>)
            for item in &collection.preview {
                let item_data: HashMap<String, serde_json::Value> = if let Some(obj) = item.as_object() {
                    obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
                } else {
                    continue;
                };
                
                let mut matches = true;
                let mut score: f32 = 1.0;

                // Apply query filter (fuzzy match on text fields)
                if let Some(ref query) = params.query {
                    let query_lower = query.to_lowercase();
                    let mut found = false;
                    
                    for (_key, value) in &item_data {
                        if let Some(text) = value.as_str() {
                            if text.to_lowercase().contains(&query_lower) {
                                found = true;
                                // Boost score for exact matches
                                if text.to_lowercase() == query_lower {
                                    score = 1.0;
                                } else {
                                    score = 0.7;
                                }
                                break;
                            }
                        }
                    }
                    
                    if !found {
                        matches = false;
                    }
                }

                // Apply exact filters
                if let Some(ref filters) = params.filters {
                    for (key, expected_value) in filters {
                        if let Some(actual_value) = item_data.get(key) {
                            // Handle comparison operators
                            if expected_value.is_object() {
                                if let Some(obj) = expected_value.as_object() {
                                    for (op, val) in obj {
                                        match op.as_str() {
                                            "$gt" => {
                                                if let (Some(a), Some(b)) = (actual_value.as_i64(), val.as_i64()) {
                                                    if a <= b { matches = false; }
                                                }
                                            }
                                            "$lt" => {
                                                if let (Some(a), Some(b)) = (actual_value.as_i64(), val.as_i64()) {
                                                    if a >= b { matches = false; }
                                                }
                                            }
                                            "$gte" => {
                                                if let (Some(a), Some(b)) = (actual_value.as_i64(), val.as_i64()) {
                                                    if a < b { matches = false; }
                                                }
                                            }
                                            "$lte" => {
                                                if let (Some(a), Some(b)) = (actual_value.as_i64(), val.as_i64()) {
                                                    if a > b { matches = false; }
                                                }
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                            } else if actual_value != expected_value {
                                matches = false;
                            }
                        } else {
                            matches = false;
                        }
                    }
                }

                if matches {
                    results.push(CollectionItem {
                        id: item_data.get("id")
                            .or_else(|| item_data.get("name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        data: item_data,
                        score: Some(score),
                    });

                    if results.len() >= limit {
                        break;
                    }
                }
            }

            if results.len() >= limit {
                break;
            }
        }

        // Sort by score descending
        results.sort_by(|a, b| {
            b.score.unwrap_or(0.0).partial_cmp(&a.score.unwrap_or(0.0)).unwrap()
        });

        Ok(serde_json::to_string(&json!({
            "count": results.len(),
            "items": results
        })).unwrap())
    }

    /// Search website variables
    fn search_variables(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: SearchVariablesParams = serde_json::from_str(args)
            .map_err(|e| format!("Invalid parameters: {}", e))?;

        let data = context.data.as_ref().ok_or("No website data available")?;
        
        let mut results: Vec<VariableItem> = Vec::new();

        for group in &data.variables {
            // Filter by source if specified
            if let Some(ref source) = params.source {
                if &group.source != source {
                    continue;
                }
            }

            for (key, value) in &group.variables {
                // Filter by pattern if specified
                if let Some(ref pattern) = params.pattern {
                    if !matches_pattern(key, pattern) {
                        continue;
                    }
                }

                results.push(VariableItem {
                    key: key.clone(),
                    value: value.clone(),
                    source: group.source.clone(),
                });
            }
        }

        Ok(serde_json::to_string(&json!({
            "count": results.len(),
            "variables": results
        })).unwrap())
    }

    /// Get website sections
    fn get_sections(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: GetSectionsParams = serde_json::from_str(args)
            .map_err(|e| format!("Invalid parameters: {}", e))?;

        let mut sections: Vec<serde_json::Value> = Vec::new();

        for section in &context.sections {
            // Filter by section type if specified
            if let Some(ref section_type) = params.section_type {
                if &section.section_type != section_type {
                    continue;
                }
            }

            let mut section_info = json!({
                "id": section.id,
                "type": section.section_type,
                "variant": section.variant,
                "position": section.position,
            });

            if params.include_content {
                section_info["properties"] = section.properties.clone();
            } else {
                // Include a brief preview from properties
                if let Some(headline) = section.properties.get("headline").and_then(|v| v.as_str()) {
                    section_info["preview"] = json!({"headline": headline});
                } else if let Some(title) = section.properties.get("title").and_then(|v| v.as_str()) {
                    section_info["preview"] = json!({"title": title});
                }
            }

            sections.push(section_info);
        }

        Ok(serde_json::to_string(&json!({
            "count": sections.len(),
            "sections": sections
        })).unwrap())
    }

    /// Get website theme
    fn get_theme(&self, context: &WebsiteContext) -> Result<String, String> {
        let theme = &context.theme;

        // Return summary of theme
        let theme_info = ThemeInfo {
            primary_color: theme.get("primaryColor").and_then(|v| v.as_str()).map(String::from),
            secondary_color: theme.get("secondaryColor").and_then(|v| v.as_str()).map(String::from),
            background_color: theme.get("backgroundColor").and_then(|v| v.as_str()).map(String::from),
            text_color: theme.get("textColor").and_then(|v| v.as_str()).map(String::from),
            font_family: theme.get("fontFamily").and_then(|v| v.as_str()).map(String::from),
            font_scale: theme.get("fontScale").and_then(|v| v.as_str()).map(String::from),
            border_radius: theme.get("borderRadius").and_then(|v| v.as_str()).map(String::from),
            full: Some(theme.clone()),
        };
        Ok(serde_json::to_string(&theme_info).unwrap())
    }

    /// Get website settings (from theme as it contains settings-like data)
    fn get_settings(&self, context: &WebsiteContext) -> Result<String, String> {
        // Settings are typically stored in theme or website data
        // For now, extract from theme
        let data = &context.theme;

        // Return summary of settings
        let settings_info = SettingsInfo {
            seo: data.get("seo").cloned(),
            social: data.get("social").cloned(),
            analytics: data.get("analytics").cloned(),
            domain: data.get("domain").and_then(|v| v.as_str()).map(String::from),
            full: Some(data.clone()),
        };
        Ok(serde_json::to_string(&settings_info).unwrap())
    }

    /// List extensions
    fn list_extensions(&self, context: &WebsiteContext) -> Result<String, String> {
        // Use the extensions list from context (loaded from website_extensions_v2)
        let extensions: Vec<ExtensionInfo> = context.extensions.iter().map(|ext| {
            // Count variables and collections from this extension
            let (variables_count, collections_count) = if let Some(data) = context.data.as_ref() {
                let vars = data.variables.iter()
                    .filter(|g| g.source == ext.slug)
                    .map(|g| g.variables.len())
                    .sum();
                let cols = data.collections.iter()
                    .filter(|c| c.source == ext.slug)
                    .count();
                (vars, cols)
            } else {
                (0, 0)
            };
            
            ExtensionInfo {
                id: ext.slug.clone(),
                name: ext.name.clone(),
                active: ext.enabled,
                variables_count,
                collections_count,
            }
        }).collect();

        Ok(serde_json::to_string(&json!({
            "count": extensions.len(),
            "extensions": extensions
        })).unwrap())
    }

    /// Get page content
    fn get_page_content(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: GetPageContentParams = serde_json::from_str(args)
            .map_err(|e| format!("Invalid parameters: {}", e))?;

        // For now, treat the whole website as a single page
        // In the future, this can be expanded for multi-page support
        let page = &params.page;
        
        let mut page_info = json!({
            "slug": page,
            "title": context.website.title,
            "section_count": context.sections.len(),
        });

        if params.include_sections {
            let sections: Vec<serde_json::Value> = context.sections.iter().map(|s| {
                json!({
                    "id": s.id,
                    "type": s.section_type,
                    "variant": s.variant,
                    "position": s.position,
                    "properties": s.properties,
                })
            }).collect();
            page_info["sections"] = json!(sections);
        } else {
            let section_types: Vec<&str> = context.sections.iter()
                .map(|s| s.section_type.as_str())
                .collect();
            page_info["section_types"] = json!(section_types);
        }

        Ok(serde_json::to_string(&page_info).unwrap())
    }
}

impl Default for ToolExecutor {
    fn default() -> Self {
        Self::new()
    }
}

/// Check if a key matches a pattern with wildcards
fn matches_pattern(key: &str, pattern: &str) -> bool {
    if pattern.contains('*') {
        // Simple wildcard matching
        let parts: Vec<&str> = pattern.split('*').collect();
        if parts.len() == 2 {
            let (prefix, suffix) = (parts[0], parts[1]);
            key.starts_with(prefix) && key.ends_with(suffix)
        } else if pattern.starts_with('*') {
            key.ends_with(&pattern[1..])
        } else if pattern.ends_with('*') {
            key.starts_with(&pattern[..pattern.len()-1])
        } else {
            key == pattern
        }
    } else {
        key == pattern
    }
}

/// Format extension ID to human-readable name
fn format_extension_name(id: &str) -> String {
    id.replace('-', " ")
        .replace('_', " ")
        .split_whitespace()
        .map(|word| {
            let mut chars: Vec<char> = word.chars().collect();
            if let Some(first) = chars.first_mut() {
                *first = first.to_uppercase().next().unwrap_or(*first);
            }
            chars.into_iter().collect::<String>()
        })
        .collect::<Vec<String>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_pattern() {
        assert!(matches_pattern("github_username", "github_*"));
        assert!(matches_pattern("github_username", "*_username"));
        assert!(matches_pattern("github_username", "github_username"));
        assert!(!matches_pattern("linkedin_username", "github_*"));
    }

    #[test]
    fn test_format_extension_name() {
        assert_eq!(format_extension_name("github-sync"), "Github Sync");
        assert_eq!(format_extension_name("linkedin_import"), "Linkedin Import");
    }
}
