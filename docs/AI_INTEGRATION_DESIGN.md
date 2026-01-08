# ASAP AI Integration - Technical Design Document

> **⚠️ Ce document a été découpé en modules pour une meilleure lisibilité.**
>
> **Voir le dossier [`docs/ai/`](./ai/README.md) pour la documentation complète.**

---

## 📚 Structure de la Documentation

| Document | Description |
|----------|-------------|
| [📖 README.md](./ai/README.md) | Vue d'ensemble et index |
| [🏗️ 01-ARCHITECTURE.md](./ai/01-ARCHITECTURE.md) | Architecture technique, providers, infrastructure |
| [✨ 02-FEATURES.md](./ai/02-FEATURES.md) | Fonctionnalités AI (Tier 1, 2, 3) |
| [🔌 03-API.md](./ai/03-API.md) | API Design, endpoints, streaming |
| [🔒 04-SECURITY.md](./ai/04-SECURITY.md) | Sécurité, rate limiting, pricing |
| [🎨 05-UX.md](./ai/05-UX.md) | Guidelines UX/UI, chat panel |
| [📋 IMPLEMENTATION_PLAN.md](./ai/IMPLEMENTATION_PLAN.md) | **Plan d'implémentation avec sprints** |

---

## 🚀 Quick Start

### Pour les développeurs

1. **Nouveau sur le projet?** → [README.md](./ai/README.md)
2. **Backend?** → [01-ARCHITECTURE.md](./ai/01-ARCHITECTURE.md) → [03-API.md](./ai/03-API.md)
3. **Frontend?** → [05-UX.md](./ai/05-UX.md) → [03-API.md](./ai/03-API.md)

### Pour le Tech Lead

→ **[IMPLEMENTATION_PLAN.md](./ai/IMPLEMENTATION_PLAN.md)** directement

---

## 📈 État du Projet

| Phase | Status | Timeline |
|-------|--------|----------|
| Phase 1: Foundation | 🔜 À démarrer | Jan 2026 |
| Phase 2: Sections Library | ⏳ Planifié | Fév 2026 |
| Phase 3: Advanced AI | ⏳ Planifié | Mar 2026 |
| Phase 4: Premium | ⏳ Planifié | Q2 2026+ |

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jan 2026 | Split en modules, ajout plan d'implémentation |
| 1.0 | Jan 2026 | Document initial monolithique |

---

# Archive (Ancien Document Monolithique)

> Les sections ci-dessous sont conservées pour référence historique.
> **Utilisez les documents dans `docs/ai/` pour la version à jour.**

---

## Executive Summary (Archive)

L'intégration d'une IA conversationnelle dans ASAP vise à transformer radicalement l'expérience de création de sites web. Au lieu d'interfaces traditionnelles point-and-click, les utilisateurs pourront :

- **Décrire** ce qu'ils veulent en langage naturel
- **Voir** les modifications en temps réel sur leur site
- **Itérer** par conversation jusqu'au résultat souhaité
- **Apprendre** les bonnes pratiques web via l'assistant

L'objectif est de rendre la création de sites professionnels accessible à tous, tout en offrant aux utilisateurs avancés un outil de productivité puissant.

---

## Analyse de l'Écosystème Existant

### Vue d'Ensemble de l'Architecture Actuelle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASAP ARCHITECTURE V1                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  websites           │ Core metadata (slug, title, status, preset)   │   │
│  │  website_data       │ JSONB extensible (profile, theme, SEO)        │   │
│  │  website_sections   │ Blocs modulaires (hero, features, pricing...) │   │
│  │  website_collections│ Données typées des extensions (repos, posts)  │   │
│  │  website_variables  │ Variables dynamiques (manual/computed)        │   │
│  │  website_extensions │ Extensions activées par site                  │   │
│  │  presets            │ Templates prédéfinis avec config complète     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RENDERING LAYER                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  @asap/renderers    │ Single Source of Truth pour le rendu          │   │
│  │  - Schema-driven    │ Chaque section a un PropertySchema            │   │
│  │  - Type-safe        │ Types partagés via @asap/shared               │   │
│  │  - Composable       │ Composants UI réutilisables                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     EDITING LAYER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Studio             │ AI-first editor avec preview live             │   │
│  │  Property Editors   │ UI générée depuis les schemas                 │   │
│  │  Data Binding       │ Connection sections ↔ collections/variables   │   │
│  │  AI Chat Panel      │ Interface conversationnelle (scaffold only)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     EXTENSIONS LAYER                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ExtensionExecutor  │ Trait Rust pour logique backend               │   │
│  │  extension.toml     │ Config déclarative (fields, settings)         │   │
│  │  github-sync        │ Seule extension implémentée (génère content)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sections Existantes

| Type | Catégorie | Status | Description |
|------|-----------|--------|-------------|
| `hero` | SaaS/Landing | ✅ Active | Hero section avec headline, CTA |
| `features` | SaaS/Landing | ✅ Active | Grid de features avec icônes |
| `how-it-works` | SaaS/Landing | ✅ Active | Steps/process flow |
| `pricing` | SaaS/Landing | ✅ Active | Plans tarifaires |
| `testimonials` | SaaS/Landing | ✅ Active | Témoignages clients |
| `cta` | SaaS/Landing | ✅ Active | Call to action |
| `navigation` | Global | ✅ Active | Header navigation |
| `footer` | Global | ✅ Active | Footer avec liens |
| `about` | Portfolio | 🔒 Frozen | À propos (legacy) |
| `projects` | Portfolio | 🔒 Frozen | Liste projets (legacy) |
| `skills` | Portfolio | 🔒 Frozen | Compétences (legacy) |
| `contact` | Portfolio | 🔒 Frozen | Formulaire contact (legacy) |

### System de Schemas

Chaque section est définie par un **PropertySchema** :

```typescript
// Exemple: HERO_SCHEMA
export const HERO_SCHEMA: SectionSchema = {
  type: 'hero',
  name: 'Hero Section',
  description: 'Main hero banner with headline and CTA',
  defaultSettings: {
    headline_line1: 'Build faster',
    headline_line2: 'Ship sooner',
    subheadline: 'The modern way to build websites',
    cta_primary_text: 'Get Started',
    cta_primary_url: '/signup',
    cta_secondary_text: 'Learn More',
    show_secondary_cta: true,
  },
  properties: [
    { key: 'headline_line1', type: 'text', label: 'Headline Line 1', group: 'content' },
    { key: 'headline_line2', type: 'text', label: 'Headline Line 2', group: 'content' },
    { key: 'subheadline', type: 'textarea', label: 'Subheadline', group: 'content' },
    { key: 'cta_primary_text', type: 'text', label: 'Primary CTA', group: 'cta' },
    { key: 'cta_primary_url', type: 'url', label: 'Primary CTA URL', group: 'cta' },
    { key: 'show_secondary_cta', type: 'boolean', label: 'Show Secondary CTA', group: 'cta' },
    // ...
  ],
};
```

### Points Forts de l'Architecture

| Aspect | Implementation | Avantage pour AI |
|--------|----------------|------------------|
| **Schema-driven** | PropertySchema pour chaque section | Prompt structuré, validation auto |
| **Single Source of Truth** | @asap/renderers | Modification = même résultat partout |
| **JSONB flexible** | website_data, settings | Extensible sans migration |
| **Collections typées** | website_collections | Contexte riche pour personnalisation |
| **Variables** | website_variables | Templating dynamique |

