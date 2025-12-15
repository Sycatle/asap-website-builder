<p align="center">
  <img src="https://img.shields.io/badge/status-Backend%20Complete%20|%20Frontend%20In%20Progress-blue" alt="Status">
  <img src="https://img.shields.io/badge/license-Open--Core-blue" alt="License">
  <img src="https://img.shields.io/badge/rust-1.70+-orange" alt="Rust">
  <img src="https://img.shields.io/badge/tests-100%2B%20passing-green" alt="Tests">
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
| **Sites Web** | Créer, publier, configurer des sites modulaires avec sections personnalisables |
| **Utilisateurs & Clients** | Inviter, gérer, assigner des ressources |
| **Modules** | Activer/désactiver les features (GitHub Sync, Blog, Analytics, etc.) |
| **Sections** | Hero, About, Projects, Skills, Contact, Blog, Gallery, etc. |
| **Presets** | Templates prêts à l'emploi pour démarrer rapidement |
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
- 🌐 **Sites Web modulaires** : créer avec sections personnalisables (Hero, About, Projects, etc.)
- 📦 **Presets** : démarrer rapidement avec des templates prédéfinis
- 🔧 **Modules activés** : GitHub Sync, Blog Engine, Contact Form, Analytics, Theme Engine
- 💾 **Stockage Cloud** : upload, gestion des assets, quota par utilisateur/client
- 🤖 **Budget IA** : tokens limités, suivi par utilisation, partage entre utilisateurs
- 📈 **Statistiques** : dashboards unifiées (visites, coûts, utilisation, revenu)
- ⚙️ **Intégrations** : GitHub, OpenAI, APIs externes, webhooks
- 💳 **Facturation** : gestion des abonnements, usage-based pricing, invoices

### API Core (infrastructure centralisée)

- ✅ **Multi-tenant** : isolation complète par account_id, RLS en base
- ✅ **Authentification** : JWT, OAuth (GitHub), 2FA optionnel
- ✅ **Architecture modulaire** : Websites → Sections → Modules
- ✅ **Gestion des quotas** : IA tokens, stockage, sites par account
- ✅ **Event-driven** : Core → Modules via événements persistés
- ✅ **WebSocket temps réel** : synchronisation en direct, notifications push
- ✅ **Redis Pub/Sub** : distribution multi-instances des événements
- ✅ **Notifications** : in-app, push (PWA), paramètres personnalisables
- ✅ **Facturations** : Stripe integration, tracking usage, webhooks
- ✅ **Hiérarchie comptes** : tenants + sub-accounts/clients avec permissions
- ✅ **PWA complète** : installable, offline, score 93/100

### Modules (produits intégrés)

| Module | Description | Usage |
|--------|-------------|-------|
| **GitHub Sync** | Import automatique des projets depuis GitHub | Integration |
| **Blog Engine** | Blog complet avec posts et catégories | Content |
| **Contact Form** | Formulaire de contact avec protection spam | Engagement |
| **Analytics Tracker** | Tracking des visites et comportements | Analytics |
| **Theme Engine** | Thèmes personnalisables et styles | Appearance |
| **Cloud Storage** | File hosting, CDN delivery, quota management | Per-client |
| **Notifications** | Notifications in-app, push PWA, consolidation | Engagement |

### Types de Sections

| Section | Description | Layouts disponibles |
|---------|-------------|---------------------|
| **Hero** | Section d'accueil principale | Full |
| **About** | Présentation personnelle/entreprise | Split, Full |
| **Projects** | Galerie de projets | Grid, Cards |
| **Skills** | Compétences techniques | Grid, List |
| **Experience** | Parcours professionnel | Timeline, List |
| **Education** | Formation | Timeline, List |
| **Contact** | Formulaire de contact | Full, Split |
| **Blog** | Articles de blog | List, Grid |
| **Gallery** | Galerie d'images | Grid |
| **Testimonials** | Témoignages clients | Cards |
| **Services** | Services proposés | Cards, Grid |
| **Pricing** | Grille tarifaire | Cards |
| **FAQ** | Questions fréquentes | List |
| **Custom** | Section personnalisée | Tous |

