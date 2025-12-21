<div align="center">

# 🚀 ASAP

**Créez et publiez votre site professionnel en moins de 5 minutes**

[![Status](https://img.shields.io/badge/status-MVP%20v1.0-success?style=for-the-badge)](https://asap.cool)
[![Rust](https://img.shields.io/badge/rust-1.70+-orange?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Open--Core-purple?style=for-the-badge)](LICENSE)

[Site Web](https://asap.cool) • [Documentation](docs/) • [Roadmap](docs/ROADMAP.md)

</div>

---

## ✨ Qu'est-ce qu'ASAP ?

ASAP est une plateforme SaaS de création de sites web modulaires. Elle permet aux développeurs, freelances et créateurs de générer un site professionnel en quelques clics grâce à des **presets prêts à l'emploi** et l'**import automatique de projets GitHub**.

### 🎯 Cas d'usage

| Profil | Usage |
|--------|-------|
| **Développeurs** | Portfolio avec projets GitHub importés automatiquement |
| **Freelances** | Site vitrine avec services, tarifs et formulaire de contact |
| **Créateurs** | Landing page avec liens et présentation |
| **Agences** | Gestion multi-sites pour plusieurs clients |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Astro + React)                  │
│   Dashboard (/app)              Sites publics (*.asap.cool) │
└──────────────────────────┬──────────────────────────────────┘
                           │ API REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                    Core API (Rust + Axum)                    │
│  • Auth (JWT)           • Websites & Sections               │
│  • Multi-tenant         • Extensions & Presets              │
│  • Events               • Notifications (Push/In-app)       │
│  • Files & Storage      • Billing (Stripe)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ Events
┌──────────────────────────▼──────────────────────────────────┐
│                    Worker (Rust + Tokio)                     │
│  Extensions: Github Sync • Analytics                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  PostgreSQL (données)      Redis (cache, pub/sub)           │
└─────────────────────────────────────────────────────────────┘
```

### Principes clés

| Concept | Description |
|---------|-------------|
| **Core + Extensions** | Le core gère les données, les extensions ajoutent les fonctionnalités |
| **Website → Sections** | Structure modulaire avec 14 types de sections (Hero, Projects, Skills...) |
| **Presets** | Templates prêts à l'emploi pour démarrer instantanément |
| **Projections** | Fichiers JSON statiques pour des performances optimales |
| **Event-driven** | Architecture réactive avec workers asynchrones |

---

## 🛠 Stack technique

| Couche | Technologies |
|--------|--------------|
| **Backend** | Rust, Axum, SQLx, Tokio |
| **Frontend** | Astro, React, TypeScript, TailwindCSS |
| **Base de données** | PostgreSQL 15+, Redis 7+ |
| **Infrastructure** | Docker, Docker Compose |
| **Paiements** | Stripe |
| **PWA** | Service Worker, Web Push |

---

## 📁 Structure du projet

```
asap/
├── core/                    # API Core (Rust)
│   ├── domain/             # Modèles (Account, Website, Event...)
│   ├── api/                # Routes HTTP & handlers
│   ├── shared/             # Utilitaires (auth, config, errors)
│   ├── payments/           # Intégration Stripe
│   └── notifications/      # Notifications (core extension)
│
├── extensions/              # Extensions (Rust)
│   ├── github-sync/        # Github Sync - Import projets GitHub
│   └── analytics/          # Tracking & stats
│
├── packages/                # Packages partagés (TypeScript)
│   ├── shared/             # @asap/shared - Types & utils
│   └── renderers/          # @asap/renderers - 14 renderers sections
│
├── apps/                    # Applications
│   ├── api/                # Serveur API (Rust)
│   ├── worker/             # Worker async (Rust)
│   ├── web/                # Dashboard (Astro + React)
│   └── sites/              # Sites publics (Astro)
│
├── infra/                   # Infrastructure
│   ├── docker-compose.yml
│   ├── migrations/         # Migrations SQL
│   └── env.example/        # Templates d'environnement
│
├── data/                    # Runtime (non versionné)
│   └── sites/              # Projections JSON générées
│
└── docs/                    # Documentation complète
```

---

## 🚀 Démarrage rapide

### Prérequis

- **Rust** 1.70+
- **Node.js** 18+
- **Docker** & Docker Compose
- **Make** (optionnel)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/asap.git && cd asap

# 2. Copier les fichiers d'environnement
cp infra/env.example/api.env infra/api.env
cp infra/env.example/worker.env infra/worker.env
cp infra/env.example/web.env infra/web.env

# 3. Lancer tous les services (PostgreSQL, Redis, API, Worker)
docker compose -f infra/docker-compose.yml up -d

# 4. Lancer le frontend
cd apps/web && npm install && npm run dev
```

### Développement local (sans Docker)

```bash
# Terminal 1 - PostgreSQL & Redis
docker compose -f infra/docker-compose.dev.yml up -d

# Terminal 2 - API
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
cargo run -p asap-api

# Terminal 3 - Worker
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
cargo run -p asap-worker

# Terminal 4 - Frontend
cd apps/web && npm run dev
```

### URLs locales

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:4321/app |
| API | http://localhost:3000 |
| WebSocket | ws://localhost:3000/ws |
| Sites publics | http://{slug}.localhost:4321 |

---

## 📡 API

### Authentification

```bash
# Inscription
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "password": "secure123", "slug": "mon-site"}'

# Connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "password": "secure123"}'
```

### Websites & Sections

```bash
# Créer depuis un preset
curl -X POST http://localhost:3000/websites/from-preset \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preset_id": "uuid", "slug": "mon-portfolio", "title": "Mon Portfolio"}'

# Lister les sections
curl http://localhost:3000/websites/{id}/sections \
  -H "Authorization: Bearer $TOKEN"

# Publier
curl -X POST http://localhost:3000/websites/{id}/publish \
  -H "Authorization: Bearer $TOKEN"
```

> 📖 Documentation API complète : [docs/API_SPEC.md](docs/API_SPEC.md)

---

## 🧩 Sections disponibles

| Type | Description | Layouts |
|------|-------------|---------|
| `hero` | Section d'accueil principale | full |
| `about` | Présentation | split, full |
| `projects` | Galerie de projets | grid, cards |
| `skills` | Compétences techniques | grid, list |
| `experience` | Parcours professionnel | timeline, list |
| `education` | Formation | timeline, list |
| `services` | Services proposés | cards, grid |
| `pricing` | Grille tarifaire | cards |
| `testimonials` | Témoignages | cards |
| `contact` | Formulaire de contact | full, split |
| `blog` | Articles | list, grid |
| `gallery` | Galerie d'images | grid |
| `faq` | Questions fréquentes | list |
| `custom` | Section personnalisée | tous |

---

## 🧪 Tests

```bash
# Tous les tests unitaires
make test

# Par composant
make test-domain      # Core domain (31 tests)
make test-extensions  # Extensions (38 tests)

# Avec couverture
cargo test --workspace -- --test-threads=1
```

**Couverture actuelle :** 100+ tests unitaires couvrant le core et les extensions.

---

## 📊 Métriques

| Métrique | Valeur |
|----------|--------|
| Tests | 100+ |
| Lignes Rust | ~15,000 |
| Migrations SQL | 17 |
| Renderers React | 14 |
| Score PWA | 93/100 |

---

## 🗺 Roadmap

### ✅ MVP v1.0 (Terminé)

- [x] Core API complet (auth, multi-tenant, websites, sections)
- [x] Worker avec extensions (GitHub Sync, Themes, Analytics)
- [x] Dashboard web (Astro + React)
- [x] 3 presets (portfolio-dev, portfolio-minimal, freelance)
- [x] PWA avec notifications push
- [x] Intégration Stripe

### 🔜 v1.1 (En cours)

- [ ] Onboarding amélioré
- [ ] Éditeur de sections enrichi
- [ ] Import GitHub optimisé
- [ ] Analytics dashboard

### 📋 Futur

- [ ] AI Generator (contenu généré par IA)
- [ ] Custom domains (DNS + SSL)
- [ ] Marketplace (thèmes, plugins)
- [ ] App mobile (React Native)

> 📖 Roadmap détaillée : [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 💰 Modèle économique

| Plan | Prix | Sites | Stockage |
|------|------|-------|----------|
| **Free** | 0€ | 1 | 1 GB |
| **Pro** | 29€/mois | 5 | 50 GB |
| **Team** | 99€/mois | Illimité | 500 GB |

---

## 🤝 Contribution

ASAP suit un modèle **open-core** :

- `core/` → MIT License (open-source)
- `modules/` → Licence propriétaire

### Contribuer

1. Fork le repository
2. Créer une branche : `git checkout -b feature/ma-feature`
3. Commit : `git commit -m 'Add: ma feature'`
4. Push : `git push origin feature/ma-feature`
5. Ouvrir une Pull Request

### Standards

- **Rust** : `rustfmt` + `clippy`
- **TypeScript** : ESLint + Prettier
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [API_SPEC.md](docs/API_SPEC.md) | Spécification API complète |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Guide de développement |
| [STRUCTURE.md](docs/STRUCTURE.md) | Structure du monorepo |
| [FLOWS.md](docs/FLOWS.md) | Parcours utilisateur |
| [NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | Système de notifications |
| [PWA_README.md](docs/PWA_README.md) | Documentation PWA |
| [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Configuration base de données |
| [TESTING.md](docs/TESTING.md) | Guide des tests |
| [CHANGELOG.md](docs/CHANGELOG.md) | Historique des changements |

---

## 📄 Licence

- **Core** (`core/`) : [MIT License](LICENSE)
- **Extensions** (`extensions/`) : Licence propriétaire
- **SaaS** : [Conditions d'utilisation](https://asap.cool/terms)

---

<div align="center">

**Built with ❤️ by the ASAP Team**

[Website](https://asap.cool) • [Documentation](docs/) • [Issues](https://github.com/votre-org/asap/issues)

</div>
