# Extensions

Extensions add capabilities on top of the core. Each extension is a Rust crate under `extensions/` that subscribes to core events and may expose its own HTTP endpoints behind the core's auth boundary.

## Why extensions

- **Keep the core small.** The core only owns auth, tenancy, persistence, and the event bus. Anything domain-specific (GitHub portfolio import, analytics, AI-assist tooling, marketplaces) is an extension.
- **Independent lifecycles.** An extension can be added, disabled, or removed without touching the core's schema or routes.
- **Per-site activation.** A site enables or disables an extension via `POST /websites/:id/extensions`. Settings are stored per-website.

## Today's extensions

| Extension | Path | What it does |
|---|---|---|
| `github-sync` | `extensions/github-sync/` | Imports a user's public GitHub repos and turns them into Projects sections. |
| `analytics` | `extensions/analytics/` | Records visits and aggregates per-site metrics for the dashboard. |

## Anatomy of an extension

```
extensions/<name>/
├── Cargo.toml
└── src/
    ├── lib.rs           # Extension entrypoint and registration
    ├── manifest.rs      # Metadata, settings schema, capabilities
    ├── events.rs        # Handlers for core events the extension subscribes to
    ├── routes.rs        # Optional HTTP endpoints mounted under /extensions/<name>/
    └── …
```

Each extension exposes:

- A **manifest** (`name`, `version`, `permissions`, `settings_schema`) read by the core registry on startup.
- An **event handler** registered with the worker for the events declared in the manifest.
- Optional **HTTP routes**, mounted by the core under `/extensions/<slug>/…` and protected by the standard JWT middleware.

## Lifecycle

1. **Discovery.** The core loads extension manifests at startup. Each manifest is matched against the `extensions` registry table.
2. **Enablement.** A site owner enables the extension via the dashboard or `POST /websites/:id/extensions`. The site stores its settings in `website_extensions`.
3. **Event delivery.** The worker dispatches matching events (`WEBSITE_CREATED`, `ACCOUNT_INTEGRATION_ADDED`, …) to the extension handler.
4. **Output.** The extension proposes structured actions on the site model (new sections, updates, suggestions) via the core API. Nothing is applied until accepted.
5. **Disable / remove.** Disabling keeps the data and the settings; removing wipes the extension's per-site state.

## Permissions

A manifest declares the data it reads and writes. Examples:

```toml
permissions = [
  "account.profile.read",
  "website.sections.write:proposals",
  "events.subscribe:WEBSITE_CREATED",
]
```

The core rejects calls outside the declared permissions even when the JWT is valid. This keeps third-party or future-community extensions contained.

## Marketplace surface (planned)

The codebase already exposes a public marketplace API under `/store/extensions` so that third-party extensions can be browsed and listed. The hosted marketplace experience is not yet shipped; see the issue tracker for the current scope.

## Where to look in the code

- Extension registry and core wiring: `core/api/src/extensions.rs`
- Event delivery from the worker: `apps/worker/src/extensions/`
- Manifests and shared types: `core/shared/src/extensions/`
- Public store endpoints: `core/api/src/store.rs`
