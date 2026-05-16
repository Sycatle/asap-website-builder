//! Tool Executor
//!
//! Executes AI tool calls against website data.
//! Supports pluggable backends for web search and URL browsing.

use async_trait::async_trait;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error, warn};

use super::types::*;
use crate::types::WebsiteContext;

/// Trait for web search backends (Brave, Serper, etc.)
#[async_trait]
pub trait WebSearchBackend: Send + Sync {
    /// Execute a web search and return results
    async fn search(&self, params: &WebSearchParams) -> Result<Vec<WebSearchResult>, String>;

    /// Check if the backend is configured and ready
    fn is_available(&self) -> bool;
}

/// Trait for URL browsing backends (scraping services)
#[async_trait]
pub trait WebBrowseBackend: Send + Sync {
    /// Browse a URL and extract content
    async fn browse(&self, params: &BrowseUrlParams) -> Result<BrowsedContent, String>;

    /// Check if the backend is configured and ready
    fn is_available(&self) -> bool;
}

/// Executor for AI tools
pub struct ToolExecutor {
    /// Optional web search backend
    web_search_backend: Option<Arc<dyn WebSearchBackend>>,
    /// Optional web browse backend
    web_browse_backend: Option<Arc<dyn WebBrowseBackend>>,
}

impl ToolExecutor {
    /// Create a new tool executor without web backends
    pub fn new() -> Self {
        Self {
            web_search_backend: None,
            web_browse_backend: None,
        }
    }

    /// Create a tool executor with web search capability
    pub fn with_search(search_backend: Arc<dyn WebSearchBackend>) -> Self {
        Self {
            web_search_backend: Some(search_backend),
            web_browse_backend: None,
        }
    }

    /// Create a tool executor with full web capabilities
    pub fn with_web_backends(
        search_backend: Option<Arc<dyn WebSearchBackend>>,
        browse_backend: Option<Arc<dyn WebBrowseBackend>>,
    ) -> Self {
        Self {
            web_search_backend: search_backend,
            web_browse_backend: browse_backend,
        }
    }

    /// Check if web search is available
    pub fn has_web_search(&self) -> bool {
        self.web_search_backend
            .as_ref()
            .map(|b| b.is_available())
            .unwrap_or(false)
    }

    /// Check if URL browsing is available
    pub fn has_web_browse(&self) -> bool {
        self.web_browse_backend
            .as_ref()
            .map(|b| b.is_available())
            .unwrap_or(false)
    }

