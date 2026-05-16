# CLAUDE.md

Project-specific instructions for AI coding agents working in this repo.
Keep this file short and current. Public docs live in `docs/`, contributor
docs in `CONTRIBUTING.md`. This file is only for agent operating rules.

## What this repo is

ASAP — source-available (BSL 1.1 → Apache 2.0 in 2030) self-hostable website
builder. Hybrid Rust + Node monorepo.

- **Rust workspace** (`Cargo.toml`): `core/{domain,shared,api,payments,notifications,ai}`, `apps/api`, `apps/worker`, `extensions/github-sync/backend`.
- **pnpm workspace** (`pnpm-workspace.yaml`): `apps/{web,sites,accounts,screenshot}`, `packages/{shared,renderers}`, `extensions/*/frontend`.
- Postgres + Redis. SSE for AI streaming. WebSocket for live presence / collab.

## Load-bearing concepts

Read these before touching the related code:

- **Design tokens** (`core/domain/src/design_tokens.rs`, `packages/shared/src/tokens.ts`) — per-site visual identity: palette, typography, spacing, radius, motion, shadow. Stored in `Website.metadata.tokens` (JSONB). The renderer emits CSS custom properties from these tokens; the studio Design page lets users edit them; the onboarding wizard derives them from a seed color via `derive_tokens()`.
- **Variant catalog** (`core/domain/src/variant_catalog.rs`, `packages/renderers/src/variant-catalog.ts`) — single source of truth for `variant_key`s and their typed parameters. **Both files must stay in lockstep.** Used by: the AI tool `generate_section_variant`, the studio variant picker, the renderer dispatchers, and the validator `validate_variant()`.
- **Native variant columns** — `website_elements` has `variant_key TEXT` and `variant_params JSONB` columns. The renderer also reads legacy `settings.variant_*` via `withVariantFields()` for pre-migration records — keep that fallback when touching dispatchers.
- **Section dispatchers** — each section component in `packages/renderers/src/components/saas/` is a small dispatcher that routes on `section.variant_key` to a variant in `<section>-variants/`. When adding variants, update both catalogs and the dispatcher; never let one drift.

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
| `@asap/renderers` typecheck | `pnpm -F @asap/renderers typecheck` |
| `apps/web` typecheck | `cd apps/web && pnpm exec tsc --noEmit` |
| `apps/sites` typecheck | `cd apps/sites && pnpm exec astro check` |
| Frontend tests (vitest, jsdom) | `pnpm --filter @asap/web test:run` |
| Frontend build | `pnpm -r --if-present build` |
| Dev stack (Docker compose) | `make dev` |

CI (`.github/workflows/ci.yml`) enforces `cargo fmt`, the two clippy lint groups above, the full test suite, and `cargo sqlx prepare --check`. Anything that breaks one of these blocks merge.

### Commits

- Conventional commits, English, imperative mood. Examples:
  - `fix(api): require strong JWT_SECRET and CORS allowlist in production`
  - `refactor(api): extract login endpoint into auth/login.rs`
  - `feat(renderers): add hero/split-asymmetric variant`
- One concern per commit. No mixed reformats + behaviour changes.
- **Never** add `Co-Authored-By` trailers.
- **Never** `git commit --no-verify`. If a hook fails, fix the underlying issue.
- Stage explicitly (`git add <paths>`), not `git add -A`, to avoid pulling in parallel agents' WIP or untracked secrets.
- Don't push, don't open PRs, don't tag releases unless the user asked for it.

### Editing rules of thumb

- Don't comment the obvious; explain *why* when a constraint isn't visible from the code.
- Don't add error-handling or fallbacks for impossible cases. Trust internal code.
- Don't introduce abstractions speculatively. Three repeated lines beats a premature trait.
- Server Components / Astro by default in `apps/web` and `apps/sites`. Add `"use client"` only when hooks / events require it.
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

### Renderers / variants

