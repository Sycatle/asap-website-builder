# ASAP v2 - Plan de Développement Actualisé

**Dernière mise à jour:** 8 décembre 2025  
**Statut:** Backend complet (Phases 1-3) | Frontend en attente (Phase 4)

---

## 📊 État Actuel du Projet

### ✅ Phases Complétées

#### Phase 1 : Infrastructure de Base - ✅ TERMINÉE (100%)
- ✅ Structure Monorepo complète
- ✅ Domain Models (User, Tenant, Website, Event)
- ✅ API Routes (stubs → implémentation complète)
- ✅ Database Schema & Migrations
- ✅ Docker Infrastructure
- ✅ Workspace Cargo fonctionnel

#### Phase 2 : Core API Complet - ✅ TERMINÉE (100%)
- ✅ Configuration et Database Pool
- ✅ Authentification JWT + bcrypt
- ✅ Gestion Utilisateurs complète
- ✅ Gestion Intégrations (GitHub)
- ✅ Gestion Websites (CRUD + publish)
- ✅ Système d'Événements
- ✅ Gestion Modules (registry + config)
- ✅ Middleware JWT
- ✅ Multi-tenant strict avec RLS

#### Phase 3 : Worker et Modules - ✅ TERMINÉE (100%)
- ✅ Event Processor avec polling
- ✅ Module Executor Framework
- ✅ GitHub Generator Module complet
- ✅ Themes Module avec tests
- ✅ Projections Module avec tests
- ✅ Analytics Module avec tests
- ✅ Retry Mechanism (exponential backoff)

#### Optimisations Avancées - ✅ PARTIELLEMENT COMPLÉTÉES (60%)
- ✅ File Storage System (upload, compression, quotas)
- ✅ Redis Caching pour websites publics
- ✅ Parallel Event Processing (4x speedup)
- ✅ Query Optimization (indexes)
- ✅ Compression API (gzip, brotli, zstd)
- ✅ Shared Core Module (config centralisée)
- ⏳ Monitoring production (non fait)
- ⏳ Rate limiting (non fait)

### ❌ Phases Non Démarrées

#### Phase 4 : Frontend Astro - ❌ NON DÉMARRÉE (0%)
- ❌ Setup Astro + Tailwind
- ❌ Client API TypeScript
- ❌ Pages publiques (landing, [slug])
- ❌ Dashboard privé
- ❌ Formulaires signup/login
- ❌ Gestion websites UI
- ❌ Upload fichiers UI
- ❌ Preview website

#### Phase 5 : Tests E2E et CI/CD - ❌ NON DÉMARRÉE (0%)
- ❌ Tests end-to-end avec Playwright
- ❌ GitHub Actions CI/CD
- ❌ Deploy automatique
- ❌ Documentation utilisateur finale

---

## 🎯 Priorités Révisées

### 🔴 PRIORITÉ 1 - Frontend Astro (CRITIQUE)

**Problème:** Le backend est complet mais inutilisable sans interface utilisateur.

**Objectif:** Créer un MVP démontrable avec interface web fonctionnelle.

**Durée estimée:** 2-3 semaines

**Tâches détaillées:**

#### 1. Setup Initial (2 jours)
- [ ] Initialiser projet Astro dans `apps/web/`
- [ ] Installer et configurer Tailwind CSS
- [ ] Setup TypeScript strict
- [ ] Configurer ESLint + Prettier
- [ ] Créer structure de dossiers

#### 2. Client API TypeScript (2 jours)
- [ ] `lib/api/client.ts` - Wrapper fetch avec JWT
- [ ] `lib/api/auth.ts` - Signup, login, me
- [ ] `lib/api/websites.ts` - CRUD websites
- [ ] `lib/api/files.ts` - Upload, list, delete
- [ ] `lib/api/integrations.ts` - GitHub config
- [ ] Gestion erreurs et retry
- [ ] Types TypeScript complets

#### 3. Pages Publiques (3 jours)
- [ ] `pages/index.astro` - Landing page
  - [ ] Hero section avec CTA
  - [ ] Features principales
  - [ ] Pricing (si applicable)
  - [ ] Footer avec liens
- [ ] `pages/[slug].astro` - Website public
  - [ ] SSG avec getStaticPaths
  - [ ] Lecture projection JSON
  - [ ] Fallback API si projection absente
  - [ ] Métadonnées SEO dynamiques
  - [ ] Design responsive

#### 4. Authentification (2 jours)
- [ ] `pages/signup.astro` - Formulaire inscription
  - [ ] Validation email/password
  - [ ] Création website initial
  - [ ] Redirection après signup
- [ ] `pages/login.astro` - Formulaire connexion
  - [ ] Validation credentials
  - [ ] Gestion JWT en cookie/localStorage
  - [ ] Redirection dashboard