    /// Execute a tool call and return the result
    ///
    /// # Arguments
    /// * `tool_call` - The tool call to execute
    /// * `context` - Website context (must include account_id for secure operations)
    ///
    /// # Security
    /// The context should be built with `build_secure` or have account_id set.
    /// Operations on website data are scoped to the context - ensure the context
    /// was populated only with data the account has access to.
    pub async fn execute(&self, tool_call: &ToolCall, context: &WebsiteContext) -> ToolResult {
        let function_name = &tool_call.function.name;
        let args = &tool_call.function.arguments;

        // Log with account context for audit trail
        let account_str = context.account_id_or_unknown();

        // Warn if account_id is missing (potential security issue)
        if !context.has_account_id() {
            warn!(
                tool = function_name,
                website_id = %context.website.id,
                "SECURITY: Tool executed without account_id in context"
            );
        }

        debug!(
            tool = function_name,
            website_id = %context.website.id,
            account_id = %account_str,
            "Executing tool"
        );

        let result = match function_name.as_str() {
            "search_collections" => self.search_collections(args, context),
            "search_variables" => self.search_variables(args, context),
            "get_website_sections" => self.get_sections(args, context),
            "get_website_theme" => self.get_theme(context),
            "get_website_settings" => self.get_settings(context),
            "list_extensions" => self.list_extensions(context),
            "get_page_content" => self.get_page_content(args, context),
            "web_search" => self.web_search(args).await,
            "browse_url" => self.browse_url(args).await,
            "analyze_trends" => self.analyze_trends(args).await,
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
                warn!(
                    tool = function_name,
                    error = %error,
                    website_id = %context.website.id,
                    account_id = %account_str,
                    "Tool execution failed"
                );
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
        let params: SearchCollectionsParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

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
                let item_data: HashMap<String, serde_json::Value> =
                    if let Some(obj) = item.as_object() {
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

                    for value in item_data.values() {
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
                                                if let (Some(a), Some(b)) =
                                                    (actual_value.as_i64(), val.as_i64())
                                                {
                                                    if a <= b {
                                                        matches = false;
                                                    }
                                                }
                                            }
                                            "$lt" => {
                                                if let (Some(a), Some(b)) =
                                                    (actual_value.as_i64(), val.as_i64())
                                                {
                                                    if a >= b {
                                                        matches = false;
                                                    }
                                                }
                                            }
                                            "$gte" => {
                                                if let (Some(a), Some(b)) =
                                                    (actual_value.as_i64(), val.as_i64())
                                                {
                                                    if a < b {
                                                        matches = false;
                                                    }
                                                }
                                            }
                                            "$lte" => {
                                                if let (Some(a), Some(b)) =
                                                    (actual_value.as_i64(), val.as_i64())
                                                {
                                                    if a > b {
                                                        matches = false;
                                                    }
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
                        id: item_data
                            .get("id")
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
            b.score
                .unwrap_or(0.0)
                .partial_cmp(&a.score.unwrap_or(0.0))
                .unwrap()
        });

        Ok(serde_json::to_string(&json!({
            "count": results.len(),
            "items": results
        }))
        .unwrap())
    }

    /// Search website variables
    fn search_variables(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: SearchVariablesParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

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
        }))
        .unwrap())
    }

    /// Get website sections
    fn get_sections(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: GetSectionsParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

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
                if let Some(headline) = section.properties.get("headline").and_then(|v| v.as_str())
                {
                    section_info["preview"] = json!({"headline": headline});
                } else if let Some(title) = section.properties.get("title").and_then(|v| v.as_str())
                {
                    section_info["preview"] = json!({"title": title});
                }
            }

            sections.push(section_info);
        }

        Ok(serde_json::to_string(&json!({
            "count": sections.len(),
            "sections": sections
        }))
        .unwrap())
    }

    /// Get website theme
    fn get_theme(&self, context: &WebsiteContext) -> Result<String, String> {
        let theme = &context.theme;

        // Return summary of theme
        let theme_info = ThemeInfo {
            primary_color: theme
                .get("primaryColor")
                .and_then(|v| v.as_str())
                .map(String::from),
            secondary_color: theme
                .get("secondaryColor")
                .and_then(|v| v.as_str())
                .map(String::from),
            background_color: theme
                .get("backgroundColor")
                .and_then(|v| v.as_str())
                .map(String::from),
            text_color: theme
                .get("textColor")
                .and_then(|v| v.as_str())
                .map(String::from),
            font_family: theme
                .get("fontFamily")
                .and_then(|v| v.as_str())
                .map(String::from),
            font_scale: theme
                .get("fontScale")
                .and_then(|v| v.as_str())
                .map(String::from),
            border_radius: theme
                .get("borderRadius")
                .and_then(|v| v.as_str())
                .map(String::from),
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
            domain: data
                .get("domain")
                .and_then(|v| v.as_str())
                .map(String::from),
            full: Some(data.clone()),
        };
        Ok(serde_json::to_string(&settings_info).unwrap())
    }

    /// List extensions
    fn list_extensions(&self, context: &WebsiteContext) -> Result<String, String> {
        // Use the extensions list from context (loaded from website_extensions_v2)
        let extensions: Vec<ExtensionInfo> = context
            .extensions
            .iter()
            .map(|ext| {
                // Count variables and collections from this extension
                let (variables_count, collections_count) = if let Some(data) = context.data.as_ref()
                {
                    let vars = data
                        .variables
                        .iter()
                        .filter(|g| g.source == ext.slug)
                        .map(|g| g.variables.len())
                        .sum();
                    let cols = data
                        .collections
                        .iter()
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
            })
            .collect();

        Ok(serde_json::to_string(&json!({
            "count": extensions.len(),
            "extensions": extensions
        }))
        .unwrap())
    }

    /// Get page content
    fn get_page_content(&self, args: &str, context: &WebsiteContext) -> Result<String, String> {
        let params: GetPageContentParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

        // For now, treat the whole website as a single page
        // In the future, this can be expanded for multi-page support
        let page = &params.page;

        let mut page_info = json!({
            "slug": page,
            "title": context.website.title,
            "section_count": context.sections.len(),
        });

        if params.include_sections {
            let sections: Vec<serde_json::Value> = context
                .sections
                .iter()
                .map(|s| {
                    json!({
                        "id": s.id,
                        "type": s.section_type,
                        "variant": s.variant,
                        "position": s.position,
                        "properties": s.properties,
                    })
                })
                .collect();
            page_info["sections"] = json!(sections);
        } else {
            let section_types: Vec<&str> = context
                .sections
                .iter()
                .map(|s| s.section_type.as_str())
                .collect();
            page_info["section_types"] = json!(section_types);
        }

        Ok(serde_json::to_string(&page_info).unwrap())
    }

    /// Search the web for information
    ///
    /// NOTE: Requires a WebSearchBackend to be configured.
    /// Without a backend, returns an explicit error instead of fake data.
    async fn web_search(&self, args: &str) -> Result<String, String> {
        let params: WebSearchParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

        debug!(
            "Web search requested: query='{}', num_results={}, time_range='{}'",
            params.query, params.num_results, params.time_range
        );

        // Check if we have a search backend configured
        if self.web_search_backend.is_none() {
            warn!("Web search requested but no search backend configured");
            return Ok(serde_json::to_string(&json!({
                "query": params.query,
                "count": 0,
                "results": [],
                "error": "WEB_SEARCH_NOT_CONFIGURED",
                "message": "Web search is not currently available. The AI will provide general knowledge instead of real-time web results. To enable web search, configure a search API (Brave, Serper, etc.) in your environment."
            })).unwrap());
        }

        // Execute search via backend
        match self
            .web_search_backend
            .as_ref()
            .unwrap()
            .search(&params)
            .await
        {
            Ok(results) => Ok(serde_json::to_string(&json!({
                "query": params.query,
                "count": results.len(),
                "results": results
            }))
            .unwrap()),
            Err(e) => {
                error!("Web search failed: {}", e);
                Ok(serde_json::to_string(&json!({
                    "query": params.query,
                    "count": 0,
                    "results": [],
                    "error": "WEB_SEARCH_FAILED",
                    "message": format!("Web search failed: {}. The AI will use general knowledge instead.", e)
                })).unwrap())
            }
        }
    }

    /// Browse a URL and extract content
    ///
    /// NOTE: Requires a WebBrowseBackend to be configured.
    async fn browse_url(&self, args: &str) -> Result<String, String> {
        let params: BrowseUrlParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

        debug!(
            "Browse URL requested: url='{}', extract='{}'",
            params.url, params.extract
        );

        // Validate URL
        if !params.url.starts_with("http://") && !params.url.starts_with("https://") {
            return Err("Invalid URL: must start with http:// or https://".to_string());
        }

        // Check if we have a browse backend configured
        if self.web_browse_backend.is_none() {
            warn!("URL browse requested but no browse backend configured");
            return Ok(serde_json::to_string(&BrowsedContent {
                url: params.url.clone(),
                title: "".to_string(),
                content: "".to_string(),
                metadata: Some(json!({
                    "error": "BROWSE_NOT_CONFIGURED",
                    "message": "URL browsing is not currently available. To enable, configure a web scraping service in your environment."
                })),
            }).unwrap());
        }

        // Execute browse via backend
        match self
            .web_browse_backend
            .as_ref()
            .unwrap()
            .browse(&params)
            .await
        {
            Ok(content) => Ok(serde_json::to_string(&content).unwrap()),
            Err(e) => {
                error!("URL browse failed: {}", e);
                Ok(serde_json::to_string(&BrowsedContent {
                    url: params.url.clone(),
                    title: "".to_string(),
                    content: "".to_string(),
                    metadata: Some(json!({
                        "error": "BROWSE_FAILED",
                        "message": format!("Failed to browse URL: {}", e)
                    })),
                })
                .unwrap())
            }
        }
    }

    /// Analyze trends for target audiences using web research
    async fn analyze_trends(&self, args: &str) -> Result<String, String> {
        let params: AnalyzeTrendsParams =
            serde_json::from_str(args).map_err(|e| format!("Invalid parameters: {}", e))?;

        debug!(
            "Trend analysis requested: audience='{}', industry={:?}, focus='{}', time_period='{}'",
            params.audience, params.industry, params.focus, params.time_period
        );

        // Get current year dynamically
        let current_year = chrono::Utc::now().format("%Y").to_string();

        // Build a comprehensive search query for trends
        let industry_part = params
            .industry
            .as_deref()
            .map(|i| format!("{} ", i))
            .unwrap_or_default();

        let time_qualifier = match params.time_period.as_str() {
            "current" => format!("{} trends", current_year),
            "recent" => "recent trends".to_string(),
            period if period.parse::<u32>().is_ok() => format!("{} trends", period),
            _ => params.time_period.clone(),
        };

        let search_query = format!(
            "{}{} {} {} target audience",
            industry_part, params.focus, time_qualifier, params.audience
        );

        debug!("Executing web search for trends: '{}'", search_query);

        // Perform web search
        let search_result = self
            .web_search(
                &serde_json::json!({
                    "query": search_query,
                    "num_results": 5
                })
                .to_string(),
            )
            .await;

        let search_data = match search_result {
            Ok(data) => data,
            Err(e) => {
                return Ok(serde_json::to_string(&TrendAnalysis {
                    audience: params.audience.clone(),
                    trends: vec![],
                    summary: format!("Unable to fetch trend data: {}. Please try a more specific query or check your internet connection.", e),
                    sources: None,
                }).unwrap());
            }
        };

        // Parse search results
        let search_response: serde_json::Value = serde_json::from_str(&search_data)
            .map_err(|e| format!("Failed to parse search results: {}", e))?;

        // Extract results array
        let results = search_response["results"]
            .as_array()
            .ok_or_else(|| "No results array in search response".to_string())?;

        // Extract trends from search results
        let mut trends = Vec::new();
        let mut sources = Vec::new();

        for result in results {
            if let (Some(title), Some(snippet), Some(url)) = (
                result["title"].as_str(),
                result["snippet"].as_str(),
                result["url"].as_str(),
            ) {
                trends.push(TrendItem {
                    title: title.to_string(),
                    description: snippet.to_string(),
                    relevance: None,
                    tags: None,
                });
                sources.push(url.to_string());
            }
        }

        let summary = if trends.is_empty() {
            format!("No specific trends found for {} audience in {}. Consider broadening your search or trying different keywords.",
                params.audience, params.focus)
        } else {
            format!("Found {} relevant trends for {} audience in the {} space based on current web research.",
                trends.len(), params.audience, params.focus)
        };

        let analysis = TrendAnalysis {
            audience: params.audience.clone(),
            trends,
            summary,
            sources: Some(sources),
        };

        Ok(serde_json::to_string(&analysis).unwrap())
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
            key.starts_with(&pattern[..pattern.len() - 1])
        } else {
            key == pattern
        }
    } else {
        key == pattern
    }
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
