//! Context Builder for AI requests
//!
//! Builds the website context that gets injected into AI prompts.

use uuid::Uuid;

use crate::types::{SectionInfo, UserContext, WebsiteContext, WebsiteDataContext, WebsiteInfo};

/// Builds context for AI from website data
pub struct ContextBuilder {
    /// Available section types in the system
    available_section_types: Vec<String>,
}

impl Default for ContextBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextBuilder {
    pub fn new() -> Self {
        Self {
            available_section_types: vec![
                "hero".to_string(),
                "features".to_string(),
                "how-it-works".to_string(),
                "pricing".to_string(),
                "testimonials".to_string(),
                "cta".to_string(),
                "navigation".to_string(),
                "footer".to_string(),
                "content".to_string(),
                "about".to_string(),
                "faq".to_string(),
                "contact".to_string(),
                "gallery".to_string(),
                "stats".to_string(),
                "logos".to_string(),
            ],
        }
    }

    /// Build context from raw data (typically from database)
    pub fn build(
        &self,
        website_id: Uuid,
        slug: &str,
        title: Option<&str>,
        preset: Option<&str>,
        sections: Vec<SectionInfo>,
        theme: serde_json::Value,
    ) -> WebsiteContext {
        WebsiteContext {
            website: WebsiteInfo {
                id: website_id,
                slug: slug.to_string(),
                title: title.map(|s| s.to_string()),
                preset: preset.map(|s| s.to_string()),
            },
            sections,
            theme,
            available_section_types: self.available_section_types.clone(),
            user: None,
            data: None,
            extensions: Vec::new(),
        }
    }

    /// Build context with user and website data
    pub fn build_with_data(
        &self,
        website_id: Uuid,
        slug: &str,
        title: Option<&str>,
        preset: Option<&str>,
        sections: Vec<SectionInfo>,
        theme: serde_json::Value,
        user: Option<UserContext>,
        data: Option<WebsiteDataContext>,
    ) -> WebsiteContext {
        WebsiteContext {
            website: WebsiteInfo {
                id: website_id,
                slug: slug.to_string(),
                title: title.map(|s| s.to_string()),
                preset: preset.map(|s| s.to_string()),
            },
            sections,
            theme,
            available_section_types: self.available_section_types.clone(),
            user,
            data,
            extensions: Vec::new(),
        }
    }

    /// Serialize context to a string suitable for AI system prompt
    pub fn to_prompt_context(&self, context: &WebsiteContext) -> String {
        let mut parts = vec![];

        // User info (if available)
        if let Some(ref user) = context.user {
            let mut user_parts = vec!["## User Information".to_string()];
            if let Some(ref name) = user.name {
                user_parts.push(format!("- Name: {}", name));
            }
            user_parts.push(format!("- Language: {}", user.language));
            user_parts.push(format!("- Plan: {}", user.plan));
            if let Some(ref quota) = user.quota {
                user_parts.push(format!(
                    "- AI Quota: {}/{} messages today ({} remaining)",
                    quota.daily_used, quota.daily_limit, quota.daily_remaining
                ));
            }
            if !user.integrations.is_empty() {
                user_parts.push(format!("- Integrations: {}", user.integrations.join(", ")));
            }
            parts.push(user_parts.join("\n"));
        }

        // Website info
        parts.push(format!(
            "## Website Information\n- ID: {}\n- Slug: {}\n- Title: {}\n- Preset: {}",
            context.website.id,
            context.website.slug,
            context.website.title.as_deref().unwrap_or("(none)"),
            context.website.preset.as_deref().unwrap_or("(none)")
        ));

        // Website Data (Variables and Collections from all extensions)
        if let Some(ref data) = context.data {
            // Variables grouped by source
            if !data.variables.is_empty() {
                parts.push("\n## Website Variables".to_string());
                for group in &data.variables {
                    if !group.variables.is_empty() {
                        parts.push(format!("\n### From: {}", group.source));
                        for (key, value) in &group.variables {
                            // Format value nicely (truncate long strings/arrays)
                            let formatted = format_value_for_prompt(value);
                            parts.push(format!("- {}: {}", key, formatted));
                        }
                    }
                }
            }
            
            // Collections summary with previews
            if !data.collections.is_empty() {
                parts.push("\n## Available Collections".to_string());
                for collection in &data.collections {
                    parts.push(format!(
                        "\n### {} ({} items, from: {})",
                        collection.slug, collection.count, collection.source
                    ));
                    if !collection.preview.is_empty() {
                        parts.push("Preview:".to_string());
                        for (i, item) in collection.preview.iter().enumerate() {
                            // Show compact preview of each item
                            let preview = format_collection_item_preview(item);
                            parts.push(format!("  {}. {}", i + 1, preview));
                        }
                        if collection.count as usize > collection.preview.len() {
                            parts.push(format!("  ... and {} more", collection.count as usize - collection.preview.len()));
                        }
                    }
                }
            }
        }

        // Theme
        parts.push(format!(
            "\n## Current Theme\n```json\n{}\n```",
            serde_json::to_string_pretty(&context.theme).unwrap_or_default()
        ));

        // Sections
        parts.push("\n## Current Sections".to_string());
        for section in &context.sections {
            parts.push(format!(
                "\n### Section: {} (ID: {})\n- Type: {}\n- Variant: {}\n- Position: {}\n- Properties:\n```json\n{}\n```",
                section.section_type,
                section.id,
                section.section_type,
                section.variant.as_deref().unwrap_or("default"),
                section.position,
                serde_json::to_string_pretty(&section.properties).unwrap_or_default()
            ));
        }

        // Available actions
        parts.push(format!(
            "\n## Available Section Types\n{}",
            context
                .available_section_types
                .iter()
                .map(|s| format!("- {}", s))
                .collect::<Vec<_>>()
                .join("\n")
        ));

        parts.join("\n")
    }

