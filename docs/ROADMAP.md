# Roadmap ASAP - Plan de Développement

**Dernière mise à jour :** 15 décembre 2025  
**Version :** 2.0

---

## 📊 Vue d'ensemble

ASAP est une plateforme SaaS centralisée pour créateurs et entrepreneurs, permettant de gérer utilisateurs, sites web, modules, tokens IA, et quotas dans un seul dashboard unifié.

### État actuel du projet

| Phase | Statut | Progression |
|-------|--------|-------------|
| Phase 1-4 : Backend Core | ✅ Terminé | 100% |
| Phase 5 : Frontend & UX | 🔨 En cours | 35% |
| Phase 6 : Modules Avancés | 📋 Planifié | 0% |
| Phase 7 : Monétisation | 📋 Planifié | 0% |
| Phase 8 : Scale & Global | 📋 Planifié | 0% |

---

## ✅ Phase 1-4 : Backend Core + Infrastructure Temps Réel (TERMINÉ)

**Période :** Octobre - Décembre 2025  
**Statut :** ✅ 100% Complété

### Objectifs atteints

Construire une infrastructure backend robuste et complète avec support temps réel, notifications, PWA et paiements.

### Réalisations

#### Core API (Rust + Axum)

- ✅ **Authentification & Sécurité**
  - JWT avec refresh tokens
  - Bcrypt pour hash passwords
  - Middleware d'authentification
  - Multi-tenant avec isolation stricte (RLS PostgreSQL)
  - Contrôle d'accès basé sur les comptes

- ✅ **Gestion Comptes & Données**
  - CRUD comptes utilisateurs
  - Profils étendus avec JSONB
  - Intégrations externes (GitHub)
  - Préférences personnalisables

- ✅ **Architecture Website/Sections**
  - Websites avec modes de création (from_scratch, from_preset)
  - Sections modulaires (Hero, About, Projects, Skills, Contact, Blog, etc.)
  - Système de Presets (templates prédéfinis)
  - Catalogue de Modules activables par website
  - Réordonnancement des sections

- ✅ **Système d'Événements**
  - Event sourcing avec persistance
  - Polling configurable (5s par défaut)
  - Retry mechanism avec exponential backoff
  - Event types typés et extensibles

- ✅ **Gestion Fichiers**
  - Upload avec compression automatique (gzip, brotli, zstd)
  - Quotas de stockage par compte
  - Audit trail complet
  - Endpoint usage tracking

#### Infrastructure Temps Réel

- ✅ **WebSocket Server (Phase 4)**
  - Authentification JWT sur WebSocket
  - Registry clients authentifiés
  - Heartbeat et détection connexions mortes
  - Graceful shutdown
  - Contrôle d'accès par account_id

- ✅ **Redis Pub/Sub**
  - Distribution multi-instances
  - Channels dédiés :
    - `asap:sync:website` - Synchronisation websites
    - `asap:sync:module` - Synchronisation modules
    - `asap:sync:file` - Synchronisation fichiers
    - `asap:presence` - Présence utilisateurs
    - `asap:notifications` - Notifications
  - Support scale horizontal

- ✅ **Événements de Synchronisation Typés**
  - Website events (4) : updated, deleted, published, unpublished
  - Module events (4) : activated, deactivated, configured, catalog_updated
  - File events (5) : uploaded, deleted, upload_progress, upload_complete, upload_failed
  - Presence events (5) : user online/offline, started/stopped editing, online_users_list

#### Système de Notifications

- ✅ **Notifications In-App**
  - Catégories : system, account, website, module, billing, analytics, security
  - Priorités : low, normal, high, urgent
  - État lu/non lu avec timestamps
  - Actions associées (URLs)
  - Types prédéfinis (20+)

- ✅ **Notifications Push (Web Push API)**
  - Clés VAPID générées et gérées
  - Abonnements multi-navigateurs
  - Support unsubscribe
  - Service Worker intégré

