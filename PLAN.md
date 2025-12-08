# ASAP v2 - Plan de Développement Complet

## Analyse de la Documentation Existante

### Documents Analysés
1. ✅ **README.md** - Vision globale, architecture, business model
2. ✅ **docs/SPEC_MVP.md** - Spécifications fonctionnelles du MVP
3. ✅ **docs/ARCHITECTURE.md** - Architecture technique détaillée
4. ✅ **docs/STRUCTURE.md** - Structure du monorepo
5. ✅ **docs/API_SPEC.md** - Contrat d'API complet
6. ✅ **docs/FLOWS.md** - Parcours utilisateur et système
7. ✅ **docs/DECISIONS.md** - Journal des décisions architecturales
8. ✅ **docs/BUSINESS.md** - Vision business et modèle économique

### Constats Clés

**Architecture "Core + Modules"**
- Le Core centralise l'authentification, les utilisateurs, les tenants et les données
- Les Modules implémentent toutes les fonctionnalités (GitHub, IA, themes, analytics)
- Communication event-driven entre Core et Modules
- Projections locales pour performances de lecture

**Technologies**
- Backend: Rust + Axum (performance, sécurité mémoire)
- Database: PostgreSQL (JSONB, RLS pour multi-tenant)
- Worker: Rust + Tokio (traitement événements asynchrone)
- Frontend: Astro (SSG/SSR optimisé)

**Isolation Multi-tenant**
- Chaque tenant est isolé via `tenant_id`
- RLS (Row Level Security) au niveau PostgreSQL
- Quotas par ressource (tokens IA, stockage, sites)

---

## Phase 1 : Infrastructure de Base ✅ TERMINÉE

### Réalisations

#### Structure Monorepo
```
asap-v2/
├── core/
│   ├── domain/          # ✅ Models Rust (User, Portfolio, Event)
│   ├── api/             # ✅ Routes HTTP (stubs)
│   └── schemas/         # ⏳ JSON schemas (à venir)
├── modules/
│   ├── github-generator/ # ✅ Structure créée
│   ├── themes/          # ✅ Structure créée
│   ├── analytics/       # ✅ Structure créée
│   └── projections/     # ✅ Structure créée
├── apps/
│   ├── api/             # ✅ Application API (main.rs)
│   ├── worker/          # ✅ Application worker (main.rs)
│   └── web/             # ⏳ Frontend Astro (à venir)
├── infra/
│   ├── migrations/      # ✅ Schema SQL complet
│   ├── docker-compose.yml # ✅ PostgreSQL + services
│   ├── Dockerfile.api   # ✅ Multi-stage build
│   ├── Dockerfile.worker # ✅ Multi-stage build
│   └── env.example/     # ✅ Templates configuration
└── scripts/
    └── setup-dev.sh     # ✅ Script d'installation
```

#### Domain Core
- ✅ User, Tenant, UserData
- ✅ Portfolio, PortfolioData, PortfolioStatus
- ✅ Event, EventType
- ✅ Integration (GitHub)
- ✅ DomainError (gestion erreurs)

#### API Routes (Stubs)
- ✅ Auth: /auth/signup, /auth/login, /auth/me
- ✅ Users: /users/:id
- ✅ Integrations: /users/:id/integrations/github
- ✅ Portfolios: /portfolios/:id, /portfolios/:id/publish
- ✅ Events: /events
- ✅ Modules: /modules, /modules/:id/config
- ✅ Public: /public/portfolios/:slug

#### Base de Données
- ✅ Tables: users, tenants, user_data
- ✅ Tables: portfolios, portfolio_data
- ✅ Tables: events, modules, module_configs
- ✅ Indexes pour performance
- ✅ RLS (Row Level Security) activé

#### Infrastructure
- ✅ Workspace Cargo.toml
- ✅ Docker Compose (PostgreSQL)
- ✅ Dockerfiles multi-stage
- ✅ Configurations environnement
- ✅ Script setup-dev.sh

