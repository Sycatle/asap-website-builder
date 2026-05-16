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

| Concern | Location |
|---|---|
| Orchestrator (provider routing, streaming, intent analysis) | `core/ai/src/orchestrator/` |
| Tool registry and execution | `core/ai/src/tools/` |
| Rate limiting (daily token caps, cost-aware throttling) | `core/ai/src/rate_limit/` |
| Vision / image analysis | `core/ai/src/vision/` |
| HTTP endpoints (SSE streams, history, settings) | `core/api/src/ai/` |
| Chat panel UI | `apps/web/src/components/ai/` |

## Provider routing

The orchestrator selects a provider per request based on:

1. The task type (chat, structured tool call, vision, embedding).
2. The user's account-level preference (`PATCH /ai/settings`).
3. Live cost ceilings from `rate_limit/`. A provider that would exceed the per-account daily cap is skipped.

If no eligible provider is available, the API returns `503` and the panel surfaces an explicit message.

## Capabilities

The chat panel supports three kinds of operations:

- **Content drafting.** Generate copy for an existing section (headline, bullet list, CTA).
- **Structural actions.** Add, remove, or reorder sections through structured tool calls validated against the section schemas in `packages/shared`.
- **Visual review.** Send the current preview screenshot to a vision-capable model to get feedback on layout, contrast, or hierarchy.

Anything the AI proposes is staged as a draft action. The user sees the diff on the canvas and confirms or rejects before it is committed.

## API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/ai/chat` | SSE stream. Emits text deltas, tool calls, and proposed actions. |
| `GET` | `/ai/history` | Recent conversations for the authenticated account. |
| `GET` | `/ai/usage` | Per-account daily token and cost counters. |
| `GET` | `/ai/settings` | Provider and persona preferences. |
| `PATCH` | `/ai/settings` | Update provider and persona preferences. |

The SSE event types emitted by `/ai/chat` are defined in `core/ai/src/streaming/` (`MessageDelta`, `ToolCall`, `ActionProposed`, `ThinkingToken`, `InsightToken`, `Error`).

See [`../../development/api.md`](../../development/api.md) for the full Core API reference.

## Cost controls

- **Daily token cap per account**, enforced before each call (`rate_limit::daily_used`).
- **Per-request budget**, deduced from the chosen model and the prompt size.
- **Provider fallback**, only across providers the user has explicitly enabled.
- **Image generation** is gated behind an explicit feature flag and a stricter daily quota.

The intent is that an account on the free tier cannot generate uncapped cost on the operator's API keys.

## UX principles

- **Always reviewable.** No action is committed without a confirm step. The dashboard renders the diff before commit.
- **Streaming first.** All long-form responses stream so the UI never feels stuck on `loading`.
- **Quiet failures.** Provider errors and quota errors surface in-panel, not as toast banners.
- **Accessibility.** The chat panel supports keyboard navigation, screen-reader announcements for streamed tokens, and respects `prefers-reduced-motion` on the preview diff.

## Configuration

Set provider keys in `infra/.env.prod`:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

If neither is set, the AI panel is hidden from the UI and the endpoints return `503`.