- ✅ **Notification Queue**
  - Consolidation intelligente
  - Déduplication par clé
  - Fenêtre de consolidation (30s configurable)
  - Nettoyage automatique

- ✅ **Paramètres Personnalisables**
  - Activation/désactivation par canal (email, push, in-app)
  - Filtrage par catégorie
  - Préférences par compte

#### Progressive Web App (PWA)

- ✅ **Service Worker Professionnel** (802 lignes)
  - Stratégies de cache adaptatives
  - Support offline avec queue de sync
  - Retry automatique pour requêtes échouées
  - Support multi-navigateurs (Chrome, Firefox, Safari, Edge)
  - Fallback réseau gracieux

- ✅ **Manifest Web App**
  - Share Target API
  - File Handlers
  - 14 tailles d'icônes optimisées
  - Splash screens iOS
  - Theme colors et display modes

- ✅ **Score Lighthouse : 93/100**
  - Installabilité : 100/100
  - PWA optimisée : 95/100
  - Performance : 90/100
  - Accessibilité : 85/100
  - Best Practices : 95/100

#### Système de Paiements

- ✅ **Infrastructure Paiements**
  - Interface `PaymentGateway` abstraite
  - Provider Stripe implémenté
  - Checkout sessions sécurisées
  - Webhooks Stripe pour événements
  - Support abonnements récurrents

- ✅ **Endpoints API**
  - `POST /billing/checkout-session` - Création session
  - Webhooks pour traitement événements Stripe
  - Plans configurables

#### Optimisations & Performance

- ✅ **Redis Caching**
  - Cache sites publics (projections JSON)
  - TTL configurable (24h par défaut)
  - Invalidation automatique
  - Temps de réponse <10ms

- ✅ **Compression Multi-Format**
  - Support gzip, brotli, zstd
  - Négociation de contenu automatique
  - Cache par format de compression
  - Streaming compression

- ✅ **Parallel Event Processing**
  - Traitement parallèle avec JoinSet
  - Speedup 4x sur événements batch
  - Retry mechanism avancé

- ✅ **Query Optimization**
  - Indexes sur colonnes critiques
  - Connection pooling optimisé
  - Requêtes PostgreSQL optimisées

#### Worker & Module Executor

- ✅ **Event Processor**
  - Polling configurable
  - Batch processing
  - Traitement parallèle
  - Statistiques temps réel

- ✅ **Module Framework**
  - Trait-based design
  - Executor pour modules
  - Retry mechanism (5 tentatives)
  - Graceful shutdown

#### Modules Initiaux

- ✅ **GitHub Sync**
  - Import automatique repos publics
  - Filtrage forks et archives
  - Tri par étoiles
  - Stockage dans website_data

- ✅ **Theme Engine**
  - Thème par défaut professionnel
  - Support thèmes personnalisés
  - Métadonnées de thème
  - Application automatique

- ✅ **Projections Module**
  - Génération `data/sites/<slug>.json`
  - Projections versionnées
  - CRUD operations
  - Metadata tracking

- ✅ **Analytics Tracker**
  - Système de tracking événements
  - Structure événements détaillée
  - Tracking par website
  - Base pour analytics avancées

- ✅ **Blog Engine** (structure)
  - Types et structures
  - Articles avec catégories
  - Support tags
  - Publication workflow

- ✅ **Contact Form** (structure)
  - Formulaire avec validation
  - Protection spam
  - Stockage soumissions
  - Notifications email

### Métriques finales Phase 1-4

| Métrique | Valeur |
|----------|--------|
| Lignes Rust | ~15,000 |
| Migrations SQL | 7 |
| Tests unitaires | 100+ |
| Service Worker | 802 lignes |
| Endpoints API | 50+ |
| Tables PostgreSQL | 15+ |

### Documentation produite

