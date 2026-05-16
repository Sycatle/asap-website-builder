# Architecture Overview

**Dernière mise à jour :** 31 décembre 2025

## Contexte global

ASAP est une plateforme de génération de sites web ultra-rapides basée sur une architecture **core + extensions**. Le core expose une API unifiée de gestion des utilisateurs et des données, tandis que les extensions implémentent toutes les fonctionnalités (générateurs, rendus, analytics, etc.).

Cette approche permet :

- **Séparation des préoccupations** : le core gère l'authentification, l'isolation multi-tenant et la persistance
- **Réutilisabilité** : les extensions peuvent être développées indépendamment et consommer les données du core
- **Extensibilité** : ajouter de nouvelles fonctionnalités sans modifier le core
- **DRY/KISS** : packages partagés pour éviter la duplication de code
- **Parité rendu** : même composants React pour preview (Studio) et production (Sites publics)

---

## Principes architecturaux

### 1. Le Core = Structure + Données utilisateur

Le core expose une API centralisée qui :

- Gère l'**authentification** et l'**isolation multi-tenant**
- Centralise les **données utilisateur** (profil, paramètres, intégrations GitHub, etc.)
- Fournit une **structure unifiée** pour les projets/sites web
- Émet des **événements métier** pour les modules
- Gère les **droits d'accès** via account_id

### 2. Les Modules = Toutes les fonctionnalités

Chaque module implémente une fonctionnalité spécifique :

- **Générateur GitHub** : récupère les données utilisateur du core → génère la structure du site
- **Générateur IA** : utilise les données du core → génère du contenu avancé
- **Themes** : appliquent des styles sur la structure du core
- **Analytics** : consomment les événements du core

### 3. Données utilisateur centralisées

Les données utilisateur vivent dans le core, pas dans les extensions :

```
┌─────────────────────────────────────────┐
│         Core (API ASAP)                 │
│  ┌─────────────────────────────────────┐│
│  │  Accounts                           ││
│  │  ├─ profile (nom, email, etc.)      ││
│  │  ├─ integrations (GitHub, etc.)     ││
│  │  ├─ preferences                     ││
│  │  └─ plan & billing info             ││
│  └─────────────────────────────────────┘│
│                                         │
│  Extensions accèdent via API au Core    │
└─────────────────────────────────────────┘
        ↓           ↓           ↓
   [Generator]  [Theme]   [Analytics]
```

---

## Composants principaux

### Control Plane API (Rust / Axum)

L'API expose plusieurs catégories de routes :

#### A. Routes Core - Gestion des données utilisateur

- **Authentification** : signup, login, refresh token, change password
- **Profil utilisateur** : récupérer/modifier profil, intégrations (GitHub)
- **Données métier** : créer/lire/modifier les projets et websites
- **Événements** : publier des événements pour les modules
- **Fichiers** : upload avec compression, gestion quotas, audit trail

#### B. Routes Extensions - Enregistrement et configuration

- **Extension catalog** : liste des extensions disponibles
- **Extension config** : configuration per-website des extensions
- **Extension actions** : exécution d'actions sur les extensions
- **Extension data** : données spécifiques aux extensions

#### C. Routes Temps Réel - Notifications et Sync

- **Notifications** : CRUD, mark as read, paramètres personnalisables
- **Push notifications** : subscription, unsubscription, clés VAPID
- **WebSocket** : `/ws` pour sync temps réel authentifiée
- **Redis Pub/Sub** : distribution événements multi-instances

#### D. Routes Paiements - Monétisation

- **Stripe** : création checkout sessions, webhooks
- **Abonnements** : plans récurrents, usage-based pricing

---

### Workers (Rust / Tokio)

Les workers consomment les événements émis par le core et exécutent les tâches des modules :

- **Event processing** : à la réception d'événements (ex. `USER_UPDATED`, `WEBSITE_PUBLISHED`), les workers distribuent ces événements aux modules abonnés

- **Extension tasks** : chaque extension enregistrée peut avoir des tâches background :
  - `GitHubGenerator::sync_repos()` - récupère les repos GitHub
  - `AIGenerator::generate_content()` - génère du contenu avec IA
  - `Projections::render()` - génère les fichiers de projection

- **Tâches périodiques** : nettoyage, maintenance, resync GitHub (si activé)

---

### Rendering & Delivery

Le rendu des pages est assuré par **Astro**, un générateur de sites orienté contenu :

- **Dashboard (privé)** : pages `/app/*` pour éditer le site web, qui consomment l'API Rust protégée par JWT/cookies.