---

## 🏗 Architecture

ASAP adopte une architecture **Core + Modules** où :

- **Core API** = gestion centralisée des utilisateurs, données, sites web
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
│  │  • Websites (structure: slug, title, sections)          │
│  │  • Website Sections (Hero, About, Projects, etc.)       │
│  │  • Website Modules (activated per website)              │
│  │  • Presets (templates prédéfinis)                       │
│  │  • Events (USER_CREATED, INTEGRATION_ADDED, etc.)       │
│  │  • Module Catalog & Config                               │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
    ↑                                   ↑
    │ GET /websites/:id/sections       │ POST /events
    │ PATCH /websites/:id/data         │ (modules écoutent)
    │ PATCH integrations               │
    │                                   │
    │ Modules                           Worker
    ├──────────────────────────────────┤
    │                                   ├─→ github-sync
    │ • github-sync                     ├─→ blog-engine
    │ • blog-engine                     ├─→ theme-engine
    │ • theme-engine                    └─→ analytics-tracker
    │ • analytics-tracker          (exécute les modules)
    │ • contact-form
    │
    └─→ Résultats → website_data (JSONB du core)
         ↓
      data/sites/<slug>.json (projection)
         ↓
      Frontend lit la projection
```

### Principes architecturaux

| Aspect | Description |
|--------|-------------|
| **Core = Structure** | Données utilisateur, websites, sections, isolation multi-tenant, événements |
| **Modules = Features** | Chaque module implémente une fonctionnalité (GitHub Sync, Blog, Analytics, etc.) |
| **Sections = Contenu** | Blocs de contenu modulaires avec types et layouts configurables |
| **Presets = Templates** | Configurations prédéfinies pour créer rapidement des sites |
| **Données centralisées** | Les données utilisateur vivent dans le core, modules les consomment dynamiquement |
| **Event-driven** | Les modules réagissent aux événements du core |
| **CQRS lite** | Projections locales pour les lectures publiques, Core API pour les écritures |

---

## 🛠 Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **API** | Rust + Axum | Performance native, sécurité mémoire, async robuste |
| **Database** | PostgreSQL | ACID, JSONB, RLS pour isolation multi-tenant |
| **Cache** | Redis | Caching des sites publics, Pub/Sub temps réel |
| **WebSocket** | Axum + tokio-tungstenite | Communication bidirectionnelle temps réel |
| **Worker** | Rust + Tokio | Jobs asynchrones performants |
| **Frontend** | Astro | SSG/SSR optimisé, excellent pour les sites de contenu |
| **PWA** | Service Worker + Manifest | Installation, offline, notifications push |
| **Auth** | JWT / Cookies | Simple et stateless |
| **Paiements** | Stripe API | Facturation et abonnements |

### Décisions architecturales clés

| Décision | Contexte | Alternative rejetée |
|----------|----------|---------------------|
| **Rust backend** | Performances et sécurité mémoire critiques | Node.js (CPU), Go (typage), PHP (async) |
| **Architecture Website/Sections** | Flexibilité et modularité du contenu | Structure monolithique rigide |
| **Projections locales** | Milliers de sites à servir rapidement | Lecture directe PostgreSQL |
| **Monorepo open-core** | Contributions externes + modules premium | Multi-repos (complexité) |

---

## 📁 Structure du projet

```
asap/
├── core/                          # Core API (open-source)
│   ├── domain/                    # Types et structures (Website, Section, Module)
│   ├── api/                       # Routes HTTP
│   └── shared/                    # Utilitaires partagés (config, auth, errors)
│
├── modules/                       # Modules (fonctionnalités)
│   ├── github-generator/          # Import GitHub
│   ├── themes/                    # Thèmes de rendu
│   ├── analytics/                 # Analytics
│   └── projections/               # Génération projections
│
├── apps/                          # Applications
│   ├── api/                       # Core API executable
│   ├── worker/                    # Module task executor
│   └── web/                       # Frontend Astro (React + TypeScript)
│
├── infra/                         # Infrastructure
│   ├── docker-compose.yml
│   ├── migrations/                # 6 migrations SQL
│   └── env.example
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
| `core/` | Gestion utilisateurs, websites, sections, modules, événements (open-source) |
| `core/domain/` | Types métier: Website, WebsiteSection, WebsiteModule, Preset, etc. |
| `core/shared/` | Configuration centralisée, JWT, gestion des erreurs |
| `modules/` | Implémentent les features (GitHub, Themes, Analytics, Projections) |
| `apps/api/` | Core API executable (Rust) |
| `apps/worker/` | Event processor et module executor (Rust) |
| `apps/web/` | Frontend dashboard + pages publiques (Astro + React) |
| `infra/` | Docker, migrations, configuration |

