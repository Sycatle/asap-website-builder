# Structure du Monorepo ASAP

Ce document décrit la structure du monorepo ASAP basée sur une architecture **core + extensions**.

**Dernière mise à jour :** 31 décembre 2025

**Public visé :** Développeur senior qui doit comprendre l'architecture du projet.

## Objectifs

- **Core minimal** : gestion des comptes utilisateurs, isolation multi-tenant, persistance
- **Extensions réutilisables** : toutes les fonctionnalités viennent d'extensions
- **Données centralisées** : les données utilisateur vivent dans le core, les extensions les consomment
- **Extensibilité** : ajouter de nouvelles fonctionnalités sans modifier le core
- **Parité rendu** : même code pour preview (Studio) et production (Sites publics)

---

## 1. Vue d'ensemble du monorepo

```
asap/
├── core/           # Core backend Rust (API, domain, shared)
├── extensions/     # Extensions backend Rust
├── packages/       # Packages partagés TypeScript (@asap/shared, @asap/renderers)
├── apps/           # Applications exécutables
│   ├── api/       # Serveur API Rust
│   ├── worker/    # Worker Rust (events)
│   ├── web/       # Dashboard Astro+React
│   └── sites/     # Sites publics Astro+React
├── infra/          # Docker, migrations, configs
├── data/           # Runtime data (logs, sites générés)
├── scripts/        # Utilitaires shell
├── docs/           # Documentation
├── package.json    # Root pnpm workspace
├── pnpm-workspace.yaml
└── Makefile        # Commandes de développement
```

---

## 2. `core/` – Le cœur Backend (Rust)

Le core expose une API centralisée pour :

- Gérer l'**authentification** et les **comptes utilisateurs**
- Centraliser les **données utilisateur** (profil, intégrations, préférences)
- Gérer l'**isolation multi-tenant**
- Émettre des **événements** pour les extensions
- Fournir une **structure unifiée** pour les sites web

```
core/
├── domain/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── users.rs         # Account, AccountData structs
│       ├── websites.rs      # Website, Extension, WebsiteExtension, WebsiteSection
│       ├── events.rs        # Event definitions
│       ├── integrations.rs  # GitHub, etc.
│       ├── storage.rs       # File storage types
│       ├── extension_schema.rs  # ConfigSchema, DataDisplay, Actions
│       └── errors.rs        # Error types
│
├── api/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── routes.rs
│       ├── auth.rs
│       ├── accounts.rs      # GET/PUT /accounts/:id
│       ├── integrations.rs  # GET/PUT /accounts/:id/integrations
│       ├── websites/        # Modular website handlers
│       │   ├── mod.rs
│       │   ├── core.rs      # Core CRUD operations
│       │   ├── extensions.rs # Website extension management
│       │   ├── sections.rs  # Section management
│       │   ├── pages.rs     # Multi-page management
│       │   ├── presets.rs   # Preset templates
│       │   └── catalog.rs   # Extension catalog
│       ├── queries/         # Modular database queries
│       │   ├── mod.rs
│       │   ├── types.rs
│       │   ├── websites.rs
│       │   ├── extensions.rs
│       │   ├── sections.rs
│       │   ├── pages.rs
│       │   └── presets.rs
│       ├── events.rs        # POST /events (publish)
│       ├── files.rs         # File upload/download
│       ├── storage.rs       # File storage service
│       ├── notifications.rs # Notifications CRUD
│       ├── billing.rs       # Stripe billing
│       └── webhooks.rs      # Payment webhooks
│
├── shared/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── auth.rs          # JWT utilities
│       ├── config.rs        # Shared configuration
│       ├── pubsub.rs        # Redis Pub/Sub types
│       ├── websocket.rs     # WebSocket broadcaster
│       ├── extension_catalog.rs  # Extension schema types
│       └── errors.rs
│
├── notifications/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── service.rs      # Notification service
│       └── types.rs        # Notification types
│
└── payments/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── gateway.rs       # PaymentGateway trait
        ├── stripe_provider.rs  # Stripe implementation
        ├── models.rs
        └── errors.rs
```