### Limitations Actuelles

| Limitation | Impact | Priorité Fix |
|------------|--------|--------------|
| Sections Portfolio frozen | Pas de portfolio moderne | 🟡 Medium |
| Pas de sections custom | Limité aux types prédéfinis | 🔴 Voir analyse ci-dessous |
| AI Chat = mock | Aucune génération réelle | 🟢 High (ce doc) |
| Pas de WebSocket | Pas de streaming temps réel | 🟢 High |
| Inline editing absent | UX moins fluide | 🟡 Medium |

---

## Décisions Architecturales Fondamentales

### ⚡ Question 1: Composants Custom en Code vs Templates Only ?

Cette décision est **structurante** pour l'avenir de la plateforme. Analysons les options :

#### Option A: Templates Only (No-Code Pure)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TEMPLATES ONLY APPROACH                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Utilisateur                                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Presets   │ ──▶ │  Sections   │ ──▶ │  Renderer   │                   │
│  │  (Template) │     │ Prédéfinies │     │   Fixe      │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                              │
│  ✅ Avantages:                           ❌ Inconvénients:                  │
│  • UX ultra-simple                       • Limité aux sections existantes   │
│  • Cohérence garantie                    • Pas de différenciation           │
│  • Maintenance facile                    • Frustration users avancés        │
│  • AI peut tout contrôler                • Dépendance totale ASAP           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Option B: Code Components (Low-Code/Pro)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CODE COMPONENTS APPROACH                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Utilisateur Pro                                                             │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   IDE/Code  │ ──▶ │  Custom     │ ──▶ │  Runtime    │                   │
│  │   Editor    │     │ Components  │     │  Sandbox    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                              │
│  ✅ Avantages:                           ❌ Inconvénients:                  │
│  • Flexibilité totale                    • Complexité UX                    │
│  • Différenciation                       • Sécurité (XSS, sandbox)          │
│  • Attire les devs                       • Performance (runtime)            │
│  • Marketplace possible                  • Support/debug difficile          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Option C: Hybrid Approach (Recommandée) ⭐

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HYBRID APPROACH (RECOMMENDED)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 1: No-Code (Tous utilisateurs)                                   │ │
│  │                                                                        │ │
│  │  Presets ──▶ Sections Standard ──▶ Property Editors ──▶ AI Assist    │ │
│  │                                                                        │ │
│  │  • 30+ sections prédéfinies couvrant 95% des besoins                 │ │
│  │  • Variantes par section (layout, style)                              │ │
│  │  • AI peut modifier toutes les propriétés                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 2: Element Library (Pro Users)                                   │ │
│  │                                                                        │ │
│  │  Section Standard ──▶ "Save as Template" ──▶ User Library            │ │
│  │                                                                        │ │
│  │  • Sauvegarde de sections configurées                                 │ │
│  │  • Partage entre sites du même compte                                 │ │
│  │  • Export/Import JSON                                                 │ │
│  │  • PAS de code custom, juste des configurations                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 3: Code Blocks (Business/Enterprise) - FUTURE V3                 │ │
│  │                                                                        │ │
│  │  Custom HTML/CSS ──▶ Sandboxed Iframe ──▶ Limited Interop            │ │
│  │                                                                        │ │
│  │  • Section "custom" avec HTML/CSS/JS isolé                            │ │
│  │  • Sandbox strict (CSP, iframe sandbox)                               │ │
│  │  • Pas d'accès aux données du site                                    │ │
│  │  • Cas d'usage: widgets tiers, animations custom                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 📋 Décision Recommandée

| Tier | Timeline | Scope |
|------|----------|-------|
| **Tier 1: No-Code** | V1 (maintenant) | Focus total, 30+ sections |
| **Tier 2: Element Library** | V2 (Q2 2026) | Save/reuse configurations |
| **Tier 3: Code Blocks** | V3 (Q4 2026) | Sandboxed custom HTML |

**Justification** :
1. **80/20 Rule** : 95% des utilisateurs n'ont pas besoin de code custom
2. **AI-First** : Le code custom rend l'AI moins efficace
3. **Maintenabilité** : Sections standard = bugs prévisibles
4. **Business Model** : L'Element Library devient un feature Pro

---

### ⚡ Question 2: Bibliothèque d'Éléments Personnalisés ?

#### Modèle Proposé: User Element Library

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER ELEMENT LIBRARY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM ELEMENTS (Read-Only, Managed by ASAP)                          │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │  Hero   │ │Features │ │ Pricing │ │Testimon.│ │  CTA    │        │ │
│  │  │ (5 var) │ │ (3 var) │ │ (2 var) │ │ (4 var) │ │ (3 var) │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  │                                                                        │ │
│  │  [Standard] [Standard] [Standard] [Standard] [Standard]               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ USER ELEMENTS (Pro Feature)                                           │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │  My Hero Style  │ │  FAQ Corporate  │ │  Footer Brand   │         │ │
│  │  │  (saved config) │ │  (saved config) │ │  (saved config) │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  │                                                                        │ │
│  │  [Custom] [Custom] [Custom]                                           │ │
│  │                                                                        │ │
│  │  Actions: Edit | Duplicate | Export | Delete                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ COMMUNITY ELEMENTS (Future: Marketplace)                              │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │  Agency Hero    │ │  SaaS Pricing   │ │  Startup FAQ    │         │ │
│  │  │  by @designer   │ │  by @templates  │ │  by @founder    │         │ │
│  │  │  ⭐ 4.8 (234)   │ │  ⭐ 4.9 (567)   │ │  ⭐ 4.7 (123)   │         │ │
│  │  │  FREE           │ │  $5             │ │  FREE           │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  │                                                                        │ │
│  │  [Community] [Community] [Community]                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Schema de Stockage

```sql
-- Nouvelle table: element_templates
CREATE TABLE element_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),  -- NULL = system template
    
    -- Metadata
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Base section info
    element_type VARCHAR(50) NOT NULL,  -- 'hero', 'features', etc.
    variant VARCHAR(50),                 -- 'centered', 'split', etc.
    
    -- Configuration snapshot
    settings JSONB NOT NULL,             -- Property values
    styles JSONB,                        -- Custom style overrides
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'private',  -- 'private', 'public', 'marketplace'
    
    -- Stats (for marketplace)
    usage_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(2,1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's templates
CREATE INDEX idx_element_templates_account ON element_templates(account_id);
CREATE INDEX idx_element_templates_type ON element_templates(element_type);
```

#### API

```yaml
# Element Templates API
GET    /api/v1/element-templates          # List user's templates
POST   /api/v1/element-templates          # Create from section
GET    /api/v1/element-templates/:id      # Get template details
PUT    /api/v1/element-templates/:id      # Update template
DELETE /api/v1/element-templates/:id      # Delete template

# Apply template to site
POST   /api/v1/websites/:id/sections/from-template
  body: { template_id: uuid, position: number }
```

---

### ⚡ Question 3: Section Variants vs Sections Séparées ?

#### Approche Recommandée: Variants

```typescript
// Un type de section avec plusieurs variantes visuelles
interface SectionSchema {
  type: 'hero';
  variants: [
    {
      id: 'centered',
      name: 'Centered',
      preview: '/previews/hero-centered.png',
      defaultSettings: { /* ... */ },
    },
    {
      id: 'split-image-right',
      name: 'Split with Image',
      preview: '/previews/hero-split.png',
      defaultSettings: { /* ... */ },
    },
    {
      id: 'video-background',
      name: 'Video Background',
      preview: '/previews/hero-video.png',
      defaultSettings: { /* ... */ },
    },
  ];
  // Properties communes à toutes les variantes
  properties: PropertySchema[];
}
```