- **Pages publiques** : les pages accessibles via `{slug}.asap.cool` lisent en priorité les fichiers projetés (`data/sites/<slug>.json`) et n'appellent l'API qu'en dernier recours. Cela permet des temps de chargement (TTFB et LCP) très bas même sans CDN.

- **Séparation du rendu et du back-end** : Astro est découplé du reste du système, ce qui facilite l'ajout de thèmes, de composants ou de frontends alternatifs à l'avenir.

---

### Base de données

ASAP utilise **PostgreSQL** comme source de vérité pour le core :

#### Tables Core

| Table | Responsabilité |
|-------|-----------------|
| `accounts` | Profil utilisateur centralisé avec plan & billing |
| `tenants` | Isolation multi-tenant |
| `account_data` | Données étendues (GitHub, intégrations, préférences) |
| `websites` | Structure du site (slug, statut, création mode, preset) |
| `website_data` | Contenu du website (JSONB extensible) |
| `website_sections` | Sections du site (Hero, About, Projects, etc.) |
| `website_pages` | Pages multi-pages du website |
| `website_extensions` | Extensions activées par website (many-to-many) |
| `presets` | Templates prédéfinis pour création rapide |
| `extensions` | Catalogue des extensions disponibles |
| `events` | Événements métier pour les modules |
| `notifications` | Notifications utilisateur in-app |
| `notification_queue` | Queue de consolidation des notifications |
| `push_subscriptions` | Abonnements aux notifications push (PWA) |
| `files` | Fichiers uploadés avec quotas |
| `file_operations_audit` | Audit trail des opérations fichiers |

#### Architecture multi-tenant

- Chaque `account` appartient à un seul `tenant`
- Chaque `tenant` peut avoir plusieurs `websites`
- Chaque `website` a des `sections`, `pages` et des `extensions` activées
- `RLS (Row Level Security)` : assure que les données ne fuient pas entre tenants
- Toutes les lectures/écritures passent par `account_id`

### Redis Cache & Pub/Sub

ASAP utilise **Redis** pour plusieurs fonctionnalités critiques :

#### Cache des sites publics

- **Projections websites** : fichiers JSON mis en cache pour des temps de réponse <10ms
- **Compression multi-format** : gzip, brotli, zstd selon le client
- **TTL configuré** : 24h par défaut, invalidation automatique

#### Pub/Sub temps réel

- **Distribution multi-instances** : permet le scale horizontal de l'API
- **Channels dédiés** :
  - `asap:sync:website` - événements websites
  - `asap:sync:extension` - événements extensions
  - `asap:sync:file` - événements fichiers
  - `asap:presence` - présence utilisateurs
  - `asap:notifications` - notifications push

### WebSocket Server

Architecture WebSocket intégrée au backend :

- **Authentification JWT** : vérification token avant communication
- **Contrôle d'accès par compte** : filtrage des événements par account_id
- **Registry des clients** : tracking des connexions actives par account
- **Heartbeat automatique** : détection des connexions mortes
- **Graceful shutdown** : fermeture propre des connexions

### Progressive Web App (PWA)

Frontend optimisé pour installation native :

- **Service Worker** : 802 lignes, stratégies de cache adaptatives
- **Manifest complet** : Share Target, File Handlers, 14 tailles d'icônes
- **Support offline** : queue de sync, retry automatique
- **Notifications push** : Web Push API, clés VAPID, support multi-navigateurs
- **Score Lighthouse** : 93/100 PWA

### Système de Paiements

Intégration **Stripe** pour la monétisation :

- **Provider abstrait** : interface `PaymentGateway` pour extensibilité
- **Checkout sessions** : création de sessions de paiement sécurisées
- **Webhooks Stripe** : traitement asynchrone des événements
- **Abonnements récurrents** : support des plans mensuels/annuels

---

## Flux de données

### Scénario : Utilisateur crée un website avec un Preset