### API Core - Routes principales

```
GET    /auth/me              # Compte courant
POST   /auth/login
POST   /auth/signup
POST   /auth/change-password

GET    /accounts/:id            # Profil compte
PUT    /accounts/:id

GET    /accounts/:id/integrations        # GitHub username, tokens, etc.
PUT    /accounts/:id/integrations/github

GET    /websites             # Liste websites du tenant
GET    /websites/:id         # Structure website
PUT    /websites/:id         # Titre, tagline, slug
PATCH  /websites/:id/data    # Mise à jour contenu
POST   /websites/:id/publish # Publication

GET    /websites/:id/sections          # Liste sections
POST   /websites/:id/sections          # Créer section
PATCH  /websites/:id/sections/:id      # Modifier section
DELETE /websites/:id/sections/:id      # Supprimer section
POST   /websites/:id/sections/reorder  # Réordonner

GET    /websites/:id/pages             # Liste pages
POST   /websites/:id/pages             # Créer page
GET    /websites/:id/pages/:id         # Détail page
PATCH  /websites/:id/pages/:id         # Modifier page
DELETE /websites/:id/pages/:id         # Supprimer page
POST   /websites/:id/pages/reorder     # Réordonner

GET    /websites/:id/extensions        # Liste extensions activées
POST   /websites/:id/extensions        # Activer extension
PATCH  /websites/:id/extensions/:id    # Modifier settings
DELETE /websites/:id/extensions/:id    # Désactiver

GET    /extensions/catalog             # Catalogue extensions
GET    /extensions/:slug               # Détail extension
GET    /websites/:id/extensions/:slug/data    # Données extension
POST   /websites/:id/extensions/:slug/actions/:key  # Action

GET    /presets              # Liste presets
POST   /websites/from-preset # Créer depuis preset

POST   /events               # Publish événement
GET    /events               # Lire événements
PATCH  /events/:id           # Marquer traité

POST   /files                # Upload fichier
GET    /files                # Liste fichiers
GET    /files/:id            # Télécharger
DELETE /files/:id            # Supprimer
GET    /files/quota/usage    # Usage quota

GET    /notifications        # Liste notifications
GET    /notifications/unread-count
POST   /notifications/mark-read
GET    /notifications/:id
POST   /notifications/:id/read
DELETE /notifications/:id

POST   /notifications/push/subscribe
POST   /notifications/push/unsubscribe
GET    /notifications/push/vapid-key

GET    /notifications/settings
PUT    /notifications/settings

POST   /billing/checkout-session  # Créer session Stripe

GET    /public/websites/:slug          # Site public
GET    /public/websites/:slug/sections # Sections publiques
```

---

## 3. `extensions/` – Extensions Backend (Mixte)

Chaque extension implémente une fonctionnalité spécifique. Les extensions :

- **Lisent** les données utilisateur du core via l'API
- **Écoutent** les événements du core
- **Émettent** des événements après traitement
- **Stockent** leurs résultats dans `website_data` (JSONB du core)

```
extensions/
├── github-sync/            # Github Sync - Récupère repos GitHub
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── client.rs       # Appels GitHub API
│       └── processor.rs    # Transforme repos → website data
│
└── analytics/              # Tracking et stats
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

Note: Les notifications sont maintenant dans `core/notifications/` car c'est une extension core.

---

## 4. `packages/` – Packages Partagés TypeScript

Packages partagés entre les applications frontend.

```
packages/
├── shared/                 # Types, constantes, utilitaires
│   ├── package.json
│   └── src/
│       ├── types.ts        # Section, Website, Page, Theme, etc.
│       ├── constants.ts    # SECTION_TYPES, SECTION_LAYOUTS
│       ├── utils.ts        # slugify, validateSlug, etc.
│       ├── landing-saas-schema.ts  # Schema preset Landing SaaS
│       ├── site-rendering.ts       # Rendering utilities
│       └── index.ts
│
└── renderers/              # Renderers de sections React (Single Source of Truth)
    ├── package.json
    └── src/
        ├── index.ts            # Main exports
        ├── types.ts            # Re-export depuis @asap/shared
        ├── utils.ts            # getData, cn, etc.
        ├── renderers.tsx       # Main registry et SectionRenderer
        ├── components/
        │   ├── index.ts        # Component exports
        │   ├── ui.tsx          # Shared UI (Button, Card, Badge)
        │   ├── icons.tsx       # Centralized icons
        │   ├── ui/             # Primitives (avatar, badge, button, card, etc.)
        │   └── saas/           # SaaS landing sections (hero, features, pricing, etc.)
        └── freelance-renderer.tsx  # Portfolio renderer (deprecated)
