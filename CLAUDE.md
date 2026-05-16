# CLAUDE.md

Project-specific instructions for AI coding agents working in this repo.
Keep this file short and current — public docs live in `docs/`, contributor
docs in `CONTRIBUTING.md`. This file is only for agent operating rules.

## What this repo is

ASAP — open self-hostable website builder. Hybrid Rust + Node monorepo.

- **Rust workspace** (`Cargo.toml`): `core/{domain,shared,api,payments,notifications,ai}`, `apps/api`, `apps/worker`, `extensions/github-sync/backend`.
- **pnpm workspace** (`pnpm-workspace.yaml`): `apps/{web,sites,accounts,screenshot}`, `packages/{shared,renderers}`, `extensions/*/frontend`.
- Postgres + Redis backing services. SSE for AI streaming. WebSocket for live presence/collab.

## Working on the codebase

### Build / test / lint

| Task | Command |
| --- | --- |
| Whole-workspace Rust test | `cargo test --workspace --no-fail-fast` |
| Whole-workspace Rust check (offline DB) | `SQLX_OFFLINE=true cargo check --workspace` |
| Whole-workspace Rust format | `cargo fmt --all` (enforced in CI) |
| Whole-workspace Rust lint | `cargo clippy --workspace --all-targets -- -D clippy::correctness -D clippy::suspicious` |
| Frontend tests (vitest, jsdom) | `pnpm --filter @asap/web test:run` |
| Frontend typecheck / build | `pnpm -r --if-present build` |
| Dev stack (Docker compose) | `make dev` |

CI (`.github/workflows/ci.yml`) enforces `cargo fmt`, the two clippy lint groups above, the full test suite, and `cargo sqlx prepare --check`. Anything that breaks one of these blocks merge.

### Commits

- Conventional commits, English, imperative mood. Examples:
  - `fix(api): require strong JWT_SECRET and CORS allowlist in production`
  - `refactor(api): extract login endpoint into auth/login.rs`
  - `chore: apply cargo clippy --fix across the Rust workspace`
- One concern per commit. No mixed reformats + behaviour changes.
- **Never** add `Co-Authored-By` trailers.
- **Never** `git commit --no-verify`. If a hook fails, fix the underlying issue.
- Stage explicitly (`git add <paths>`), not `git add -A`, to avoid pulling in
  parallel agents' WIP or untracked secrets.

### Editing rules of thumb

- Don't comment the obvious; explain *why* when a constraint isn't visible from the code.
- Don't add error-handling or fallbacks for impossible cases. Trust internal code.
- Don't introduce abstractions speculatively. Three repeated lines beats a premature trait.
- Server Components / Astro by default in `apps/web` and `apps/sites`. Add `"use client"` only when hooks/events require it.

## Hard constraints

### Secrets

- `.env*` files at the repo root and under `infra/` are gitignored. Do not commit them, and do not reintroduce them under tracked names. Use `*.example` for templates.
- Never log secrets, tokens, or password hashes. `tracing` events should never embed `JWT_SECRET`, raw refresh tokens, or `Authorization` headers.
- `JWT_SECRET`: required in production (`ASAP_ENV=production`), min 32 bytes, never the dev placeholder. Enforced in `apps/api/src/config.rs`.
- `CORS_ALLOWED_ORIGINS`: required in production, must not contain `*`. Enforced in `apps/api/src/config.rs`.

### Database — `sqlx` offline cache

`.sqlx/` caches the compile-time check of every `query!()` / `query_as!()`
macro. The cache hashes the **exact** raw SQL string, whitespace included.

When you move SQL between files:
- Keep the query string byte-for-byte identical (trailing spaces, blank lines, indentation).
- Don't let `cargo fmt` rewrite multi-line string literals (it shouldn't, but verify).
- After **any** SQL change, run `cargo sqlx prepare --workspace -- --all-targets` against a live Postgres. CI runs `cargo sqlx prepare --check` and will fail if the cache is stale.
- If you don't have a DB, **don't change SQL** — open a PR description that flags the need to regenerate the cache.

Migrations live in `infra/migrations/` and run via `scripts/run-migrations.sh`. Schema changes always go through a new timestamped migration; never edit a merged one.

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

### Infra

- K8s production overlay uses `0.0.0-PLACEHOLDER` for image tags on purpose. CI must override with `kustomize edit set image asap-<svc>=ghcr.io/asap-cool/<svc>:${GIT_SHA}` before `kubectl apply`. Don't replace the placeholder with `latest`.
- The API image runs as non-root (UID 1001). Don't add steps that write outside `/app` or expect root.

## Where things live

When in doubt, follow the existing split rather than adding new top-level modules.

- **API routing**: `core/api/src/routes.rs` — single source of truth for `/api/*`.
- **Auth**: `core/api/src/auth.rs` is a thin module file. Each endpoint sits in its own submodule (`auth/signup.rs`, `auth/login.rs`, `auth/refresh.rs`, `auth/password_reset.rs`, `auth/account.rs`, `auth/logout.rs`, `auth/sessions.rs`). Shared helpers: `auth/cookies.rs`, `auth/password.rs`, `auth/types.rs`.
- **AI**: `core/api/src/ai/` — handlers split into `handlers.rs` (chat + chat_stream), `quota.rs`, `conversations.rs`, plus the helper modules listed in `ai/mod.rs`.
- **Collections + variables**: `core/api/src/collections/` — `items.rs`, `variables.rs`, `filters.rs`, `helpers.rs`, `types.rs`.
- **Shared crate utilities**: `core/shared/src/` — JWT, cookies, hashing. Don't reimplement these per-crate.
- **Renderers** (used by both `apps/web` preview and `apps/sites` public): `packages/renderers/`. Component must work identically in SSR (Astro) and CSR (React studio).

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
1. `cargo test --workspace` passes.
2. Affected frontend `pnpm test:run` passes.
3. `cargo fmt --all -- --check` passes.
4. `cargo clippy --workspace --all-targets -- -D clippy::correctness -D clippy::suspicious` passes.
5. If SQL changed: `.sqlx/` regenerated and committed.
6. No `.env` or secret in the diff (`git diff --cached | grep -iE 'secret|api[_-]?key|password'`).
