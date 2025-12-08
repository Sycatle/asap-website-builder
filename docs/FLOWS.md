# Parcours Fonctionnels (Flux Modulaire)

Ce document décrit les flux utilisateur et système avec l'architecture **core + modules**.

---

## 1. Inscription (Core)

```
User signup form
    ↓
POST /auth/signup
    ↓
Core crée : users, tenants, portfolios
    ↓
Émet : USER_CREATED
    ↓
Frontend reçoit token JWT
    ↓
Redirige vers /app/dashboard
```

---

## 2. Configuration GitHub (Core + Module)

### Étape 1 : User fournit GitHub username

```
User entre son GitHub username
    ↓
PUT /users/:id/integrations/github { username: "johndoe" }
    ↓
Core stocke dans user_data.integrations
    ↓
Émet : USER_INTEGRATION_ADDED
```

### Étape 2 : GitHubGenerator module réagit

```
Worker détecte USER_INTEGRATION_ADDED
    ↓
Module GitHubGenerator démarré
    ↓
1. GET /auth/me (Core API)
2. Lit user_data.integrations.github.username
3. Appelle GitHub API → récupère repos
4. PATCH /portfolios/:id/data
5. Stocke les projets dans portfolio_data
    ↓
Émet : GITHUB_REPOS_SYNCED
```

---

## 3. Activer un Module (Core)

```
User clique "Activer theme dark"
    ↓
PUT /modules/:id/config { enabled: true }
    ↓
Core met à jour module_configs
    ↓
Émet : MODULE_CONFIG_CHANGED
```

---

## 4. Générer le Rendu (Theme Module)

### Scénario 1 : User valide le portfolio

```
User clique "Publier"
    ↓
POST /portfolios/:id/publish
    ↓
Core met status = "published"
    ↓
Émet : PORTFOLIO_PUBLISHED
    ↓
Worker reçoit l'événement
    ↓
Theme module (default-theme) démarré :
    1. GET /portfolios/:id
    2. Lit portfolio.data (contenu généré)
    3. Applique le thème
    4. Génère data/sites/mon-portfolio.json
    ↓
Émet : PORTFOLIO_RENDERED
```

### Scénario 2 : Module autonome

```
Worker poll en continu
    ↓
Module détecte : GITHUB_REPOS_SYNCED (non traité)
    ↓
Theme module redéclenche rendu
    ↓
Génère data/sites/mon-portfolio.json
    ↓
Marque comme processed
```

---

## 5. Affichage Public (Frontend)

```
Visiteur : GET mon-portfolio.asap.cool
    ↓
Astro lit data/sites/mon-portfolio.json
    ↓ (si absent)
GET /public/portfolios/mon-portfolio (fallback Core)
    ↓
Rendu HTML
```

---

## 6. Mise à jour (Chaîne complète)

```
User modifie GitHub username
    ↓
PUT /users/:id/integrations/github { username: "newdoe" }
    ↓
Core met à jour user_data
    ↓
Émet : USER_INTEGRATION_UPDATED
    ↓
Worker exécute GitHubGenerator
    ↓
Récupère les nouveaux repos
    ↓
PATCH /portfolios/:id/data (met à jour contenu)
    ↓
Émet : GITHUB_REPOS_SYNCED
    ↓
Worker exécute Theme module
    ↓
Régénère data/sites/mon-portfolio.json
    ↓
Portfolio à jour automatiquement
```

---

## Architecture Événementielle

```
┌─────────────────────────────────────┐
│         Core Events Table           │
│                                     │
│ • USER_CREATED                      │
│ • USER_INTEGRATION_ADDED            │
│ • USER_INTEGRATION_UPDATED          │
│ • PORTFOLIO_CREATED                 │
│ • PORTFOLIO_PUBLISHED               │
│ • MODULE_CONFIG_CHANGED             │
│                                     │
└─────────────────────────────────────┘
         ↑                  ↓
    Core API          Worker Pool
                      (Event Processor)
                             ↓
                    ┌───────────────────┐
                    │ Module Executor   │
                    │                   │
                    │ • GitHubGenerator │
                    │ • AIGenerator     │
                    │ • ThemeRenderer   │
                    │ • Analytics       │
                    └───────────────────┘
```

---

## Points clés

- ✅ **Core** = source de vérité pour authentification et données utilisateur
- ✅ **Modules** = implémentent les features en lisant/écrivant via Core API
- ✅ **Événements** = découplent Core et Modules
- ✅ **Idempotence** = modules peuvent être relancés sans risque
- ✅ **Extensibilité** = ajouter un module ne nécessite pas de modifier le Core
