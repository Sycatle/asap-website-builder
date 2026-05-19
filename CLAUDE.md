# CLAUDE.md

Project-specific instructions for AI coding agents working in this repo.
Keep this file short and current. Public docs live in `docs/`, contributor
docs in `CONTRIBUTING.md`. This file is only for agent operating rules.

## What this repo is

ASAP — source-available (BSL 1.1 → Apache 2.0 in 2030) self-hostable website
builder. Hybrid Rust + Node monorepo.

- **Rust workspace** (`Cargo.toml`): `core/{domain,shared,api,payments,notifications,ai}`, `apps/api`, `apps/worker`, `extensions/github-sync/backend`.
- **pnpm workspace** (`pnpm-workspace.yaml`): `apps/{web,sites,accounts,screenshot}`, `packages/shared`, `extensions/*/frontend`.
- Postgres + Redis. SSE for AI streaming. WebSocket for live presence / collab.

## Architecture in transition

The variant-catalog / section-renderers system was removed. The replacement (AI-generated JSX consuming Tailwind utilities bound to per-site design tokens) is not yet built — see `/home/sycatle/.claude/plans/n-a-t-on-pas-int-grer-floofy-sifakis.md` for the target.

Current state:
- `packages/renderers/` deleted. `apps/sites` mounts `@asap/site-runtime` and renders each section via `<GeneratedSection>`, which dynamic-imports the compiled module by URL.
- AI codegen pipeline lives in `core/ai/src/section_codegen/` (parse → validate → compile via `swc_core`, plus data-binding and knob extraction). Endpoint: `POST /api/websites/:id/elements/:element_id/code` runs the pipeline and atomically writes `source_code` + `compiled_js` + `data_bindings` + `knobs_schema`.
- AI tool `generate_section_code` + action `AIAction::ProposeSectionCode` are wired through the orchestrator. The studio is responsible for showing the diff and confirming before calling the `/code` endpoint.
- Public read path: `GET /api/public/websites/:slug/elements` returns `module_url` per compiled section; `GET /api/public/sections/:id/module.js` serves the compiled JS with proper MIME; `GET /api/public/websites/:slug/data` returns the `{ collections, variables }` envelope the runtime hands to the provider.
- DB schema is final for v0: `website_elements.{source_code, compiled_js, data_bindings, knobs_schema}` (variant columns gone). `.sqlx` regenerated.
- `apps/web` studio keeps the editor shell. Sections that haven't been generated render an inline placeholder in `apps/sites`; the studio's preview-frame still stubs each section pending the new edit UI.
- **Still to build**: studio UI for `generate_section_code` round-trip (re-prompt + diff + knobs panel), websocket invalidation when a section is regenerated, optional SSR rendering of generated sections.

## Load-bearing concepts

- **Design tokens** (`core/domain/src/design_tokens.rs`, `packages/shared/src/tokens.ts`) — per-site visual identity: palette, typography, spacing, radius, motion, shadow. Stored in `Website.metadata.tokens` (JSONB). `apps/sites` injects them as CSS custom properties on `:root` per request. These are the *only* allowed source of color / spacing / typography for future AI-generated sections.

## Working on the codebase

### Build / test / lint / typecheck

| Task | Command |
| --- | --- |
| Rust whole-workspace build | `cargo build --workspace` |
| Rust whole-workspace test | `cargo test --workspace --no-fail-fast` |
| Rust offline check | `SQLX_OFFLINE=true cargo check --workspace` |
| Rust format | `cargo fmt --all` (enforced in CI) |
| Rust lint | `cargo clippy --workspace --all-targets -- -D clippy::correctness -D clippy::suspicious` |
| `@asap/shared` typecheck | `pnpm -F @asap/shared typecheck` |
| `apps/web` typecheck | `pnpm -F @asap/web typecheck` |
| `apps/sites` typecheck | `cd apps/sites && pnpm exec astro check` |
| Frontend tests (vitest, jsdom) | `pnpm --filter @asap/web test:run` |
| Frontend build | `pnpm -r --if-present build` |
| Dev stack (Docker compose) | `make dev` |