#### Validation
- ✅ `cargo check` passe avec succès
- ✅ Tous les crates compilent
- ✅ Workspace Rust fonctionnel

---

## Phase 2 : Core API Complet (Sprint 1-2 semaines)

### Objectifs
Implémenter l'API Core avec authentification, gestion utilisateurs et portfolios fonctionnels.

### Tâches Détaillées

#### 2.1 Configuration et Database Pool
- [ ] Implémenter `apps/api/src/config.rs`
  - [ ] Charger variables environnement
  - [ ] Configuration JWT (secret, expiration)
  - [ ] Configuration serveur (host, port)
- [ ] Implémenter `apps/api/src/db.rs`
  - [ ] Pool SQLx PostgreSQL
  - [ ] Gestion connexions
  - [ ] Health check database

#### 2.2 Authentification (JWT + bcrypt)
- [ ] `core/api/src/auth.rs` - Implémentation complète
  - [ ] `signup()`: créer user + tenant + portfolio par défaut
  - [ ] `login()`: vérifier credentials, générer JWT
  - [ ] `me()`: retourner utilisateur courant depuis token
- [ ] Middleware JWT
  - [ ] Extraire et valider token
  - [ ] Injecter user_id et tenant_id dans contexte
- [ ] Helpers bcrypt
  - [ ] Hash password
  - [ ] Verify password

#### 2.3 Gestion Utilisateurs
- [ ] `core/api/src/users.rs` - Implémentation
  - [ ] `get_user()`: récupérer profil utilisateur
  - [ ] `update_user()`: modifier user_data (JSONB)
  - [ ] Validation tenant_id (isolation)

#### 2.4 Gestion Intégrations
- [ ] `core/api/src/integrations.rs` - Implémentation
  - [ ] `get_integrations()`: lire user_data.integrations
  - [ ] `update_github_integration()`: stocker GitHub username/token
  - [ ] Émettre événement USER_INTEGRATION_ADDED

#### 2.5 Gestion Portfolios
- [ ] `core/api/src/portfolios.rs` - Implémentation
  - [ ] `list_portfolios()`: lister portfolios du tenant
  - [ ] `get_portfolio()`: récupérer un portfolio + data
  - [ ] `update_portfolio()`: modifier structure (titre, tagline)
  - [ ] `patch_portfolio_data()`: modules modifient contenu
  - [ ] `publish_portfolio()`: changer status, émettre événement
  - [ ] `get_public_portfolio()`: fallback public (sans auth)

#### 2.6 Système d'Événements
- [ ] `core/api/src/events.rs` - Implémentation
  - [ ] `create_event()`: publier nouvel événement
  - [ ] `get_events()`: polling par modules (non traités)
  - [ ] `mark_processed()`: marquer événement comme traité

#### 2.7 Gestion Modules
- [ ] `core/api/src/modules.rs` - Implémentation
  - [ ] `list_modules()`: modules disponibles et activés
  - [ ] `get_module_config()`: config module pour tenant
  - [ ] `update_module_config()`: modifier config module

#### Tests Phase 2
- [ ] Tests unitaires pour chaque route
- [ ] Tests d'intégration avec database test
- [ ] Tests authentification (token valide/invalide)
- [ ] Tests isolation multi-tenant

---

## Phase 3 : Worker et Event Processing (Sprint 1 semaine)

### Objectifs
Implémenter le worker qui consomme les événements du core et exécute les modules.

### Tâches Détaillées

#### 3.1 Event Processor
- [ ] `apps/worker/src/event_processor.rs`
  - [ ] Polling périodique de la table `events`
  - [ ] Filtrer événements non traités (`processed_at IS NULL`)
  - [ ] Dispatcher vers modules appropriés
  - [ ] Gérer erreurs et retries