```
1. SIGNUP (Core)
   ├─> POST /auth/signup
   ├─> INSERT accounts, tenants
   └─> EMIT(ACCOUNT_CREATED)

2. CREATE FROM PRESET (Core)
   ├─> POST /websites/from-preset {preset_id, slug}
   ├─> INSERT website (creation_mode = from_preset)
   ├─> INSERT website_sections (depuis preset.config.sections)
   ├─> INSERT website_extensions (depuis preset.config.extensions)
   └─> EMIT(WEBSITE_CREATED)

3. CONFIGURE GITHUB (Core)
   ├─> PUT /accounts/:id/integrations/github {github_username}
   ├─> UPDATE account_data.integrations
   └─> EMIT(ACCOUNT_INTEGRATION_ADDED)

4. SYNC (Extension GitHub Sync)
   ├─> Worker reçoit ACCOUNT_INTEGRATION_ADDED
   ├─> Extension appelle Core: GET /accounts/:id/data
   ├─> Core retourne account_data (GitHub username, etc.)
   ├─> Extension appelle GitHub API
   ├─> Extension stocke résultats dans WEBSITE_DATA (JSONB)
   └─> EMIT(GITHUB_REPOS_SYNCED)

5. RENDER (Extension Theme Engine)
   ├─> Worker reçoit WEBSITE_PUBLISHED
   ├─> Extension appelle Core: GET /websites/:id + sections + pages
   ├─> Extension récupère la structure + contenu + sections + pages
   ├─> Extension applique le thème
   ├─> Extension génère data/sites/<slug>.json
   └─> EMIT(WEBSITE_RENDERED)

6. SERVE (Frontend Astro)
   ├─> GET {slug}.asap.cool
   ├─> Astro lit data/sites/<slug>.json
   └─> Rendu utilisateur
```

---

## Packages Partagés (Monorepo)

### @asap/shared

Package central contenant tous les types, constantes et utilitaires partagés entre les applications.

```
packages/shared/
├── src/
│   ├── types.ts      # Types: Section, Website, Page, Theme, Preset, etc.
│   ├── constants.ts  # SECTION_TYPES, SECTION_LAYOUTS, ASAP_DOMAIN
│   ├── utils.ts      # slugify, validateSlug, hexToRgb, buildThemeStyles
│   ├── presets.ts    # Définitions des presets (portfolio, saas-landing, etc.)
│   └── index.ts      # Re-exports
├── package.json
└── tsconfig.json
```

**Principe DRY :** Ce package élimine la duplication de types définis précédemment dans 4+ fichiers différents.

### @asap/renderers

Package central contenant tous les composants de rendu, utilisés par le preview dashboard et les sites publics.

```
packages/renderers/
├── src/
│   ├── components/
│   │   ├── saas/           # Composants landing SaaS
│   │   │   ├── Navigation.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── CTA.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/             # Composants UI de base
│   │       ├── button.tsx
│   │       ├── icons.tsx
│   │       └── index.ts
│   ├── renderers/
│   │   ├── index.tsx       # Registry principal
│   │   ├── landing.tsx     # LandingSectionRenderer (SaaS)
│   │   └── standard.tsx    # HeroRenderer, AboutRenderer, etc.
│   ├── types.ts            # Re-export depuis @asap/shared
│   ├── utils.ts            # Utilitaires rendu
│   └── index.ts            # Re-exports
├── package.json
└── tsconfig.json
```

**Architecture Single Source of Truth :** Un seul package pour tous les composants de rendu.
- Prévisualisation identique au rendu final
- Partage de styles et logique entre dashboard et sites publics
- Support multi-catégories (portfolio, SaaS landing, etc.)

### Types de Sections Supportés

#### Portfolio / Freelance
| Type | Description | Layouts |
|------|-------------|---------|
| `hero` | Section d'accueil principale | full |
| `about` | Présentation personnelle | full, split |
| `skills` | Compétences techniques | grid, list |
| `projects` | Galerie de projets | grid, cards |
| `experience` | Parcours professionnel | timeline, list |
| `education` | Parcours éducatif | timeline, list |
| `contact` | Formulaire de contact | full, split |
| `testimonials` | Témoignages clients | cards |
| `services` | Services proposés | cards, grid |
| `pricing` | Grille tarifaire | cards |
| `faq` | Questions fréquentes | list |
| `gallery` | Galerie d'images | grid |
| `blog` | Articles de blog | list, grid |
| `custom` | Section personnalisée | full, split, grid, cards, list |

#### Landing SaaS (nouveau)
| Type | Description |
|------|-------------|
| `navigation` | Header sticky avec logo, nav, auth buttons |
| `hero` | Hero avec headline, CTAs, social proof |
| `features` | Grille de fonctionnalités avec icônes |
| `how-it-works` | Process step-by-step |
| `pricing` | Comparaison des plans |
| `testimonials` | Témoignages clients |
| `cta` | Call-to-action section |
| `footer` | Footer avec liens et réseaux sociaux |

---

## Infrastructure Docker

### Configuration Multi-environnement

```
infra/
├── docker-compose.yml          # Services de base (postgres, redis, migrations)
├── docker-compose.dev.yml      # Overrides dev (hot reload, volumes)
├── docker-compose.prod.yml     # Production (healthchecks, limits, networking)
├── .env.prod.example           # Template variables production
├── Dockerfile.api              # Build API Rust
├── Dockerfile.worker           # Build Worker Rust
├── Dockerfile.web              # Build Dashboard Astro (pnpm workspaces)
├── Dockerfile.sites            # Build Sites Astro (pnpm workspaces)
└── migrations/                 # Migrations SQL
```

