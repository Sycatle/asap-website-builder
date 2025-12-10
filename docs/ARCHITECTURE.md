# Architecture Overview

## Contexte global

ASAP est une plateforme de génération de portfolios ultra-rapides basée sur une architecture **core + modules**. Le core expose une API unifiée de gestion des utilisateurs et des données, tandis que les modules implémentent toutes les fonctionnalités (générateurs, rendus, analytics, etc.).

Cette approche permet :

- **Séparation des préoccupations** : le core gère l'authentification, l'isolation multi-tenant et la persistance
- **Réutilisabilité** : les modules peuvent être développés indépendamment et consommer les données du core
- **Extensibilité** : ajouter de nouvelles fonctionnalités sans modifier le core

---

## Principes architecturaux

### 1. Le Core = Structure + Données utilisateur

Le core expose une API centralisée qui :

- Gère l'**authentification** et l'**isolation multi-tenant**
- Centralise les **données utilisateur** (profil, paramètres, intégrations GitHub, etc.)
- Fournit une **structure unifiée** pour les projets/portfolios
- Émet des **événements métier** pour les modules
- Gère les **droits d'accès** via tenant_id

### 2. Les Modules = Toutes les fonctionnalités

Chaque module implémente une fonctionnalité spécifique :

- **Générateur GitHub** : récupère les données utilisateur du core → génère la structure du portfolio
- **Générateur IA** : utilise les données du core → génère du contenu avancé
- **Themes** : appliquent des styles sur la structure du core
- **Analytics** : consomment les événements du core

### 3. Données utilisateur centralisées

Les données utilisateur vivent dans le core, pas dans les modules :

```
┌─────────────────────────────────────────┐
│         Core (API ASAP)                 │
│  ┌─────────────────────────────────────┐│
│  │  Users                              ││
│  │  ├─ profile (nom, email, etc.)      ││
│  │  ├─ integrations (GitHub, etc.)     ││
│  │  ├─ preferences                     ││
│  │  └─ data_version (pour tracking)    ││
│  └─────────────────────────────────────┘│
│                                         │
│  Modules accèdent via API au Core       │
└─────────────────────────────────────────┘
        ↓           ↓           ↓
   [Generator]  [Theme]   [Analytics]
```

---

## Composants principaux

### Control Plane API (Rust / Axum)

L'API expose deux catégories de routes :

#### A. Routes Core - Gestion des données utilisateur

- **Authentification** : signup, login, refresh token
- **Profil utilisateur** : récupérer/modifier profil, intégrations
- **Données métier** : créer/lire/modifier les projets et portfolios
- **Événements** : publier des événements pour les modules

#### B. Routes Modules - Enregistrement et configuration

- **Module registry** : liste des modules disponibles
- **Module config** : configuration per-tenant des modules
- **Module hooks** : webhooks pour les événements du core

---

### Workers (Rust / Tokio)

Les workers consomment les événements émis par le core et exécutent les tâches des modules :

- **Event processing** : à la réception d'événements (ex. `USER_UPDATED`, `PORTFOLIO_GENERATED`), les workers distribuent ces événements aux modules abonnés

- **Module tasks** : chaque module enregistré peut avoir des tâches background :
  - `GitHubGenerator::sync_repos()` - récupère les repos GitHub
  - `AIGenerator::generate_content()` - génère du contenu avec IA
  - `Projections::render()` - génère les fichiers de projection

- **Tâches périodiques** : nettoyage, maintenance, resync GitHub (si activé)

---

### Rendering & Delivery

Le rendu des pages est assuré par **Astro**, un générateur de sites orienté contenu :

- **Dashboard (privé)** : pages `/app/*` pour éditer le portfolio, qui consomment l'API Rust protégée par JWT/cookies.

- **Pages publiques** : les pages accessibles via `{slug}.asap.cool` lisent en priorité les fichiers projetés (`data/sites/<slug>.json`) et n'appellent l'API qu'en dernier recours. Cela permet des temps de chargement (TTFB et LCP) très bas même sans CDN.

- **Séparation du rendu et du back-end** : Astro est découplé du reste du système, ce qui facilite l'ajout de thèmes, de composants ou de frontends alternatifs à l'avenir.

---

### Base de données

ASAP utilise **PostgreSQL** comme source de vérité pour le core :

#### Tables Core

| Table | Responsabilité |
|-------|-----------------|
| `users` | Profil utilisateur centralisé |
| `tenants` | Isolation multi-tenant |
| `user_data` | Données étendues (GitHub, intégrations, préférences) |
| `websites` | Structure du site (slug, statut, création mode, preset) |
| `website_data` | Contenu du website (JSONB extensible) |
| `website_sections` | Sections du site (Hero, About, Projects, etc.) |
| `website_modules` | Modules activés par website (many-to-many) |
| `presets` | Templates prédéfinis pour création rapide |
| `modules` | Catalogue des modules disponibles |
| `events` | Événements métier pour les modules |

#### Architecture multi-tenant

- Chaque `user` appartient à un seul `tenant`
- Chaque `tenant` peut avoir plusieurs `websites`
- Chaque `website` a des `sections` et des `modules` activés
- `RLS (Row Level Security)` : assure que les données ne fuient pas entre tenants
- Toutes les lectures/écritures passent par `tenant_id`

---

## Flux de données

### Scénario : Utilisateur crée un website avec un Preset

```
1. SIGNUP (Core)
   ├─> POST /auth/signup
   ├─> INSERT users, tenants
   └─> EMIT(USER_CREATED)

2. CREATE FROM PRESET (Core)
   ├─> POST /websites/from-preset {preset_id, slug}
   ├─> INSERT website (creation_mode = from_preset)
   ├─> INSERT website_sections (depuis preset.config.sections)
   ├─> INSERT website_modules (depuis preset.config.modules)
   └─> EMIT(WEBSITE_CREATED)

3. CONFIGURE GITHUB (Core)
   ├─> PUT /users/:id/integrations {github_username}
   ├─> UPDATE user_data.integrations
   └─> EMIT(USER_INTEGRATION_ADDED)

4. SYNC (Module GitHub Sync)
   ├─> Worker reçoit USER_INTEGRATION_ADDED
   ├─> Module appelle Core: GET /users/:id/data
   ├─> Core retourne user_data (GitHub username, etc.)
   ├─> Module appelle GitHub API
   ├─> Module stocke résultats dans WEBSITE_DATA (JSONB)
   └─> EMIT(GITHUB_REPOS_SYNCED)

5. RENDER (Module Theme Engine)
   ├─> Worker reçoit WEBSITE_PUBLISHED
   ├─> Module appelle Core: GET /websites/:id + sections
   ├─> Module récupère la structure + contenu + sections
   ├─> Module applique le thème
   ├─> Module génère data/sites/<slug>.json
   └─> EMIT(WEBSITE_RENDERED)

6. SERVE (Frontend Astro)
   ├─> GET {slug}.asap.cool
   ├─> Astro lit data/sites/<slug>.json
   └─> Rendu utilisateur
```
