# ASAP Extensions

This directory contains the feature extensions that extend ASAP's functionality.

## Extension Architecture

Each extension is an independent Rust crate that provides specific functionality to the ASAP platform. Extensions follow a consistent pattern:

1. **Self-contained** - Each extension can be built and tested independently
2. **Event-driven** - Extensions react to events from the Core API
3. **Well-tested** - Comprehensive unit tests for all functionality
4. **Documented** - Clear API documentation and usage examples

## Available Extensions

### Github Sync (`github-sync/`)

Imports repository data from GitHub and transforms it into website content.

**Features:**
- Fetches public repositories via GitHub API
- Filters forks and archived repos
- Sorts by stars and activity
- Generates structured website data

**Events Handled:**
- `USER_INTEGRATION_ADDED` - When GitHub username is added
- `USER_INTEGRATION_UPDATED` - When GitHub credentials change

**Usage:**
```rust
use asap_extension_github_sync::{GitHubClient, process_repos};

let client = GitHubClient::new();
let repos = client.fetch_user_repos("username").await?;
let website_data = process_repos(&repos)?;
```

### Analytics (`analytics/`)

Tracks user interactions and website metrics.

**Features:**
- Event tracking (page views, clicks, etc.)
- Detailed metadata support
- Website-specific tracking
- User attribution

**Event Types:**
- `page_view` - Website page viewed
- `click` - Button or link clicked
- `form_submit` - Contact form submitted
- Custom events

**Usage:**
```rust
use asap_extension_analytics::{track_page_view, track_click, AnalyticsEvent};

// Simple tracking
track_page_view("my-website", Some(user_id))?;

// Detailed tracking
let event = AnalyticsEvent::new("custom_event", slug, user_id)
    .with_metadata(metadata);
track_detailed_event(event)?;
```

## Extension Development

### Creating a New Extension

1. Create a new crate in `extensions/`:
   ```bash
   cargo new extensions/my-extension --lib
   ```

2. Add to workspace in root `Cargo.toml`:
   ```toml
   members = [
       # ...
       "extensions/my-extension",
   ]
   ```

3. Add dependencies:
   ```toml
   [dependencies]
   asap-core-domain = { path = "../../core/domain" }
   serde.workspace = true
   serde_json.workspace = true
   anyhow.workspace = true
   tracing.workspace = true
   ```

4. Implement functionality with tests
5. Add documentation

### Testing Extensions

Test individual extensions:
```bash
cargo test -p asap-extension-analytics
cargo test -p asap-extension-github-sync
```

Test all extensions:
```bash
cargo test --workspace --lib
```

## Integration with Worker

Extensions are executed by the Worker in response to events:

```rust
// In worker/extension_executor.rs
match event.event_type {
    EventType::UserIntegrationAdded => {
        // Execute Github Sync
        github_executor.execute(&event).await?;
    }
}
```

## Best Practices

1. **Keep extensions focused** - Each extension should do one thing well
2. **Test thoroughly** - Aim for high test coverage
3. **Document APIs** - Clear documentation for public functions
4. **Handle errors gracefully** - Use Result types and meaningful errors
5. **Log appropriately** - Use tracing for debugging and monitoring
6. **Version your data** - Include version info in generated data

## Future Extensions

Planned extensions for future development:

- **AI Generator** - LLM-based content generation
- **Image Optimizer** - Image processing and optimization
- **Email Notifications** - Transactional emails
- **Payment Processing** - Stripe integration
- **Custom Domains** - Domain management
- **SEO Optimizer** - Meta tags and sitemaps
