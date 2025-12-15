# Contrat d'API du Core

Ce document décrit les routes HTTP exposées par le **Core API** (pas les modules). Le core fournit la structure et les données utilisateur. Les modules consomment cette API pour implémenter les fonctionnalités.

---

## Format général

- Toutes les réponses sont au format **JSON** (UTF-8)
- L'authentification utilise **JWT** ou **cookies signés**
- Les routes privées requièrent un token JWT
- Chaque requête inclut implicitement le `account_id` depuis le token JWT

---

## Routes d'authentification (Publiques)

### `POST /auth/signup`

Crée un utilisateur, un tenant et un website par défaut.

**Corps JSON :**

```json
{
  "email": "dev@example.com",
  "password": "securepassword",
  "website_slug": "mon-website"
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
    "slug": "mon-website"
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
    "name": "Developer Website",
    "slug": "developer-website",
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

## Routes Notifications (Authentifiées)

### `GET /notifications`

Liste les notifications de l'utilisateur avec filtres optionnels.

**Query params (optionnels) :**
- `category` : filtrer par catégorie (system, account, website, module, billing, etc.)
- `priority` : filtrer par priorité (low, normal, high, urgent)
- `is_read` : filtrer par statut lu/non lu (true/false)
- `limit` : nombre de résultats (défaut: 50)
- `offset` : pagination

**Réponse (200) :**

```json
{
  "notifications": [
    {
      "id": "uuid",
      "title": "Website publié",
      "message": "Votre site 'mon-site' est maintenant en ligne",
      "notification_type": "website_published",
      "category": "website",
      "priority": "normal",
      "is_read": false,
      "action_url": "/websites/uuid",
      "icon": "check-circle",
      "created_at": "2025-12-15T10:30:00Z"
    }
  ],
  "total": 42,
  "unread_count": 5
}
```

### `GET /notifications/unread-count`

Retourne le nombre de notifications non lues.

**Réponse (200) :**

```json
{
  "count": 5
}
```

### `GET /notifications/:notification_id`

Récupère une notification spécifique.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "title": "Notification",
  "message": "Message détaillé",
  "notification_type": "type",
  "category": "system",
  "priority": "normal",
  "is_read": false,
  "created_at": "2025-12-15T10:30:00Z"
}
```

### `POST /notifications/mark-read`

Marque une ou plusieurs notifications comme lues.

**Corps JSON :**

```json
{
  "notification_ids": ["uuid1", "uuid2"],  // Optionnel : IDs spécifiques
  "mark_all": false                         // Optionnel : marquer toutes
}
```

**Réponse (200) :**

```json
{
  "marked_count": 2
}
```

### `POST /notifications/:notification_id/read`

Marque une notification spécifique comme lue.

**Réponse (200) :**

```json
{
  "id": "uuid",
  "is_read": true
}
```

### `DELETE /notifications/:notification_id`

Supprime une notification.

**Réponse (204) :**

Pas de contenu.

### `POST /notifications/push/subscribe`

S'abonne aux notifications push (PWA).

