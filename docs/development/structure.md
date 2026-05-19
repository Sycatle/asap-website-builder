# Monorepo Structure

This is the file-by-file map of the repository. For the architectural reasoning, see [`architecture.md`](./architecture.md).

## Top level

```
asap-website-builder/
├── core/             # Rust: domain, API, shared utilities, payments, AI, notifications
├── extensions/       # Rust: optional features (github-sync, analytics, …)
├── packages/         # TypeScript: @asap/shared, @asap/site-runtime
├── apps/             # Executables (api, worker, web, sites, accounts, screenshot)
├── infra/            # Docker Compose, Dockerfiles, SQL migrations, env examples
├── data/             # Runtime data (logs, generated site projections) — gitignored content
├── scripts/          # Maintenance shell scripts (migrations, VAPID, …)
├── docs/             # Documentation (this folder)
├── Cargo.toml        # Rust workspace
├── pnpm-workspace.yaml
├── package.json      # pnpm workspace root
└── Makefile          # Development commands
```

## `core/` — Rust core

The trust boundary. Anything an extension is allowed to see goes through here.

| Crate | Path | Responsibility |
|---|---|---|
| `asap-core-domain` | `core/domain/` | Domain models: `Account`, `Website`, `Section`, `Event`, … |
| `asap-core-api` | `core/api/` | HTTP routes and handlers shared by all apps |
| `asap-core-shared` | `core/shared/` | Auth, config, error types, pub/sub, observability |
| `asap-core-payments` | `core/payments/` | Stripe provider, webhooks, billing state |
| `asap-core-ai` | `core/ai/` | Multi-provider AI orchestrator, rate limiting, tool executor |
| `asap-core-notifications` | `core/notifications/` | Push and in-app notifications |

## `extensions/` — Rust extensions

Optional capabilities that subscribe to core events. Each is a standalone crate.

| Crate | Path | Responsibility |
|---|---|---|
| `asap-extension-github-sync` | `extensions/github-sync/` | Import public repos as portfolio sections |
| `asap-extension-analytics` | `extensions/analytics/` | Visit and event tracking |

## `packages/` — Shared TypeScript

Consumed by `apps/web` and `apps/sites`.

| Package | Path | Responsibility |
|---|---|---|
| `@asap/shared` | `packages/shared/` | Types, constants, validation utilities |
| `@asap/site-runtime` | `packages/site-runtime/` | Per-tenant runtime: design-token injection, data hooks, Tailwind preset, and compiled-section host (`<GeneratedSection>`). Consumed by `apps/sites` for production and `apps/web` for studio preview. Sections themselves are AI-generated, compiled by `core/ai/src/section_codegen`, and served as JS modules by `/api/public/sections/:id/module.js`. |

## `apps/` — Executables

| App | Path | Runtime |
|---|---|---|
| `apps/api` | API server | Rust / Axum |
| `apps/worker` | Event processor | Rust / Tokio |
| `apps/accounts` | Auth and account flows | Astro |
| `apps/web` | Authoring dashboard | Astro + React |
| `apps/sites` | Public website rendering | Astro + React |
| `apps/screenshot` | Headless screenshot service | Node |

## `infra/` — Infrastructure

```
infra/
├── docker-compose.yml          # Base services
├── docker-compose.dev.yml      # Development overlay (hot reload)
├── docker-compose.prod.yml     # Production overlay
├── Dockerfile.*                # Per-app images
├── migrations/                 # SQL migrations (timestamped)
├── env.example/                # Environment variable templates
├── kubernetes/                 # Kustomize manifests
└── .env.prod.example           # Production .env template
```

## `data/` — Runtime data

`data/logs/` and `data/sites/` are created on first run. Contents are gitignored; only the `.gitkeep` markers are tracked so the directories exist after a clean clone.

## `docs/` — Documentation

```
docs/
├── README.md                 # Audience-based index
├── self-hosting/             # Operators
├── development/              # Contributors
│   ├── architecture.md
│   ├── api.md
│   ├── structure.md          # this file
│   ├── testing.md
│   ├── flows.md
│   └── decisions/            # ADRs
└── features/                 # Per-feature design docs
```

## Build artifacts (not tracked)

| Path | Purpose |
|---|---|
| `target/` | Rust build output |
| `node_modules/` | pnpm dependencies |
| `.astro/`, `.pnpm-store/`, `.sqlx/`, `.cache/` | Tooling caches |

All of the above are listed in `.gitignore`.
