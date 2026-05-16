# Architecture Overview

ASAP is a one-page website builder organized as a **core + extensions** monorepo. The core owns the data and the boundaries (auth, tenancy, persistence, events, billing). Extensions add capabilities on top via a stable HTTP API and an event bus.

## High-level layout

```
┌──────────────────────────────────────────────────────────────┐
│                  Frontend (Astro + React)                    │
│  Dashboard (apps/web)              Public sites (apps/sites) │
└─────────────────────────────┬────────────────────────────────┘
                              │  HTTP + WebSocket
┌─────────────────────────────▼────────────────────────────────┐
│                    Core API (apps/api)                       │
│  • Auth (JWT)            • Websites & Sections               │
│  • Multi-tenant (RLS)    • Extensions registry & events      │
│  • Files & storage       • Notifications (push + in-app)     │
│  • Billing (Stripe)      • AI orchestrator                   │
└─────────────────────────────┬────────────────────────────────┘
                              │  Events (Redis pub/sub)
┌─────────────────────────────▼────────────────────────────────┐
│                  Worker (apps/worker)                        │
│  Runs extensions asynchronously: github-sync, analytics, …   │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│   PostgreSQL 15 (data, RLS)        Redis 7 (cache, pub/sub)  │
└──────────────────────────────────────────────────────────────┘
```

## Principles

- **Core owns the boundary.** Authentication, tenant isolation (Postgres row-level security on `account_id`), persistence, and event emission live in `core/`. Nothing else.
- **Extensions are leaf code.** Each extension subscribes to events from the core and exposes its own endpoints. They never reach into another extension's tables.
- **Single source of truth for rendering.** The React renderers in `packages/renderers` are used by both the dashboard preview (`apps/web`) and the public sites (`apps/sites`). What you edit is what you publish.
- **Event-driven, not request-chained.** Long-running work (GitHub sync, AI generation, screenshot capture) flows through events handled by `apps/worker`, never blocking the API request loop.
- **Type-safe across the seam.** Shared TypeScript types live in `packages/shared` and are derived from Rust domain types where possible.

## Runtime services

| Service | Path | Role |
|---|---|---|
| API | `apps/api` | HTTP + WebSocket entrypoint. Authentication, CRUD, billing webhooks, AI streaming. |
| Worker | `apps/worker` | Event consumer. Runs extension handlers asynchronously. |
| Web dashboard | `apps/web` | Authoring UI. Astro shell + React islands. |
| Public sites | `apps/sites` | Renders every published site at `{slug}.asap.cool` (or your domain). |
| Accounts | `apps/accounts` | Authentication and account-level flows split out from the API. |
| Screenshot | `apps/screenshot` | Headless renderer used for previews and OG images. |

## Code layout

```
core/             # Rust crates: domain, api, shared, payments, ai, notifications
extensions/       # Rust crates: github-sync, analytics, …
packages/         # TypeScript: @asap/shared, @asap/renderers
apps/             # Executables: api, worker, web, sites, accounts, screenshot
infra/            # Docker compose files and SQL migrations
```

See [`structure.md`](./structure.md) for the file-by-file breakdown.

## Data flow examples

### Authoring a section

1. The user edits a section in the dashboard. The change hits `POST /websites/{id}/sections/{section_id}`.
2. The API validates the payload, updates Postgres under the user's `account_id`, and emits a `section.updated` event.
3. The worker picks the event up; the screenshot service refreshes the preview thumbnail; analytics records the edit.
4. The dashboard receives a WebSocket push and re-renders.

### Publishing

1. `POST /websites/{id}/publish` marks the website as published in Postgres.
2. The worker rebuilds the static projection (JSON/SQLite) used by `apps/sites` for low-TTFB reads.
3. The site is reachable at `{slug}.asap.cool` (or the user's custom domain).

## Where to look in the code

- HTTP routes: `core/api/src/`
- Domain models: `core/domain/src/`
- Auth + JWT: `core/shared/src/auth/`
- Stripe integration: `core/payments/src/`
- AI orchestrator: `core/ai/src/`
- Extensions: `extensions/<name>/src/`
- Event types: `core/shared/src/events/`

## Further reading

- [Structure](./structure.md) — per-folder breakdown
- [API reference](./api.md)
- [Testing](./testing.md)
- [Architecture decisions](./decisions/README.md)
- Feature design docs in [`../features/`](../features/)