#### 3.2 Module Executor
- [ ] `apps/worker/src/module_executor.rs`
  - [ ] Interface trait `ModuleExecutor`
  - [ ] Exécuter module selon type d'événement
  - [ ] Logger exécution et résultats
  - [ ] Marquer événements comme traités

#### 3.3 Configuration Worker
- [ ] Charger configuration depuis env
- [ ] Intervalle de polling (défaut: 5s)
- [ ] Retry policy (tentatives, backoff)
- [ ] Gestion graceful shutdown

#### Tests Phase 3
- [ ] Tests event processor avec database test
- [ ] Tests module executor (mocks)
- [ ] Tests retry logic

---

## Phase 4 : Module GitHub Generator (Sprint 1 semaine)

### Objectifs
Implémenter le module qui récupère les repos GitHub et génère le contenu portfolio.

### Tâches Détaillées

#### 4.1 GitHub API Client
- [ ] `modules/github-generator/src/client.rs`
  - [ ] Appel API GitHub (repos publics)
  - [ ] Support token GitHub (optionnel)
  - [ ] Pagination des résultats
  - [ ] Gestion rate limiting
  - [ ] Filtrer repos (exclure forks, etc.)

#### 4.2 Content Processor
- [ ] `modules/github-generator/src/processor.rs`
  - [ ] Transformer repos en structure portfolio
  - [ ] Extraire: name, description, url, language, stars
  - [ ] Trier par date/stars
  - [ ] Détecter repos pinned (metadata GitHub)

#### 4.3 Event Handler
- [ ] `modules/github-generator/src/handler.rs`
  - [ ] Écouter événement USER_INTEGRATION_ADDED
  - [ ] Appeler Core API pour récupérer username
  - [ ] Fetch repos GitHub
  - [ ] PATCH portfolio_data via Core API
  - [ ] Émettre GITHUB_REPOS_SYNCED

#### Tests Phase 4
- [ ] Tests unitaires avec GitHub API mockée
- [ ] Tests processor avec données réelles
- [ ] Tests end-to-end (mock worker + API)

---

## Phase 5 : Module Themes et Projections (Sprint 1 semaine)

### Objectifs
Implémenter le rendu de thème et la génération de projections JSON statiques.

### Tâches Détaillées

#### 5.1 Theme Renderer
- [ ] `modules/themes/src/default.rs`
  - [ ] Template thème par défaut
  - [ ] Mapping portfolio_data vers template
  - [ ] Générer structure HTML/JSON
  - [ ] Support métadonnées SEO

#### 5.2 Projections Generator
- [ ] `modules/projections/src/lib.rs`
  - [ ] Écouter événement PORTFOLIO_PUBLISHED
  - [ ] Récupérer portfolio complet depuis Core
  - [ ] Appliquer thème
  - [ ] Générer `data/sites/{slug}.json`
  - [ ] Validation fichier généré

#### 5.3 Event Handlers
- [ ] Handler pour PORTFOLIO_PUBLISHED
- [ ] Handler pour GITHUB_REPOS_SYNCED (re-render)
- [ ] Gérer projections stale (cleanup)

#### Tests Phase 5
- [ ] Tests theme rendering
- [ ] Tests projection generation
- [ ] Vérifier fichiers générés

---

## Phase 6 : Frontend Astro (Sprint 2 semaines)

### Objectifs
Créer le frontend avec dashboard privé et pages publiques de portfolios.

### Tâches Détaillées

#### 6.1 Setup Astro
- [ ] Initialiser projet Astro dans `apps/web/`
- [ ] Configuration TypeScript
- [ ] Configuration Tailwind CSS
- [ ] Client API TypeScript

#### 6.2 Pages Publiques
- [ ] `pages/[slug].astro` - Page portfolio publique
  - [ ] Lire projection `data/sites/{slug}.json`
  - [ ] Fallback API si projection absente
  - [ ] Rendu SSG pour performance
  - [ ] Métadonnées SEO dynamiques