- ✅ README.md - Vue d'ensemble et guide démarrage
- ✅ API_SPEC.md - Contrat d'API complet
- ✅ ARCHITECTURE.md - Architecture technique détaillée
- ✅ CHANGELOG.md - Historique changements détaillé
- ✅ WEBSOCKET_PHASE4.md - WebSocket implémentation
- ✅ NOTIFICATIONS.md - Système notifications
- ✅ PWA_README.md - Documentation PWA complète
- ✅ FILE_STORAGE.md - Gestion fichiers et quotas
- ✅ SPEC_MVP.md - Spécifications fonctionnelles
- ✅ BUSINESS.md - Vision et modèle d'affaires
- ✅ DECISIONS.md - Journal des décisions (ADR)
- ✅ ROADMAP.md - Ce document

---

## 🔨 Phase 5 : Frontend & UX (EN COURS)

**Période :** Décembre 2025 - Février 2026  
**Statut :** 🔨 En cours - 45% complété  
**Objectif :** Rendre le MVP utilisable avec une interface web complète

### Réalisations actuelles

- ✅ **Setup Frontend (Astro + React + TypeScript)**
  - Landing page professionnelle
  - Pages signup/login avec validation
  - Client API TypeScript complet
  - Store d'authentification (Zustand)
  - Routing et navigation

- ✅ **PWA Intégrée**
  - Application installable
  - Mode offline fonctionnel
  - Service Worker actif
  - Manifest configuré

- ✅ **Hooks Temps Réel**
  - Hook WebSocket (`useWebSocket`)
  - Gestion reconnexion automatique
  - Typages TypeScript complets

- ✅ **Système Notifications UI**
  - Composants notification
  - Toast notifications
  - Badge compteur non lus

- ✅ **Gestion Websites (Sprint 1)**
  - Liste websites avec WebsitesList
  - Création depuis presets avec CreateWebsiteModal
  - Suppression website avec confirmation
  - Publication/dépublication rapide
  - Hooks usePresets et useSections

### En cours de développement

- 🔨 **Dashboard Principal**
  - Vue d'ensemble compte
  - Statistiques clés
  - Actions rapides
  - Widgets personnalisables

### À développer

- ⏳ **Éditeur de Sections**
  - Interface drag & drop
  - Réordonnancement sections
  - Édition contenu inline
  - Prévisualisation temps réel
  - Ajout/suppression sections

- ⏳ **Configuration Modules**
  - Activation/désactivation modules
  - Configuration paramètres
  - Gestion intégrations (GitHub)
  - État synchronisation

- ⏳ **Gestion Fichiers**
  - Upload drag & drop
  - Liste fichiers avec filtres
  - Prévisualisation
  - Gestion quotas avec indicateur
  - Suppression et organisation

- ⏳ **Prévisualisation Website**
  - Preview temps réel
  - Mode responsive
  - Navigation sections
  - Bascule draft/published

- ⏳ **Notifications Dropdown**
  - Liste notifications récentes
  - Filtres par catégorie
  - Actions rapides
  - Marquer comme lu
  - Paramètres notifications

- ⏳ **Pages Publiques**
  - Rendu websites publics ([slug])
  - SSG optimisé avec Astro
  - SEO meta tags
  - Performance optimale

- ⏳ **Tests E2E**
  - Scénarios utilisateur complets
  - Tests d'intégration API/Frontend
  - Tests WebSocket
  - Tests notifications

- ⏳ **CI/CD**
  - GitHub Actions setup
  - Tests automatiques
  - Build et deploy automatique
  - Environnements staging/production

### Critères de succès Phase 5

- [ ] Dashboard utilisateur fonctionnel et intuitif
- [ ] Création website en <5 minutes avec preset
- [ ] Édition sections fluide et intuitive
- [ ] Prévisualisation temps réel opérationnelle
- [ ] Publication website en 1 clic
- [ ] Tests E2E couvrant parcours principaux
- [ ] CI/CD déployant automatiquement
- [ ] Site public performant (<2s load)

### Planning estimé

