# Contrat d'API du Core

Ce document décrit les routes HTTP exposées par le **Core API** (pas les modules). Le core fournit la structure et les données utilisateur. Les modules consomment cette API pour implémenter les fonctionnalités.

---

## Format général

- Toutes les réponses sont au format **JSON** (UTF-8)
- L'authentification utilise **JWT** ou **cookies signés**
- Les routes privées requièrent un token JWT
- Chaque requête inclut implicitement le `tenant_id` depuis le token

---

## Routes d'authentification (Publiques)

### `POST /auth/signup`

Crée un utilisateur, un tenant et un portfolio par défaut.

**Corps JSON :**

```json
{
  "email": "dev@example.com",
  "password": "securepassword",
  "portfolio_slug": "mon-portfolio"
}
```

**Réponse (201) :**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "dev@example.com"
  },
  "tenant": {
    "id": "uuid",
    "slug": "mon-portfolio"
  }
}
```

### `POST /auth/login`

Authentifie et retourne un JWT.

**Corps JSON :**

```json
{
  "email": "dev@example.com",
  "password": "securepassword"
}
```

**Réponse (200) :**

```json
{
  "token": "eyJhbGc..."
}
```

---

## Routes Users (Authentifiées)

### `GET /auth/me`

Retourne l'utilisateur courant et ses données.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "email": "dev@example.com",
  "tenant_id": "uuid",
  "data": {
    "integrations": {
      "github": {
        "username": "johndoe"
      }
    },
    "preferences": {
      "theme": "default",
      "enabled_modules": ["github-generator", "default-theme"]
    }
  }
}
```

### `GET /users/:id`

Retourne les données d'un utilisateur.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "email": "dev@example.com",
  "created_at": "2025-12-08T10:00:00Z"
}
```

### `PUT /users/:id`

Met à jour les données utilisateur (profil seulement).

**Corps JSON :**

```json
{
  "data": {
    "preferences": {
      "theme": "dark"
    }
  }
}
```

---

## Routes Intégrations (Authentifiées)

Les intégrations centralisent les données externes (GitHub, etc.).

### `GET /users/:id/integrations`

Retourne toutes les intégrations de l'utilisateur.

**Réponse (200) :**

```json
{
  "github": {
    "username": "johndoe",
    "token": "ghp_...",
    "last_sync": "2025-12-08T10:00:00Z"
  }
}
```

### `PUT /users/:id/integrations/github`

Configure l'intégration GitHub.

**Corps JSON :**

```json
{
  "username": "johndoe",
  "token": "ghp_..."
}
```

**Effets secondaires :**

- Met à jour `user_data.integrations.github`
- Émet événement `USER_INTEGRATION_ADDED` pour les modules

---

## Routes Portfolios (Authentifiées)

### `GET /portfolios`

Liste les portfolios du tenant.

**Réponse (200) :**

```json
{
  "portfolios": [
    {
      "id": "uuid",
      "slug": "mon-portfolio",
      "title": "John Doe",
      "tagline": "Full-Stack Dev",
      "status": "published",
      "created_at": "2025-12-08T10:00:00Z"
    }
  ]
}
```

### `GET /portfolios/:id`

Retourne un portfolio spécifique et son contenu.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "slug": "mon-portfolio",
  "title": "John Doe",
  "tagline": "Full-Stack Dev",
  "status": "draft",
  "metadata": {},
  "data": {
    "projects": [
      {
        "name": "ASAP",
        "description": "Portfolio engine",
        "url": "https://github.com/..."
      }
    ]
  }
}
```

### `PUT /portfolios/:id`

Met à jour la structure du portfolio.

**Corps JSON :**

```json
{
  "title": "John Doe",
  "tagline": "Senior Developer",
  "metadata": {
    "seo_description": "..."
  }
}
```

> **Note :** `data` ne doit pas être modifié directement — il est généré par les modules.

### `PATCH /portfolios/:id/data`

Permet aux modules de mettre à jour le contenu du portfolio.

**Corps JSON :**

```json
{
  "projects": [
    {
      "name": "Project 1",
      "description": "...",
      "url": "https://..."
    }
  ]
}
```

> **Utilisé par :** les modules (GitHubGenerator, etc.)

### `POST /portfolios/:id/publish`

Publie le portfolio et l'expose publiquement.

**Réponse (200) :**

```json
{
  "status": "published",
  "public_url": "https://mon-portfolio.asap.cool"
}
```

**Effets secondaires :**

- Met à jour `portfolios.status = 'published'`
- Émet événement `PORTFOLIO_PUBLISHED` pour les modules

---

## Routes Événements (Authentifiées)

### `POST /events`

Publie un événement. **Utilisé par les modules.**

**Corps JSON :**

```json
{
  "event_type": "PORTFOLIO_GENERATED",
  "payload": {
    "module": "github-generator",
    "timestamp": "2025-12-08T10:00:00Z"
  }
}
```

### `GET /events`

Récupère les événements non traités (polling pour les modules).

**Réponse (200) :**

```json
{
  "events": [
    {
      "id": "uuid",
      "event_type": "USER_INTEGRATION_ADDED",
      "payload": { ... }
    }
  ]
}
```

### `PATCH /events/:id`

Marque un événement comme traité.

**Corps JSON :**

```json
{
  "processed_at": "2025-12-08T10:00:00Z"
}
```

---

## Routes Modules (Authentifiées)

### `GET /modules`

Liste les modules disponibles et activés pour ce tenant.

**Réponse (200) :**

```json
{
  "modules": [
    {
      "id": "uuid",
      "name": "github-generator",
      "version": "1.0.0",
      "description": "Import GitHub repositories",
      "enabled": true
    }
  ]
}
```

### `GET /modules/:id/config`

Retourne la configuration du module pour ce tenant.

**Réponse (200) :**

```json
{
  "module_id": "uuid",
  "config": {
    "enabled": true,
    "settings": {
      "sync_frequency": "daily"
    }
  }
}
```

### `PUT /modules/:id/config`

Met à jour la configuration du module.

**Corps JSON :**

```json
{
  "enabled": true,
  "settings": {
    "sync_frequency": "weekly"
  }
}
```

---

## Routes Publiques (Sans authentification)

### `GET /public/portfolios/:slug`

Retourne un portfolio publié (fallback si projection absente).

**Réponse (200) :**

```json
{
  "slug": "mon-portfolio",
  "title": "John Doe",
  "tagline": "Full-Stack Dev",
  "data": { ... }
}
```

**Erreurs :**

| Code | Description |
|------|-------------|
| `404` | Portfolio non trouvé ou non publié |

---

## Erreurs HTTP

| Code | Description |
|------|-------------|
| `400` | Validation échouée |
| `401` | Non authentifié |
| `403` | Forbidden (mauvais tenant) |
| `404` | Ressource non trouvée |
| `409` | Conflit (slug déjà existant) |
| `500` | Erreur serveur |
