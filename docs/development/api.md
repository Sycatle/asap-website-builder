# Core API Reference

The Core API is the HTTP surface exposed by `apps/api` (built from `core/api`). Extensions consume this API; the dashboard and the public sites consume it too. Source of truth for shapes and validation lives in `core/api/src/`; this document is a navigable index.

## Conventions

- JSON over HTTP (UTF-8). All requests and responses are JSON unless explicitly noted.
- Authentication is JWT via `Authorization: Bearer <token>` for most routes, or signed cookies for browser flows.
- The authenticated `account_id` is read from the token; clients never pass it in the body.
- Mutating routes that affect billing or quotas accept an `Idempotency-Key` header.
- Errors follow `{ "error": { "code", "message", "details?" } }`. HTTP status codes match the conventional REST mapping.

## Route groups

| Group | Auth | Purpose | Source |
|---|---|---|---|
| Auth | public | Signup, login, password reset | `core/api/src/auth.rs` |
| Accounts | jwt | Account profile and integrations | `core/api/src/accounts.rs` |
| Websites | jwt | Site CRUD, publish | `core/api/src/websites.rs` |
| Sections | jwt | Section CRUD, reorder | `core/api/src/sections.rs` |
| Presets | jwt | Templates and `from-preset` creation | `core/api/src/presets.rs` |
| Website extensions | jwt | Enable / configure per-site extensions | `core/api/src/extensions.rs` |
| Extension catalog | jwt | List available extensions and their schemas | `core/api/src/extensions.rs` |
| Extension store | public | Public marketplace listings | `core/api/src/extensions.rs` |
| Events | jwt | Event log read/write for extensions | `core/api/src/events.rs` |
| Notifications | jwt | In-app + push notifications | `core/api/src/notifications.rs` |
| Billing | jwt | Stripe checkout sessions, plan changes | `core/api/src/billing.rs` |
| Webhooks | public | Stripe and provider callbacks (signed) | `core/api/src/webhooks.rs` |
| Files | jwt | File upload, quota, deletion | `core/api/src/files.rs` |
| AI | jwt | Chat, streaming, settings | `core/api/src/ai/` |
| Public websites | public | Read-only view of a published site by slug | `core/api/src/public.rs` |
| WebSocket | jwt | Real-time dashboard updates | `apps/api/src/websocket.rs` |

## Frequently used endpoints

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/signup` | Returns JWT and creates a default workspace |
| `POST` | `/auth/login` | Returns JWT |
| `GET` | `/auth/me` | Current account |
| `GET` | `/websites` | All websites in the user's tenant |
| `POST` | `/websites/from-preset` | Create a site from a preset id |
| `GET` | `/websites/:id/sections` | Ordered section list |
| `POST` | `/websites/:id/sections` | Append a section |
| `PATCH` | `/websites/:id/sections/:section_id` | Partial update |
| `POST` | `/websites/:id/sections/reorder` | Reorder by id list |
| `POST` | `/websites/:id/publish` | Publish the current draft |
| `GET` | `/public/websites/:slug` | Public read-only view (no auth) |
| `POST` | `/billing/checkout-session` | Create a Stripe Checkout session |
| `POST` | `/webhooks/stripe` | Signed Stripe webhook |
| `GET` | `/ws` | WebSocket upgrade for dashboard live updates |

The full list is enumerated by the OpenAPI document generated from the Rust handlers — run `cargo run -p asap-api -- openapi > openapi.json` to produce it locally.

## AI endpoints

| Method | Path | Notes |
|---|---|---|
| `POST` | `/ai/chat` | Streaming SSE response. Tool calls are emitted as discrete events. |
| `GET` | `/ai/history` | Recent conversations for the authenticated account |
| `GET` | `/ai/usage` | Per-account daily token and cost counters |
| `GET` | `/ai/settings` | Provider + persona preferences |
| `PATCH` | `/ai/settings` | Update provider preferences |

See [`../features/ai/README.md`](../features/ai/README.md) for the orchestrator details and the SSE protocol.

## Standard HTTP errors

| Status | Meaning |
|---|---|
| `400` | Bad request — malformed JSON or invalid field |
| `401` | Missing or invalid JWT |
| `403` | Authenticated but not allowed for this resource |
| `404` | Resource does not exist (or is hidden by RLS) |
| `409` | Conflict — typically slug collisions or stale updates |
| `422` | Validation error — field-level reasons in `error.details` |
| `429` | Rate-limited (auth, AI, or generic per-account limits) |
| `5xx` | Server error — see logs and tracing |

## Where to look next

- [`./flows.md`](./flows.md) — request-flow walkthroughs (signup, publish, AI, Stripe webhook).
- [`./architecture.md`](./architecture.md) — how the API fits with the worker, queues, and projections.
- [`../features/`](../features/) — feature-level design docs for AI, notifications, file upload, extensions, WebSocket, and PWA.
