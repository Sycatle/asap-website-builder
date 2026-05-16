# Architecture Decision Records

This folder records significant architectural choices for ASAP. Each entry follows a lightweight ADR (Architecture Decision Record) format: context, decision, consequences. Append-only — supersede an ADR with a new one rather than rewriting history.

When you propose a change that alters a public API, the data model, or a foundational pattern, open an ADR PR before or alongside the implementation.

---

## ADR-0001 — Backend stack: Rust (Axum) + PostgreSQL

**Date:** 2025-12-08  
**Status:** Accepted

### Context
We need a backend that handles multi-tenant data, exposes an HTTP API, and runs asynchronous jobs. Performance, memory safety, and long-term maintenance cost matter.

### Decision
Use **Rust** with the **Axum** framework for the HTTP API. Use **PostgreSQL** as the primary database, accessed through **SQLx**.

### Alternatives considered
- **Node.js (Fastify / NestJS).** Higher productivity, weaker memory guarantees, heavier per-request CPU.
- **PHP (Laravel).** Familiar, but execution model fits less well with long-running async work.
- **Go.** Simple and performant, but a less expressive type system.

### Rationale
Rust gives native performance, memory safety, and a mature async ecosystem (Axum, SQLx, Tokio). PostgreSQL is ACID, supports JSONB and row-level security, and is well understood at the operational level.

### Consequences
- + Excellent runtime performance and low memory footprint.
- + Strong compile-time guarantees reduce a class of production bugs.
- − Rust expertise required to contribute to the core.
- − Slower initial iteration speed compared to a JS/TS backend.

---

## ADR-0002 — CQRS-lite reads via local projections

**Date:** 2025-12-08  
**Status:** Accepted

### Context
The public site renderer (`apps/sites`) may serve many sites per second. Reading directly from PostgreSQL on every page load couples public latency to authoring-side write load.

### Decision
Adopt a lightweight CQRS pattern. Writes go to PostgreSQL. The worker generates **per-site projections** (JSON / SQLite) that `apps/sites` reads to render published pages.

### Alternatives considered
- **Direct PostgreSQL reads on the public path.** Simpler, but couples public latency to authoring load.
- **Redis cache in front of the API.** Fast, but invalidation is complex and Redis is not the source of truth.

### Rationale
File-based projections give near-instant TTFB without an extra service in the public request path and they make a future move to an edge store (Turso, D1) or a CDN straightforward.

### Consequences
- + Public TTFB stays low without a CDN.
- + Read scaling is decoupled from write load.
- − One more component to operate (worker projection pipeline).
- − Two states to reason about when debugging: row in Postgres vs. projection on disk.

---

## ADR-0003 — Single monorepo with BSL-licensed source

**Date:** 2025-12-08  
**Superseded by ADR-0004:** the open-core split has been dropped in favor of a single license.

### Context
We wanted to ship public source code while protecting the commercial hosting business.

### Decision (historical)
Keep everything in one monorepo and originally split it into an open-source `core/` and a private `modules/` directory.

### Outcome
The `modules/` split was removed before public release. The repository ships under a single license (see ADR-0004) instead of mixing OSS and proprietary code in the same tree.

---

## ADR-0004 — License: Business Source License 1.1 → Apache 2.0

**Date:** 2026-05-16  
**Status:** Accepted

### Context
The repository is public. We need a license that signals "source-available" while protecting the commercial offering on `asap.cool` for a reasonable runway.

### Decision
License the entire repository under the **Business Source License 1.1**. Change Date: **2030-05-16**. Change License: **Apache License 2.0**. Additional Use Grant: any production use that is not a competing hosted website-builder service.

### Alternatives considered
- **MIT / Apache-2.0.** Maximum adoption, but allows a hyperscaler to re-host the project as a competitor.
- **Open-core split.** Adds two licenses, two enforcement boundaries, and operational overhead for a single-maintainer project.
- **Elastic License 2.0.** Similar protection but less developer-friendly perception than BSL.

### Rationale
BSL is well understood (HashiCorp, MariaDB, Sentry). The automatic Apache 2.0 conversion after four years gives a hard commitment to eventually-open code while protecting the commercial runway.

### Consequences
- + Public-facing source for review, audit, and self-hosting.
- + The hosted SaaS retains a meaningful commercial moat for four years.
- − Not OSI-approved during the BSL window — some communities and companies will treat it as proprietary.

---

## Template for new ADRs

Copy `template.md` (TODO) or follow this skeleton:

```markdown
## ADR-NNNN — <title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Superseded by ADR-XXXX

### Context

### Decision

### Alternatives considered

### Rationale

### Consequences
```