```

---

## 5. `apps/` – Applications exécutables

```
apps/
├── api/              # Core API server (Rust/Axum)
│   └── src/
│       ├── main.rs
│       ├── config.rs
│       ├── db.rs
│       ├── pool.rs
│       ├── cache.rs           # Redis cache
│       ├── website_cache.rs   # Website caching
│       ├── websocket.rs       # WebSocket server
│       └── redis_pubsub.rs    # Redis Pub/Sub
│
├── worker/           # Extension task executor (Rust/Tokio)
│   └── src/
│       ├── main.rs
│       ├── config.rs
│       ├── db.rs
│       ├── event_processor.rs      # Écoute core events
│       ├── extension_executor.rs   # Exécute les extensions (anciennement module_executor)
│       ├── parallel_processor.rs   # Traitement parallèle
│       ├── registry.rs             # Extension registry
│       ├── file_cleanup.rs         # Nettoyage fichiers
│       ├── notification_publisher.rs  # Notifications
│       ├── web_push.rs             # Push notifications (IsahcWebPushClient)
│       └── payment_reconciliation.rs  # Stripe sync
│
├── web/              # Dashboard Frontend (Astro + React + shadcn)
│   └── src/
│       ├── pages/
│       │   ├── index.astro       # Landing page
│       │   ├── login.astro       # Login page
│       │   └── app/[...path].astro  # SPA dashboard
│       ├── components/
│       │   ├── features/        # Feature modules (dashboard, cloud, analytics, etc.)
│       │   ├── studio/          # Visual editor (studio-page/)
│       │   ├── onboarding/      # Onboarding flow (presets, ui/)
│       │   ├── shared/          # Shared components (command-palette, confirm-dialog, etc.)
│       │   ├── ui/              # UI components (shadcn)
│       │   ├── layouts/         # App shell, sidebar
│       │   └── landing/         # Landing page components
│       ├── i18n/                # Internationalization
│       │   ├── locales/         # en/, fr/
│       │   └── hooks/           # useLanguage
│       └── lib/
│           ├── api/              # API clients
│           ├── store/            # State management
│           └── websocket/        # WebSocket client
│
└── sites/            # Sites publics (Astro + React)
    └── src/
        ├── pages/
        │   ├── index.astro           # Root redirect
        │   ├── 404.astro             # 404 page
        │   ├── [slug].astro          # Site homepage
        │   └── [slug]/[page].astro   # Site subpages
        ├── components/
        │   ├── rendering/            # SectionRenderer, SectionsWrapper
        │   └── site/                 # PageNavigation
        ├── layouts/
        │   └── BaseLayout.astro
        └── lib/
            ├── api.ts               # API client
            ├── site-data.ts         # Data fetching
            └── rendering/           # Registry, normalize
```

---

## 6. `infra/` – Infrastructure

```
infra/
├── docker-compose.yml         # Base services
├── docker-compose.dev.yml     # Dev overrides (hot reload)
├── docker-compose.prod.yml    # Production config (healthchecks, limits)
├── docker-compose.dev.yml
├── Dockerfile.api
├── Dockerfile.api.dev
├── Dockerfile.worker
├── Dockerfile.worker.dev
├── Dockerfile.web
│
├── migrations/
│   ├── 20231211000000_initial_schema.sql
│   ├── 20251212083613_add_payment_fields.sql
│   ├── 20251212112047_simplify_architecture.sql
│   ├── 20251214000000_recreate_module_configs.sql
│   ├── 20251214000001_rename_user_to_account_columns.sql
│   ├── 20251214100000_add_notifications.sql
│   ├── 20251214110000_add_notification_queue.sql
│   ├── 20251216144900_seed_portfolio_dev_preset.sql
│   ├── 20251216152300_add_website_pages.sql
│   ├── 20251217100000_update_presets_with_pages.sql
│   └── 20251217150000_rename_modules_to_extensions.sql
│
└── env.example/
    ├── api.env
    ├── worker.env
    └── web.env
