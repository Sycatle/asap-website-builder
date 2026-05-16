# Functional Flows

This document walks through the main user and system flows on ASAP, showing how the core and the extensions cooperate. See [`architecture.md`](./architecture.md) for the static picture.

## 1. Sign up

```
Sign-up form (apps/web)
    │  POST /auth/signup
    ▼
core/api creates: accounts, tenants, websites
    │
    ▼  emits ACCOUNT_CREATED
core/notifications and workers react
    │
    ▼
client receives a JWT and is redirected to /app/dashboard
```

## 2. Connect GitHub (core + github-sync extension)

### Step 1 — record the integration

```
User enters a GitHub username
    │  PUT /accounts/:id/integrations/github
    ▼
core stores it on account_data.integrations
    │
    ▼  emits ACCOUNT_INTEGRATION_ADDED
```

### Step 2 — extension reacts

```
apps/worker observes ACCOUNT_INTEGRATION_ADDED
    │
    ▼
extensions/github-sync:
  1. GET /auth/me (core API)
  2. Reads account_data.integrations.github.username
  3. Fetches public repos through the GitHub API
  4. Builds a project list and proposes a Projects section
  5. POST /websites/:id/sections/from-suggestion
```

## 3. Create a site from a preset

```
User picks a preset in the dashboard
    │  POST /websites/from-preset { preset_id, slug, title }
    ▼
core duplicates the preset's sections under the user's account
    │
    ▼  emits WEBSITE_CREATED
apps/screenshot generates a thumbnail
apps/worker rebuilds the public projection
```

## 4. Edit a section

```
User edits content in the studio
    │  PATCH /websites/:id/sections/:section_id
    ▼
core validates and persists the change (RLS-scoped to account_id)
    │
    ▼  emits SECTION_UPDATED
apps/web receives a WebSocket push and refreshes the canvas
apps/screenshot refreshes the preview thumbnail
```

## 5. Publish

```
User clicks Publish
    │  POST /websites/:id/publish
    ▼
core marks the site as published, increments the version
    │
    ▼  emits WEBSITE_PUBLISHED
apps/worker rebuilds the static projection (JSON / SQLite)
apps/sites starts serving the new version at {slug}.asap.cool
```

## 6. AI conversation

```
User opens the AI panel and submits a prompt
    │  POST /ai/chat (SSE stream)
    ▼
core/ai orchestrator selects a provider, streams the response
    │
    ▼  produces structured tool calls
core executes the tools as draft actions
    │
    ▼  emits AI_ACTIONS_PROPOSED
apps/web renders the proposed diff over the live preview
User accepts → the actions are committed as normal edits (step 4)
```

## 7. Stripe webhook

```
Stripe → POST /webhooks/stripe (signed)
    │
    ▼
core/payments verifies the signature, updates billing state
    │
    ▼  emits ACCOUNT_PLAN_CHANGED or PAYMENT_*
core/notifications enqueues an in-app and push notification
```

## Cross-cutting invariants

- Every state-changing call is authorized against the user's `account_id` either by JWT claims or by RLS.
- Long-running side effects always flow through events. The API request loop never blocks on a third-party call.
- Public reads (`apps/sites`) never query the API. They read the on-disk projection produced by the worker.