CI (`.github/workflows/ci.yml`) enforces `cargo fmt`, the two clippy lint groups above, the full test suite, and `cargo sqlx prepare --check`. Anything that breaks one of these blocks merge.

### Commits

- Conventional commits, English, imperative mood. Examples:
  - `fix(api): require strong JWT_SECRET and CORS allowlist in production`
  - `refactor(api): extract login endpoint into auth/login.rs`
  - `feat(api): add /sections/generate endpoint`
- One concern per commit. No mixed reformats + behaviour changes.
- **Never** add `Co-Authored-By` trailers.
- **Never** `git commit --no-verify`. If a hook fails, fix the underlying issue.
- Stage explicitly (`git add <paths>`), not `git add -A`, to avoid pulling in parallel agents' WIP or untracked secrets.
- Don't push, don't open PRs, don't tag releases unless the user asked for it.

### Editing rules of thumb

- Don't comment the obvious; explain *why* when a constraint isn't visible from the code.
- Don't add error-handling or fallbacks for impossible cases. Trust internal code.
- Don't introduce abstractions speculatively. Three repeated lines beats a premature trait.
- `apps/web` is a Vite + React SPA served by nginx in production; `apps/sites` stays on Astro (SSR for public sites). Add `"use client"` only when hooks / events require it.
- After editing a Rust file, expect `rustfmt` and `clippy` to be run; structure your changes to survive both.

## Hard constraints

### Secrets

- `.env*` files at the repo root and under `infra/` are gitignored. Do not commit them, and do not reintroduce them under tracked names. Use `*.example` for templates.
- Never log secrets, tokens, or password hashes. `tracing` events should never embed `JWT_SECRET`, raw refresh tokens, or `Authorization` headers.
- `JWT_SECRET`: required in production (`ASAP_ENV=production`), min 32 bytes, never the dev placeholder. Enforced in `apps/api/src/config.rs`.
- `CORS_ALLOWED_ORIGINS`: required in production, must not contain `*`. Enforced in `apps/api/src/config.rs`.

### Database — migrations and `sqlx` offline cache

`.sqlx/` caches the compile-time check of every `query!()` / `query_as!()` macro. The cache hashes the **exact** raw SQL string, whitespace included.

When you move SQL between files:
- Keep the query string byte-for-byte identical (trailing spaces, blank lines, indentation).
- Don't let `cargo fmt` rewrite multi-line string literals.
- After **any** SQL change, run `cargo sqlx prepare --workspace -- --all-targets` against a live Postgres. CI runs `cargo sqlx prepare --check` and will fail if the cache is stale.
- If you don't have a DB, **don't change SQL** — open a PR description that flags the need to regenerate the cache.

Migrations live in `infra/migrations/` and run via `scripts/run-migrations.sh`. Schema changes always go through a new timestamped migration (`YYYYMMDDHHMMSS_short_description.sql`); never edit a merged one. Migrations must be safe under concurrent writes (use `IF NOT EXISTS`, `CONCURRENTLY` for indexes when feasible, no `NOT NULL` without a default backfill).

### Authentication / sessions

- bcrypt cost is `BCRYPT_COST` env var, default 13. Don't lower.
- Refresh tokens rotate on every `/auth/refresh`. Reuse of an old token revokes the **entire family**. Don't shortcut this in `core/api/src/auth/refresh.rs`.
- Access tokens carry a JTI; logout writes the JTI into `revoked_access_tokens`. The middleware checks this — preserve that flow when touching `core/api/src/middleware.rs`.
- Stripe webhook (`core/api/src/webhooks.rs`) rejects timestamps older than ±300s. Don't widen this without reason.
- OAuth state is HMAC-signed (`encode_state`/`decode_state` in `core/api/src/oauth.rs`). PKCE applies to Google. GitHub OAuth Apps doesn't support PKCE — leave that branch alone.

### Frontend

- API base URL: always go through `getApiBaseUrl()` from `apps/web/src/lib/api/base-url.ts`. Never hard-code `http://localhost:3000/api` or read `import.meta.env.PUBLIC_API_URL` directly. Same rule for `getWsBaseUrl()` and the WS URL.
- Internal package deps use `workspace:*` in `package.json`, not `file:` paths.
- Astro middleware sets a strict CSP in production — anything new that fetches across origins needs to be added to `connect-src`.
- All public-facing docs and UI copy are in English (project decision, 2026-05).