**Corps JSON :**

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNc...",
      "auth": "xyz..."
    }
  }
}
```

**Réponse (200) :**

```json
{
  "message": "Subscription created"
}
```

### `POST /notifications/push/unsubscribe`

Se désabonne des notifications push.

**Corps JSON :**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Réponse (200) :**

```json
{
  "message": "Subscription removed"
}
```

### `GET /notifications/push/vapid-key`

Récupère la clé publique VAPID pour Web Push.

**Réponse (200) :**

```json
{
  "public_key": "BNcG..."
}
```

### `GET /notifications/settings`

Récupère les paramètres de notification de l'utilisateur.

**Réponse (200) :**

```json
{
  "email_enabled": true,
  "push_enabled": true,
  "in_app_enabled": true,
  "categories": {
    "system": true,
    "website": true,
    "module": true,
    "billing": true,
    "security": true
  }
}
```

### `PUT /notifications/settings`

Met à jour les paramètres de notification.

**Corps JSON :**

```json
{
  "email_enabled": false,
  "push_enabled": true,
  "categories": {
    "system": true,
    "billing": true
  }
}
```

**Réponse (200) :**

```json
{
  "message": "Settings updated"
}
```

---

## Routes Paiements (Authentifiées)

### `POST /billing/checkout-session`

Crée une session de paiement Stripe pour un abonnement ou paiement unique.

**Corps JSON :**

```json
{
  "price_id": "price_xxxxx",
  "success_url": "https://app.asap.cool/success",
  "cancel_url": "https://app.asap.cool/cancel",
  "mode": "subscription"  // ou "payment" pour paiement unique
}
```

**Réponse (200) :**

```json
{
  "session_id": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

**Usage :**
Rediriger l'utilisateur vers l'URL retournée pour compléter le paiement.

---

## WebSocket

### `GET /ws`

Établit une connexion WebSocket pour la synchronisation temps réel.

**Authentification :**

Après la connexion, envoyer un message d'authentification :

```json
{
  "type": "auth",
  "token": "eyJhbGc..."
}
```

**Réponse d'authentification :**

```json
{
  "type": "auth_success",
  "data": {
    "account_id": "uuid",
    "message": "Authentication successful"
  }
}
```

**Messages reçus (exemples) :**

```json
// Website mis à jour
{
  "type": "website_updated",
  "data": {
    "website_id": "uuid",
    "website": { ... },
    "user_name": "John Doe"
  }
}

// Module activé
{
  "type": "module_activated",
  "data": {
    "website_id": "uuid",
    "module_slug": "github-sync",
    "user_name": "John Doe"
  }
}

// Fichier uploadé
{
  "type": "file_uploaded",
  "data": {
    "website_id": "uuid",
    "file_id": "uuid",
    "file_name": "image.png",
    "file_size": 1024000
  }
}

// Notification
{
  "type": "notification",
  "data": {
    "notification_id": "uuid",
    "title": "Nouveau message",
    "message": "...",
    "category": "system",
    "priority": "normal"
  }
}
```

**Messages envoyés (actions) :**

```json
// Heartbeat (optionnel, toutes les 30s)
{
  "type": "ping"
}
```

**Déconnexion :**

La connexion se ferme automatiquement en cas d'inactivité ou d'erreur d'authentification.

---

## Routes Fichiers (Authentifiées)

### `POST /files`

Upload un fichier avec compression automatique.

**Content-Type :** `multipart/form-data`

**Champs :**
- `file` : fichier à uploader
- `website_id` : UUID du website (optionnel)
- `category` : catégorie (image, document, etc.)

**Réponse (201) :**

```json
{
  "file": {
    "id": "uuid",
    "file_name": "image.png",
    "original_name": "photo.png",
    "file_size": 512000,
    "mime_type": "image/png",
    "category": "image",
    "storage_path": "accounts/uuid/files/...",
    "compression": {
      "enabled": true,
      "original_size": 1024000,
      "compressed_size": 512000,
      "ratio": 0.5,
      "algorithm": "gzip"
    },
    "created_at": "2025-12-15T10:30:00Z"
  }
}
```

### `GET /files`

Liste les fichiers de l'utilisateur.

**Query params (optionnels) :**
- `website_id` : filtrer par website
- `category` : filtrer par catégorie
- `limit` : nombre de résultats
- `offset` : pagination

**Réponse (200) :**

```json
{
  "files": [...],
  "total": 42
}
```

### `DELETE /files/:file_id`

Supprime un fichier.

**Réponse (204) :**

Pas de contenu.

### `GET /files/quota/usage`

Récupère l'usage du quota de stockage.

**Réponse (200) :**

```json
{
  "used_bytes": 104857600,
  "quota_bytes": 1073741824,
  "usage_percentage": 9.76,
  "file_count": 42
}
```

---

## Erreurs HTTP

| Code | Description |
|------|-------------|
| `400` | Validation échouée |
| `401` | Non authentifié |
| `403` | Forbidden (mauvais tenant) |
| `404` | Ressource non trouvée |
| `409` | Conflit (slug déjà existant) |
| `413` | Fichier trop volumineux |
| `429` | Trop de requêtes (rate limiting) |
| `500` | Erreur serveur |