| Tâche | Durée estimée | Statut |
|-------|---------------|--------|
| Dashboard principal | 2 semaines | 🔨 En cours |
| Sélecteur presets | 1 semaine | ⏳ À faire |
| Éditeur sections | 3 semaines | ⏳ À faire |
| Configuration modules | 1 semaine | ⏳ À faire |
| Gestion fichiers | 1 semaine | ⏳ À faire |
| Prévisualisation website | 2 semaines | ⏳ À faire |
| Notifications dropdown | 1 semaine | ⏳ À faire |
| Pages publiques | 2 semaines | ⏳ À faire |
| Tests E2E | 2 semaines | ⏳ À faire |
| CI/CD | 1 semaine | ⏳ À faire |

**Total estimé :** 16 semaines (~4 mois)

---

## 📦 Phase 6 : Modules Avancés & Marketplace (PLANIFIÉ)

**Période :** Mars - Juin 2026  
**Statut :** 📋 Planifié  
**Objectif :** Enrichir la plateforme avec modules avancés et créer un écosystème

### Modules prioritaires

#### AI Generator Module

- [ ] **Text Generation**
  - Intégration OpenAI/Anthropic
  - Génération contenu sections
  - Amélioration textes existants
  - Templates de prompts
  - Quotas tokens par compte

- [ ] **Image Generation**
  - Intégration DALL-E/Midjourney
  - Génération assets visuels
  - Optimisation automatique
  - Quotas génération par compte

- [ ] **Gestion Quotas IA**
  - Budget tokens par compte
  - Tracking usage temps réel
  - Alertes dépassement
  - Projections coûts
  - Recharge automatique

#### Analytics Avancées

- [ ] **Page Views & Traffic**
  - Tracking visiteurs unique
  - Sources de trafic
  - Géolocalisation
  - Devices et navigateurs

- [ ] **Heatmaps**
  - Zones clics
  - Scroll depth
  - Zone chaudes/froides
  - Optimisation UX

- [ ] **Funnels & Conversions**
  - Tunnels de conversion
  - Taux conversion par étape
  - A/B testing
  - Objectifs personnalisés

- [ ] **Dashboards Temps Réel**
  - Visiteurs en ligne
  - Événements temps réel
  - KPIs principaux
  - Alertes automatiques

#### Custom Domains

- [ ] **Configuration DNS**
  - Domaines personnalisés
  - Sous-domaines
  - Configuration DNS automatique
  - Propagation vérification

- [ ] **SSL Automatique**
  - Certificats Let's Encrypt
  - Renouvellement automatique
  - HTTPS forcé
  - Support wildcard

- [ ] **CDN Global**
  - Distribution mondiale
  - Edge caching
  - Optimisation latence
  - DDoS protection

#### Theme Marketplace

- [ ] **Plateforme Marketplace**
  - Catalogue thèmes
  - Recherche et filtres
  - Prévisualisation live
  - Ratings et reviews

- [ ] **Thèmes Premium**
  - Thèmes payants
  - Système de licensing
  - Updates automatiques
  - Support développeurs

- [ ] **Custom Themes SDK**
  - Documentation développeurs
  - CLI outils
  - Templates starters
  - Testing framework

- [ ] **Revenue Sharing**
  - Split 70/30 (créateur/plateforme)
  - Paiements automatiques
  - Dashboard créateurs
  - Analytics ventes

### Infrastructure technique

- [ ] **Advanced Caching**
  - Edge caching CDN
  - Cache invalidation sélective
  - Cache warming
  - Multi-layer caching

- [ ] **Rate Limiting**
  - Rate limiting par endpoint
  - Quotas par plan
  - Protection DDoS
  - Throttling intelligent

- [ ] **Monitoring Production**
  - Prometheus metrics
  - Grafana dashboards
  - Alerting automatique
  - Tracing distribué

### Critères de succès Phase 6

- [ ] 3+ modules avancés en production
- [ ] 10+ thèmes premium marketplace
- [ ] AI Generator utilisé par 50%+ utilisateurs
- [ ] Analytics avancées opérationnelles
- [ ] Custom domains fonctionnels
- [ ] Marketplace avec 5+ créateurs tiers
- [ ] Monitoring production complet