    /// Estimate token count for context
    pub fn estimate_tokens(&self, context: &WebsiteContext) -> usize {
        let json = serde_json::to_string(context).unwrap_or_default();
        // Rough estimate: ~4 characters per token
        json.len() / 4
    }

    /// Truncate context to fit within token limit
    pub fn truncate_to_limit(&self, context: &mut WebsiteContext, max_tokens: usize) {
        let mut current_tokens = self.estimate_tokens(context);

        // Remove section schemas first (they're large)
        if current_tokens > max_tokens {
            for section in &mut context.sections {
                section.schema = None;
            }
            current_tokens = self.estimate_tokens(context);
        }

        // Then truncate sections from the end
        while current_tokens > max_tokens && !context.sections.is_empty() {
            context.sections.pop();
            current_tokens = self.estimate_tokens(context);
        }
    }
}

/// Format a JSON value for display in prompt (truncate if too long)
fn format_value_for_prompt(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => {
            if s.len() > 100 {
                format!("\"{}...\"", &s[..100])
            } else {
                format!("\"{}\"", s)
            }
        }
        serde_json::Value::Array(arr) => {
            if arr.len() <= 3 {
                format!("{:?}", arr.iter().map(|v| format_value_for_prompt(v)).collect::<Vec<_>>())
            } else {
                format!("[{} items]", arr.len())
            }
        }
        serde_json::Value::Object(obj) => {
            let keys: Vec<_> = obj.keys().take(5).collect();
            if keys.len() < obj.len() {
                format!("{{{}... ({} keys)}}", keys.iter().map(|k| k.as_str()).collect::<Vec<_>>().join(", "), obj.len())
            } else {
                format!("{{{}}}", keys.iter().map(|k| k.as_str()).collect::<Vec<_>>().join(", "))
            }
        }
        _ => value.to_string(),
    }
}

/// Format a collection item preview (show key fields)
fn format_collection_item_preview(item: &serde_json::Value) -> String {
    if let Some(data) = item.get("data").and_then(|d| d.as_object()) {
        // Try to get common display fields
        let name = data.get("name").or(data.get("title")).or(data.get("login"));
        let desc = data.get("description").or(data.get("bio"));
        
        let mut parts = vec![];
        if let Some(n) = name {
            if let Some(s) = n.as_str() {
                parts.push(s.to_string());
            }
        }
        if let Some(d) = desc {
            if let Some(s) = d.as_str() {
                let truncated = if s.len() > 50 { format!("{}...", &s[..50]) } else { s.to_string() };
                parts.push(truncated);
            }
        }
        // Add any numeric stats
        for key in ["stars", "count", "percentage"] {
            if let Some(v) = data.get(key) {
                if let Some(n) = v.as_i64() {
                    parts.push(format!("{}: {}", key, n));
                } else if let Some(f) = v.as_f64() {
                    parts.push(format!("{}: {:.1}", key, f));
                }
            }
        }
        if parts.is_empty() {
            // Fallback: show first 3 keys
            let keys: Vec<_> = data.keys().take(3).map(|k| k.as_str()).collect();
            return format!("{{{}}}", keys.join(", "));
        }
        parts.join(" | ")
    } else {
        format!("{}", item)
    }
}