---

## 🚀 Démarrage rapide

### Prérequis

- **Rust** 1.70+
- **Node.js** 18+
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (ou via Docker)
- **Redis** 7+ (ou via Docker) - optionnel mais recommandé pour WebSocket et cache

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/asap.git
cd asap

# 2. Copier les fichiers d'environnement
cp infra/env.example/api.env infra/api.env
cp infra/env.example/worker.env infra/worker.env
cp infra/env.example/web.env infra/web.env

# 3. Configurer Redis (optionnel, pour WebSocket et cache)
# Ajouter dans infra/api.env et infra/worker.env :
# REDIS_URL=redis://localhost:6379

# 4. Lancer l'environnement complet (les migrations sont automatiques)
docker compose -f infra/docker-compose.yml up

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
| WebSocket | ws://localhost:3000/ws |
| Site public | http://{slug}.localhost:4321 (en local) / `{slug}.asap.cool` (prod) |

---

## 🗄️ Database Migrations

ASAP utilise un système de migrations automatiques intégré à Docker Compose.

### Comment ça fonctionne

1. **Migrations automatiques** : Lors du démarrage des services via `docker compose up`, un service `migrations` s'exécute automatiquement et applique toutes les migrations en attente.

2. **Format des fichiers** : Les migrations sont stockées dans `infra/migrations/` avec le format `YYYYMMDDHHMMSS_description.sql`.

3. **Tracking** : Les migrations appliquées sont enregistrées dans la table `_sqlx_migrations` pour éviter les réapplications.

### Commandes utiles

```bash
# Lancer les migrations manuellement
make migrate

# Réinitialiser la base de données (ATTENTION: supprime toutes les données)
make db-reset

# Setup complet avec migrations
make setup-db
```

### Ajouter une nouvelle migration

1. Créer un fichier dans `infra/migrations/` avec le format : `YYYYMMDDHHMMSS_description.sql`
   
   Exemple : `20240115120000_add_user_preferences.sql`

2. Écrire le SQL de la migration

3. Relancer les services ou exécuter `make migrate`

### Bonnes pratiques

- ✅ Toujours créer des migrations idempotentes quand possible (`CREATE IF NOT EXISTS`)
- ✅ Utiliser des transactions pour les migrations complexes
- ✅ Tester les migrations sur une base de données de test avant la production
- ❌ Ne jamais modifier une migration déjà appliquée en production

---

## 📡 API Reference

### Authentification

#### `POST /auth/signup`
Crée un utilisateur, un tenant et un website par défaut.

