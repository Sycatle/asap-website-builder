# ASAP Platform - AI Coding Agent Instructions

## Project Overview

ASAP is a SaaS platform for creating modular professional websites. It uses a **core + extensions** architecture with the core handling authentication, data, and multi-tenancy, while extensions implement all features (GitHub imports, analytics, themes, etc.).

**Stack:** Rust (Axum, SQLx, Tokio) + TypeScript (Astro, React 19, TailwindCSS) + PostgreSQL + Redis

## Architecture Principles

### Core + Extensions Pattern
- **Core** (`core/`): Manages accounts, websites, authentication, events, multi-tenant isolation. Never implements features.
- **Extensions** (`extensions/`): Consume core data via API to implement features (github-sync, analytics). Respond to events emitted by core.
- **No data duplication**: User data (profile, GitHub tokens, preferences) lives in core's `accounts` and `account_data` tables, not in extensions.

### Website Structure
Websites follow a modular architecture: `Website → Sections → Extensions`
- **Sections** (Hero, Projects, Skills, Contact, etc.) are the building blocks stored in `website_sections` table
- **Extensions** are activated per-website (many-to-many via `website_extensions`)
- **Presets** are templates that pre-configure sections and extensions for quick setup

### Event-Driven Architecture
Core emits events (`USER_UPDATED`, `WEBSITE_PUBLISHED`) → Worker polls events → Extensions execute tasks asynchronously. Events use exponential backoff retry (5 attempts).

## Development Workflow

### Docker-First Development
Always use Docker commands via Makefile - **never run Rust or Node services directly**:
```bash
make dev              # Start everything (API, Worker, Web, Sites, DB, Redis)
make dev-api          # API + dependencies only
make logs             # View all logs
make db-shell         # PostgreSQL shell
make migrate          # Run migrations
```

Services run at:
- API: `http://localhost:3000`
- Web (dashboard): `http://localhost:4321`
- Sites (public): `http://localhost:4322`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Testing Strategy
Run **all tests without database** using:
```bash
make test                  # All 79 unit tests
make test-domain           # Core domain tests (31 tests)
make test-extensions       # Extension tests (38 tests)
cargo test test_name -- --exact  # Specific test
```

Tests are in-memory and cover domain models, event handling, and extension logic. Database tests require `DATABASE_URL` but most development uses offline mode.

### pnpm Workspace Structure
```bash
pnpm install                    # Install all dependencies
pnpm --filter @asap/web build   # Build specific app
pnpm build                      # Build all packages
```

Packages:
- `@asap/shared`: Types, constants, utilities (TypeScript)
- `@asap/renderers`: React section renderers used by both Studio and public sites (DRY principle)
- `@asap/web`: Dashboard Astro app
- `@asap/sites`: Public sites Astro app

## Code Patterns & Conventions

### Rust Backend

**Multi-tenant Isolation**: Every query MUST filter by `tenant_id`:
```rust
// ✓ CORRECT
sqlx::query!("SELECT * FROM websites WHERE tenant_id = $1", tenant_id)

// ✗ WRONG - Violates multi-tenancy
sqlx::query!("SELECT * FROM websites WHERE id = $1", id)
```

**Extension Trait Pattern**:
```rust
// Extensions implement ExtensionExecutor trait
#[async_trait]
pub trait ExtensionExecutor: Send + Sync {
    fn extension_id(&self) -> &str;
    async fn execute(&self, event: &Event) -> Result<(), ExtensionError>;
}
```

**SQLX Offline Mode**: Pre-compile queries for Docker builds:
```bash
# Generate query metadata (run locally, not in Docker)
cargo sqlx prepare --database-url "postgresql://..."
```

**Error Handling**: Use `anyhow::Result` for main logic, `thiserror` for custom errors:
```rust
pub enum CoreApiError {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}
```

### TypeScript Frontend

**Component-First Architecture** (`apps/web/COMPONENT_ARCHITECTURE.md`):
- Features organized by domain: `src/components/features/{settings,websites,notifications}/`
- Barrel exports via `index.ts` in each folder
- Max ~200 lines per component, extract sub-components for complex logic

**File Structure Template**:
```typescript
"use client"

// Types
export interface ComponentProps { }

// Config / Constants
const CONFIG = { }

// Helpers
function helper() { }

// Hooks (if component-specific)
function useHook() { }

// Component
export function Component(props: ComponentProps) { }
```

**API Client Pattern**:
```typescript
// Use shared API client from @asap/shared
import { apiClient } from '@asap/shared';

const response = await apiClient.get('/websites');
```

## Database & Migrations

**Migration Location**: `infra/migrations/*.sql` (timestamped)

**Key Tables**:
- `accounts`: User profiles with plan & billing
- `account_data`: JSONB for GitHub integrations, preferences (extensible)
- `websites`: Core website structure (slug, status, preset)
- `website_data`: JSONB content storage (extensible)
- `website_sections`: Modular sections (Hero, Projects, etc.)
- `website_extensions`: Many-to-many extensions activation
- `events`: Event queue for workers
- `notifications`: In-app notifications with push support

**JSONB Pattern**: Use `account_data` and `website_data` for flexible schema:
```sql
-- Updating nested JSONB
UPDATE account_data 
SET data = jsonb_set(data, '{github,username}', '"newuser"')
WHERE account_id = $1;
```

## Critical Gotchas

1. **Tenant Isolation**: Always add `WHERE tenant_id = $1` to queries. Use RLS policies as last defense.

2. **Extension Data Flow**: Extensions fetch user data from Core API, never directly from database:
   ```rust
   // ✓ CORRECT
   let account_data = core_api_client.get_account_data(account_id).await?;
   
   // ✗ WRONG
   let row = sqlx::query!("SELECT * FROM account_data...").fetch_one(&pool).await?;
   ```

3. **Hot Reload in Docker**: Backend uses `cargo-watch`, frontend uses Astro's dev server. Code changes auto-reload, but new dependencies require `make dev-build`.

4. **CORS Configuration**: API allows origins from `CORS_ALLOWED_ORIGINS` env var. Update `infra/env.example/api.env` for new services.

5. **Shared Types**: Keep Rust structs (`core/domain/`) and TypeScript types (`packages/shared/src/types.ts`) in sync manually - no automatic codegen yet.

6. **Rendering Parity**: Use `@asap/renderers` components for both preview (Studio) and production (public sites) to avoid duplication.

## Quick Reference

**Add new migration**: Create `infra/migrations/YYYYMMDDHHMMSS_description.sql`, then `make migrate`

**Add new extension**: 
1. Create `extensions/my-extension/` with `Cargo.toml`
2. Implement `ExtensionExecutor` trait
3. Register in `apps/worker/src/main.rs`
4. Add metadata to `extensions` table

**Add website section type**: Update `SectionType` enum in `core/domain/src/websites.rs`, create renderer in `packages/renderers/src/`

**Debug auth issues**: Check JWT token in browser DevTools → Application → Cookies. Token expires in 24h.

**Database schema changes**: Modify `infra/migrations/*.sql`, run `make migrate`, regenerate SQLX metadata with `cargo sqlx prepare` locally.