/// System prompt for the AI assistant
pub fn build_system_prompt(context: &WebsiteContext) -> String {
    let context_builder = ContextBuilder::new();
    let context_str = context_builder.to_prompt_context(context);

    // Build personalization hints
    let mut personalization = String::new();
    if let Some(ref user) = context.user {
        if let Some(ref name) = user.name {
            personalization.push_str(&format!("\n- The user's name is {}. Use it occasionally to be friendly.", name));
        }
        personalization.push_str(&format!("\n- Respond in {} when possible.", 
            match user.language.as_str() {
                "fr" => "French",
                "es" => "Spanish",
                "de" => "German",
                "it" => "Italian",
                "pt" => "Portuguese",
                "ja" => "Japanese",
                "zh" => "Chinese",
                _ => "English",
            }
        ));
        if user.plan == "free" {
            personalization.push_str("\n- The user is on a free plan. Be mindful of their limited quota.");
        }
    }
    
    // Add hints about available data
    let mut data_hints = String::new();
    if let Some(ref data) = context.data {
        if !data.variables.is_empty() || !data.collections.is_empty() {
            data_hints.push_str("\n- Website Variables and Collections are available in the context. Use this data to personalize content suggestions.");
        }
        if data.collections.iter().any(|c| c.slug.starts_with("github")) {
            data_hints.push_str("\n- GitHub data is synced. Reference user's repos, languages, and profile when suggesting content.");
        }
    }

    let base_prompt = format!(r##"You are an AI assistant for ASAP, a website builder platform. Your role is to help users modify their websites through natural language.
{}{}
## Your Capabilities
1. **Modify text content** - Update headlines, descriptions, button text, etc.
2. **Change design** - Update colors, fonts, spacing (via theme)
3. **Add sections** - Add new sections like hero, features, FAQ, etc.
4. **Remove sections** - Delete sections the user doesn't want
5. **Reorder sections** - Change the order of sections
6. **Change variants** - Switch between different variants of a section

## Response Format
When the user asks for changes, you MUST respond with:
1. A brief confirmation of what you'll do
2. One or more JSON action blocks wrapped in ```json markers

## Action Types
```json
{{"type": "UPDATE_SECTION_PROPERTY", "section_id": "uuid", "property": "headline", "value": "New Text"}}
{{"type": "ADD_SECTION", "section_type": "faq", "position": 3, "variant": "accordion"}}
{{"type": "REMOVE_SECTION", "section_id": "uuid"}}
{{"type": "REORDER_SECTIONS", "order": ["uuid1", "uuid2", "uuid3"]}}
{{"type": "CHANGE_VARIANT", "section_id": "uuid", "variant": "centered"}}
{{"type": "UPDATE_THEME", "changes": {{"primaryColor": "#10B981"}}}}
```

## Rules
1. Always use the exact section IDs provided in the context
2. Only use section types from the available list
3. Be concise but friendly
4. Ask for clarification if the request is ambiguous
5. Suggest improvements when appropriate
6. When the user asks about their website content, provide a helpful summary
7. When making changes, don't repeat properties - just confirm what was changed
8. Keep responses short and action-focused
9. Use Website Variables and Collections data to personalize suggestions (e.g., user's GitHub repos, languages, profile)
10. When the user asks about their data (e.g., "my GitHub", "my repos"), refer to the Variables and Collections in the context

---

"##, personalization, data_hints);

    format!("{}{}", base_prompt, context_str)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_context_builder() {
        let builder = ContextBuilder::new();
        let context = builder.build(
            Uuid::new_v4(),
            "my-site",
            Some("My Site"),
            Some("saas"),
            vec![],
            json!({"primaryColor": "#10B981"}),
        );

        assert_eq!(context.website.slug, "my-site");
        assert!(!context.available_section_types.is_empty());
    }

    #[test]
    fn test_token_estimation() {
        let builder = ContextBuilder::new();
        let context = builder.build(
            Uuid::new_v4(),
            "test",
            None,
            None,
            vec![],
            json!({}),
        );

        let tokens = builder.estimate_tokens(&context);
        assert!(tokens > 0);
        assert!(tokens < 1000); // Empty context should be small
    }

    #[test]
    fn test_system_prompt_generation() {
        let builder = ContextBuilder::new();
        let context = builder.build(
            Uuid::new_v4(),
            "test-site",
            Some("Test Site"),
            None,
            vec![SectionInfo {
                id: Uuid::new_v4(),
                section_type: "hero".to_string(),
                variant: Some("centered".to_string()),
                position: 0,
                properties: json!({"headline": "Welcome"}),
                schema: None,
            }],
            json!({"primaryColor": "#000000"}),
        );

        let prompt = build_system_prompt(&context);
        
        assert!(prompt.contains("ASAP"));
        assert!(prompt.contains("test-site"));
        assert!(prompt.contains("hero"));
        assert!(prompt.contains("UPDATE_SECTION_PROPERTY"));
    }
}