**Avantages** :
- Moins de sections dans le catalogue (UX cleaner)
- Changement de variante sans perdre le contenu
- AI peut suggérer la meilleure variante
- Maintenance centralisée

---

### 📊 Mapping Sections Nécessaires

Basé sur l'analyse des besoins, voici les sections à développer :

| Catégorie | Section | Variantes | Priorité | Status |
|-----------|---------|-----------|----------|--------|
| **Navigation** | `navigation` | header, header-transparent, sidebar | 🟢 P0 | ✅ Done |
| **Hero** | `hero` | centered, split, video, animated | 🟢 P0 | ✅ Done |
| **Features** | `features` | grid, list, alternating, icons | 🟢 P0 | ✅ Done |
| **Content** | `content` | text, text-image, columns | 🟢 P0 | 🔄 TODO |
| **About** | `about` | team, story, values, timeline | 🟢 P0 | 🔄 TODO |
| **Pricing** | `pricing` | cards, table, toggle-annual | 🟡 P1 | ✅ Done |
| **Testimonials** | `testimonials` | carousel, grid, single-feature | 🟡 P1 | ✅ Done |
| **FAQ** | `faq` | accordion, two-column, search | 🟡 P1 | 🔄 TODO |
| **CTA** | `cta` | simple, split, newsletter | 🟡 P1 | ✅ Done |
| **Contact** | `contact` | form, info-map, split | 🟡 P1 | 🔄 TODO |
| **Gallery** | `gallery` | grid, masonry, lightbox | 🟡 P1 | 🔄 TODO |
| **Stats** | `stats` | counters, progress, icons | 🟡 P1 | 🔄 TODO |
| **Logos** | `logos` | strip, grid, animated | 🟡 P1 | 🔄 TODO |
| **Blog** | `blog-list` | grid, list, featured | 🔴 P2 | 🔄 TODO |
| **Portfolio** | `portfolio` | grid, case-study | 🔴 P2 | 🔄 TODO |
| **Footer** | `footer` | simple, columns, mega | 🟢 P0 | ✅ Done |

**Total: 16 types de sections × 3-4 variantes = ~50-60 options**

---

## Intégration AI avec l'Architecture Existante

### Comment l'AI Interagit avec les Schemas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI ↔ SCHEMA INTERACTION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: "Change the headline to 'Welcome to the future'"                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. AI UNDERSTANDS INTENT                                            │   │
│  │    - Action: UPDATE_PROPERTY                                        │   │
│  │    - Target: hero section                                           │   │
│  │    - Property: headline_line1                                       │   │
│  │    - Value: "Welcome to the future"                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. SCHEMA VALIDATION                                                │   │
│  │    - Property exists? ✓ (HERO_SCHEMA.properties)                   │   │
│  │    - Type match? ✓ (string)                                        │   │
│  │    - Constraints? ✓ (max 100 chars)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. API CALL                                                         │   │
│  │    PATCH /api/v1/websites/:id/sections/:section_id                  │   │
│  │    { settings: { headline_line1: "Welcome to the future" } }        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. LIVE PREVIEW UPDATE (WebSocket)                                  │   │
│  │    Preview refreshes with new headline                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Context Builder - Ce que l'AI Reçoit

```typescript
interface AIContext {
  // Website metadata
  website: {
    id: string;
    slug: string;
    title: string;
    preset: string;
    createdAt: Date;
  };
  
  // Current structure with schemas
  sections: Array<{
    id: string;
    type: SectionType;
    variant: string;
    position: number;
    settings: Record<string, unknown>;
    // Schema info for AI understanding
    schema: {
      properties: PropertySchema[];
      editableFields: string[];
      constraints: Record<string, Constraint>;
    };
  }>;
  
  // Theme info
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    fonts: { heading: string; body: string };
  };
  
  // Collections data (from extensions)
  collections: {
    github_repos?: Array<{ name: string; description: string; stars: number }>;
    blog_posts?: Array<{ title: string; excerpt: string }>;
  };
  
  // Variables
  variables: Record<string, unknown>;
  
  // User context
  user: {
    name: string;
    industry?: string;
    plan: 'free' | 'pro' | 'business';
  };
}
```

### AI Actions Typées

```typescript
// Union type de toutes les actions possibles
type AIAction =
  | { type: 'UPDATE_SECTION_PROPERTY'; sectionId: string; property: string; value: unknown }
  | { type: 'ADD_SECTION'; sectionType: string; variant: string; position: number; settings?: Record<string, unknown> }
  | { type: 'REMOVE_SECTION'; sectionId: string }
  | { type: 'REORDER_SECTIONS'; order: string[] }
  | { type: 'CHANGE_VARIANT'; sectionId: string; newVariant: string }
  | { type: 'UPDATE_THEME'; changes: Partial<ThemeConfig> }
  | { type: 'GENERATE_CONTENT'; target: 'section' | 'page'; context: string }
  | { type: 'SAVE_AS_TEMPLATE'; sectionId: string; name: string };

// Validation avant exécution
function validateAction(action: AIAction, context: AIContext): ValidationResult {
  switch (action.type) {
    case 'UPDATE_SECTION_PROPERTY':
      const section = context.sections.find(s => s.id === action.sectionId);
      if (!section) return { valid: false, error: 'Section not found' };
      
      const property = section.schema.properties.find(p => p.key === action.property);
      if (!property) return { valid: false, error: 'Property not in schema' };
      
      // Type validation
      if (!validateType(action.value, property.type)) {
        return { valid: false, error: `Expected ${property.type}` };
      }
      
      return { valid: true };
    // ...
  }
}
```

---

## Vision & Objectifs

### Vision

> "Créer un site web devrait être aussi simple qu'avoir une conversation."

### Objectifs Business

| Objectif | Métrique | Target |
|----------|----------|--------|
| Réduire le temps de création | Temps moyen de création d'un site | -60% |
| Augmenter la rétention | Taux de rétention J30 | +25% |
| Différenciation marché | NPS score | > 60 |
| Monétisation | Conversion Free → Pro via AI features | > 15% |

### Objectifs Techniques

1. **Latence** : Réponse streaming < 500ms pour premier token
2. **Fiabilité** : 99.9% uptime sur les fonctionnalités AI
3. **Scalabilité** : Support de 10k requêtes AI simultanées
4. **Précision** : > 90% de modifications correctes du premier coup

---

## Architecture Technique

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Astro)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  AI Chat Panel  │  │  Studio Editor  │  │  Preview (Live Updates)     │ │
│  │  - Conversation │  │  - Visual Edit  │  │  - Iframe / Live Preview    │ │
│  │  - Voice Input  │  │  - AI Suggestions│  │  - Optimistic Updates      │ │
│  │  - Quick Actions│  │  - Inline AI    │  │  - Rollback Support        │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘ │
│           │                    │                          │                 │
│           └────────────────────┼──────────────────────────┘                 │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │   WebSocket / SSE      │                               │
│                    │   (Real-time Stream)   │                               │
│                    └───────────┬───────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      API Gateway        │
                    │   (Rate Limiting, Auth) │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│                           BACKEND (Rust/Axum)                               │