---

## 💳 Phase 7 : Monétisation & Enterprise (PLANIFIÉ)

**Période :** Juillet - Octobre 2026  
**Statut :** 📋 Planifié  
**Objectif :** Lancer la monétisation et viser les clients entreprise

### Plans SaaS

#### Structure Tarifaire

| Plan | Prix | Comptes | Sites | Tokens IA | Stockage | Custom Domains |
|------|------|---------|-------|-----------|----------|----------------|
| **Free** | 0€ | 1 | 1 | 0 | 1GB | 0 |
| **Pro** | 29€/mois | 3 | 5 | 100K/mois | 50GB | 2 |
| **Team** | 99€/mois | 10 | 20 | 500K/mois | 500GB | 10 |
| **Enterprise** | Custom | Illimité | Illimité | Custom | Custom | Illimité |

#### Implémentation

- [ ] **Gestion Plans**
  - Création/modification plans
  - Upgrade/downgrade automatique
  - Prorata calcul
  - Période d'essai (14 jours)

- [ ] **Usage-Based Pricing**
  - Tokens IA supplémentaires
  - Stockage additionnel
  - Domaines supplémentaires
  - Bande passante extra

- [ ] **Invoicing Automatique**
  - Génération factures PDF
  - Envoi email automatique
  - Historique facturation
  - Exports comptables

### Stripe Integration Avancée

- [ ] **Payment Methods**
  - Cartes bancaires
  - SEPA Direct Debit
  - PayPal
  - Virements bancaires

- [ ] **Subscription Management**
  - Gestion abonnements récurrents
  - Webhooks événements Stripe
  - Handling failed payments
  - Dunning management

- [ ] **Billing Portal**
  - Self-service billing
  - Changement plan
  - Update payment methods
  - Download invoices

### Webhooks & API Access

- [ ] **Webhooks Publics**
  - Configuration webhooks utilisateurs
  - Événements personnalisables
  - Signature verification
  - Retry mechanism

- [ ] **API Keys**
  - Génération API keys
  - Scopes et permissions
  - Rate limiting par key
  - Usage tracking

- [ ] **API Documentation**
  - Documentation interactive
  - Exemples code
  - SDKs (JS, Python, Go)
  - Changelog API

### Features Enterprise

- [ ] **Self-Hosted Licensing**
  - License keys
  - On-premise deployment
  - Support installation
  - Updates management

- [ ] **White-Label**
  - Custom branding
  - Domaine personnalisé
  - Logo et couleurs
  - Email templates

- [ ] **Advanced Permissions (RBAC)**
  - Rôles personnalisés
  - Permissions granulaires
  - Équipes et groupes
  - Audit logs

- [ ] **SSO (Single Sign-On)**
  - SAML 2.0
  - OAuth 2.0
  - LDAP/Active Directory
  - Multi-factor authentication

- [ ] **SLA & Support**
  - SLA 99.9% uptime
  - Support prioritaire
  - Account manager dédié
  - Custom integrations

### Multi-Language Support

- [ ] **Internationalisation (i18n)**
  - Frontend multilingue
  - Traductions complètes
  - Détection langue automatique
  - Langues : FR, EN, ES, DE, IT

- [ ] **Localisation (l10n)**
  - Formats dates/heures
  - Devises locales
  - Unités de mesure
  - Conformité locale

### Critères de succès Phase 7

- [ ] 100+ utilisateurs payants
- [ ] MRR (Monthly Recurring Revenue) > 5K€
- [ ] Churn rate < 5%
- [ ] 5+ clients Enterprise
- [ ] API publique utilisée par 20+ intégrations
- [ ] Support multilingue (5 langues)

---

## 🌍 Phase 8 : Scale & Global Expansion (PLANIFIÉ)

