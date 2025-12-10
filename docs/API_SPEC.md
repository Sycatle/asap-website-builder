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

## Routes Websites (Authentifiées)

### `GET /websites`

Liste les websites du tenant.

**Réponse (200) :**

```json
[
  {
    "id": "uuid",
    "slug": "mon-site",
    "title": "John Doe",
    "tagline": "Full-Stack Dev",
    "status": "published",
    "creation_mode": "from_preset",
    "preset_id": "uuid"
  }
]
```

### `GET /websites/:id`

Retourne un website spécifique et son contenu.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "slug": "mon-site",
  "title": "John Doe",
  "tagline": "Full-Stack Dev",
  "status": "draft",
  "creation_mode": "from_preset",
  "preset_id": "uuid",
  "metadata": {},
  "data": {
    "projects": [
      {
        "name": "ASAP",
        "description": "Website builder",
        "url": "https://github.com/..."
      }
    ]
  }
}
```

### `PUT /websites/:id`

Met à jour la structure du website.

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

### `PATCH /websites/:id/data`

Permet aux modules de mettre à jour le contenu du website.

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

> **Utilisé par :** les modules (GitHub Sync, etc.)

### `POST /websites/:id/publish`

Publie le website et l'expose publiquement.

**Réponse (200) :**

```json
{
  "status": "published",
  "public_url": "https://mon-site.asap.cool"
}
```

**Effets secondaires :**

- Met à jour `websites.status = 'published'`
- Émet événement `WEBSITE_PUBLISHED` pour les modules

---

## Routes Sections (Authentifiées)

### `GET /websites/:id/sections`

Liste les sections d'un website.

**Réponse (200) :**

```json
[
  {
    "id": "uuid",
    "section_type": "hero",
    "slug": "hero",
    "title": "Welcome",
    "order": 0,
    "layout": "full",
    "settings": {},
    "data": {},
    "visible": true
  }
]
```

### `POST /websites/:id/sections`

Crée une nouvelle section.

**Corps JSON :**

```json
{
  "section_type": "about",
  "slug": "about",
  "title": "About Me",
  "order": 1,
  "layout": "split"
}
```

### `PATCH /websites/:id/sections/:section_id`

Met à jour une section.

**Corps JSON :**

```json
{
  "title": "À propos",
  "data": { "content": "..." },
  "visible": true
}
```

### `DELETE /websites/:id/sections/:section_id`

Supprime une section.

### `POST /websites/:id/sections/reorder`

Réordonne les sections.

**Corps JSON :**

```json
{
  "section_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Routes Website Modules (Authentifiées)

### `GET /websites/:id/modules`

Liste les modules activés pour un website.

**Réponse (200) :**

```json
[
  {
    "id": "uuid",
    "module_id": "uuid",
    "module_name": "github-sync",
    "settings": { "auto_sync": true },
    "enabled": true
  }
]
```

### `POST /websites/:id/modules`

Active un module pour un website.

**Corps JSON :**

```json
{
  "module_id": "uuid",
  "settings": { "auto_sync": true }
}
```

### `PATCH /websites/:id/modules/:module_id`

Met à jour les settings d'un module.

---

## Routes Presets (Authentifiées)

### `GET /presets`

Liste les presets (templates) disponibles.

**Réponse (200) :**

```json
[
  {
    "id": "uuid",
    "name": "Developer Portfolio",
    "slug": "developer-portfolio",
    "description": "Perfect for developers",
    "category": "professional",
    "thumbnail_url": "https://..."
  }
]
```

### `POST /websites/from-preset`

Crée un website à partir d'un preset.

**Corps JSON :**

```json
{
  "preset_id": "uuid",
  "slug": "mon-site",
  "title": "Mon Site"
}
```

---

## Routes Module Catalog (Authentifiées)

### `GET /modules/catalog`

Liste les modules disponibles dans le catalogue.

**Réponse (200) :**

```json
[
  {
    "id": "uuid",
    "name": "GitHub Sync",
    "slug": "github-sync",
    "description": "Sync projects from GitHub",
    "category": "integration",
    "default_settings": {}
  }
]
```

---

## Routes Événements (Authentifiées)

### `POST /events`

Publie un événement. **Utilisé par les modules.**

**Corps JSON :**

```json
{
  "event_type": "WEBSITE_PUBLISHED",
  "payload": {
    "module": "github-sync",
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

### `GET /public/websites/:slug`

Retourne un website publié (fallback si projection absente).

**Réponse (200) :**

```json
{
  "slug": "mon-site",
  "title": "John Doe",
  "tagline": "Full-Stack Dev",
  "sections": [...],
  "data": { ... }
}
```

**Erreurs :**

| Code | Description |
|------|-------------|
| `404` | Website non trouvé ou non publié |

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
