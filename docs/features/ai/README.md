# AI Integration

Design documentation for the AI panel and orchestrator that ship as part of ASAP.

## What it does

The AI integration lets a user describe what they want in natural language and receive proposed edits to their site. Edits are previewed in the dashboard before they are applied — nothing changes on the published site without an explicit confirmation.

Key behaviors:

- **Conversational editing.** Free-form prompts (`"add a pricing section with three tiers"`) produce structured actions over the site model.
- **Live preview.** Proposed actions render against the current site in real time via SSE streaming.
- **Multi-provider.** The orchestrator routes to OpenAI or Anthropic based on the task and on per-account budgets.
- **Bounded cost.** Per-account daily and per-request limits are enforced in `core/ai/`. Image generation is gated separately.

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────┐
│            Dashboard (apps/web) — AI Chat Panel                │
└──────────────────────────────┬─────────────────────────────────┘
                               │ SSE
┌──────────────────────────────▼─────────────────────────────────┐
│        Core AI (core/ai/) — orchestrator, tools, rate limit    │
└──────────────────┬──────────────────────────┬──────────────────┘
                   │                          │
            ┌──────▼──────┐            ┌──────▼──────┐
            │  Anthropic  │            │   OpenAI    │
            └─────────────┘            └─────────────┘
```

## Components

| Concern | Location |
|---|---|
| Orchestrator (provider routing, streaming, intent analysis) | `core/ai/src/orchestrator/` |
| Tool registry and execution | `core/ai/src/tools/` |
| Rate limiting (daily token caps, cost-aware throttling) | `core/ai/src/rate_limit/` |
| Vision / image analysis | `core/ai/src/vision/` |
| HTTP endpoints (SSE streams, history, settings) | `core/api/src/ai/` |
| Chat panel UI | `apps/web/src/components/ai/` |

## Subdocuments

> The next files are legacy design docs retained in French. A translation pass is open — see [GitHub Issues](https://github.com/Sycatle/asap-website-builder/issues).

| File | Topic |
|---|---|
| [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md) | Provider infrastructure and orchestration |
| [`02-FEATURES.md`](./02-FEATURES.md) | Capability tiers and user-facing features |
| [`03-API.md`](./03-API.md) | Endpoint shapes and SSE protocol |
| [`04-SECURITY.md`](./04-SECURITY.md) | Rate limiting, abuse prevention, billing model |
| [`05-UX.md`](./05-UX.md) | Chat panel and inline AI affordances |

## Configuration

Set provider keys in `infra/.env.prod`:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

If neither is set, the AI panel is hidden from the UI and the endpoints return `503`.
