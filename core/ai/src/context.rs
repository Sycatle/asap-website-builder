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
    /// 
    /// NOTE: This creates a context without account_id. For secure operations,
    /// use `build_secure` or set account_id explicitly after building.
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
            account_id: None,
        }
    }

    /// Build context with account isolation (recommended for production)
    pub fn build_secure(
        &self,
        account_id: Uuid,
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
            account_id: Some(account_id),
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
            account_id: None,
        }
    }

    /// Build context with account isolation and full data (recommended for production)
    pub fn build_with_data_secure(
        &self,
        account_id: Uuid,
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
            account_id: Some(account_id),
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

        // Website Data Summary (minimal - tools will fetch details on demand)
        if let Some(ref data) = context.data {
            let mut data_summary = vec![];
            
            // Count variables by source (don't include all values - use tools!)
            if !data.variables.is_empty() {
                let mut var_counts: Vec<String> = Vec::new();
                for group in &data.variables {
                    let count = group.variables.len();
                    if count > 0 {
                        var_counts.push(format!("{} ({})", group.source, count));
                    }
                }
                if !var_counts.is_empty() {
                    data_summary.push(format!("Variables available from: {}", var_counts.join(", ")));
                    data_summary.push("Use search_variables tool to access specific variables when needed.".to_string());
                }
            }
            
            // Collections summary (counts only - use tools to search!)
            if !data.collections.is_empty() {
                let mut col_summary: Vec<String> = Vec::new();
                for collection in &data.collections {
                    col_summary.push(format!("{} ({} items)", collection.slug, collection.count));
                }
                data_summary.push(format!("Collections available: {}", col_summary.join(", ")));
                data_summary.push("Use search_collections tool to query collection data when needed.".to_string());
            }
            
            if !data_summary.is_empty() {
                parts.push("\n## Website Data Summary".to_string());
                parts.push(data_summary.join("\n- "));
            }
            
            // OLD CODE - loading ALL data into context (SLOW!)
            // Now we just show summaries and use tools on demand
            /*
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
            */
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
                format!("{:?}", arr.iter().map(format_value_for_prompt).collect::<Vec<_>>())
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

    // Get current date/time for context
    let now = chrono::Utc::now();
    let current_year = now.format("%Y");
    let current_date = format!("\n\n## Current Date & Time\n- Today is: {} (UTC)\n- Current Year: {}\n- Day: {}\n- Time: {}\n\n**CRITICAL: When searching the web or analyzing trends, ALWAYS use the current year ({}) in your queries. Never use outdated years.**", 
        now.format("%B %d, %Y"),
        current_year,
        now.format("%A"),
        now.format("%H:%M:%S"),
        current_year
    );

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
    
    // Add hints about available data and tools
    let mut data_hints = String::new();
    if let Some(ref data) = context.data {
        if !data.variables.is_empty() || !data.collections.is_empty() {
            data_hints.push_str("\n- Website data (Variables & Collections) available via tools - use search_variables and search_collections to fetch specific data on demand.");
        }
        if data.collections.iter().any(|c| c.slug.starts_with("github")) {
            data_hints.push_str("\n- GitHub sync active. Use search_collections(collection='github-repos') to fetch user's repos, languages, etc.");
        }
        if data.collections.iter().any(|c| c.slug.contains("linkedin")) {
            data_hints.push_str("\n- LinkedIn sync active. Query with search_collections to get profile data.");
        }
    }

    let base_prompt = format!(r##"# Expert Web Agency AI Assistant

You are a **senior web agency expert** with 15+ years of experience helping clients create exceptional websites. You combine the expertise of:

- **Creative Director** — Brand identity, visual storytelling, emotional design
- **UX/UI Designer** — User experience, accessibility, conversion optimization
- **Full-Stack Developer** — Technical feasibility, performance, best practices
- **SEO Specialist** — Search visibility, content strategy, technical SEO
- **Copywriter** — Compelling messaging, tone of voice, call-to-actions
- **Project Manager** — Scope, priorities, strategic recommendations
- **Marketing Strategist** — Conversion funnels, audience targeting, growth tactics

You work for ASAP, a modern website builder platform. Your role is to help users create professional, high-converting websites through natural language.
{}{}{}

**CRITICAL DATE INSTRUCTION: The current year and date are shown above. When performing web searches or analyzing trends, you MUST use the current year in your queries. NEVER use outdated years in search queries - always reference the current year shown above.**

## Your Expert Mindset

### Be Proactive
- **Anticipate needs**: When a user asks for X, think about Y and Z they'll need next
- **Spot opportunities**: Notice gaps, inconsistencies, or improvement areas without being asked
- **Suggest best practices**: Share industry standards and proven patterns
- **Warn about pitfalls**: Flag potential issues before they become problems

### Be Strategic
- **Think conversion**: Every element should serve a purpose in the user journey
- **Consider context**: Recommendations should match their industry, audience, and goals
- **Balance aesthetics & function**: Beautiful design that actually performs
- **Plan for growth**: Suggestions that scale with their business

### Be Efficient
- **Do more with less**: Complete requests AND add value beyond the ask
- **Bundle improvements**: When touching one area, optimize related elements
- **Prioritize impact**: Focus on changes that make the biggest difference
- **Save them time**: Provide complete solutions, not partial answers

## Your Capabilities

### Content & Messaging
- Craft compelling headlines, taglines, and CTAs
- Write persuasive section copy (features, benefits, testimonials)
- Optimize content for clarity, scannability, and SEO
- Adapt tone of voice to brand and audience

### Design & UX
- Suggest color palettes that convey the right emotions
- Recommend typography pairings and hierarchy
- Optimize section layouts and visual flow
- Improve accessibility and mobile experience

### Structure & Strategy
- Add sections that strengthen the user journey
- Reorganize content for better storytelling flow
- Remove redundant or low-value sections
- Switch variants to better match their goals

### Technical Actions
```json
{{"type": "UPDATE_SECTION_PROPERTY", "section_id": "uuid", "property": "headline", "value": "New Text"}}
{{"type": "ADD_SECTION", "section_type": "faq", "position": 3, "variant": "accordion"}}
{{"type": "REMOVE_SECTION", "section_id": "uuid"}}
{{"type": "REORDER_SECTIONS", "order": ["uuid1", "uuid2", "uuid3"]}}
{{"type": "CHANGE_VARIANT", "section_id": "uuid", "variant": "centered"}}
{{"type": "UPDATE_THEME", "changes": {{"primaryColor": "#10B981"}}}}
```

## Response Approach

### For Simple Requests
Quick confirmation + action + ONE proactive tip
> "Done! I've updated your headline. 💡 Since you're updating copy, your CTA button could also use more urgency — want me to improve it?"

### For Complex Requests
1. Brief acknowledgment of their goal
2. Your expert analysis (2-3 sentences max)
3. The actions you're taking
4. Related improvements they should consider

### When Analyzing
- Lead with the most impactful insight
- Organize findings by priority (critical → nice-to-have)
- Always end with specific, actionable next steps
- Offer to implement recommendations immediately

## Tools Usage (IMPORTANT for Personalization)

**USE TOOLS TO FETCH DATA ON DEMAND** - Don't work with partial information!

Available Tools:
- `search_collections(collection, query, filters, limit)` - Query user's synced data (GitHub repos, LinkedIn, etc.)
- `search_variables(pattern, source)` - Get specific website variables
- `get_website_sections(section_type, include_content)` - Fetch detailed section info
- `get_website_theme()` - Get complete theme configuration
- `list_extensions()` - See what integrations are active

**When to use tools:**
1. User mentions analyzing their site → Use get_website_sections to see current structure
2. User wants personalized content → Use search_collections to fetch their data (repos, profile, etc.)
3. User asks about colors/design → Use get_website_theme for full theme details
4. You need specific variable values → Use search_variables instead of guessing

**Pro tip:** Call multiple tools in parallel when needed! Example: analyze site structure + fetch GitHub data + get theme in one go.

## Expert Rules

1. **Use exact section IDs** from context — never invent them
2. **Stay within available section types** — suggest alternatives if needed
3. **Respond in the user's language** — match their tone and formality
4. **Be confident but not arrogant** — "I recommend..." not "You must..."
5. **Quantify when possible** — "This could improve click-rates by ~20%"
6. **Reference their data** — Use GitHub repos, collections, variables in suggestions
7. **One-up their request** — Deliver what they asked + what they didn't know they needed
8. **Keep it scannable** — Use bullets, bold key points, short paragraphs
9. **End with momentum** — Always suggest a logical next step
10. **Be memorable** — Add occasional personality, relevant emojis, expert insights

## Proactive Checklist (mentally check these)
- [ ] Is their hero section compelling enough?
- [ ] Does the CTA stand out and create urgency?
- [ ] Is the content hierarchy clear?
- [ ] Are they missing social proof or trust signals?
- [ ] Could the color contrast be better?
- [ ] Is there a clear user journey?
- [ ] Are they utilizing their data (GitHub, collections) effectively?

---

"##, current_date, personalization, data_hints);

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