```

### Schéma PostgreSQL actuel

```sql
-- Core tables
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  plan_status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES accounts(id),
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_data (
  account_id UUID PRIMARY KEY REFERENCES accounts(id),
  data JSONB NOT NULL DEFAULT '{}',  -- Intégrations, préférences
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE websites (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, published
  creation_mode TEXT NOT NULL DEFAULT 'from_scratch',
  preset_id UUID REFERENCES presets(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE website_data (
  website_id UUID PRIMARY KEY REFERENCES websites(id),
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE website_sections (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES websites(id),
  extension_id UUID REFERENCES extensions(id),
  section_type TEXT NOT NULL DEFAULT 'custom',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  layout TEXT NOT NULL DEFAULT 'full',
  settings JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id, slug)
);

CREATE TABLE website_pages (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES websites(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  is_home BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id, slug)
);

CREATE TABLE presets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  config JSONB NOT NULL DEFAULT '{}',  -- sections, extensions, pages
  thumbnail_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extensions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  default_settings JSONB NOT NULL DEFAULT '{}',
  config_schema JSONB,      -- ConfigSchema for dynamic UI
  data_display JSONB,       -- DataDisplay for extension data
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE website_extensions (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES websites(id),
  extension_id UUID NOT NULL REFERENCES extensions(id),
  settings JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id, extension_id)
);

CREATE TABLE events (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,  -- system, account, website, extension, billing, etc.
  priority TEXT NOT NULL DEFAULT 'normal',
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY,
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id),
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  categories_enabled JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, endpoint)
);

CREATE TABLE files (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  compressed_size BIGINT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_storage_quotas (
  account_id UUID PRIMARY KEY REFERENCES accounts(id),
  total_bytes BIGINT NOT NULL DEFAULT 0,
  quota_bytes BIGINT NOT NULL DEFAULT 1073741824,  -- 1 GB
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. `data/` – Runtime (non versionné)

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

## 8. Flux de communication

```
Frontend (Astro + React)
    ↓ authentifié avec JWT
┌─────────────────────────────────────────┐
│         Core API (Rust)                 │
│  ├─ Auth                                │
│  ├─ Accounts & Integrations             │
│  ├─ Websites, Sections, Pages           │
│  ├─ Extensions (catalog + activation)   │
│  ├─ Events (publish/subscribe)          │
│  ├─ Files (upload/download/quota)       │
│  ├─ Notifications                       │
│  ├─ WebSocket (temps réel)              │
│  └─ Billing (Stripe)                    │
└─────────────────────────────────────────┘
    ↑                           ↑
    │ GET /accounts/:id/data   │ POST /events (listening)
    │                           │
    │ Extensions                Worker
    ├──────────────────────────→│
    │ • github-sync             ├─→ Github Sync job
    │ • analytics               └─→ analytics processor
    │
    └─→ Résultats stockés dans website_data (JSONB)
```

---

## 9. Communication Temps Réel

```
┌─────────────────┐     ┌──────────────────────┐
│   Dashboard     │     │  Redis Pub/Sub       │
│   (React)       │     │                      │
│                 │     │  Channels:           │
│  useWebSocket() │     │  - asap:sync:website │
│  useNotifications()   │  - asap:sync:extension│
│  usePresence()  │     │  - asap:sync:file    │
└────────┬────────┘     │  - asap:presence     │
         │               │  - asap:notifications│
         ↓               └──────────┬───────────┘
┌────────┴────────┐             │
│  WebSocket /ws   │─────────────┘
│  (Rust/Axum)     │
│                  │
│  - Auth JWT      │
│  - Heartbeat     │
│  - Broadcast     │
└──────────────────┘
