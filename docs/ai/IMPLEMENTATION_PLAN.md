# Plan d'Implémentation AI

> **Document**: IMPLEMENTATION_PLAN.md  
> **Parent**: [README.md](./README.md)  
> **Audience**: Tech Lead, Engineering Team

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Phase 1: Foundation (4 semaines)](#phase-1-foundation-4-semaines)
3. [Phase 2: Sections Library (3 semaines)](#phase-2-sections-library-3-semaines)
4. [Phase 3: Advanced AI (4 semaines)](#phase-3-advanced-ai-4-semaines)
5. [Phase 4: Premium Features (Ongoing)](#phase-4-premium-features-ongoing)
6. [Dependencies & Risks](#dependencies--risks)
7. [Definition of Done](#definition-of-done)
8. [Milestones & Checkpoints](#milestones--checkpoints)

---

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IMPLEMENTATION ROADMAP                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  JANVIER 2026              FÉVRIER 2026             MARS 2026               │
│  ══════════════════════   ══════════════════════   ════════════════════════ │
│                                                                              │
│  Week 1-2      Week 3-4    Week 5-7      Week 8     Week 9-12               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Phase 1a │  │ Phase 1b │  │ Phase 2  │  │ Phase 2  │  │  Phase 3     │   │
│  │ Backend  │─▶│ Actions  │─▶│ Sections │─▶│ Templates│─▶│  Advanced    │   │
│  │ Infra    │  │ System   │  │ Library  │  │          │  │              │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                              │
│  Deliverables:                                                               │
│  ✓ AI streaming        ✓ Live updates      ✓ +8 sections   ✓ Image gen    │
│  ✓ Multi-provider      ✓ Schema validation ✓ Variants      ✓ Inline AI    │
│  ✓ Rate limiting       ✓ Undo/Redo         ✓ Templates     ✓ Analyzer     │
│                                                                              │
│  Team:                                                                       │
│  👤 Backend Lead       👤 Full-stack       👤 Full-stack    👤 All hands   │
│  👤 Frontend Lead      👤 Backend          👤 Frontend                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Timeline Summary

| Phase | Duration | Start | End | Team Size |
|-------|----------|-------|-----|-----------|
| **Phase 1a: Backend Infrastructure** | 2 weeks | Jan 6 | Jan 17 | 2 devs |
| **Phase 1b: Actions System** | 2 weeks | Jan 20 | Jan 31 | 2 devs |
| **Phase 2: Sections Library** | 3 weeks | Feb 3 | Feb 21 | 2 devs |
| **Phase 3: Advanced AI** | 4 weeks | Feb 24 | Mar 21 | 3 devs |
| **Phase 4: Premium** | Ongoing | Mar 24 | - | 1-2 devs |

---

## Phase 1: Foundation (4 semaines)

### Phase 1a: Backend Infrastructure (Semaines 1-2)

**Objectif**: Infrastructure backend AI fonctionnelle avec streaming

#### Sprint 1 (Week 1) - Core Module

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Créer `core/ai/Cargo.toml` avec dependencies | Backend | 2h | P0 |
| Définir traits `AIProvider`, `AIOrchestrator` | Backend | 4h | P0 |
| Créer types `AIRequest`, `AIResponse`, `AIAction` | Backend | 3h | P0 |
| Implémenter OpenAI provider (chat completions) | Backend | 6h | P0 |
| Implémenter OpenAI streaming | Backend | 4h | P0 |
| Écrire tests unitaires provider | Backend | 3h | P0 |

**Deliverable**: Client OpenAI fonctionnel avec streaming

#### Sprint 2 (Week 2) - API & Rate Limiting

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Implémenter Anthropic provider | Backend | 4h | P0 |
| Créer Model Router avec fallback | Backend | 4h | P0 |
| Endpoint SSE `/api/v1/ai/chat/stream` | Backend | 6h | P0 |
| Rate Limiter Redis-based | Backend | 4h | P0 |
| Tests d'intégration streaming | Backend | 3h | P0 |
| Connecter Chat Panel au vrai endpoint | Frontend | 6h | P0 |
| Affichage streaming tokens | Frontend | 4h | P0 |
| Gestion erreurs et retry | Frontend | 3h | P1 |

**Deliverable**: Chat fonctionnel end-to-end avec streaming

#### Checklist Phase 1a

```markdown
## Definition of Done - Phase 1a

Backend:
- [ ] `core/ai` crate créé avec structure complète
- [ ] OpenAI provider avec chat + streaming
- [ ] Anthropic provider avec chat + streaming
- [ ] Model Router avec fallback chain
- [ ] SSE endpoint fonctionnel
- [ ] Rate limiting par plan (free: 20/day, pro: 200/day)
- [ ] Tests unitaires > 80% coverage
- [ ] Documentation API dans 03-API.md

Frontend:
- [ ] useAIChat hook connecté au vrai endpoint
- [ ] Streaming display token-by-token
- [ ] États visuels (sending, streaming, error)
- [ ] Retry logic sur erreur
- [ ] Tests composants

Integration:
- [ ] Test E2E: envoyer message → recevoir réponse streaming
- [ ] Test E2E: rate limit atteint → message d'erreur approprié
```

---

### Phase 1b: Actions System (Semaines 3-4)

**Objectif**: L'AI peut modifier le site en temps réel

#### Sprint 3 (Week 3) - Context & Parser

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| `ContextBuilder` avec website + sections | Backend | 6h | P0 |
| Injection des schemas dans le contexte | Backend | 4h | P0 |
| System prompt builder dynamique | Backend | 4h | P0 |
| Action parser (extract from AI response) | Backend | 6h | P0 |
| Validation actions contre schemas | Backend | 4h | P0 |
| Types actions frontend | Frontend | 2h | P0 |
| Action executor (apply to store) | Frontend | 6h | P0 |

**Deliverable**: Parser capable d'extraire et valider les actions AI

#### Sprint 4 (Week 4) - Executors & Undo

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Executor: `UPDATE_SECTION_PROPERTY` | Backend + API | 4h | P0 |
| Executor: `ADD_SECTION` | Backend + API | 4h | P0 |
| Executor: `REMOVE_SECTION` | Backend + API | 3h | P0 |
| Executor: `REORDER_SECTIONS` | Backend + API | 3h | P1 |
| Executor: `UPDATE_THEME` | Backend + API | 3h | P1 |
| Executor: `CHANGE_VARIANT` | Backend + API | 3h | P1 |
| Action history stack (undo support) | Frontend | 4h | P0 |
| Undo/Redo UI + keyboard shortcuts | Frontend | 3h | P0 |
| Action cards dans messages | Frontend | 3h | P1 |
| Preview refresh après action | Frontend | 4h | P0 |

**Deliverable**: Actions AI fonctionnelles avec undo/redo

#### Checklist Phase 1b

```markdown
## Definition of Done - Phase 1b

Backend:
- [ ] ContextBuilder complet (website, sections, theme, user)
- [ ] Schemas injectés dans le contexte AI
- [ ] System prompt dynamique selon le site
- [ ] Action parser robuste avec validation
- [ ] Tous les executors implémentés
- [ ] Tests pour chaque type d'action

Frontend:
- [ ] Action executor applique les changements au store
- [ ] Preview se rafraîchit après action
- [ ] Undo/Redo fonctionne (Cmd+Z / Cmd+Shift+Z)
- [ ] Action cards affichées dans les messages
- [ ] Animations de feedback

Integration:
- [ ] Test E2E: "Change le titre" → titre modifié
- [ ] Test E2E: "Ajoute une section FAQ" → section ajoutée
- [ ] Test E2E: Undo → retour état précédent
```

---

## Phase 2: Sections Library (3 semaines)

**Objectif**: Étoffer le catalogue de sections et ajouter les variantes

### Semaine 5-6: New Section Types

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Section `content` (3 variantes) | Full-stack | 8h | P0 |
| Section `about` (4 variantes) | Full-stack | 8h | P0 |
| Section `faq` (3 variantes) | Full-stack | 6h | P1 |
| Section `contact` (3 variantes) | Full-stack | 6h | P1 |
| Section `gallery` (3 variantes) | Full-stack | 6h | P1 |
| Section `stats` (3 variantes) | Full-stack | 4h | P1 |
| Section `logos` (3 variantes) | Full-stack | 4h | P1 |
| Section `blog-list` (3 variantes) | Full-stack | 6h | P2 |

**Format par section**:
1. Schema definition (`PropertySchema`)
2. React component dans `@asap/renderers`
3. Property editor registration
4. Default settings et variants
5. Tests visuels

### Semaine 7: Variants & Templates

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Variant system dans schemas | Backend | 4h | P0 |
| Variant picker UI dans Studio | Frontend | 6h | P0 |
| AI peut suggérer/changer variants | Backend | 3h | P1 |
| Migration `element_templates` table | Backend | 2h | P1 |
| API Element Templates (CRUD) | Backend | 6h | P1 |
| "Save as Template" UI | Frontend | 4h | P1 |
| User template library UI | Frontend | 6h | P1 |
| Apply template to new site | Full-stack | 4h | P1 |

#### Checklist Phase 2

```markdown
## Definition of Done - Phase 2

Sections:
- [ ] 8 nouveaux types de sections implémentés
- [ ] Chaque section a 3-4 variantes
- [ ] Tous les renderers dans @asap/renderers
- [ ] Property editors fonctionnels
- [ ] AI peut modifier toutes les propriétés

Variants:
- [ ] Variant picker dans Studio
- [ ] Changement de variante préserve le contenu
- [ ] AI peut suggérer la meilleure variante

Templates:
- [ ] Table `element_templates` créée
- [ ] API CRUD fonctionnelle
- [ ] UI "Save as Template"
- [ ] Template library visible pour Pro users
```

---

## Phase 3: Advanced AI (4 semaines)

**Objectif**: Features AI avancées et inline editing

### Semaine 8-9: Image Generation

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| DALL-E 3 provider integration | Backend | 4h | P0 |
| Endpoint `/api/v1/ai/generate/image` | Backend | 4h | P0 |
| Image prompt builder from context | Backend | 4h | P1 |
| Image picker UI (4 options) | Frontend | 6h | P0 |
| Auto-upload to cloud storage | Backend | 4h | P0 |
| Insert image into section | Full-stack | 3h | P0 |
| Background removal option | Backend | 3h | P2 |

### Semaine 10: Inline AI

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Text selection detection | Frontend | 3h | P0 |
| Inline AI menu popup | Frontend | 4h | P0 |
| Actions: Improve, Rewrite, Translate | Backend | 4h | P0 |
| Actions: Shorten, Expand | Backend | 3h | P0 |
| Keyboard shortcut (Cmd+J) | Frontend | 2h | P1 |
| Inline loading state | Frontend | 2h | P1 |

### Semaine 11: Content Generation & Analyzer

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Generate entire section content | Backend | 4h | P1 |
| Multiple tone options | Backend | 3h | P1 |
| Website Analyzer - Design score | Backend | 6h | P1 |
| Website Analyzer - SEO audit | Backend | 6h | P1 |
| Website Analyzer - Accessibility | Backend | 4h | P2 |
| Analyzer UI + recommendations | Frontend | 6h | P1 |

### Semaine 12: Smart Suggestions

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Proactive suggestions engine | Backend | 6h | P1 |
| Suggestions based on preset/industry | Backend | 4h | P1 |
| Suggestions UI cards | Frontend | 4h | P1 |
| Dismiss/learn from suggestions | Backend | 3h | P2 |
| Test coverage + polish | All | 8h | P0 |

#### Checklist Phase 3

```markdown
## Definition of Done - Phase 3

Image Generation:
- [ ] DALL-E 3 integration complete
- [ ] Image picker UI fonctionnel
- [ ] Images auto-uploaded to CDN
- [ ] Can insert generated images in sections

Inline AI:
- [ ] Text selection triggers AI menu
- [ ] All inline actions functional
- [ ] Keyboard shortcut works
- [ ] Smooth UX with loading states

Analyzer:
- [ ] Design, SEO, Accessibility scores
- [ ] Actionable recommendations
- [ ] One-click apply for suggestions

Smart Suggestions:
- [ ] Proactive suggestions appear
- [ ] Can dismiss or apply
- [ ] Based on site context
```

---

## Phase 4: Premium Features (Ongoing)

**Objectif**: Features différenciantes pour Business tier

### Voice Input (2 semaines)

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Whisper API integration | Backend | 4h | P1 |
| Push-to-talk UI | Frontend | 4h | P1 |
| Audio recording (Web Audio API) | Frontend | 4h | P1 |
| Voice command recognition | Backend | 6h | P2 |

### A/B Testing Integration (3 semaines)

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| AI generates variants | Backend | 6h | P2 |
| Traffic splitting system | Backend | 8h | P2 |
| Conversion tracking | Backend | 6h | P2 |
| Statistical significance | Backend | 4h | P2 |
| A/B Testing UI | Frontend | 8h | P2 |

### Community Marketplace (4 semaines)

| Task | Owner | Estimate | Priority |
|------|-------|----------|----------|
| Public element templates | Backend | 6h | P2 |
| Ratings & reviews system | Backend | 6h | P2 |
| Paid templates (Stripe) | Backend | 8h | P2 |
| Creator profiles | Full-stack | 8h | P2 |
| Marketplace UI | Frontend | 12h | P2 |

---

## Dependencies & Risks

### Technical Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPENDENCY GRAPH                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1a                Phase 1b              Phase 2          Phase 3     │
│  ┌──────────┐           ┌──────────┐          ┌──────────┐     ┌──────────┐│
│  │ OpenAI   │──────────▶│ Context  │─────────▶│ Variant  │────▶│ Image    ││
│  │ Provider │           │ Builder  │          │ System   │     │ Gen      ││
│  └──────────┘           └──────────┘          └──────────┘     └──────────┘│
│       │                      │                     │                        │
│       ▼                      ▼                     ▼                        │
│  ┌──────────┐           ┌──────────┐          ┌──────────┐     ┌──────────┐│
│  │ SSE      │──────────▶│ Action   │─────────▶│ New      │────▶│ Inline   ││
│  │ Endpoint │           │ Executors│          │ Sections │     │ AI       ││
│  └──────────┘           └──────────┘          └──────────┘     └──────────┘│
│       │                      │                                              │
│       ▼                      ▼                                              │
│  ┌──────────┐           ┌──────────┐                                       │
│  │ Chat     │──────────▶│ Undo/    │                                       │
│  │ Panel    │           │ Redo     │                                       │
│  └──────────┘           └──────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### External Dependencies

| Dependency | Risk | Mitigation |
|------------|------|------------|
| OpenAI API | Medium (outages) | Anthropic fallback |
| Anthropic API | Low | OpenAI fallback |
| DALL-E 3 | Medium (rate limits) | Stable Diffusion self-hosted |
| Redis | Low (stable) | Local cache fallback |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **API cost overrun** | Medium | High | Hard caps, monitoring, alerts |
| **Hallucinations** | High | Medium | Schema validation, preview |
| **Latency issues** | Medium | Medium | Caching, model routing |
| **Team bandwidth** | Medium | High | Prioritization, MVP scope |

---

## Definition of Done

### For All Features

```markdown
## General DoD

Code Quality:
- [ ] Code reviewed and approved
- [ ] Tests written (unit + integration)
- [ ] No TypeScript/Rust errors
- [ ] Linting passes

Documentation:
- [ ] API documented in 03-API.md
- [ ] README updated if needed
- [ ] Inline code comments

Security:
- [ ] No PII to external APIs
- [ ] Rate limiting in place
- [ ] Input sanitization

UX:
- [ ] Loading states
- [ ] Error handling with user-friendly messages
- [ ] Undo support where applicable
- [ ] Accessible (keyboard, screen reader)

Deployment:
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tests pass
```

---

## Milestones & Checkpoints

### Weekly Checkpoints

| Date | Milestone | Success Criteria |
|------|-----------|------------------|
| **Jan 10** | Phase 1a - Mid | OpenAI streaming works locally |
| **Jan 17** | Phase 1a - Complete | Chat end-to-end functional |
| **Jan 24** | Phase 1b - Mid | Actions parse and validate |
| **Jan 31** | Phase 1b - Complete | AI can modify site, undo works |
| **Feb 14** | Phase 2 - Mid | 4 new sections deployed |
| **Feb 21** | Phase 2 - Complete | All sections + variants + templates |
| **Mar 7** | Phase 3 - Mid | Image gen + inline AI |
| **Mar 21** | Phase 3 - Complete | Analyzer + suggestions |

### Demo Schedule

| Date | Demo Content | Audience |
|------|--------------|----------|
| Jan 17 | Basic chat streaming | Internal team |
| Jan 31 | Full action system + undo | Stakeholders |
| Feb 21 | Sections library + templates | Beta users |
| Mar 21 | Full AI experience | Public launch |

### Go/No-Go Criteria

```markdown
## Launch Checklist

Technical:
- [ ] All P0 features complete
- [ ] Error rate < 1%
- [ ] P95 latency < 3s
- [ ] Rate limiting tested

Business:
- [ ] Pricing finalized
- [ ] Fair use policy published
- [ ] Support documentation ready

Marketing:
- [ ] Landing page updated
- [ ] Email campaign ready
- [ ] Social media posts scheduled
```

---

## Appendix: Task Templates

### New Section Template

```markdown
## Section: [NAME]

### Schema
- Properties: [list]
- Variants: [list]
- Default settings: [object]

### Files to Create/Modify
- [ ] `packages/renderers/src/sections/[name].tsx`
- [ ] `packages/shared/src/schemas/[name].ts`
- [ ] `apps/web/src/components/studio/section-editor/[name]-editor.tsx`

### Test Cases
- [ ] Renders correctly with default settings
- [ ] All variants render correctly
- [ ] Property changes reflect immediately
- [ ] Works in preview iframe
- [ ] AI can modify properties
```

### New API Endpoint Template

```markdown
## Endpoint: [METHOD] /api/v1/[path]

### Request
- Headers: [list]
- Body: [schema]

### Response
- Success: [schema]
- Errors: [list]

### Files to Create/Modify
- [ ] `apps/api/src/routes/[module].rs`
- [ ] `core/[domain]/src/[handler].rs`
- [ ] `packages/shared/src/types/[type].ts`

### Tests
- [ ] Unit test for handler
- [ ] Integration test for endpoint
- [ ] Frontend hook test
```

---

## Voir Aussi

- [README.md](./README.md) - Overview
- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - Technical details
- [02-FEATURES.md](./02-FEATURES.md) - Feature specs
- [03-API.md](./03-API.md) - API reference
- [04-SECURITY.md](./04-SECURITY.md) - Security & pricing
- [05-UX.md](./05-UX.md) - UX guidelines