#### 6.3 Landing Page
- [ ] `pages/index.astro` - Page d'accueil
  - [ ] Hero section
  - [ ] Features
  - [ ] CTA signup

#### 6.4 Dashboard Privé
- [ ] `pages/app/dashboard.astro`
  - [ ] Formulaire login/signup
  - [ ] Afficher user et portfolio
  - [ ] Formulaire configuration GitHub
  - [ ] Bouton "Générer depuis GitHub"
  - [ ] Bouton "Publier portfolio"
  - [ ] Preview portfolio

#### 6.5 Client API
- [ ] `lib/core-client.ts`
  - [ ] Wrapper fetch avec JWT
  - [ ] Méthodes pour toutes routes API
  - [ ] Gestion erreurs

#### Tests Phase 6
- [ ] Tests composants Astro
- [ ] Tests client API (mocks)
- [ ] Tests end-to-end (Playwright)

---

## Phase 7 : Tests End-to-End et Documentation (Sprint 1 semaine)

### Objectifs
Valider le flux complet et finaliser la documentation.

### Tâches Détaillées

#### 7.1 Tests E2E
- [ ] Scénario complet:
  1. Signup utilisateur
  2. Configuration GitHub username
  3. Génération automatique portfolio
  4. Publication portfolio
  5. Accès public
- [ ] Tests isolation multi-tenant
- [ ] Tests gestion erreurs

#### 7.2 Documentation
- [ ] Guide déploiement
- [ ] Guide contribution
- [ ] API Reference complète
- [ ] Exemples d'utilisation
- [ ] Troubleshooting

#### 7.3 Optimisations
- [ ] Performance database (EXPLAIN ANALYZE)
- [ ] Caching projections
- [ ] Rate limiting API
- [ ] Monitoring et logs

---

## Prochaines Étapes Immédiates

### Sprint Actuel (Semaine 1)

**Priorité 1: Core API Authentication**
1. Implémenter configuration et database pool
2. Développer système d'authentification (JWT + bcrypt)
3. Tester signup/login/me endpoints

**Priorité 2: User Management**
1. Implémenter routes utilisateurs
2. Ajouter middleware JWT
3. Tests isolation tenant_id

**Livrables Sprint 1**
- ✅ API démarre et répond
- ✅ Signup/login fonctionnels
- ✅ JWT émis et validé
- ✅ Tests passent

---

## Métriques de Succès MVP

### Critères de Validation
- [ ] Un utilisateur peut s'inscrire
- [ ] Un utilisateur peut se connecter
- [ ] Un utilisateur peut configurer GitHub
- [ ] Le portfolio est généré automatiquement
- [ ] Le portfolio peut être publié
- [ ] Le portfolio est accessible publiquement
- [ ] Temps de génération < 30 secondes
- [ ] TTFB page publique < 100ms

### Performance Targets
- API response time: < 100ms (p95)
- Database queries: < 50ms (p95)
- Worker event processing: < 5s
- Public page TTFB: < 100ms

---

## Notes Techniques

### Décisions Importantes
1. **Projections locales** plutôt que lecture direct PostgreSQL → TTFB optimal
2. **Event-driven** plutôt que appels directs → découplage modules
3. **JSONB** pour user_data et portfolio_data → flexibilité
4. **RLS PostgreSQL** pour isolation → sécurité native

### Points d'Attention
- Gérer circular dependency users ↔ tenants (résolu dans migration)
- Valider JWT à chaque requête authentifiée
- Limiter taille JSONB (max 1MB par document)
- Cleanup événements traités périodiquement

### Améliorations Futures (Post-MVP)
- WebSocket pour updates real-time
- Cache Redis pour projections hot
- CDN pour fichiers statiques
- AI Generator module (tokens limités)
- Analytics module (page views)
- Marketplace modules premium
- Self-hosted licensing

---

**Statut:** Phase 1 complétée ✅ | Phase 2 prête à démarrer 🚀