- Each section variant must work identically in SSR (`apps/sites`) and CSR studio preview (`apps/web`). No browser-only APIs at top level.
- When adding or renaming a variant: update **both** `packages/renderers/src/variant-catalog.ts` **and** `core/domain/src/variant_catalog.rs`. Tests in `core/domain` validate the round-trip; CI catches drift.
- Variant components read `section.variant_params` directly; the dispatcher hoists from `settings` via `withVariantFields()` for legacy records.
- AI-proposed variants flow through `AIAction::ProposeSectionVariant`. The user must confirm before persistence — never auto-apply in the action handler.

### Infra

- K8s production overlay uses `0.0.0-PLACEHOLDER` for image tags on purpose. CI must override with `kustomize edit set image asap-<svc>=ghcr.io/asap-cool/<svc>:${GIT_SHA}` before `kubectl apply`. Don't replace the placeholder with `latest`.
- The API image runs as non-root (UID 1001). Don't add steps that write outside `/app` or expect root.

## Where things live

When in doubt, follow the existing split rather than adding new top-level modules.

- **API routing**: `core/api/src/routes.rs` — single source of truth for `/api/*`.
- **Auth**: `core/api/src/auth.rs` is a thin module file. Each endpoint sits in its own submodule (`auth/signup.rs`, `auth/login.rs`, `auth/refresh.rs`, `auth/password_reset.rs`, `auth/account.rs`, `auth/logout.rs`, `auth/sessions.rs`). Shared helpers: `auth/cookies.rs`, `auth/password.rs`, `auth/types.rs`.
- **AI**: `core/api/src/ai/` — handlers split into `handlers.rs` (chat + chat_stream), `quota.rs`, `conversations.rs`, plus the helper modules listed in `ai/mod.rs`. AI orchestrator + tool definitions live in `core/ai/src/`.
- **Collections + variables**: `core/api/src/collections/` — `items.rs`, `variables.rs`, `filters.rs`, `helpers.rs`, `types.rs`.
- **Design tokens & variants**: `core/domain/src/{design_tokens,design_tokens_derive,variant_catalog}.rs` (Rust mirror) and `packages/{shared/src/{types,tokens}.ts, renderers/src/variant-catalog.ts}` (TS source).
- **Onboarding wizard / Design page**: `apps/web/src/components/{onboarding/brand-identity-wizard.tsx, features/design/design-page.tsx}`.
- **Shared crate utilities**: `core/shared/src/` — JWT, cookies, hashing. Don't reimplement these per-crate.
- **Renderers** (used by both `apps/web` preview and `apps/sites` public): `packages/renderers/`. Components must work identically in SSR and CSR.

## Anti-patterns we've already paid for

These keep coming back. Don't redo them:

- Hardcoded localhost fallbacks scattered across 20 call sites — use the centralized resolvers.
- `format!("SAVEPOINT sp_{}", x)` style dynamic SQL — use static identifiers, never interpolate runtime values into SQL keywords.
- Defaulting `JWT_SECRET` to a placeholder when missing — fail fast in production.
- Single-file god modules — keep handler files focused; the auth/ai/collections splits are the reference patterns.
- pnpm `file:` paths inside the workspace — use `workspace:*`.
- `image: ...:latest` in k8s manifests — versioned tags only.
- TS catalog updated, Rust catalog forgotten (or vice versa) — they go together.
- Adding a variant component without listing it in the catalog — the AI tool enum is generated from the catalog at startup, so an unlisted variant is invisible to the model.

## When you're done

Before claiming a task is complete:
1. Targeted cargo build of touched crates passes; `cargo test --workspace` passes for behaviour changes.
2. Affected frontend `pnpm test:run` passes.
3. Targeted typecheck (`pnpm -F <pkg> typecheck` or `astro check`) passes for touched packages.
4. `cargo fmt --all -- --check` passes.
5. `cargo clippy --workspace --all-targets -- -D clippy::correctness -D clippy::suspicious` passes.
6. If SQL changed: `.sqlx/` regenerated and committed; new migration added (never edit a merged one).
7. If a variant or design-token field changed: both TS and Rust catalogs updated.
8. No `.env` or secret in the diff (`git diff --cached | grep -iE 'secret|api[_-]?key|password'`).
9. State the test commands you ran in the final response. Don't claim "tests pass" without naming them.
