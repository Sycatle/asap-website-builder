<p align="center">
  <img src="https://img.shields.io/badge/status-MVP%20in%20development-yellow" alt="Status">
  <img src="https://img.shields.io/badge/license-Open--Core-blue" alt="License">
  <img src="https://img.shields.io/badge/rust-1.70+-orange" alt="Rust">
  <img src="https://img.shields.io/badge/astro-4.x-blueviolet" alt="Astro">
</p>

<h1 align="center">🚀 ASAP</h1>

<p align="center">
  <strong>Plateforme SaaS centralisée pour créateurs et entrepreneurs</strong>
</p>

<p align="center">
  Gère tes utilisateurs, tes clients, tes sites, tes modules, tes tokens IA et tes quotas — tout en un seul endroit.
</p>

---

## 📋 Table des matières

- [Vision](#-vision)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Stack technique](#-stack-technique)
- [Structure du projet](#-structure-du-projet)
- [Démarrage rapide](#-démarrage-rapide)
- [API Reference](#-api-reference)
- [Parcours utilisateur](#-parcours-utilisateur)
- [Modèle de données](#-modèle-de-données)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Vision

**ASAP** est une **plateforme SaaS centralisée** qui permet aux créateurs, entrepreneurs et agences de gérer l'ensemble de leurs outils, clients et ressources depuis un seul dashboard.

### L'approche ASAP

Au lieu d'utiliser 10 outils différents (un pour les sites, un pour l'IA, un pour les stats, etc.), les utilisateurs ont **un seul dashboard** où ils contrôlent :

| Élément | Gestion |
|--------|---------|
| **Sites & Portfolios** | Créer, publier, configurer des sites pour eux ou leurs clients |
| **Utilisateurs & Clients** | Inviter, gérer, assigner des ressources |
| **Modules** | Activer/désactiver les features (GitHub import, IA, Analytics, etc.) |
| **Tokens IA** | Budget limité avec suivi par utilisateur/client |
| **Stockage Cloud** | Quota d'espace partagé ou per-client |
| **Statistiques** | Dashboards unifiées (visites, utilisations, coûts) |
| **Intégrations** | GitHub, API keys, webhooks |
| **Facturation** | Plans, abonnements, usage-based pricing |

### La structure

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard ASAP (Frontend)                              │
│  ┌───────────────────────────────────────────────────────┐
│  │  • Mes Sites                                          │
│  │  • Mes Utilisateurs/Clients                           │
│  │  • Mes Modules                                        │
│  │  • Mes Tokens IA (budget)                             │
│  │  • Mon Stockage Cloud                                 │
│  │  • Mes Stats & Facturation                            │
│  └───────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
            ↓ (API centralisée)
┌─────────────────────────────────────────────────────────┐
│  API Core ASAP (Rust/Axum)                              │
│                                                         │
│  • Authentification & tenants                           │
│  • Gestion utilisateurs/clients                         │
│  • Ressources (sites, modules, tokens, etc.)            │
│  • Quotas & limitations                                 │
│  • Facturation & usage tracking                         │
│  • Événements & webhooks                                │
└─────────────────────────────────────────────────────────┘
            ↓ (Consomment l'API)
┌─────────────────────────────────────────────────────────┐
│  Produits (Modules)                                     │
│                                                         │
│  • Sites (GitHub import, rendering, publication)        │
│  • IA (text generation, image generation)                │
│  • Analytics (page views, user tracking)                 │
│  • Cloud Storage (file hosting)                          │
│  • (+ futurs produits)                                   │
└─────────────────────────────────────────────────────────┘
```

### Qui utilise ASAP ?

1. **Indépendants** : créent des sites pour eux, gèrent 1-5 clients
2. **Agences** : créent des sites/apps pour leurs clients, gèrent une équipe
3. **Creators** : utilisent l'IA + les sites pour monétiser leur audience
4. **Entreprises** : créent du contenu interne, sites clients, apps internes

---

## ✨ Caractéristiques principales

### Dashboard Tenant

Un endroit unique pour :
- 👥 **Gérer utilisateurs/clients** : créer, inviter, assigner ressources et quotas
- 📊 **Sites & Portfolios** : créer, publier, configurer, personnaliser par client
- 🔧 **Modules activés** : voir et configurer les features disponibles
- 💾 **Stockage Cloud** : upload, gestion des assets, quota par utilisateur/client
- 🤖 **Budget IA** : tokens limités, suivi par utilisation, partage entre utilisateurs
- 📈 **Statistiques** : dashboards unifiées (visites, coûts, utilisation, revenu)
- ⚙️ **Intégrations** : GitHub, OpenAI, APIs externes, webhooks
- 💳 **Facturation** : gestion des abonnements, usage-based pricing, invoices

### API Core (infrastructure centralisée)

- ✅ **Multi-tenant** : isolation complète par tenant_id, RLS en base
- ✅ **Authentification** : JWT, OAuth (GitHub), 2FA optionnel
- ✅ **Gestion des quotas** : IA tokens, stockage, sites par utilisateur
- ✅ **Event-driven** : Core → Modules via événements persistés
- ✅ **Facturations** : tracking usage, projections de coûts, webhooks
- ✅ **Hiérarchie utilisateurs** : tenants + sub-users/clients avec permissions

### Modules (produits intégrés)

| Module | Description | Usage |
|--------|-------------|-------|
| **Sites** | Créer/publier sites statiques rapides (GitHub import, custom domains) | Core product |
| **IA** | Text generation, image gen, SEO optimization avec budget tokens | Premium |
| **Analytics** | Page views, user tracking, conversion funnels, heatmaps | Premium |
| **Cloud Storage** | File hosting, CDN delivery, quota management | Per-client |
| **Themes** | Pre-built designs, custom CSS, publishing | Free + Premium |
| **Intégrations** | GitHub sync, API access, webhooks, Zapier/Make | Core |

---

## 🏗 Architecture

ASAP adopte une architecture **Core + Modules** où :

- **Core API** = gestion centralisée des utilisateurs, données, portfolios
- **Modules** = implémentent toutes les fonctionnalités (GitHub import, rendering, analytics, etc.)
- **Workers** = exécutent les tâches des modules en réponse aux événements

```
Frontend (Astro)
    ↓ authentifié
┌─────────────────────────────────────────────────────────────┐
│           Core API (Rust/Axum)                              │
│  ┌──────────────────────────────────────────────────────────┐
│  │  Gestion Centralisée                                     │
│  │  • Auth & Users (email, password)                        │
│  │  • User Data (GitHub username, tokens, prefs)           │
│  │  • Portfolios (structure: slug, title, tagline)         │
│  │  • Portfolio Data (JSONB - contenu généré par modules)  │
│  │  • Events (USER_CREATED, INTEGRATION_ADDED, etc.)       │
│  │  • Module Registry & Config                              │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
    ↑                                   ↑
    │ GET /users/:id/data             │ POST /events
    │ PUT /portfolios/:id/data        │ (modules écoutent)
    │ PATCH integrations              │
    │                                   │
    │ Modules                           Worker
    ├──────────────────────────────────┤
    │                                   ├─→ github-generator
    │ • github-generator                ├─→ ai-generator
    │ • ai-generator                    ├─→ theme-renderer
    │ • themes                          └─→ analytics
    │ • analytics                   (exécute les modules)
    │ • projections
    │
    └─→ Résultats → portfolio_data (JSONB du core)
         ↓
      data/sites/<slug>.json (projection)
         ↓
      Frontend lit la projection
```

### Principes architecturaux

| Aspect | Description |
|--------|-------------|
| **Core = Structure** | Données utilisateur, isolation multi-tenant, événements |
| **Modules = Features** | Chaque module implémente une fonctionnalité (GitHub, IA, rendu, etc.) |
| **Données centralisées** | Les données utilisateur vivent dans le core, modules les consomment dynamiquement |
| **Event-driven** | Les modules réagissent aux événements du core |
| **CQRS lite** | Projections locales pour les lectures publiques, Core API pour les écritures |

---

## 🛠 Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **API** | Rust + Axum | Performance native, sécurité mémoire, async robuste |
| **Database** | PostgreSQL | ACID, JSONB, RLS pour isolation multi-tenant |
| **Worker** | Rust + Tokio | Jobs asynchrones performants |
| **Frontend** | Astro | SSG/SSR optimisé, excellent pour les sites de contenu |
| **Auth** | JWT / Cookies | Simple et stateless |

### Décisions architecturales clés

| Décision | Contexte | Alternative rejetée |
|----------|----------|---------------------|
| **Rust backend** | Performances et sécurité mémoire critiques | Node.js (CPU), Go (typage), PHP (async) |
| **Projections locales** | Milliers de portfolios à servir rapidement | Lecture directe PostgreSQL |
| **Monorepo open-core** | Contributions externes + modules premium | Multi-repos (complexité) |

---

## 📁 Structure du projet

```
asap/
├── core/                          # Core API (open-source)
│   ├── domain/                    # Types et structures
│   ├── api/                       # Routes HTTP
│   └── schemas/                   # JSON schemas
│
├── modules/                       # Modules (fonctionnalités)
│   ├── github-generator/          # Import GitHub
│   ├── ai-generator/              # Génération IA
│   ├── themes/                    # Thèmes de rendu
│   └── analytics/                 # Analytics
│
├── apps/                          # Applications
│   ├── api/                       # Core API executable
│   ├── worker/                    # Module task executor
│   └── web/                       # Frontend Astro
│
├── infra/                         # Infrastructure
│   ├── docker-compose.yml
│   ├── migrations/
│   └── env.example/
│
├── data/                          # Runtime (non versionné)
│   ├── sites/                     # Projections générées
│   └── logs/
│
└── docs/                          # Documentation
```

### Rôle de chaque dossier

| Dossier | Responsabilité |
|---------|-----------------|
| `core/` | Gestion utilisateurs, data, portfolios, événements (open-source) |
| `modules/` | Implémentent les features (GitHub, IA, rendering, etc.) |
| `apps/api/` | Core API executable (Rust) |
| `apps/worker/` | Event processor et module executor (Rust) |
| `apps/web/` | Frontend dashboard + pages publiques (Astro) |
| `infra/` | Docker, migrations, configuration |

---

## 🚀 Démarrage rapide

### Prérequis

- **Rust** 1.70+
- **Node.js** 18+
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (ou via Docker)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/asap.git
cd asap

# 2. Copier les fichiers d'environnement
cp infra/env.example/api.env infra/api.env
cp infra/env.example/worker.env infra/worker.env
cp infra/env.example/web.env infra/web.env

# 3. Lancer l'environnement complet
docker compose up -d

# 4. Appliquer les migrations
./scripts/migrate.sh

# 5. (Optionnel) Créer des données de démo
./scripts/seed-demo.sh
```

### Développement local

```bash
# Terminal 1 - API
cd apps/api && cargo run

# Terminal 2 - Worker
cd apps/worker && cargo run

# Terminal 3 - Frontend
cd apps/web && npm install && npm run dev
```

### URLs locales

| Service | URL |
|---------|-----|
| Landing | http://localhost:4321 |
| Dashboard | http://localhost:4321/app |
| API | http://localhost:3000 |
| Portfolio public | http://{slug}.localhost:4321 (en local) / `{slug}.asap.cool` (prod) |

---

## 📡 API Reference

### Authentification

#### `POST /auth/signup`
Crée un utilisateur, un tenant et un site par défaut.

```json
// Request
{
  "email": "dev@example.com",
  "password": "securepassword",
  "slug": "mon-portfolio"
}

// Response 201
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "email": "dev@example.com" },
  "site": { "slug": "mon-portfolio" }
}
```

#### `POST /auth/login`
Authentifie et retourne un JWT.

```json
// Request
{ "email": "dev@example.com", "password": "securepassword" }

// Response 200
{ "token": "eyJhbG..." }
```

### Sites (authentifié)

#### `GET /me/site`
Retourne la configuration du site de l'utilisateur.

```json
// Response 200
{
  "id": "uuid",
  "slug": "mon-portfolio",
  "status": "draft",
  "config": { /* SiteConfig */ },
  "published_config": null,
  "title": "John Doe",
  "tagline": "Développeur Full-Stack",
  "github_username": "johndoe"
}
```

#### `PUT /me/site`
Met à jour les informations du site.

```json
// Request
{
  "title": "John Doe",
  "tagline": "Senior Developer",
  "github_username": "johndoe"
}
```

#### `POST /me/site/generate-from-github`
Importe les projets depuis GitHub.

```json
// Request
{ "github_username": "johndoe" }

// Response 200 - Nouvelle config avec projets importés
```

#### `POST /me/site/publish`
Publie le site et le rend accessible publiquement.

```json
// Response 200
{ "message": "Site published", "status": "published" }
```

### Public

#### `GET /api/public/site/:slug`
Fallback pour récupérer un site publié (si projection absente).

---

## 🔄 Parcours utilisateur

### 1. Inscription (Core)

```
User signup
    ↓
POST /auth/signup
    ↓
Core crée user, tenant, portfolio
    ↓
Redirige vers dashboard
```

### 2. Configuration GitHub (Core + Module)

```
User fournit GitHub username
    ↓
PUT /users/:id/integrations/github
    ↓
Core émet USER_INTEGRATION_ADDED
    ↓
GitHubGenerator module exécuté :
  • Lit user_data.integrations depuis Core
  • Appelle GitHub API
  • PATCH /portfolios/:id/data (stocke contenu)
```

### 3. Publication + Rendering (Core + Theme Module)

```
User clique "Publier"
    ↓
POST /portfolios/:id/publish
    ↓
Core émet PORTFOLIO_PUBLISHED
    ↓
Theme module exécuté :
  • GET /portfolios/:id (contenu du core)
  • Applique thème
  • Génère data/sites/<slug>.json
    ↓
Projection prête → portfolio public accessible
```

---

## 💾 Modèle de données

### Tables Core (Source de vérité)

| Table | Description |
|-------|-------------|
| `users` | Profil utilisateur (email, password_hash) |
| `tenants` | Isolation multi-tenant |
| `user_data` | Données étendues (GitHub username, tokens, preferences) |
| `portfolios` | Structure portfolio (slug, title, tagline, status) |
| `portfolio_data` | Contenu généré par les modules (JSONB) |
| `events` | Événements système (USER_CREATED, INTEGRATION_ADDED, etc.) |
| `modules` | Registry des modules disponibles |
| `module_configs` | Configuration per-tenant des modules |

### Flux de données

```
User Data (Core)
├─ email
├─ password_hash
└─ integrations
   └─ github: { username, token }

    ↓ Modules lisent via API

Modules (GitHub Generator, etc.)
    ↓ Écrivent contenu générés

Portfolio Data (Core JSONB)
├─ projects
├─ links
└─ (autres données modulaires)

    ↓ Theme Module lit et applique

Projection (data/sites/<slug>.json)
    ↓ Frontend lit

Public Portfolio
```

---

## 🗺 Roadmap

### Phase 1 - Core MVP + Dashboard (En cours) 🔨

> **Focus :** Core API robuste + Dashboard pour gérer users, clients, sites et quotas

- [ ] Core API (auth, multi-tenant, users, portfolios, quotas, events)
- [ ] Worker (event processor + module executor)
- [ ] Dashboard principal (Astro)
  - [ ] Gestion utilisateurs/clients (invitations, permissions)
  - [ ] Gestion sites/portfolios
  - [ ] Vue quotas et budgets (IA tokens, stockage)
  - [ ] Facturation et usage tracking
- [ ] Modules initiaux
  - [ ] GitHub Generator (import repos)
  - [ ] Theme renderer (sites statiques)
- [ ] Authentification (JWT, OAuth GitHub)

### Phase 2 - Module Ecosystem & Quotas (Q2-Q3) 📦

> **Focus :** Modules payants + système de quotas avancé

- [ ] AIGenerator module (tokens limités)
- [ ] Analytics module (page views, tracking)
- [ ] Cloud Storage module (fichiers, quota)
- [ ] Quotas enforcement (rate limiting, usage tracking)
- [ ] Module marketplace (thèmes, composants)
- [ ] Advanced dashboard (graphs, KPIs)

### Phase 3 - Facturation & Scaling (Q4) 💳

- [ ] Stripe integration (récurrent + usage-based)
- [ ] Invoicing system
- [ ] Webhooks & API access (Team+)
- [ ] Self-hosted licensing (Enterprise)
- [ ] Multi-language support

### Phase 4 - Enterprise & Global (Y2+) 🌍

- [ ] Advanced permission system
- [ ] Custom modules SDK
- [ ] Edge rendering (Cloudflare)
- [ ] International expansion
- [ ] White-label options

---

## 💰 Business Model

**ASAP** utilise un **modèle freemium + usage-based** pour monétiser :

### Plans SaaS

| Plan | Prix | Utilisateurs | Sites | Tokens IA | Stockage |
|------|------|--------------|-------|-----------|----------|
| **Free** | 0€ | 1 | 1 | 0 | 1GB |
| **Pro** | 29€/mois | 3 | 5 | 100K/mois | 50GB |
| **Team** | 99€/mois | Illimité | Illimité | 500K/mois | 500GB |

### Revenue Streams

1. **Abonnements récurrents** (SaaS)
2. **Usage-based** (tokens IA extra, stockage, domains)
3. **Marketplace** (70/30 split sur thèmes/plugins)
4. **Enterprise & Self-hosted** (licensing annuel)

**Voir [BUSINESS.md](docs/BUSINESS.md) pour plus de détails.**

---

## 🤝 Contributing

ASAP suit un modèle **open-core**. Le cœur (`core/`) est open-source, les modules premium (`modules/`) sont privés.

### Comment contribuer

1. Fork le repository
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Guidelines

- Code Rust : suivre les conventions `rustfmt` et `clippy`
- Code TypeScript : ESLint + Prettier
- Tests requis pour toute nouvelle fonctionnalité
- Documentation à jour

---

## 📄 License

Ce projet suit un modèle **Open-Core** :

- **`core/`** : MIT License - Libre d'utilisation, modification et distribution
- **`modules/`** : Propriétaire - Licence commerciale requise
- **SaaS** : Conditions d'utilisation sur asap.cool

---

## 📚 Documentation supplémentaire

| Document | Description |
|----------|-------------|
| [SPEC_MVP.md](docs/SPEC_MVP.md) | Spécifications fonctionnelles du MVP |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [API_SPEC.md](docs/API_SPEC.md) | Contrat d'API complet |
| [FLOWS.md](docs/FLOWS.md) | Parcours utilisateur détaillés |
| [DECISIONS.md](docs/DECISIONS.md) | Journal des décisions (ADR) |
| [STRUCTURE.md](docs/STRUCTURE.md) | Structure du monorepo |
| [BUSINESS.md](docs/BUSINESS.md) | Vision & modèle d'affaires |

---

<p align="center">
  <strong>Built with ❤️ for developers, by developers</strong>
</p>

<p align="center">
  <a href="https://asap.cool">Website</a> •
  <a href="https://github.com/votre-org/asap/issues">Issues</a> •
  <a href="https://twitter.com/asapcool">Twitter</a>
</p>