**Période :** Novembre 2026 - 2027  
**Statut :** 📋 Planifié  
**Objectif :** Passer à l'échelle mondiale et créer un écosystème

### Infrastructure Globale

- [ ] **Edge Rendering**
  - Cloudflare Workers
  - Vercel Edge Functions
  - SSR distribué globalement
  - Latence <50ms mondiale

- [ ] **Multi-Region Deployment**
  - Régions : EU, US, APAC
  - Réplication données
  - Failover automatique
  - Geo-routing intelligent

- [ ] **Database Sharding**
  - Sharding par tenant
  - Read replicas
  - Write optimization
  - Backup distribués

### Écosystème Développeurs

- [ ] **Custom Modules SDK**
  - SDK public pour modules custom
  - Documentation complète
  - Templates et exemples
  - Testing framework

- [ ] **Module Marketplace**
  - Soumission modules tiers
  - Review process
  - Revenue sharing
  - Support communauté

- [ ] **Developer Program**
  - Certifications développeurs
  - Partner program
  - Bounties et rewards
  - Hackathons réguliers

### Mobile Apps

- [ ] **Application iOS Native**
  - Dashboard mobile
  - Gestion websites
  - Notifications push
  - Offline mode

- [ ] **Application Android Native**
  - Dashboard mobile
  - Gestion websites
  - Notifications push
  - Offline mode

- [ ] **React Native Shared**
  - Code partagé iOS/Android
  - UI/UX optimisée mobile
  - Sync temps réel
  - Deep linking

### Partenariats & Intégrations

- [ ] **Intégrations SaaS**
  - Zapier
  - Make (Integromat)
  - n8n
  - IFTTT

- [ ] **CMS Integrations**
  - WordPress plugin
  - Shopify app
  - Notion integration
  - Webflow connector

- [ ] **Design Tools**
  - Figma plugin
  - Adobe XD
  - Sketch
  - Canva

### Marketing & Growth

- [ ] **Affiliate Program**
  - Commission structure
  - Tracking affiliés
  - Dashboard affiliés
  - Payouts automatiques

- [ ] **Referral Program**
  - Bonus parrainage
  - Codes promo personnalisés
  - Tracking referrals
  - Rewards multi-niveaux

- [ ] **Content Marketing**
  - Blog technique
  - Tutorials vidéo
  - Case studies
  - Webinars réguliers

### Critères de succès Phase 8

- [ ] 10K+ utilisateurs actifs
- [ ] MRR > 100K€
- [ ] Présence 3+ continents
- [ ] 50+ modules tiers marketplace
- [ ] Apps mobiles 10K+ téléchargements
- [ ] 20+ partenariats stratégiques

---

## 📈 Métriques de Succès Globales

### Métriques Techniques

| Métrique | Objectif Q1 2026 | Objectif Q4 2026 | Objectif 2027 |
|----------|------------------|------------------|---------------|
| Uptime | 99.5% | 99.9% | 99.99% |
| API Response Time | <100ms p95 | <50ms p95 | <20ms p95 |
| Page Load Time | <2s | <1s | <500ms |
| WebSocket Latency | <50ms | <30ms | <10ms |
| Tests Coverage | 70% | 80% | 90% |

### Métriques Business

| Métrique | Objectif Q1 2026 | Objectif Q4 2026 | Objectif 2027 |
|----------|------------------|------------------|---------------|
| Utilisateurs actifs | 500 | 5,000 | 50,000 |
| Utilisateurs payants | 50 | 500 | 5,000 |
| MRR | 2K€ | 20K€ | 200K€ |
| Churn rate | <10% | <5% | <3% |
| NPS Score | 30 | 50 | 70 |

### Métriques Produit

| Métrique | Objectif Q1 2026 | Objectif Q4 2026 | Objectif 2027 |
|----------|------------------|------------------|---------------|
| Websites créés | 1,000 | 10,000 | 100,000 |
| Websites publiés | 500 | 5,000 | 50,000 |
| Modules activés | 2,000 | 20,000 | 200,000 |
| Thèmes marketplace | 5 | 20 | 100 |
| Intégrations tierces | 5 | 20 | 50 |

