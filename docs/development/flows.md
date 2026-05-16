<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# Parcours Fonctionnels (Flux avec Extensions)

Ce document décrit les flux utilisateur et système avec l'architecture **core + extensions**.

---

## 1. Inscription (Core)

```
Account signup form
    ↓
POST /auth/signup
    ↓
Core crée : accounts, tenants, websites
    ↓
Émet : ACCOUNT_CREATED
    ↓
Frontend reçoit token JWT
    ↓
Redirige vers /app/dashboard
```

---

## 2. Configuration GitHub (Core + Extension)

### Étape 1 : User fournit GitHub username

```
User entre son GitHub username
    ↓
PUT /accounts/:id/integrations/github { username: "johndoe" }
    ↓
Core stocke dans account_data.integrations
    ↓
Émet : ACCOUNT_INTEGRATION_ADDED
```

### Étape 2 : Extension GitHubGenerator réagit

```
Worker détecte ACCOUNT_INTEGRATION_ADDED
    ↓
Extension GitHubGenerator démarrée
    ↓
1. GET /auth/me (Core API)
2. Lit account_data.integrations.github.username
3. Appelle GitHub API → récupère repos
4. PATCH /websites/:id/data
5. Stocke les projets dans website_data
    ↓
Émet : GITHUB_REPOS_SYNCED
```

---

## 3. Activer une Extension (Core)

```
User clique "Activer GitHub Sync"
    ↓
POST /websites/:id/extensions { extension_id: "uuid" }
    ↓
Core crée website_extensions
    ↓
Émet : EXTENSION_ACTIVATED
```

---

## 4. Générer le Rendu (Theme Extension)

### Scénario 1 : User valide le website

```
User clique "Publier"
    ↓
POST /websites/:id/publish
    ↓
Core met status = "published"
    ↓
Émet : WEBSITE_PUBLISHED
    ↓
Worker reçoit l'événement
    ↓
Theme extension (default-theme) démarrée :
    1. GET /websites/:id
    2. Lit website.data (contenu généré)
    3. Applique le thème
    4. Génère data/sites/mon-website.json
    ↓
Émet : WEBSITE_RENDERED
```

### Scénario 2 : Extension autonome

```
Worker poll en continu
    ↓
Extension détecte : GITHUB_REPOS_SYNCED (non traité)
    ↓
Theme extension redéclenche rendu
    ↓
Génère data/sites/mon-website.json
    ↓
Marque comme processed
```

---

## 5. Affichage Public (Frontend)

```
Visiteur : GET mon-website.asap.cool
    ↓
Astro lit data/sites/mon-website.json
    ↓ (si absent)
GET /public/websites/mon-website (fallback Core)
    ↓
Rendu HTML
```

---

## 6. Mise à jour (Chaîne complète)

```
User modifie GitHub username
    ↓
PUT /accounts/:id/integrations/github { username: "newdoe" }
    ↓
Core met à jour account_data
    ↓
Émet : ACCOUNT_INTEGRATION_UPDATED
    ↓
Worker exécute GitHubGenerator
    ↓
Récupère les nouveaux repos
    ↓
PATCH /websites/:id/data (met à jour contenu)
    ↓
Émet : GITHUB_REPOS_SYNCED
    ↓
Worker exécute Theme extension
    ↓
Régénère data/sites/mon-website.json
    ↓
Website à jour automatiquement
```

---

## Architecture Événementielle

```
┌─────────────────────────────────────┐
│         Core Events Table           │
│                                     │
│ • ACCOUNT_CREATED                   │
│ • ACCOUNT_INTEGRATION_ADDED         │
│ • ACCOUNT_INTEGRATION_UPDATED       │
│ • WEBSITE_CREATED                   │
│ • WEBSITE_PUBLISHED                 │
│ • EXTENSION_ACTIVATED               │
│ • EXTENSION_DEACTIVATED             │
│                                     │
└─────────────────────────────────────┘
         ↑                  ↓
    Core API          Worker Pool
                      (Event Processor)
                             ↓
                    ┌───────────────────┐
                    │ Extension Exec    │
                    │                   │
                    │ • GitHubGenerator │
                    │ • ThemeRenderer   │
                    │ • Analytics       │
                    │ • Projections     │
                    └───────────────────┘
```

---

## Points clés

- ✅ **Core** = source de vérité pour authentification et données utilisateur
- ✅ **Extensions** = implémentent les features en lisant/écrivant via Core API
- ✅ **Événements** = découplent Core et Extensions
- ✅ **Idempotence** = extensions peuvent être relancées sans risque
- ✅ **Extensibilité** = ajouter une extension ne nécessite pas de modifier le Core