├────────────────────────────────┼────────────────────────────────────────────┤
│                    ┌───────────▼───────────┐                               │
│                    │    AI Orchestrator    │                               │
│                    │  - Request Routing    │                               │
│                    │  - Context Building   │                               │
│                    │  - Response Parsing   │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│    ┌───────────────────────────┼───────────────────────────────┐           │
│    │                           │                               │           │
│    ▼                           ▼                               ▼           │
│ ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐      │
│ │ Text Gen     │    │ Code Generation  │    │ Image Generation     │      │
│ │ - Chat       │    │ - HTML/CSS       │    │ - Illustrations      │      │
│ │ - Suggestions│    │ - Components     │    │ - Backgrounds        │      │
│ │ - Analysis   │    │ - Animations     │    │ - Avatars            │      │
│ └──────┬───────┘    └────────┬─────────┘    └──────────┬───────────┘      │
│        │                     │                         │                   │
│        └─────────────────────┼─────────────────────────┘                   │
│                              │                                             │
│                    ┌─────────▼─────────┐                                  │
│                    │   Model Router    │                                  │
│                    │  - Cost Optimize  │                                  │
│                    │  - Fallback Chain │                                  │
│                    └─────────┬─────────┘                                  │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ OpenAI   │        │ Anthropic│        │ Local    │
    │ GPT-4o   │        │ Claude   │        │ Ollama   │
    └──────────┘        └──────────┘        └──────────┘
```

### Composants Clés

#### 1. AI Orchestrator (Core)

Responsable de :
- Routing des requêtes vers le bon modèle
- Construction du contexte (website data, user preferences, history)
- Parsing et validation des réponses AI
- Gestion des retries et fallbacks

```rust
// core/ai/src/orchestrator.rs
pub struct AIOrchestrator {
    providers: HashMap<String, Box<dyn AIProvider>>,
    context_builder: ContextBuilder,
    response_parser: ResponseParser,
    rate_limiter: RateLimiter,
}

impl AIOrchestrator {
    pub async fn process_request(
        &self,
        request: AIRequest,
        website_context: WebsiteContext,
        user_context: UserContext,
    ) -> Result<AIResponse, AIError> {
        // 1. Build full context
        let context = self.context_builder.build(website_context, user_context)?;
        
        // 2. Select appropriate model
        let model = self.select_model(&request)?;
        
        // 3. Execute with streaming
        let stream = self.providers[&model].stream(request, context).await?;
        
        // 4. Parse and validate response
        self.response_parser.parse(stream).await
    }
}
```

#### 2. Context Builder

Construit le contexte envoyé à l'IA pour des réponses pertinentes :

```rust
pub struct WebsiteContext {
    // Structure du site
    pub sections: Vec<SectionContext>,
    pub theme: ThemeContext,
    pub navigation: NavigationContext,
    
    // Contenu
    pub texts: HashMap<String, String>,
    pub images: Vec<ImageMeta>,
    
    // Metadata
    pub domain: String,
    pub industry: Option<String>,
    pub target_audience: Option<String>,
}

pub struct SectionContext {
    pub id: Uuid,
    pub section_type: SectionType,
    pub position: u32,
    pub content: serde_json::Value,
    pub styles: StyleOverrides,
}
```

---

## Fonctionnalités AI

### Tier 1: Core Features (MVP)

#### 1.1 Conversation Naturelle

L'utilisateur peut décrire ses besoins en langage naturel :

```
User: "Je voudrais un site pour mon restaurant italien à Paris"

AI: "Parfait ! Je vais créer un site élégant pour votre restaurant italien. 
     Voici ce que je propose :
     
     🏠 Page d'accueil avec :
     - Hero avec photo ambiance italienne
     - Section menu du jour
     - Horaires et localisation
     
     📍 Informations :
     - Quel est le nom de votre restaurant ?
     - Avez-vous des photos à utiliser ?"
```

#### 1.2 Modifications en Temps Réel

```
User: "Change le titre en 'Bienvenue chez Mario'"

AI: [Modifie le titre en temps réel dans le preview]
    "✓ J'ai mis à jour le titre. Que pensez-vous de cette police ?"
```

#### 1.3 Suggestions Contextuelles

L'IA analyse le site et propose des améliorations :

```
AI: "💡 J'ai remarqué que votre section 'À propos' est un peu courte.
     Voulez-vous que je vous aide à l'enrichir ?
     
     Suggestions :
     • Ajouter l'histoire du restaurant
     • Présenter le chef
     • Mettre en avant vos valeurs"
```

### Tier 2: Advanced Features

#### 2.1 Génération de Contenu

| Feature | Description | Modèle |
|---------|-------------|--------|
| **Copywriting** | Génération de textes marketing | GPT-4 / Claude |
| **SEO Content** | Méta descriptions, titres optimisés | GPT-4 |
| **Traductions** | Multi-langue automatique | GPT-4 / DeepL |
| **Bio Generator** | Biographies professionnelles | GPT-4 |

#### 2.2 Génération d'Images

```
User: "Génère une illustration d'un chef italien pour ma page À propos"

AI: [Génère via DALL-E 3 ou Midjourney API]
    "Voici 4 propositions. Laquelle préférez-vous ?"
    [Grid de 4 images]
```

**Providers supportés** :
- DALL-E 3 (OpenAI)
- Midjourney (via API tiers)
- Stable Diffusion (self-hosted option)
- Ideogram (logos, illustrations)

#### 2.3 Design Assistance

```
User: "Le site fait un peu amateur, comment l'améliorer ?"

AI: "Je vois plusieurs points à améliorer :

     🎨 Couleurs :
     - Votre palette manque de cohérence
     - Je suggère : #1A1A2E (fond), #E94560 (accent), #F5F5F5 (texte)
     
     📐 Espacement :
     - Les sections sont trop serrées
     - Ajout de padding recommandé
     
     🔤 Typographie :
     - Trop de polices différentes (4 actuellement)
     - Je recommande : Playfair Display + Inter
     
     Voulez-vous que j'applique ces changements ?"
```

#### 2.4 Code Generation

Pour les utilisateurs avancés, génération de code custom :

```
User: "Ajoute un carrousel d'images personnalisé"

AI: [Génère le composant React]
    "J'ai créé un carrousel avec :
     - Navigation flèches + dots
     - Swipe mobile
     - Autoplay optionnel
     
     Le composant est maintenant disponible dans votre bibliothèque."
```

### Tier 3: Premium Features

#### 3.1 AI Website Analyzer

Analyse complète du site avec scoring :

```json
{
  "overall_score": 78,
  "categories": {
    "design": {
      "score": 82,
      "issues": [
        { "severity": "medium", "message": "Contraste insuffisant sur le CTA" }
      ]
    },
    "seo": {
      "score": 65,
      "issues": [
        { "severity": "high", "message": "Meta description manquante" },
        { "severity": "low", "message": "Images sans attribut alt" }
      ]
    },
    "performance": {
      "score": 88,
      "issues": []
    },
    "accessibility": {
      "score": 72,
      "issues": [
        { "severity": "medium", "message": "Navigation au clavier incomplète" }
      ]
    }
  },
  "recommendations": [
    "Ajouter une meta description pour améliorer le SEO (+15 points)",
    "Augmenter le contraste du bouton principal (+5 points)"
  ]
}
```

#### 3.2 A/B Testing AI

```
User: "Quel titre convertit le mieux ?"