---

## 🎯 Priorités Stratégiques

### Court terme (0-6 mois)

1. **Finaliser Frontend Dashboard** - Phase 5 complète
2. **Tests E2E complets** - Qualité production
3. **CI/CD robuste** - Deploy automatique
4. **Premiers utilisateurs bêta** - Feedback utilisateurs
5. **Documentation utilisateur** - Onboarding fluide

### Moyen terme (6-12 mois)

1. **Modules avancés** - AI Generator, Analytics
2. **Custom domains** - SSL automatique
3. **Theme marketplace** - Écosystème créateurs
4. **Monétisation** - Plans payants actifs
5. **Support multilingue** - Expansion internationale

### Long terme (12-24 mois)

1. **Scale global** - Multi-région
2. **Applications mobiles** - iOS/Android
3. **Enterprise features** - SSO, RBAC, SLA
4. **Écosystème développeurs** - SDK public
5. **Partenariats stratégiques** - Intégrations majeures

---

## 🚧 Risques & Mitigation

### Risques Techniques

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Performance scale | High | Medium | Load testing, caching, CDN |
| Sécurité WebSocket | High | Low | Audit sécurité, rate limiting |
| Coûts infrastructure | Medium | Medium | Optimisation ressources, monitoring |
| Dépendances externes | Medium | Medium | Fallbacks, retry mechanisms |

### Risques Business

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Adoption lente | High | Medium | Marketing, freemium généreux |
| Churn élevé | High | Medium | Onboarding excellent, support réactif |
| Compétition | Medium | High | Différenciation, innovation continue |
| Pricing inadéquat | Medium | Medium | A/B testing, feedback utilisateurs |

### Risques Produit

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Complexité UX | High | Medium | User testing, itérations rapides |
| Bugs critiques | High | Low | Tests automatiques, staging |
| Feature bloat | Medium | High | Priorisation stricte, MVP focus |
| Dette technique | Medium | Medium | Refactoring régulier, code reviews |

---

## 📚 Ressources & Équipe

### Équipe Actuelle

- **1 Full-Stack Developer** (Backend Rust + Frontend TypeScript)
- **1 DevOps** (Infrastructure, CI/CD)

### Équipe Cible Phase 6-7

- **2 Backend Developers** (Rust)
- **2 Frontend Developers** (React/TypeScript)
- **1 DevOps Engineer**
- **1 Product Designer** (UX/UI)
- **1 Product Manager**
- **1 QA Engineer**

### Équipe Cible Phase 8

- **4 Backend Developers**
- **4 Frontend Developers**
- **2 Mobile Developers** (iOS/Android)
- **2 DevOps Engineers**
- **2 Product Designers**
- **1 Product Manager**
- **2 QA Engineers**
- **1 Growth Marketer**
- **1 Customer Success Manager**

---

## 🔗 Liens Utiles

- [README.md](../README.md) - Vue d'ensemble du projet
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture technique
- [API_SPEC.md](./API_SPEC.md) - Spécifications API
- [CHANGELOG.md](./CHANGELOG.md) - Historique des changements
- [BUSINESS.md](./BUSINESS.md) - Vision et modèle d'affaires
- [SPEC_MVP.md](./SPEC_MVP.md) - Spécifications MVP
- [DECISIONS.md](./DECISIONS.md) - Décisions architecturales

---

## 📝 Notes de Révision

**Dernière révision :** 15 décembre 2025  
**Prochaine révision :** 15 mars 2026

Ce roadmap est un document vivant qui sera mis à jour trimestriellement pour refléter les progrès réels, ajuster les priorités et intégrer les feedbacks utilisateurs.

**Pour contribuer ou proposer des changements à ce roadmap, ouvrez une issue ou une PR sur GitHub.**

---

<p align="center">
  <strong>Built with ❤️ for developers, by developers</strong>
</p>
