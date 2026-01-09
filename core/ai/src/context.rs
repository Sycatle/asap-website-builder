//! Context Builder for AI requests
//!
//! Builds the website context that gets injected into AI prompts.

use uuid::Uuid;

use crate::types::{SectionInfo, WebsiteContext, WebsiteInfo};

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
        }
    }

    /// Serialize context to a string suitable for AI system prompt
    pub fn to_prompt_context(&self, context: &WebsiteContext) -> String {
        let mut parts = vec![];

        // Website info
        parts.push(format!(
            "## Website Information\n- ID: {}\n- Slug: {}\n- Title: {}\n- Preset: {}",
            context.website.id,
            context.website.slug,
            context.website.title.as_deref().unwrap_or("(none)"),
            context.website.preset.as_deref().unwrap_or("(none)")
        ));

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

/// System prompt for the AI assistant
pub fn build_system_prompt(context: &WebsiteContext) -> String {
    let context_builder = ContextBuilder::new();
    let context_str = context_builder.to_prompt_context(context);

    let base_prompt = r##"You are an AI assistant for ASAP, a website builder platform. Your role is to help users modify their websites through natural language.

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
{"type": "UPDATE_SECTION_PROPERTY", "section_id": "uuid", "property": "headline", "value": "New Text"}
{"type": "ADD_SECTION", "section_type": "faq", "position": 3, "variant": "accordion"}
{"type": "REMOVE_SECTION", "section_id": "uuid"}
{"type": "REORDER_SECTIONS", "order": ["uuid1", "uuid2", "uuid3"]}
{"type": "CHANGE_VARIANT", "section_id": "uuid", "variant": "centered"}
{"type": "UPDATE_THEME", "changes": {"primaryColor": "#10B981"}}
```

## Rules
1. Always use the exact section IDs provided in the context
2. Only use section types from the available list
3. Be concise but friendly
4. Ask for clarification if the request is ambiguous
5. Suggest improvements when appropriate

---

"##;

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
