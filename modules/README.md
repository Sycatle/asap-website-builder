# ASAP Modules

This directory contains the feature modules that extend ASAP's functionality.

## Module Architecture

Each module is an independent Rust crate that provides specific functionality to the ASAP platform. Modules follow a consistent pattern:

1. **Self-contained** - Each module can be built and tested independently
2. **Event-driven** - Modules react to events from the Core API
3. **Well-tested** - Comprehensive unit tests for all functionality
4. **Documented** - Clear API documentation and usage examples

## Available Modules

### GitHub Generator (`github-generator/`)

Imports repository data from GitHub and transforms it into portfolio content.

**Features:**
- Fetches public repositories via GitHub API
- Filters forks and archived repos
- Sorts by stars and activity
- Generates structured portfolio data

**Events Handled:**
- `USER_INTEGRATION_ADDED` - When GitHub username is added
- `USER_INTEGRATION_UPDATED` - When GitHub credentials change

**Usage:**
```rust
use asap_module_github_generator::{GitHubClient, process_repos};

let client = GitHubClient::new();
let repos = client.fetch_user_repos("username").await?;
let portfolio_data = process_repos(&repos)?;
```

### Themes (`themes/`)

Applies visual themes to portfolio data for consistent styling.

**Features:**
- Default and custom theme support
- Configurable colors, fonts, and layouts
- Theme metadata generation
- JSON output with theme information

**Theme Structure:**
```rust
Theme {
    name: "modern",
    colors: { primary, secondary, background, text },
    fonts: { heading, body },
    layout: { style, sidebar },
}
```

**Usage:**
```rust
use asap_module_themes::{apply_theme, Theme};

let themed_output = apply_theme(portfolio_data, Some(custom_theme))?;
```

### Projections (`projections/`)

Generates static JSON files for fast public access to portfolios.

**Features:**
- Creates versioned projection files
- Includes generation metadata
- CRUD operations (create, read, delete)
- Optimized for CDN serving

**File Structure:**
```json
{
  "metadata": {
    "slug": "portfolio-slug",
    "generated_at": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  },
  "data": { /* portfolio content */ }
}
```

**Usage:**
```rust
use asap_module_projections::{generate_projection, read_projection};

// Generate
generate_projection("my-portfolio", portfolio_data).await?;

// Read
let projection = read_projection("my-portfolio").await?;
```

### Analytics (`analytics/`)

Tracks user interactions and portfolio metrics.

**Features:**
- Event tracking (page views, clicks, etc.)
- Detailed metadata support
- Portfolio-specific tracking
- User attribution

**Event Types:**
- `page_view` - Portfolio page viewed
- `click` - Button or link clicked
- `form_submit` - Contact form submitted
- Custom events

**Usage:**
```rust
use asap_module_analytics::{track_page_view, track_click, AnalyticsEvent};

// Simple tracking
track_page_view("my-portfolio", Some(user_id))?;

// Detailed tracking
let event = AnalyticsEvent::new("custom_event", slug, user_id)
    .with_metadata(metadata);
track_detailed_event(event)?;
```

## Module Development

### Creating a New Module

1. Create a new crate in `modules/`:
   ```bash
   cargo new modules/my-module --lib
   ```

2. Add to workspace in root `Cargo.toml`:
   ```toml
   members = [
       # ...
       "modules/my-module",
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

### Testing Modules

Test individual modules:
```bash
cargo test -p asap-module-themes
cargo test -p asap-module-projections
cargo test -p asap-module-analytics
cargo test -p asap-module-github-generator
```

Test all modules:
```bash
cargo test --workspace --lib
```

## Integration with Worker

Modules are executed by the Worker in response to events:

```rust
// In worker/module_executor.rs
match event.event_type {
    EventType::UserIntegrationAdded => {
        // Execute GitHub Generator
        github_executor.execute(&event).await?;
    }
    EventType::PortfolioPublished => {
        // Execute Theme + Projection
        theme_executor.execute(&event).await?;
        projection_executor.execute(&event).await?;
    }
}
```

## Best Practices

1. **Keep modules focused** - Each module should do one thing well
2. **Test thoroughly** - Aim for high test coverage
3. **Document APIs** - Clear documentation for public functions
4. **Handle errors gracefully** - Use Result types and meaningful errors
5. **Log appropriately** - Use tracing for debugging and monitoring
6. **Version your data** - Include version info in generated data

## Future Modules

Planned modules for future development:

- **AI Generator** - LLM-based content generation
- **Image Optimizer** - Image processing and optimization
- **Email Notifications** - Transactional emails
- **Payment Processing** - Stripe integration
- **Custom Domains** - Domain management
- **SEO Optimizer** - Meta tags and sitemaps
