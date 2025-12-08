# Structure du Monorepo ASAP

Ce document décrit la structure initiale du monorepo ASAP basée sur une architecture **core + modules**.

**Public visé :** Développeur senior qui doit poser les fondations clean du projet.

## Objectifs

- **Core minimal** : gestion des utilisateurs, isolation multi-tenant, persistance
- **Modules réutilisables** : toutes les fonctionnalités viennent de modules
- **Données centralisées** : les données utilisateur vivent dans le core, les modules les consomment
- **Extensibilité** : ajouter de nouvelles fonctionnalités sans modifier le core

---

## 1. Vue d'ensemble du monorepo

```
asap/
├── core/           # Core - structure & données utilisateur (open-source)
├── modules/        # Modules - fonctionnalités (mixte open/premium)
├── apps/           # Applications exécutables
├── infra/          # Infrastructure
├── data/           # Runtime data
├── scripts/        # Utilitaires
└── docs/           # Documentation
```

---

## 2. `core/` – Le cœur (Open-source)

Le core expose une API centralisée pour :

- Gérer l'**authentification** et les **utilisateurs**
- Centraliser les **données utilisateur** (profil, intégrations, préférences)
- Gérer l'**isolation multi-tenant**
- Émettre des **événements** pour les modules
- Fournir une **structure unifiée** pour les portfolios

```
core/
├── domain/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── users.rs         # User, Tenant, UserData structs
│       ├── portfolios.rs    # Portfolio structure
│       ├── events.rs        # Event definitions
│       ├── integrations.rs  # GitHub, etc.
│       └── errors.rs        # Error types
│
├── api/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── routes.rs
│       ├── auth.rs
│       ├── users.rs         # GET/PUT /users/:id
│       ├── integrations.rs  # GET/PUT /users/:id/integrations
│       ├── portfolios.rs    # GET/PUT /portfolios/:id
│       ├── events.rs        # POST /events (publish)
│       └── modules.rs       # GET /modules, /modules/:id/config
│
└── schemas/
    ├── user.schema.json
    ├── portfolio.schema.json
    └── events.schema.json
```

### API Core - Routes principales

```
GET    /auth/me              # Utilisateur courant
POST   /auth/login
POST   /auth/signup

GET    /users/:id            # Profil utilisateur
PUT    /users/:id

GET    /users/:id/integrations        # GitHub username, tokens, etc.
PUT    /users/:id/integrations/{type}

GET    /portfolios/:id       # Structure portfolio
PUT    /portfolios/:id       # Titre, tagline, slug

POST   /events               # Publish événement (modules → core)
GET    /events               # Lire événements (modules → core)

GET    /modules              # Module registry
GET    /modules/:id/config   # Config du module pour ce tenant
PUT    /modules/:id/config   # Changer config du module
```

---

## 3. `modules/` – Fonctionnalités (Mixte)

Chaque module implémente une fonctionnalité spécifique. Les modules :

- **Lisent** les données utilisateur du core via l'API
- **Écoutent** les événements du core
- **Émettent** des événements après traitement
- **Stockent** leurs résultats dans `portfolio_data` (JSONB du core)

```
modules/
├── github-generator/       # Récupère repos GitHub
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── client.rs       # Appels GitHub API
│   │   ├── processor.rs    # Transforme repos → portfolio data
│   │   └── events.rs       # Écoute USER_INTEGRATION_ADDED
│   └── manifest.toml       # Infos du module
│
├── ai-generator/           # Génération contenu IA
│   ├── Cargo.toml
│   ├── src/...
│   └── manifest.toml
│
├── themes/                 # Thèmes de rendu
│   ├── default-theme/
│   ├── dark-theme/
│   └── manifest.toml
│
├── analytics/              # Tracking et stats
│   ├── Cargo.toml
│   ├── src/...
│   └── manifest.toml
│
└── projections/            # Génère data/sites/<slug>.json
    ├── Cargo.toml
    ├── src/...
    └── manifest.toml
```

### Module Manifest

```toml
[module]
name = "github-generator"
version = "1.0.0"
description = "Import GitHub repositories into portfolio"

[triggers]
on_event = ["USER_INTEGRATION_ADDED"]

[api]
routes = []  # ou des routes custom

[config]
# Schéma de config pour ce module
```

---

## 4. `apps/` – Applications exécutables

```
apps/
├── api/              # Core API (Rust/Axum)
│   └── src/
│       ├── main.rs
│       ├── config.rs
│       ├── db.rs
│       └── handlers/
│           ├── auth.rs
│           ├── users.rs
│           ├── portfolios.rs
│           ├── integrations.rs
│           └── modules.rs
│
├── worker/           # Module task executor (Rust/Tokio)
│   └── src/
│       ├── main.rs
│       ├── event_processor.rs     # Écoute core events
│       ├── module_executor.rs     # Exécute les modules
│       └── jobs/                  # Job runners
│
└── web/              # Frontend (Astro)
    └── src/
        ├── pages/
        │   ├── index.astro
        │   ├── app/
        │   │   └── dashboard.astro
        │   └── [slug]/
        │       └── index.astro
        └── lib/
            └── core-client.ts    # Client API Core
```

---

## 5. `infra/` – Infrastructure

```
infra/
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.worker
├── Dockerfile.web
│
├── migrations/
│   ├── 001_core_users.sql
│   ├── 002_core_portfolios.sql
│   ├── 003_core_events.sql
│   └── 004_core_modules.sql
│
└── env.example/
    ├── api.env
    ├── worker.env
    └── web.env
```

### Schéma minimal PostgreSQL

```sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_data (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  data JSONB NOT NULL DEFAULT '{}',  -- Intégrations, préférences
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portfolios (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, published
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portfolio_data (
  portfolio_id UUID PRIMARY KEY REFERENCES portfolios(id),
  data JSONB NOT NULL DEFAULT '{}',    -- Contenu généré par modules
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE modules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE module_configs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  module_id UUID NOT NULL REFERENCES modules(id),
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. `data/` – Runtime (non versionné)

```
data/
├── sites/
│   ├── johndoe.json        # Projection rendue
│   └── alice.json
└── logs/
    ├── api.log
    └── worker.log
```

---

## 7. Flux de communication

```
Frontend (Astro)
    ↓ authentifié avec JWT
┌─────────────────────────────────────────┐
│         Core API (Rust)                 │
│  ├─ Auth                                │
│  ├─ Users & Integrations                │
│  ├─ Portfolios                          │
│  ├─ Events (publish/subscribe)          │
│  └─ Module Registry                     │
└─────────────────────────────────────────┘
    ↑                           ↑
    │ GET /users/:id/data      │ POST /events (listening)
    │                           │
    │ Modules                   Worker
    ├──────────────────────────→│
    │ • github-generator        ├─→ github-generator job
    │ • ai-generator            ├─→ ai-generator job
    │ • themes                  ├─→ theme renderer
    │ • analytics               └─→ analytics processor
    │
    └─→ Résultats stockés dans portfolio_data (JSONB)
```
