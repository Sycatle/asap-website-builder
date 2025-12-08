# Journal des décisions d'architecture

Ce fichier enregistre les choix importants faits pour la conception d'ASAP. Chaque entrée suit le modèle **ADR** (Architecture Decision Record) simplifié.

---

## ADR-0001 – Choix du backend : Rust (Axum) + PostgreSQL

**Date :** 2025-12-08

### Contexte

Nous devons choisir un stack backend pour gérer les tenants, les utilisateurs, les sites, et exécuter des tâches asynchrones. Les performances, la sécurité mémoire et la scalabilité sont des facteurs clés.

### Décision

Utiliser **Rust** avec le framework **Axum** pour exposer l'API HTTP, et **PostgreSQL** comme base de données principale.

### Alternatives envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Node/TypeScript (Fastify, NestJS) | Productivité élevée | Consommation CPU plus importante |
| PHP (Laravel) | Familiarité | Modèle d'exécution moins adapté aux tâches asynchrones |
| Go | Simple et performant | Typage moins riche, moins de garanties mémoire |

### Arguments

- Rust offre une exécution native (perf), un modèle mémoire sûr (moins de bugs) et un async/await robuste
- La communauté Rust backend (Axum, SQLx) est mature et bien documentée
- PostgreSQL est fiable, ACID, supporte JSONB et RLS, idéal pour un SaaS multitenant

### Conséquences

- ✅ Performances excellentes
- ✅ Sécurité mémoire garantie
- ⚠️ Nécessité de compétences Rust dans l'équipe
- ⚠️ Investissement initial plus élevé par rapport à du Node/PHP

---

## ADR-0002 – Séparation lecture/écriture via projections locales

**Date :** 2025-12-08

### Contexte

Nous devons servir potentiellement des milliers de portfolios avec des temps de chargement très bas sans surcharger la base de données.

### Décision

Adopter un modèle **CQRS léger** : l'écriture se fait dans PostgreSQL et la lecture publique se fait à partir de projections (JSON ou SQLite) générées par un worker.

### Alternatives envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Lecture directe PostgreSQL | Simple | Charge sur la DB, latence |
| Cache Redis + API | Rapide | Infrastructure supplémentaire, invalidation complexe |

### Arguments

- Les fichiers JSON/SQLite sont ultra rapides à charger (TTFB quasi instantané) et ne nécessitent pas de connexion base
- La projection asynchrone permet d'étaler la charge en arrière-plan et d'éviter les contentions
- Facilite un futur basculement vers un stockage edge (Turso, D1) ou un CDN

### Conséquences

- ✅ TTFB < 100ms sans CDN
- ✅ Scalabilité horizontale des lectures
- ⚠️ Introduction d'un composant worker supplémentaire
- ⚠️ Complexité du débogage accrue entre config en base et projection locale

---

## ADR-0003 – Monorepo et open-core

**Date :** 2025-12-08

### Contexte

Nous souhaitons ouvrir une partie du code tout en gardant des modules propriétaires.

### Décision

Structurer le projet en **monorepo** avec un dossier `core/` open-source et des dossiers `modules/` privés. Le monorepo contient également les applications (`apps/`) et l'infrastructure.

### Alternatives envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Plusieurs repos (microservices) | Isolation | Complexité pour débuter |
| Repo unique 100% fermé | Simplicité | Moins d'attractivité dev, pas de contributions |

### Arguments

- Le monorepo simplifie le développement et la gestion des dépendances internes
- L'open-core permet de bénéficier de contributions tout en conservant un avantage compétitif avec les modules premium

### Conséquences

- ✅ Développement simplifié
- ✅ Contributions externes possibles
- ⚠️ Nécessité d'outils pour gérer la release open-source vs propriétaire
- ⚠️ Exigence d'une gouvernance claire sur ce qui reste ouvert ou non