AI: "Je vais créer un test A/B :
     
     Version A: 'Découvrez notre cuisine italienne authentique'
     Version B: 'Les saveurs de l'Italie à Paris depuis 1985'
     
     Je vous recommande de tester pendant 2 semaines minimum.
     Voulez-vous lancer le test ?"
```

#### 3.3 Competitor Analysis

```
User: "Analyse les sites de mes concurrents"

AI: "J'ai analysé 5 restaurants italiens similaires à Paris :

     📊 Tendances observées :
     - 80% utilisent des photos professionnelles
     - 60% ont un système de réservation en ligne
     - Hero video de plus en plus populaire
     
     🎯 Opportunités pour vous :
     - Aucun concurrent n'a de blog recettes
     - Menu interactif avec allergènes peu répandu
     
     Voulez-vous que j'implémente une de ces idées ?"
```

#### 3.4 Voice Input

Support de la saisie vocale pour une expérience encore plus naturelle :

```typescript
// Whisper API integration
const transcribeVoice = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  
  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

---

## Modèles & Providers

### Stratégie Multi-Provider

| Use Case | Primary | Fallback | Reason |
|----------|---------|----------|--------|
| **Chat conversationnel** | Claude 3.5 Sonnet | GPT-4o | Meilleur ton naturel |
| **Code generation** | GPT-4o | Claude 3.5 | Meilleur pour code structuré |
| **Analyse design** | Claude 3.5 Opus | GPT-4 Vision | Compréhension visuelle |
| **Traduction** | DeepL | GPT-4 | Qualité traduction |
| **Images** | DALL-E 3 | Stable Diffusion | Qualité/cohérence |
| **Transcription** | Whisper | - | Seul provider viable |

### Model Router

```rust
pub struct ModelRouter {
    providers: HashMap<Provider, ProviderClient>,
    routing_rules: Vec<RoutingRule>,
    cost_optimizer: CostOptimizer,
}

impl ModelRouter {
    pub fn select_model(&self, request: &AIRequest) -> ModelSelection {
        // 1. Check user's plan limits
        let plan_constraints = self.get_plan_constraints(&request.user_id);
        
        // 2. Apply routing rules
        let candidates = self.routing_rules
            .iter()
            .filter(|rule| rule.matches(&request))
            .map(|rule| rule.model)
            .collect();
        
        // 3. Optimize for cost/quality
        self.cost_optimizer.select(candidates, plan_constraints)
    }
}
```

### Cost Estimation

| Model | Input (1K tokens) | Output (1K tokens) | Avg Request Cost |
|-------|-------------------|--------------------| -----------------|
| GPT-4o | $0.005 | $0.015 | ~$0.02 |
| Claude 3.5 Sonnet | $0.003 | $0.015 | ~$0.015 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | ~$0.002 |
| DALL-E 3 | - | - | $0.04/image |
| Whisper | - | - | $0.006/min |

**Estimation mensuelle par utilisateur actif** :
- Free tier: ~$0.50/mois (limité)
- Pro tier: ~$2-5/mois (usage normal)
- Business tier: ~$10-20/mois (usage intensif)

---

## API Design

### Endpoints

```yaml
# AI Chat
POST /api/v1/ai/chat
  - Envoi d'un message dans la conversation
  - Support streaming via SSE
  
POST /api/v1/ai/chat/stream
  - WebSocket pour streaming bidirectionnel
  
# Génération de contenu
POST /api/v1/ai/generate/text
  - Génération de texte (copywriting, SEO, etc.)
  
POST /api/v1/ai/generate/image
  - Génération d'images
  
POST /api/v1/ai/generate/code
  - Génération de composants custom

# Analyse
POST /api/v1/ai/analyze/website
  - Analyse complète du site
  
POST /api/v1/ai/analyze/seo
  - Audit SEO spécifique

# Suggestions
GET /api/v1/ai/suggestions
  - Suggestions contextuelles pour le site actuel

# Voice
POST /api/v1/ai/transcribe
  - Transcription audio → texte
```

### Request/Response Schemas

```typescript
// Chat Request
interface AIChatRequest {
  website_id: string;
  conversation_id?: string; // Pour continuer une conversation
  message: string;
  attachments?: Attachment[];
  context_override?: Partial<WebsiteContext>;
  stream?: boolean;
}

// Chat Response (non-streaming)
interface AIChatResponse {
  id: string;
  conversation_id: string;
  message: string;
  actions?: AIAction[]; // Actions effectuées sur le site
  suggestions?: Suggestion[];
  usage: TokenUsage;
}

// Streaming Response (SSE)
interface AIChatStreamEvent {
  type: 'token' | 'action' | 'suggestion' | 'done' | 'error';
  data: string | AIAction | Suggestion | null;
}

// Action effectuée par l'IA
interface AIAction {
  type: 'update_section' | 'add_section' | 'delete_section' | 
        'update_theme' | 'update_content' | 'generate_image';
  target: string; // Section ID ou path
  changes: Record<string, unknown>;
  preview?: string; // URL de preview avant/après
  reversible: boolean;
}
```

---

## Real-time & Streaming

### Architecture Streaming

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   API        │────▶│  AI Provider │
│   (React)    │     │   (Axum)     │     │  (OpenAI)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │    SSE/WebSocket   │     HTTP Streaming │
       │◀───────────────────│◀───────────────────│
       │                    │                    │
       ▼                    ▼                    ▼
   Render           Parse & Forward        Generate
   tokens           AI responses           tokens
```

### Implementation Backend (Rust)

```rust
// apps/api/src/routes/ai.rs
use axum::{
    response::sse::{Event, Sse},
    extract::{State, Json},
};
use futures::stream::Stream;

pub async fn chat_stream(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<AIChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        // 1. Build context
        let context = state.ai.build_context(&request.website_id).await?;
        
        // 2. Start AI stream
        let ai_stream = state.ai.chat_stream(&request, context).await?;
        
        // 3. Forward tokens
        pin_mut!(ai_stream);
        while let Some(chunk) = ai_stream.next().await {
            match chunk {
                Ok(token) => {
                    yield Ok(Event::default()
                        .event("token")
                        .data(token));
                }
                Err(e) => {
                    yield Ok(Event::default()
                        .event("error")
                        .data(e.to_string()));
                    break;
                }
            }
        }
        
        // 4. Send completion
        yield Ok(Event::default().event("done").data(""));
    };
    
    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
    )
}
```

### Implementation Frontend (React)

```typescript
// hooks/useAIChat.ts
export function useAIChat(websiteId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/v1/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_id: websiteId, message: content }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'token') {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.data }
                ];
              });
            } else if (data.type === 'action') {
              // Apply action to website preview
              applyAction(data.data);
            }
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, sendMessage, isStreaming };
}
```

---

## Context Management

### Conversation Memory

```rust
pub struct ConversationManager {
    store: RedisStore,
    max_history: usize,
    summarizer: Summarizer,
}

impl ConversationManager {
    /// Récupère l'historique de conversation avec compression
    pub async fn get_history(
        &self,
        conversation_id: &str,
        max_tokens: usize,
    ) -> Result<Vec<Message>, Error> {
        let full_history = self.store.get_messages(conversation_id).await?;
        
        // Si l'historique est trop long, on résume les anciens messages
        if self.count_tokens(&full_history) > max_tokens {
            let (old, recent) = self.split_history(full_history, max_tokens / 2);
            let summary = self.summarizer.summarize(&old).await?;
            
            return Ok(vec![
                Message::system(format!("Résumé de la conversation: {}", summary)),
                ..recent
            ]);
        }
        
        Ok(full_history)
    }
    