- [ ] `components/AuthGuard.tsx` - Protection routes privées
- [ ] Session management

#### 5. Dashboard Privé (5 jours)
- [ ] `pages/app/dashboard.astro` - Vue principale
  - [ ] Sidebar navigation
  - [ ] Stats overview (quotas, usage)
  - [ ] Actions rapides
- [ ] `pages/app/website.astro` - Gestion website
  - [ ] Formulaire édition (title, tagline)
  - [ ] Configuration GitHub username
  - [ ] Bouton "Générer depuis GitHub"
  - [ ] Bouton "Publier website"
  - [ ] Preview website
- [ ] `pages/app/files.astro` - Gestion fichiers
  - [ ] Liste fichiers uploadés
  - [ ] Upload avec drag & drop
  - [ ] Progress bar upload
  - [ ] Delete fichier
  - [ ] Quota usage visuel
- [ ] `pages/app/settings.astro` - Paramètres
  - [ ] Profil utilisateur
  - [ ] Changement mot de passe
  - [ ] API keys (future)

#### 6. Components Réutilisables (2 jours)
- [ ] `Button.astro` - Boutons stylisés
- [ ] `Input.astro` - Champs formulaire
- [ ] `Card.astro` - Cartes info
- [ ] `Modal.astro` - Modales
- [ ] `Loader.astro` - Loading states
- [ ] `Toast.astro` - Notifications
- [ ] `Header.astro` - Navigation
- [ ] `Footer.astro` - Pied de page

#### 7. Polish & Responsive (2 jours)
- [ ] Design mobile optimisé
- [ ] Animations transitions
- [ ] Dark mode (optionnel)
- [ ] Accessibility (a11y)
- [ ] Loading states
- [ ] Error states

---

### 🟡 PRIORITÉ 2 - Tests E2E (IMPORTANT)

**Objectif:** Valider les flux utilisateur complets et garantir la stabilité.

**Durée estimée:** 1 semaine

**Tâches:**

#### 1. Setup Tests (1 jour)
- [ ] Installer Playwright
- [ ] Configuration tests
- [ ] Fixtures et helpers
- [ ] Database de test

#### 2. Scénarios Critiques (3 jours)
- [ ] **Test: Signup → Dashboard**
  - [ ] Créer compte
  - [ ] Vérifier tenant créé
  - [ ] Vérifier website par défaut
  - [ ] Accéder dashboard
- [ ] **Test: Configure GitHub → Generate**
  - [ ] Configurer GitHub username
  - [ ] Déclencher génération
  - [ ] Vérifier event créé
  - [ ] Vérifier website_data mis à jour
- [ ] **Test: Publish → Public Access**
  - [ ] Publier website
  - [ ] Vérifier status = published
  - [ ] Accéder page publique
  - [ ] Vérifier contenu affiché
- [ ] **Test: File Upload → Quota**
  - [ ] Upload fichier
  - [ ] Vérifier quota mis à jour
  - [ ] Upload jusqu'à limite
  - [ ] Vérifier erreur quota dépassé

#### 3. Tests Sécurité (2 jours)
- [ ] **Test: Isolation Multi-tenant**
  - [ ] Créer 2 utilisateurs
  - [ ] Vérifier User A ne voit pas données User B
  - [ ] Tenter accès cross-tenant (doit échouer)
- [ ] **Test: JWT Expiration**
  - [ ] Token valide → accès OK
  - [ ] Token expiré → accès refusé
  - [ ] Pas de token → redirection login
- [ ] **Test: SQL Injection**
  - [ ] Tentative injection dans formulaires
  - [ ] Vérifier sanitization

#### 4. Rapport et CI (1 jour)
- [ ] Génération rapport HTML
- [ ] Intégration GitHub Actions
- [ ] Fail si tests échouent

---

### 🟢 PRIORITÉ 3 - CI/CD (NICE TO HAVE)

**Objectif:** Automatiser tests et déploiements.

**Durée estimée:** 3-5 jours

**Tâches:**

#### 1. GitHub Actions (2 jours)
- [ ] `.github/workflows/test.yml` - Tests automatiques
  - [ ] Tests Rust (cargo test)
  - [ ] Tests E2E (Playwright)
  - [ ] Matrix strategy (OS, versions)
- [ ] `.github/workflows/build.yml` - Build Docker
  - [ ] Build API image
  - [ ] Build Worker image
  - [ ] Build Frontend image
  - [ ] Push vers Docker Hub/GHCR

#### 2. Deploy Automatique (2 jours)
- [ ] `.github/workflows/deploy-staging.yml`
  - [ ] Deploy sur staging à chaque commit main
  - [ ] Migrations automatiques
  - [ ] Health checks
- [ ] `.github/workflows/deploy-prod.yml`
  - [ ] Deploy production sur tag (v*)
  - [ ] Approval manuel
  - [ ] Rollback automatique si échec