```json
// Request
{
  "email": "dev@example.com",
  "password": "securepassword",
  "slug": "mon-site"
}

// Response 201
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "email": "dev@example.com" },
  "website": { "slug": "mon-site" }
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

### Websites (authentifié)

#### `GET /websites`
Liste tous les websites du tenant.

```json
// Response 200
[
  {
    "id": "uuid",
    "slug": "mon-site",
    "title": "John Doe",
    "tagline": "Développeur Full-Stack",
    "status": "draft",
    "creation_mode": "from_preset",
    "preset_id": "uuid"
  }
]
```

#### `GET /websites/:id`
Retourne un website avec ses données.

```json
// Response 200
{
  "id": "uuid",
  "slug": "mon-site",
  "status": "draft",
  "title": "John Doe",
  "tagline": "Développeur Full-Stack",
  "creation_mode": "from_preset",
  "metadata": {},
  "data": {}
}
```

#### `PUT /websites/:id`
Met à jour les informations du website.

```json
// Request
{
  "title": "John Doe",
  "tagline": "Senior Developer"
}
```

### Sections (authentifié)

#### `GET /websites/:id/sections`
Liste les sections d'un website.

```json
// Response 200
[
  {
    "id": "uuid",
    "section_type": "hero",
    "slug": "hero",
    "title": "Welcome",
    "order": 0,
    "layout": "full",
    "visible": true
  },
  {
    "id": "uuid",
    "section_type": "projects",
    "slug": "projects",
    "title": "My Projects",
    "order": 1,
    "layout": "grid",
    "visible": true
  }
]
```

#### `POST /websites/:id/sections`
Crée une nouvelle section.

```json
// Request
{
  "section_type": "about",
  "slug": "about",
  "title": "About Me",
  "order": 2,
  "layout": "split"
}
```

#### `POST /websites/:id/sections/reorder`
Réordonne les sections.

```json
// Request
{
  "section_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Modules (authentifié)

#### `GET /modules/catalog`
Liste les modules disponibles dans le catalogue.

#### `GET /websites/:id/modules`
Liste les modules activés pour un website.

#### `POST /websites/:id/modules`
Active un module pour un website.

```json
// Request
{
  "module_id": "uuid",
  "settings": { "auto_sync": true }
}
```

### Presets

#### `GET /presets`
Liste les templates disponibles.

```json
// Response 200
[
  {
    "id": "uuid",
    "name": "Developer Website",
    "slug": "developer-website",
    "description": "Perfect for developers",
    "category": "professional"
  }
]
```

#### `POST /websites/from-preset`
Crée un website à partir d'un preset.

```json
// Request
{
  "preset_id": "uuid",
  "slug": "mon-site",
  "title": "Mon Site"
}
```

#### `POST /websites/:id/publish`
Publie le website et le rend accessible publiquement.

```json
// Response 200
{ "message": "Website published", "status": "published" }
```

### Notifications (authentifié)

#### `GET /notifications`
Liste des notifications avec filtres (category, priority, read/unread).

#### `GET /notifications/unread-count`
Retourne le nombre de notifications non lues.

#### `POST /notifications/mark-read`
Marquer une ou plusieurs notifications comme lues.

#### `POST /notifications/push/subscribe`
S'abonner aux notifications push (PWA).

#### `GET /notifications/push/vapid-key`
Récupérer la clé publique VAPID pour Web Push.

### Paiements (authentifié)

#### `POST /billing/checkout-session`
Créer une session de paiement Stripe.

```json
// Request
{
  "price_id": "price_xxx",
  "success_url": "https://app.asap.cool/success",
  "cancel_url": "https://app.asap.cool/cancel"
}
```

### WebSocket

#### `GET /ws`
Connexion WebSocket pour synchronisation temps réel.

**Authentification :** Envoyer `{"type": "auth", "token": "jwt_token"}` après connexion.

**Messages reçus :**
- `website_updated` - Website modifié
- `module_activated` - Module activé
- `file_uploaded` - Fichier uploadé
- `notification` - Nouvelle notification
- Et autres événements de synchronisation...

### Public

#### `GET /public/websites/:slug`
Récupère un website publié (fallback si projection absente).

---

## 🔄 Parcours utilisateur

### 1. Inscription (Core)

```
User signup
    ↓
POST /auth/signup
    ↓
Core crée user, tenant, website (avec preset par défaut)
    ↓
Redirige vers dashboard
```

### 2. Choix du Preset (Core)

```
User sélectionne un preset (Developer Website, Blog, etc.)
    ↓
POST /websites/from-preset
    ↓
Core crée website avec:
  • Modules pré-activés
  • Sections pré-configurées
  • Settings par défaut
    ↓
Dashboard affiche le site avec ses sections
```

### 3. Configuration GitHub (Core + Module)

```
User fournit GitHub username
    ↓
PUT /users/:id/integrations/github
    ↓
Core émet USER_INTEGRATION_ADDED
    ↓
GitHub Sync module exécuté :
  • Lit user_data.integrations depuis Core
  • Appelle GitHub API
  • PATCH /websites/:id/data (stocke contenu)
```

### 4. Personnalisation des Sections (Core)

```
User modifie les sections
    ↓
PATCH /websites/:id/sections/:section_id
    ↓
Core met à jour section_data
    ↓
Preview en temps réel
```

### 5. Publication + Rendering (Core + Theme Module)

```
User clique "Publier"
    ↓
POST /websites/:id/publish
    ↓
Core émet WEBSITE_PUBLISHED
    ↓
Theme module exécuté :
  • GET /websites/:id (contenu + sections)
  • Applique thème
  • Génère data/sites/<slug>.json
    ↓
Projection prête → site public accessible
```

---

## 💾 Modèle de données

### Tables Core (Source de vérité)

| Table | Description |
|-------|-------------|
| `users` | Profil utilisateur (email, password_hash) |
| `tenants` | Isolation multi-tenant |
| `user_data` | Données étendues (GitHub username, tokens, preferences) |
| `websites` | Structure du site (slug, title, tagline, status, creation_mode) |
| `website_data` | Contenu généré par les modules (JSONB) |
| `website_sections` | Sections du site (Hero, About, Projects, etc.) |
| `website_modules` | Modules activés par website |
| `presets` | Templates prédéfinis |
| `modules` | Catalogue des modules disponibles |
| `events` | Événements système (USER_CREATED, WEBSITE_PUBLISHED, etc.) |

### Flux de données

```
User Data (Core)
├─ email
├─ password_hash
└─ integrations
   └─ github: { username, token }

    ↓ Modules lisent via API

Website (Core)
├─ Structure (slug, title, status)
├─ Sections (Hero, About, Projects, Contact...)
└─ Activated Modules (GitHub Sync, Analytics...)

    ↓ Modules écrivent contenu

Website Data (Core JSONB)
├─ projects (from GitHub)
├─ posts (from Blog)
└─ (autres données modulaires)

    ↓ Theme Module lit et applique

Projection (data/sites/<slug>.json)
    ↓ Frontend lit

Site Public
```

---

## 🗺 Roadmap

### ✅ Phase 1-4 - Backend Core + Architecture Website (Terminé) 

> **Statut :** Backend complet avec architecture Website/Sections modulaire

- [x] **Core API** (auth, multi-tenant, users, websites, sections, modules, events)
  - [x] Authentification JWT complète
  - [x] Gestion utilisateurs et tenants
  - [x] Architecture Website avec Sections modulaires
  - [x] Système de Presets (templates prédéfinis)
  - [x] Catalogue de Modules activables par website
  - [x] Système d'événements avec retry
  - [x] Intégrations (GitHub)
  - [x] File storage avec quotas
- [x] **Worker** (event processor + module executor)
  - [x] Event processor avec polling
  - [x] Traitement parallèle des événements
  - [x] Module executor framework
  - [x] Retry mechanism avancé
- [x] **Modules initiaux**
  - [x] GitHub Sync (import repos)
  - [x] Theme Engine (système complet)
  - [x] Projections (génération JSON)
  - [x] Analytics Tracker (tracking événements)
  - [x] Blog Engine (structure)
  - [x] Contact Form (structure)
- [x] **Optimisations avancées**
  - [x] Redis caching pour sites publics
  - [x] Compression multi-format (gzip, brotli, zstd)
  - [x] Parallel event processing
  - [x] Query optimization avec indexes
  - [x] File storage avec audit trail
- [x] **Fonctionnalités temps réel**
  - [x] WebSocket avec authentification JWT
  - [x] Redis Pub/Sub pour distribution multi-instances
  - [x] Contrôle d'accès basé sur les comptes
  - [x] Synchronisation temps réel (websites, modules, fichiers)
  - [x] Système de notifications in-app et push
  - [x] Notification queue avec consolidation
- [x] **Intégration paiements**
  - [x] Stripe provider intégré
  - [x] Checkout sessions
  - [x] Webhooks Stripe
- [x] **Progressive Web App**
  - [x] Service Worker (802 lignes)
  - [x] Manifest complet avec Share Target
  - [x] Support offline et caching avancé
  - [x] Score PWA : 93/100

**📊 Métriques:** 100+ tests unitaires | ~15,000 lignes Rust | 7 migrations SQL

### 🔨 Phase Actuelle - Frontend & UX (En cours)

> **Focus :** Rendre le MVP utilisable avec interface web complète

- [x] **Setup Frontend (Astro + React)**
  - [x] Landing page
  - [x] Pages signup/login
  - [x] Client API TypeScript
  - [x] Store d'authentification
  - [x] PWA complète (installable, offline)
  - [x] Hook WebSocket temps réel
  - [x] Système de notifications UI
- [ ] **Dashboard principal**
  - [ ] Dashboard utilisateur
  - [ ] Sélecteur de Presets
  - [ ] Éditeur de Sections
  - [ ] Configuration modules
  - [ ] Upload fichiers
  - [ ] Prévisualisation website
  - [ ] Notifications dropdown
- [ ] **Pages publiques**
  - [ ] Website public ([slug])
  - [ ] SSG optimisé
- [ ] **Tests E2E**
  - [ ] Scénarios utilisateur complets
  - [ ] Tests d'intégration
- [ ] **CI/CD**
  - [ ] GitHub Actions
  - [ ] Deploy automatique

**🎯 Objectif:** MVP démontrable et utilisable

### Phase Future - Modules Avancés & Marketplace 📦

> **Focus :** Monétisation et écosystème de modules

- [ ] AI Generator module (text/image avec quotas tokens)
- [ ] Analytics avancées (page views, heatmaps, funnels)
- [ ] Custom domains (DNS + SSL automatique)
- [ ] Module marketplace (thèmes payants, plugins)
- [ ] Advanced dashboard (graphs, KPIs temps réel)
- [ ] Rate limiting global
- [ ] Monitoring production (Prometheus/Grafana)

### Phase Future - Facturation & Enterprise 💳

- [ ] Stripe integration (récurrent + usage-based)
- [ ] Invoicing automatique
- [ ] Webhooks publics & API access
- [ ] Self-hosted licensing
- [ ] White-label options
- [ ] Multi-language support
- [ ] Advanced permissions (RBAC)

### Phase Future - Scale & Global 🌍

- [ ] Edge rendering (Cloudflare Workers)
- [ ] Custom modules SDK public
- [ ] Mobile app (React Native)
- [ ] International expansion
- [ ] Enterprise features (SSO, audit logs)
- [ ] Partnerships & intégrations

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
| [ROADMAP.md](docs/ROADMAP.md) | Plan de développement détaillé avec phases et métriques |
| [SPEC_MVP.md](docs/SPEC_MVP.md) | Spécifications fonctionnelles du MVP |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [API_SPEC.md](docs/API_SPEC.md) | Contrat d'API complet |
| [FLOWS.md](docs/FLOWS.md) | Parcours utilisateur détaillés |
| [DECISIONS.md](docs/DECISIONS.md) | Journal des décisions (ADR) |
| [STRUCTURE.md](docs/STRUCTURE.md) | Structure du monorepo |
| [BUSINESS.md](docs/BUSINESS.md) | Vision & modèle d'affaires |
| [WEBSOCKET_PHASE4.md](docs/WEBSOCKET_PHASE4.md) | WebSocket Phase 4 - Backend integration & sync |
| [NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | Système de notifications in-app et push |
| [PWA_README.md](docs/PWA_README.md) | Documentation Progressive Web App complète |
| [FILE_STORAGE.md](docs/FILE_STORAGE.md) | Gestion des fichiers et quotas |
| [CHANGELOG.md](docs/CHANGELOG.md) | Historique détaillé des changements |

---

<p align="center">
  <strong>Built with ❤️ for developers, by developers</strong>
</p>

<p align="center">
  <a href="https://asap.cool">Website</a> •
  <a href="https://github.com/votre-org/asap/issues">Issues</a> •
  <a href="https://twitter.com/asapcool">Twitter</a>
</p>