    /// Sauvegarde avec TTL (conversations expirent après 7 jours)
    pub async fn save_message(
        &self,
        conversation_id: &str,
        message: Message,
    ) -> Result<(), Error> {
        self.store.append_message(conversation_id, message).await?;
        self.store.set_ttl(conversation_id, Duration::from_days(7)).await
    }
}
```

### Website Context Injection

Le contexte du site est injecté dans chaque requête :

```rust
pub fn build_system_prompt(website: &Website, sections: &[Section]) -> String {
    format!(r#"
Tu es l'assistant AI d'ASAP, un website builder moderne.

## Site actuel
- Nom: {name}
- URL: {slug}.asap.cool
- Type: {preset}
- Sections: {section_count}

## Structure du site
{sections_summary}

## Thème actuel
- Couleur primaire: {primary_color}
- Police titres: {heading_font}
- Police corps: {body_font}
- Mode: {color_mode}

## Tes capacités
Tu peux:
1. Modifier le contenu (textes, images)
2. Ajouter/supprimer des sections
3. Changer le thème et les couleurs
4. Générer du contenu (textes, images)
5. Analyser et améliorer le site

## Format de réponse
Quand tu effectues une modification, utilise ce format:
```action
{{"type": "update_section", "target": "section_id", "changes": {{...}}}}
```

Sois concis, amical et professionnel.
"#,
        name = website.title,
        slug = website.slug,
        preset = website.preset,
        section_count = sections.len(),
        sections_summary = format_sections(sections),
        primary_color = website.theme.primary_color,
        heading_font = website.theme.heading_font,
        body_font = website.theme.body_font,
        color_mode = website.theme.color_mode,
    )
}
```

---

## Sécurité & Privacy

### Principes

1. **Data Minimization** : N'envoyer que le contexte nécessaire aux providers AI
2. **No PII to AI** : Anonymiser les données personnelles avant envoi
3. **User Consent** : Opt-in explicite pour les features AI
4. **Audit Trail** : Logger toutes les interactions AI (sans contenu sensible)

### Implementation

```rust
pub struct AISecurityLayer {
    pii_detector: PIIDetector,
    content_filter: ContentFilter,
    audit_logger: AuditLogger,
}

impl AISecurityLayer {
    pub async fn sanitize_request(
        &self,
        request: &mut AIRequest,
    ) -> Result<(), SecurityError> {
        // 1. Détecter et masquer les PII
        request.message = self.pii_detector.mask(&request.message)?;
        
        // 2. Filtrer le contenu inapproprié
        if self.content_filter.is_harmful(&request.message) {
            return Err(SecurityError::HarmfulContent);
        }
        
        // 3. Log pour audit (sans contenu sensible)
        self.audit_logger.log(AuditEvent {
            user_id: request.user_id,
            action: "ai_request",
            metadata: json!({
                "website_id": request.website_id,
                "message_length": request.message.len(),
            }),
        }).await;
        
        Ok(())
    }
    
    pub async fn filter_response(
        &self,
        response: &mut AIResponse,
    ) -> Result<(), SecurityError> {
        // Vérifier que l'AI n'a pas généré de contenu problématique
        if self.content_filter.is_harmful(&response.message) {
            response.message = "Je ne peux pas générer ce type de contenu.".into();
        }
        
        Ok(())
    }
}
```

### Data Retention Policy

| Data Type | Retention | Encryption |
|-----------|-----------|------------|
| Conversation history | 30 jours | AES-256 |
| Generated content | Permanent (user content) | AES-256 |
| AI request logs | 90 jours | At-rest |
| Usage metrics | 1 an | Anonymized |

---

## Performance & Caching

### Caching Strategy

```rust
pub struct AICache {
    redis: RedisPool,
    local: MokaCache<String, CachedResponse>,
}

impl AICache {
    /// Cache les suggestions statiques (même pour tous les users)
    pub async fn get_static_suggestions(
        &self,
        website_type: &str,
    ) -> Option<Vec<Suggestion>> {
        let key = format!("ai:suggestions:static:{}", website_type);
        self.redis.get(&key).await
    }
    
    /// Cache les réponses similaires (embeddings)
    pub async fn get_similar_response(
        &self,
        query: &str,
        website_id: &str,
        similarity_threshold: f32,
    ) -> Option<CachedResponse> {
        let query_embedding = self.embed(query).await;
        
        // Recherche dans le cache par similarité cosine
        self.vector_search(
            &format!("ai:cache:{}", website_id),
            query_embedding,
            similarity_threshold,
        ).await
    }
}
```

### Optimizations

1. **Prompt Caching** : Les providers comme Anthropic supportent le caching de prompts
2. **Batch Requests** : Grouper les requêtes non-urgentes
3. **Speculative Execution** : Pré-générer les suggestions probables
4. **Edge Caching** : Cache CDN pour les assets générés

---

## Pricing & Rate Limiting

### Limites par Plan

| Plan | AI Messages/jour | Image Gen/mois | Voice Minutes/mois |
|------|------------------|----------------|---------------------|
| Free | 20 | 5 | 10 |
| Pro | 200 | 50 | 60 |
| Business | 1000 | 200 | 300 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Implementation

```rust
pub struct AIRateLimiter {
    redis: RedisPool,
    limits: HashMap<Plan, Limits>,
}

impl AIRateLimiter {
    pub async fn check_and_consume(
        &self,
        user_id: &Uuid,
        plan: Plan,
        resource: AIResource,
    ) -> Result<(), RateLimitError> {
        let key = format!("ratelimit:ai:{}:{}:{}", user_id, resource, today());
        let limit = self.limits.get(&plan).unwrap().get(&resource);
        
        let current: i64 = self.redis.incr(&key).await?;
        
        if current == 1 {
            self.redis.expire(&key, 86400).await?; // TTL 24h
        }
        
        if current > limit {
            return Err(RateLimitError::LimitExceeded {
                resource,
                limit,
                reset: next_midnight(),
            });
        }
        
        Ok(())
    }
}
```

### Fair Use Policy

```markdown
## AI Fair Use Policy

Pour garantir une expérience optimale à tous les utilisateurs :

1. **Pas de spam** : Les requêtes automatisées/scripts sont interdits
2. **Usage personnel** : L'AI est pour votre propre site, pas pour revente
3. **Contenu légal** : Pas de génération de contenu illégal/harmful
4. **Rate limits** : Respectez les limites de votre plan

