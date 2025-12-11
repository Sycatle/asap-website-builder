-- Migration: 008_github_profile_schema
-- Description: Update GitHub Sync module config_schema to display user profile and organizations

-- ============================================================================
-- Update GitHub Sync module schema with profile and organizations display
-- ============================================================================

UPDATE modules SET config_schema = '{
  "fields": [
    {
      "key": "github_username",
      "type": "text",
      "label": "Nom d''utilisateur GitHub",
      "description": "Votre nom d''utilisateur GitHub pour synchroniser vos projets",
      "placeholder": "ex: octocat",
      "required": true
    },
    {
      "key": "auto_sync",
      "type": "boolean",
      "label": "Synchronisation automatique",
      "description": "Synchroniser automatiquement vos projets toutes les 24h",
      "default": false
    },
    {
      "key": "include_forks",
      "type": "boolean",
      "label": "Inclure les forks",
      "description": "Inclure les repositories forkés dans la liste",
      "default": false
    },
    {
      "key": "max_repos",
      "type": "number",
      "label": "Nombre maximum de repos",
      "description": "Limite du nombre de projets à afficher",
      "default": 10,
      "validation": {
        "min": 1,
        "max": 50
      }
    }
  ],
  "actions": [
    {
      "key": "sync",
      "label": "Synchroniser maintenant",
      "description": "Récupérer les dernières données depuis GitHub",
      "endpoint": "/sync",
      "method": "POST",
      "style": "primary",
      "refreshAfter": true
    }
  ],
  "dataDisplay": [
    {
      "type": "profile",
      "source": "profile",
      "title": "Profil GitHub",
      "emptyMessage": "Profil non disponible. Lancez une synchronisation.",
      "fields": [
        {"key": "avatar_url", "type": "image"},
        {"key": "name", "type": "title"},
        {"key": "username", "type": "subtitle", "prefix": "@"},
        {"key": "bio", "type": "text"},
        {"key": "location", "type": "meta", "icon": "location"},
        {"key": "company", "type": "meta", "icon": "company"},
        {"key": "blog", "type": "link", "icon": "link"},
        {"key": "twitter", "type": "link", "icon": "twitter", "linkPrefix": "https://twitter.com/"},
        {"key": "public_repos", "type": "stat", "label": "Repos"},
        {"key": "followers", "type": "stat", "label": "Followers"},
        {"key": "following", "type": "stat", "label": "Following"}
      ]
    },
    {
      "type": "avatarList",
      "source": "organizations",
      "title": "Organisations",
      "emptyMessage": "Aucune organisation publique",
      "fields": [
        {"key": "avatar_url", "type": "image"},
        {"key": "name", "type": "text"},
        {"key": "description", "type": "description"}
      ]
    },
    {
      "type": "list",
      "source": "projects",
      "title": "Projets synchronisés",
      "emptyMessage": "Aucun projet synchronisé. Configurez votre nom d''utilisateur GitHub et lancez une synchronisation.",
      "fields": [
        {"key": "name", "label": "Nom", "type": "link", "linkKey": "url"},
        {"key": "description", "label": "Description", "type": "text"},
        {"key": "language", "label": "Langage", "type": "badge", "colorKey": "language"},
        {"key": "stars", "label": "Stars", "type": "number"},
        {"key": "forks", "label": "Forks", "type": "number"}
      ]
    }
  ],
  "sections": [
    {
      "key": "github_config",
      "title": "Configuration GitHub",
      "description": "Connectez votre compte GitHub pour synchroniser vos projets",
      "fields": ["github_username", "auto_sync", "include_forks", "max_repos"]
    }
  ]
}'::jsonb
WHERE slug = 'github-sync';