#### 3. Preview Deployments (1 jour)
- [ ] Deploy preview par PR
- [ ] URL unique par PR
- [ ] Cleanup après merge

---

## 📋 Backlog (Post-MVP)

### Fonctionnalités Avancées

#### Module IA (2-3 semaines)
- [ ] Intégration OpenAI API
- [ ] Text generation avec prompts
- [ ] Image generation (DALL-E)
- [ ] Quota tokens par utilisateur
- [ ] Tracking usage tokens
- [ ] UI génération IA dans dashboard

#### Analytics Avancées (2 semaines)
- [ ] Page views tracking
- [ ] Heatmaps (Hotjar-like)
- [ ] Conversion funnels
- [ ] Dashboard analytics
- [ ] Export données

#### Custom Domains (1 semaine)
- [ ] Configuration DNS
- [ ] SSL automatique (Let's Encrypt)
- [ ] CNAME validation
- [ ] Wildcard support

#### Stripe Integration (2 semaines)
- [ ] Plans abonnement (Free, Pro, Team)
- [ ] Usage-based billing (tokens IA, stockage)
- [ ] Webhooks Stripe
- [ ] Invoicing automatique
- [ ] Portal client

#### Module Marketplace (3 semaines)
- [ ] Upload thèmes personnalisés
- [ ] Validation thèmes
- [ ] Prix et commissions (70/30)
- [ ] Paiements vendeurs
- [ ] Ratings & reviews

---

## 🎯 Timeline Réaliste MVP Complet

### Semaines 1-2 : Frontend Core
- Setup Astro + Pages publiques + Auth

### Semaine 3 : Dashboard
- Interface privée complète

### Semaine 4 : Tests & Polish
- Tests E2E + CI/CD + Documentation

### Semaine 5+ : Post-MVP
- Fonctionnalités avancées selon priorités business

---

## 📈 Métriques de Succès

### MVP Fonctionnel (Définition stricte)
- [x] Backend API complet
- [x] Worker traite événements
- [x] GitHub import fonctionne
- [x] File storage opérationnel
- [ ] **Frontend permet signup/login**
- [ ] **Dashboard affiche website**
- [ ] **Page publique render website**
- [ ] **Upload fichiers via UI**
- [ ] **Tests E2E passent**
- [ ] **Déployable en production**

### Performance Targets
- [x] API response time: < 100ms (p95) ✅
- [x] Database queries: < 50ms (p95) ✅
- [x] Worker event processing: < 5s ✅
- [x] Cache hit time: < 5ms ✅
- [ ] Public page TTFB: < 100ms (à mesurer après frontend)
- [ ] Frontend FCP: < 1s (à mesurer)

---

## 🔧 Décisions Techniques à Prendre

### Frontend Stack (À décider)
- **Option 1 (Recommandé):** Astro + React islands
  - ✅ SSG performant
  - ✅ Hydratation sélective
  - ✅ SEO optimal
  - ⚠️ Moins de composants réactifs
  
- **Option 2:** Astro + Svelte
  - ✅ Bundle size minimal
  - ✅ Performance excellente
  - ⚠️ Écosystème plus petit

- **Option 3:** Full React (Next.js)
  - ✅ Écosystème mature
  - ✅ Composants réutilisables
  - ⚠️ Bundle size plus gros

**Recommandation:** **Astro + React islands** pour MVP (SSG + réactivité où nécessaire)

### State Management
- **Option 1:** Context API + localStorage
  - ✅ Simple, natif
  - ⚠️ Pas de persistence automatique
  
- **Option 2:** Zustand
  - ✅ Léger (3kb)
  - ✅ Persistence facile
  - ✅ DevTools

**Recommandation:** **Zustand** pour gestion état global (auth, website)

### Hosting Frontend
- **Option 1:** Vercel
  - ✅ Deploy automatique
  - ✅ Preview URLs
  - ✅ SSR/SSG optimisé
  
- **Option 2:** Cloudflare Pages
  - ✅ Edge network
  - ✅ Gratuit généreux
  - ⚠️ Moins features

**Recommandation:** **Vercel** pour MVP (simplicité + fonctionnalités)

---

## 🎓 Leçons Apprises (Rétrospective)

### ✅ Ce qui a bien fonctionné
1. **Architecture modulaire** - Ajout modules facile
2. **Tests unitaires** - Confiance dans le code
3. **Rust + SQLx** - Performance excellente
4. **Event-driven** - Découplage propre
5. **Documentation technique** - Maintenue régulièrement

### ⚠️ Ce qui peut être amélioré
1. **Priorisation** - Optimisations avant frontend
2. **Planification** - MVP trop large initialement
3. **Feedback utilisateur** - Aucun test avec utilisateurs réels
4. **SQLx offline** - Compilation complexe

### 💡 Recommandations Futures
1. **Frontend en priorité** - UI utilisable dès début
2. **MVP minimal** - Fonctionnalités essentielles uniquement
3. **Démos régulières** - Validation avec stakeholders
4. **CI/CD précoce** - Automatisation dès début
5. **Tests E2E tôt** - Valider flux avant fonctionnalités

---

## 📝 Conclusion

**État actuel:** Backend techniquement excellent mais **non utilisable sans frontend**.

**Action immédiate:** **Focus 100% sur Frontend Astro** (Phases 4).

**Timeline réaliste:** 3-4 semaines pour MVP complet et démontrable.

**Succès garanti si:** Priorisation stricte sur interface utilisateur avant toute nouvelle fonctionnalité backend.

---

**Dernière mise à jour:** 8 décembre 2025  
**Prochaine révision:** Après complétion Phase 4 (Frontend)

### Réalisations

#### Structure Monorepo
```
asap-v2/
├── core/
│   ├── domain/          # ✅ Models Rust (User, Website, Event)
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
- ✅ Website, WebsiteData, WebsiteStatus
- ✅ Event, EventType
- ✅ Integration (GitHub)
- ✅ DomainError (gestion erreurs)

#### API Routes (Stubs)
- ✅ Auth: /auth/signup, /auth/login, /auth/me
- ✅ Users: /users/:id
- ✅ Integrations: /users/:id/integrations/github
- ✅ Websites: /websites/:id, /websites/:id/publish
- ✅ Events: /events
- ✅ Modules: /modules, /modules/:id/config
- ✅ Public: /public/websites/:slug

#### Base de Données
- ✅ Tables: users, tenants, user_data
- ✅ Tables: websites, website_data
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
Implémenter l'API Core avec authentification, gestion utilisateurs et websites fonctionnels.

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
  - [ ] `signup()`: créer user + tenant + website par défaut
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

#### 2.5 Gestion Websites
- [ ] `core/api/src/websites.rs` - Implémentation
  - [ ] `list_websites()`: lister websites du tenant
  - [ ] `get_website()`: récupérer un website + data
  - [ ] `update_website()`: modifier structure (titre, tagline)
  - [ ] `patch_website_data()`: modules modifient contenu
  - [ ] `publish_website()`: changer status, émettre événement
  - [ ] `get_public_website()`: fallback public (sans auth)

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
Implémenter le module qui récupère les repos GitHub et génère le contenu website.

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
  - [ ] Transformer repos en structure website
  - [ ] Extraire: name, description, url, language, stars
  - [ ] Trier par date/stars
  - [ ] Détecter repos pinned (metadata GitHub)

#### 4.3 Event Handler
- [ ] `modules/github-generator/src/handler.rs`
  - [ ] Écouter événement USER_INTEGRATION_ADDED
  - [ ] Appeler Core API pour récupérer username
  - [ ] Fetch repos GitHub
  - [ ] PATCH website_data via Core API
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
  - [ ] Mapping website_data vers template
  - [ ] Générer structure HTML/JSON
  - [ ] Support métadonnées SEO

#### 5.2 Projections Generator
- [ ] `modules/projections/src/lib.rs`
  - [ ] Écouter événement WEBSITE_PUBLISHED
  - [ ] Récupérer website complet depuis Core
  - [ ] Appliquer thème
  - [ ] Générer `data/sites/{slug}.json`
  - [ ] Validation fichier généré

#### 5.3 Event Handlers
- [ ] Handler pour WEBSITE_PUBLISHED
- [ ] Handler pour GITHUB_REPOS_SYNCED (re-render)
- [ ] Gérer projections stale (cleanup)

#### Tests Phase 5
- [ ] Tests theme rendering
- [ ] Tests projection generation
- [ ] Vérifier fichiers générés

---

## Phase 6 : Frontend Astro (Sprint 2 semaines)

### Objectifs
Créer le frontend avec dashboard privé et pages publiques de websites.

### Tâches Détaillées

#### 6.1 Setup Astro
- [ ] Initialiser projet Astro dans `apps/web/`
- [ ] Configuration TypeScript
- [ ] Configuration Tailwind CSS
- [ ] Client API TypeScript

#### 6.2 Pages Publiques
- [ ] `pages/[slug].astro` - Page website publique
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
  - [ ] Afficher user et website
  - [ ] Formulaire configuration GitHub
  - [ ] Bouton "Générer depuis GitHub"
  - [ ] Bouton "Publier website"
  - [ ] Preview website

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
  3. Génération automatique website
  4. Publication website
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
- [ ] Le website est généré automatiquement
- [ ] Le website peut être publié
- [ ] Le website est accessible publiquement
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
3. **JSONB** pour user_data et website_data → flexibilité
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