En cas d'abus détecté, nous nous réservons le droit de :
- Suspendre temporairement l'accès AI
- Rétrograder vers un plan inférieur
- Suspendre le compte en cas de récidive
```

---

## UX/UI Guidelines

### Principes de Design

1. **Progressive Disclosure** : Commencer simple, révéler la complexité au besoin
2. **Immediate Feedback** : Chaque action doit avoir un retour visuel immédiat
3. **Undo/Redo** : Toutes les actions AI doivent être réversibles
4. **Transparency** : Montrer ce que l'AI fait et pourquoi

### Chat Panel UI

```
┌─────────────────────────────────────────────────────────┐
│ ┌─────┐  ASAP AI  [Beta]                         ⋮  ✕ │
│ │ ✨  │  • Online                                      │
│ └─────┘  site.asap.cool                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌────────────────────────────────────────────┐      │
│    │ 👋 Bonjour ! Comment puis-je vous aider    │      │
│    │ avec votre site aujourd'hui ?              │      │
│    └────────────────────────────────────────────┘      │
│                                                         │
│    ┌──────────────────────────────────┐                │
│    │ Change le titre en "Bienvenue"  │  👤             │
│    └──────────────────────────────────┘                │
│                                                         │
│    ┌────────────────────────────────────────────┐      │
│    │ ✅ C'est fait ! J'ai modifié le titre.     │      │
│    │                                            │      │
│    │ ┌────────────────────────────────────┐    │      │
│    │ │ [Preview before/after]             │    │      │
│    │ └────────────────────────────────────┘    │      │
│    │                                            │      │
│    │ Autre chose ?                              │      │
│    └────────────────────────────────────────────┘      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  + Section  🎨 Couleurs  T Texte  🖼️ Image             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ ↑  │
│ │ Décrivez les changements à faire...            │    │
│ └─────────────────────────────────────────────────┘    │
│                    L'IA peut faire des erreurs.         │
└─────────────────────────────────────────────────────────┘
```

### Inline AI (Studio)

En plus du panel chat, l'AI peut être invoquée directement dans l'éditeur :

```
┌─────────────────────────────────────────────────────────┐
│ [Section Hero]                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │           Bienvenue chez Mario        [✨ AI]       │ │
│ │                                                     │ │
│ │  [Sélectionner ce texte active le menu AI]         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│         ┌─────────────────────────────┐                │
│         │ 🪄 Améliorer                │                │
│         │ 📝 Réécrire                 │                │
│         │ 🌍 Traduire                 │                │
│         │ ✂️ Raccourcir               │                │
│         │ 📖 Développer               │                │
│         └─────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### States & Feedback

```tsx
// États du chat
type ChatState = 
  | 'idle'           // En attente d'input
  | 'sending'        // Message en cours d'envoi
  | 'streaming'      // Réception streaming
  | 'thinking'       // AI traite une action complexe
  | 'applying'       // Action en cours d'application
  | 'error';         // Erreur

// Feedback visuel pour chaque état
const ChatStateIndicator = ({ state }: { state: ChatState }) => {
  switch (state) {
    case 'thinking':
      return <div className="flex gap-1">
        <span className="animate-bounce">●</span>
        <span className="animate-bounce delay-150">●</span>
        <span className="animate-bounce delay-300">●</span>
      </div>;
    case 'applying':
      return <div className="flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" />
        <span>Application des modifications...</span>
      </div>;
    // ...
  }
};
```

---

## Roadmap d'Implémentation

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROADMAP OVERVIEW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Q1 2026                     Q2 2026                    Q3-Q4 2026          │
│  ════════════════════════   ════════════════════════   ════════════════════ │
│                                                                              │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐│
│  │ PHASE 1: Foundation │   │ PHASE 2: Sections   │   │ PHASE 4: Premium    ││
│  │ (2 semaines)        │   │ Library (3 sem)     │   │ (Ongoing)           ││
│  │                     │   │                     │   │                     ││
│  │ • AI Backend infra  │   │ • +10 section types │   │ • Voice input       ││
│  │ • Streaming SSE     │   │ • Variants system   │   │ • Marketplace       ││
│  │ • Chat Panel final  │   │ • Element templates │   │ • A/B Testing       ││
│  └─────────────────────┘   └─────────────────────┘   │ • Competitor intel  ││
│            │                         │               └─────────────────────┘│
│            ▼                         ▼                                      │
│  ┌─────────────────────┐   ┌─────────────────────┐                         │
│  │ PHASE 1b: Actions   │   │ PHASE 3: Advanced   │                         │
│  │ (2 semaines)        │   │ (4 semaines)        │                         │
│  │                     │   │                     │                         │
│  │ • Schema validation │   │ • Image generation  │                         │
│  │ • Property updates  │   │ • Inline AI         │                         │
│  │ • Add/remove sect.  │   │ • Analytics/SEO     │                         │
│  │ • Theme changes     │   │ • Smart suggestions │                         │
│  └─────────────────────┘   └─────────────────────┘                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1a: AI Foundation (2 semaines)

**Objectif**: Infrastructure backend AI fonctionnelle avec streaming

- [ ] **Module `core/ai`**
  - [ ] `core/ai/Cargo.toml` - Nouveau crate
  - [ ] Traits: `AIProvider`, `AIOrchestrator`, `ContextBuilder`
  - [ ] Types: `AIRequest`, `AIResponse`, `AIAction`, `AIError`
  - [ ] Config: multi-provider settings

- [ ] **Provider Integrations**
  - [ ] OpenAI client (chat completions, streaming)
  - [ ] Anthropic client (Claude 3.5 Sonnet)
  - [ ] Model router avec fallback chain
  - [ ] Cost tracking per request

- [ ] **Streaming Infrastructure**
  - [ ] SSE endpoint `/api/v1/ai/chat/stream`
  - [ ] Token-by-token streaming
  - [ ] Action events interleaved
  - [ ] Error handling graceful

- [ ] **Rate Limiting**
  - [ ] Redis-based counters
  - [ ] Per-plan limits (free: 20/day, pro: 200/day)
  - [ ] Graceful degradation

- [ ] **Chat Panel Finalization**
  - [ ] Connecter au vrai endpoint
  - [ ] Streaming display
  - [ ] Error states
  - [ ] Retry logic

### Phase 1b: AI Actions (2 semaines)

**Objectif**: L'AI peut modifier le site en temps réel

- [ ] **Context Builder**
  - [ ] `AIContext` struct avec website + sections + theme
  - [ ] Schema injection pour chaque section
  - [ ] Collections/Variables inclusion
  - [ ] User context (name, plan)