### Services Production

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | postgres:15-alpine | - | Base de données (réseau interne uniquement) |
| `redis` | redis:7-alpine | - | Cache & Pub/Sub |
| `migrations` | postgres:15-alpine | - | Exécution migrations au démarrage |
| `api` | asap-api:latest | 3000 | API Rust/Axum |
| `worker` | asap-worker:latest | - | Worker Rust/Tokio |
| `web` | asap-web:latest | 4321 | Dashboard Astro |
| `sites` | asap-sites:latest | 4322 | Sites publics Astro |

### Caractéristiques Production

- **Healthchecks** : Tous les services avec health endpoints
- **Resource limits** : Memory limits par conteneur (256M-512M)
- **Network isolation** : Réseau dédié `asap-prod-network`
- **Persistent volumes** : `postgres_data_prod`, `redis_data_prod`
- **Non-root users** : Containers web/sites s'exécutent en user `astro`
- **Multi-stage builds** : Images optimisées (base → deps → builder → runtime)

### Commandes Makefile

```bash
# Développement
make dev              # Start full dev environment
make dev-build        # Rebuild and start
make logs             # View logs

# Production
make build-prod-full  # Build all production images (no cache)
make prod-up          # Start production
make prod-down        # Stop production
make prod-logs        # View production logs
```

---

## Applications Frontend

### apps/web - Dashboard Principal

Application Astro + React pour le dashboard utilisateur.

```
apps/web/
├── src/
│   ├── components/
│   │   ├── features/       # Modules: dashboard, cloud, analytics, notifications
│   │   ├── studio/         # Éditeur visuel (studio-page/)
│   │   ├── onboarding/     # Flow onboarding (presets/, ui/)
│   │   ├── shared/         # command-palette, confirm-dialog, stat-card
│   │   ├── ui/             # shadcn/ui components
│   │   └── layouts/        # AppShell, Sidebar
│   ├── i18n/
│   │   ├── locales/        # en/, fr/
│   │   └── hooks/          # useLanguage
│   ├── lib/
│   │   ├── api/            # Clients API
│   │   └── store/          # State management
│   └── pages/
│       ├── index.astro     # Landing page
│       ├── login.astro     # Login
│       └── app/[...path].astro  # SPA dashboard
├── package.json
└── astro.config.mjs
```

### apps/sites - Sites Publics

Application Astro dédiée au rendu des sites publiés.

```
apps/sites/
├── src/
│   ├── components/
│   │   ├── rendering/      # SectionRenderer, SectionsWrapper
│   │   └── site/           # PageNavigation
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── api.ts          # Client API public
│   │   ├── site-data.ts    # Data fetching
│   │   └── rendering/      # Registry, normalize
│   ├── pages/
│   │   ├── index.astro     # Root redirect
│   │   ├── 404.astro       # 404 page
│   │   ├── [slug].astro    # Site homepage
│   │   └── [slug]/[page].astro  # Site subpages
│   └── styles/
│       └── global.css
├── package.json
└── astro.config.mjs
```

**Séparation des responsabilités :**
- `apps/web` = Interface d'administration (authentifiée)
- `apps/sites` = Rendu public (non authentifié)
- `@asap/renderers` = Single source of truth pour le rendu

---

## Flux de Données Frontend

### Synchronisation Website Context

```
1. Utilisateur se connecte
   └─> WebsiteContext initialisé

2. Chargement websites
   ├─> API GET /websites
   ├─> WebsiteContext.setWebsites()
   └─> localStorage persist sélection

3. Sélection website (SiteSwitcher)
   ├─> WebsiteContext.setCurrentWebsite()
   ├─> localStorage.setItem('selectedWebsiteId')
   └─> Tous composants mis à jour:
       ├─> Dashboard
       ├─> SectionsTab
       ├─> PagesList
       └─> PreviewPage

4. Édition sections
   ├─> useSections.updateSection()
   ├─> API PATCH /websites/:id/sections/:id
   ├─> Mise à jour optimiste UI
   └─> Preview synchronisé temps réel
```

### Parité Preview/Production

```
Preview (apps/web)                    Production (apps/sites)
       │                                      │
       ├─> @asap/renderers ◄────────────────►─┤
       │   HeroRenderer                       │
       │   AboutRenderer                      │
       │   SkillsRenderer                     │
       │   ...                                │
       │                                      │
       └─> Même CSS (TailwindCSS) ◄──────────►─┘
```

**Garantie :** Ce que l'utilisateur voit dans le preview = le rendu final du site publié.