### Rendering (in transition)

- The variant catalog + section dispatchers + `packages/renderers` were removed; nothing renders user sections today. Don't add a replacement piecewise — wait for the AI-codegen runtime described in the refactor plan.
- `apps/web` = the ASAP studio (creators build sites here). `apps/sites` = the multi-tenant runtime that will serve every published site, each with its own design tokens. Keep this distinction crisp: anything that emits per-tenant CSS / hydrates per-site data belongs in `apps/sites`, not `apps/web`.

### Infra

- K8s production overlay uses `0.0.0-PLACEHOLDER` for image tags on purpose. CI must override with `kustomize edit set image asap-<svc>=ghcr.io/asap-cool/<svc>:${GIT_SHA}` before `kubectl apply`. Don't replace the placeholder with `latest`.
- The API image runs as non-root (UID 1001). Don't add steps that write outside `/app` or expect root.

## Where things live

When in doubt, follow the existing split rather than adding new top-level modules.

- **API routing**: `core/api/src/routes.rs` — single source of truth for `/api/*`.
- **Auth**: `core/api/src/auth.rs` is a thin module file. Each endpoint sits in its own submodule (`auth/signup.rs`, `auth/login.rs`, `auth/refresh.rs`, `auth/password_reset.rs`, `auth/account.rs`, `auth/logout.rs`, `auth/sessions.rs`). Shared helpers: `auth/cookies.rs`, `auth/password.rs`, `auth/types.rs`.
- **AI**: `core/api/src/ai/` — handlers split into `handlers.rs` (chat + chat_stream), `quota.rs`, `conversations.rs`, plus the helper modules listed in `ai/mod.rs`. AI orchestrator + tool definitions live in `core/ai/src/`.
- **Collections + variables**: `core/api/src/collections/` — `items.rs`, `variables.rs`, `filters.rs`, `helpers.rs`, `types.rs`.
- **Design tokens**: `core/domain/src/{design_tokens,design_tokens_derive}.rs` (Rust) and `packages/shared/src/{types,tokens}.ts` (TS).
- **Onboarding wizard / Design page**: `apps/web/src/components/{onboarding/brand-identity-wizard.tsx, features/design/design-page.tsx}`.
- **Shared crate utilities**: `core/shared/src/` — JWT, cookies, hashing. Don't reimplement these per-crate.

## Anti-patterns we've already paid for

These keep coming back. Don't redo them:

- Hardcoded localhost fallbacks scattered across 20 call sites — use the centralized resolvers.
- `format!("SAVEPOINT sp_{}", x)` style dynamic SQL — use static identifiers, never interpolate runtime values into SQL keywords.
- Defaulting `JWT_SECRET` to a placeholder when missing — fail fast in production.
- Single-file god modules — keep handler files focused; the auth/ai/collections splits are the reference patterns.
- pnpm `file:` paths inside the workspace — use `workspace:*`.
- `image: ...:latest` in k8s manifests — versioned tags only.

## When you're done

Before claiming a task is complete:
1. Targeted cargo build of touched crates passes; `cargo test --workspace` passes for behaviour changes.
2. Affected frontend `pnpm test:run` passes.
3. Targeted typecheck (`pnpm -F <pkg> typecheck` or `astro check`) passes for touched packages.
4. `cargo fmt --all -- --check` passes.
5. `cargo clippy --workspace --all-targets -- -D clippy::correctness -D clippy::suspicious` passes.
6. If SQL changed: `.sqlx/` regenerated and committed; new migration added (never edit a merged one).
7. If a design-token field changed: Rust (`core/domain/src/design_tokens.rs`) and TS (`packages/shared/src/{types,tokens}.ts`) stay aligned.
8. No `.env` or secret in the diff (`git diff --cached | grep -iE 'secret|api[_-]?key|password'`).
9. State the test commands you ran in the final response. Don't claim "tests pass" without naming them.