- [ ] **Action Parser**
  - [ ] Parse AI response for ````action` blocks
  - [ ] Validate against section schemas
  - [ ] Type checking for property values
  - [ ] Error messages user-friendly

- [ ] **Action Executors**
  - [ ] `UPDATE_SECTION_PROPERTY` - Modify single property
  - [ ] `ADD_SECTION` - Insert new section at position
  - [ ] `REMOVE_SECTION` - Delete section
  - [ ] `REORDER_SECTIONS` - Change order
  - [ ] `UPDATE_THEME` - Colors, fonts, mode
  - [ ] `CHANGE_VARIANT` - Switch section variant

- [ ] **Live Preview Update**
  - [ ] WebSocket or SSE for preview refresh
  - [ ] Optimistic UI updates
  - [ ] Rollback on failure

- [ ] **Undo/Redo System**
  - [ ] Action history stack
  - [ ] Undo last N actions
  - [ ] Conversation-scoped history

### Phase 2: Sections Library (3 semaines)

**Objectif**: Étoffer le catalogue de sections pour couvrir tous les cas d'usage

- [ ] **New Section Types**
  - [ ] `content` (text, text-image, columns) - Rich content blocks
  - [ ] `about` (team, story, values, timeline) - About variations
  - [ ] `faq` (accordion, two-column, search) - FAQ sections
  - [ ] `contact` (form, info-map, split) - Contact forms
  - [ ] `gallery` (grid, masonry, lightbox) - Image galleries
  - [ ] `stats` (counters, progress, icons) - Statistics display
  - [ ] `logos` (strip, grid, animated) - Logo clouds
  - [ ] `blog-list` (grid, list, featured) - Blog listings

- [ ] **Variant System**
  - [ ] Schema extension for variants
  - [ ] Variant picker in Studio
  - [ ] AI can suggest/change variants
  - [ ] Content preserved across variant changes

- [ ] **Element Templates (Pro Feature)**
  - [ ] `element_templates` table
  - [ ] "Save as Template" action
  - [ ] User template library UI
  - [ ] Apply template to new site
  - [ ] Export/Import JSON

- [ ] **Schema Enhancements**
  - [ ] `ai_hint` field for better AI understanding
  - [ ] `examples` field with sample values
  - [ ] `validation` rules (min/max length, patterns)
  - [ ] `group` for property organization

### Phase 3: Advanced AI (4 semaines)

**Objectif**: Features AI avancées et inline editing

- [ ] **Image Generation**
  - [ ] DALL-E 3 integration
  - [ ] Image prompt builder from context
  - [ ] Image picker UI (4 options)
  - [ ] Auto-upload to cloud storage
  - [ ] Background removal option

- [ ] **Inline AI (Studio)**
  - [ ] Text selection → AI menu
  - [ ] Actions: Improve, Rewrite, Translate, Shorten, Expand
  - [ ] Floating toolbar
  - [ ] Keyboard shortcut (Cmd+J)

- [ ] **Content Generation**
  - [ ] Generate entire section content
  - [ ] Generate from URL (competitor analysis)
  - [ ] Generate from description
  - [ ] Multiple tone options (professional, casual, playful)

- [ ] **Website Analyzer**
  - [ ] Design score
  - [ ] SEO audit
  - [ ] Accessibility check
  - [ ] Performance tips
  - [ ] Actionable recommendations

- [ ] **Smart Suggestions**
  - [ ] Proactive improvement suggestions
  - [ ] "Sites like yours often have..."
  - [ ] Based on industry/preset
  - [ ] Dismissable, learnable

### Phase 4: Premium Features (Ongoing)

**Objectif**: Différenciation et monétisation avancée

- [ ] **Voice Input**
  - [ ] Whisper API integration
  - [ ] Push-to-talk UI
  - [ ] Voice command recognition
  - [ ] Accessibility benefits

- [ ] **Community Marketplace**
  - [ ] Public element templates
  - [ ] Ratings & reviews
  - [ ] Paid templates (revenue share)
  - [ ] Creator profiles

- [ ] **A/B Testing Integration**
  - [ ] AI generates variants
  - [ ] Traffic splitting
  - [ ] Conversion tracking
  - [ ] Statistical significance

- [ ] **Competitor Intelligence**
  - [ ] URL analysis
  - [ ] Feature comparison
  - [ ] Gap analysis
  - [ ] Improvement suggestions

- [ ] **Brand AI Training**
  - [ ] Upload brand guidelines
  - [ ] Custom tone of voice
  - [ ] Preferred terminology
  - [ ] Style consistency

---

## Métriques & Analytics

### KPIs à Tracker

| Métrique | Description | Target |
|----------|-------------|--------|
| **AI Adoption Rate** | % users qui utilisent l'AI | > 60% |
| **Messages per Session** | Engagement avec l'AI | > 5 |
| **Action Success Rate** | Modifications réussies/tentées | > 90% |
| **Time to First Value** | Temps avant première action utile | < 2 min |
| **CSAT AI** | Satisfaction spécifique AI | > 4.2/5 |
| **Cost per User** | Coût AI par utilisateur actif | < $3/mois |

### Events à Logger

```typescript
// Analytics events
trackEvent('ai_chat_opened', { website_id, source });
trackEvent('ai_message_sent', { website_id, message_length, has_attachment });
trackEvent('ai_action_applied', { website_id, action_type, success });
trackEvent('ai_action_undone', { website_id, action_type });
trackEvent('ai_suggestion_clicked', { website_id, suggestion_type });
trackEvent('ai_error', { website_id, error_type, error_message });
trackEvent('ai_feedback', { website_id, rating, feedback_text });
```

### Dashboard Admin

```
┌─────────────────────────────────────────────────────────────────┐
│ ASAP AI Dashboard                                    Last 7 days │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Usage Overview                                               │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ Messages     │ Actions      │ Images Gen   │ Cost          │ │
│  │ 45,234       │ 12,456       │ 2,341        │ $1,234        │ │
│  │ +12% ↑       │ +8% ↑        │ +25% ↑       │ -5% ↓         │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
│                                                                  │
│  📈 Adoption Trend              🎯 Success Rate                  │
│  [Graph: daily active AI users] [Gauge: 94% success]            │
│                                                                  │
│  🔝 Top Actions                 ⚠️ Top Errors                    │
│  1. Update content (45%)        1. Rate limit (234)             │
│  2. Change colors (22%)         2. Timeout (45)                 │
│  3. Add section (18%)           3. Invalid action (12)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risques & Mitigations

### Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **API Provider Down** | Medium | High | Multi-provider fallback, queue for retry |
| **Hallucinations AI** | High | Medium | Validation des actions, sandbox preview |
| **Coûts explosent** | Medium | High | Hard caps, alertes, throttling progressif |
| **Latence élevée** | Medium | Medium | Caching, CDN, model routing intelligent |
| **Data leak** | Low | Critical | Chiffrement, audit, pas de PII vers AI |

### Risques Business

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Utilisateurs frustrés** | Medium | High | Onboarding progressif, fallback manuel |
| **Concurrence AI** | High | Medium | Features uniques, UX supérieure |
| **Régulation AI** | Medium | Medium | Compliance-ready, opt-in, transparency |
| **Abus du service** | Medium | Low | Rate limits, fair use policy, monitoring |

### Plan de Contingence

```yaml
# Fallback Chain
primary: claude-3.5-sonnet
secondary: gpt-4o
tertiary: gpt-3.5-turbo  # Degraded mode
offline: manual-mode     # AI disabled, manual editing only

# Circuit Breaker
error_threshold: 10      # errors in 1 minute
cooldown: 30s            # before retry
max_retries: 3           # per request

# Cost Protection
daily_cap_per_user: $5
monthly_cap_total: $10000
alert_at: 80%
```

---

## Conclusion

L'intégration AI dans ASAP représente une opportunité majeure de différenciation et d'amélioration de l'expérience utilisateur. Cette conception prévoit :

1. **Architecture solide** : Multi-provider, resilient, scalable
2. **UX thoughtful** : Chat naturel + inline AI + suggestions proactives
3. **Security first** : Pas de PII, audit trail, content filtering
4. **Cost control** : Rate limits, caching, model routing intelligent
5. **Iterative rollout** : MVP → Core → Advanced → Premium

Le succès dépendra de :
- Qualité des prompts et du context engineering
- Performance et fiabilité de l'infrastructure
- Feedback loop rapide avec les utilisateurs
- Monitoring continu des coûts et de la qualité

---

## Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **LLM** | Large Language Model (GPT-4, Claude, etc.) |
| **Prompt Engineering** | Art de formuler les instructions pour l'AI |
| **Context Window** | Limite de tokens qu'un modèle peut traiter |
| **Streaming** | Réception progressive de la réponse AI |
| **Embedding** | Représentation vectorielle du texte |
| **RAG** | Retrieval-Augmented Generation |

### B. Références

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [AI UX Best Practices](https://pair.withgoogle.com)
- [OWASP AI Security Guidelines](https://owasp.org/www-project-machine-learning-security-top-10/)

### C. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial design document |
