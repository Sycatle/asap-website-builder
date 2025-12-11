-- Migration: 006_module_config_schema
-- Description: Add config_schema column to modules for schema-driven UI

-- ============================================================================
-- STEP 1: Add config_schema column to modules table
-- ============================================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS config_schema JSONB DEFAULT NULL;

-- ============================================================================
-- STEP 2: Add config schemas for existing modules
-- ============================================================================

-- GitHub Sync module schema
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

-- Blog Engine module schema
UPDATE modules SET config_schema = '{
  "fields": [
    {
      "key": "posts_per_page",
      "type": "number",
      "label": "Articles par page",
      "description": "Nombre d''articles affichés par page",
      "default": 10,
      "validation": {"min": 1, "max": 50}
    },
    {
      "key": "enable_comments",
      "type": "boolean",
      "label": "Activer les commentaires",
      "description": "Permettre aux visiteurs de commenter vos articles",
      "default": false
    },
    {
      "key": "show_author",
      "type": "boolean",
      "label": "Afficher l''auteur",
      "description": "Afficher le nom de l''auteur sur les articles",
      "default": true
    },
    {
      "key": "show_date",
      "type": "boolean",
      "label": "Afficher la date",
      "description": "Afficher la date de publication",
      "default": true
    },
    {
      "key": "excerpt_length",
      "type": "number",
      "label": "Longueur de l''extrait",
      "description": "Nombre de caractères pour l''aperçu des articles",
      "default": 200,
      "validation": {"min": 50, "max": 500}
    }
  ],
  "dataDisplay": [
    {
      "type": "stats",
      "source": "stats",
      "title": "Statistiques du blog",
      "stats": [
        {"key": "total_posts", "label": "Articles publiés"},
        {"key": "total_views", "label": "Vues totales"},
        {"key": "total_comments", "label": "Commentaires"}
      ]
    }
  ],
  "sections": [
    {
      "key": "display",
      "title": "Affichage",
      "description": "Options d''affichage des articles",
      "fields": ["posts_per_page", "excerpt_length", "show_author", "show_date"]
    },
    {
      "key": "interaction",
      "title": "Interaction",
      "description": "Options d''interaction avec les visiteurs",
      "fields": ["enable_comments"]
    }
  ]
}'::jsonb
WHERE slug = 'blog-engine';

-- Contact Form module schema
UPDATE modules SET config_schema = '{
  "fields": [
    {
      "key": "notify_email",
      "type": "email",
      "label": "Email de notification",
      "description": "Adresse email où recevoir les messages du formulaire",
      "placeholder": "votre@email.com",
      "required": true
    },
    {
      "key": "require_captcha",
      "type": "boolean",
      "label": "Protection anti-spam",
      "description": "Activer la vérification CAPTCHA pour éviter le spam",
      "default": true
    },
    {
      "key": "success_message",
      "type": "textarea",
      "label": "Message de confirmation",
      "description": "Message affiché après l''envoi du formulaire",
      "default": "Merci pour votre message ! Nous vous répondrons dans les plus brefs délais.",
      "placeholder": "Votre message personnalisé..."
    },
    {
      "key": "fields_name",
      "type": "boolean",
      "label": "Champ Nom",
      "description": "Afficher le champ nom dans le formulaire",
      "default": true
    },
    {
      "key": "fields_phone",
      "type": "boolean",
      "label": "Champ Téléphone",
      "description": "Afficher le champ téléphone dans le formulaire",
      "default": false
    },
    {
      "key": "fields_subject",
      "type": "boolean",
      "label": "Champ Sujet",
      "description": "Afficher le champ sujet dans le formulaire",
      "default": true
    }
  ],
  "dataDisplay": [
    {
      "type": "stats",
      "source": "stats",
      "title": "Messages reçus",
      "stats": [
        {"key": "total_messages", "label": "Total messages"},
        {"key": "unread_messages", "label": "Non lus"},
        {"key": "this_month", "label": "Ce mois"}
      ]
    }
  ],
  "sections": [
    {
      "key": "notifications",
      "title": "Notifications",
      "description": "Configurez comment recevoir les messages",
      "fields": ["notify_email", "success_message"]
    },
    {
      "key": "form_fields",
      "title": "Champs du formulaire",
      "description": "Personnalisez les champs affichés",
      "fields": ["fields_name", "fields_phone", "fields_subject"]
    },
    {
      "key": "security",
      "title": "Sécurité",
      "description": "Options de protection contre le spam",
      "fields": ["require_captcha"]
    }
  ]
}'::jsonb
WHERE slug = 'contact-form';

-- Analytics Tracker module schema
UPDATE modules SET config_schema = '{
  "fields": [
    {
      "key": "track_events",
      "type": "boolean",
      "label": "Suivre les événements",
      "description": "Enregistrer les clics sur les boutons et liens",
      "default": true
    },
    {
      "key": "track_scroll",
      "type": "boolean",
      "label": "Suivre le défilement",
      "description": "Enregistrer jusqu''où les visiteurs scrollent",
      "default": false
    },
    {
      "key": "anonymous",
      "type": "boolean",
      "label": "Mode anonyme",
      "description": "Ne pas collecter d''informations personnelles (recommandé pour RGPD)",
      "default": true
    },
    {
      "key": "exclude_bots",
      "type": "boolean",
      "label": "Exclure les robots",
      "description": "Ignorer le trafic des robots et crawlers",
      "default": true
    }
  ],
  "dataDisplay": [
    {
      "type": "stats",
      "source": "stats",
      "title": "Aperçu",
      "stats": [
        {"key": "total_views", "label": "Pages vues"},
        {"key": "unique_visitors", "label": "Visiteurs uniques"},
        {"key": "avg_time", "label": "Temps moyen"},
        {"key": "bounce_rate", "label": "Taux de rebond"}
      ]
    }
  ],
  "sections": [
    {
      "key": "tracking",
      "title": "Suivi",
      "description": "Configurez ce que vous souhaitez mesurer",
      "fields": ["track_events", "track_scroll"]
    },
    {
      "key": "privacy",
      "title": "Confidentialité",
      "description": "Options de respect de la vie privée",
      "fields": ["anonymous", "exclude_bots"]
    }
  ]
}'::jsonb
WHERE slug = 'analytics-tracker';

-- Theme Engine module schema
UPDATE modules SET config_schema = '{
  "fields": [
    {
      "key": "default_theme",
      "type": "select",
      "label": "Thème",
      "description": "Choisissez le style visuel de votre site",
      "default": "modern",
      "options": [
        {"value": "modern", "label": "Modern"},
        {"value": "minimal", "label": "Minimal"},
        {"value": "corporate", "label": "Corporate"},
        {"value": "creative", "label": "Creative"},
        {"value": "dark", "label": "Dark Mode"}
      ]
    },
    {
      "key": "primary_color",
      "type": "color",
      "label": "Couleur principale",
      "description": "Couleur d''accent utilisée pour les boutons et liens",
      "default": "#3B82F6"
    },
    {
      "key": "font_family",
      "type": "select",
      "label": "Police",
      "description": "Police de caractères pour le contenu",
      "default": "inter",
      "options": [
        {"value": "inter", "label": "Inter"},
        {"value": "roboto", "label": "Roboto"},
        {"value": "poppins", "label": "Poppins"},
        {"value": "merriweather", "label": "Merriweather"},
        {"value": "jetbrains-mono", "label": "JetBrains Mono"}
      ]
    },
    {
      "key": "custom_css",
      "type": "boolean",
      "label": "CSS personnalisé",
      "description": "Permettre l''ajout de CSS personnalisé",
      "default": false
    },
    {
      "key": "custom_css_code",
      "type": "textarea",
      "label": "Code CSS",
      "description": "Ajoutez vos styles CSS personnalisés",
      "placeholder": "/* Vos styles ici */\\n.mon-element {\\n  color: red;\\n}"
    }
  ],
  "sections": [
    {
      "key": "appearance",
      "title": "Apparence",
      "description": "Personnalisez le look de votre site",
      "fields": ["default_theme", "primary_color", "font_family"]
    },
    {
      "key": "advanced",
      "title": "Avancé",
      "description": "Options avancées de personnalisation",
      "fields": ["custom_css", "custom_css_code"]
    }
  ]
}'::jsonb
WHERE slug = 'theme-engine';

-- ============================================================================
-- STEP 3: Add icon column for modules
-- ============================================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- Set icons for modules
UPDATE modules SET icon = 'github' WHERE slug = 'github-sync';
UPDATE modules SET icon = 'blog' WHERE slug = 'blog-engine';
UPDATE modules SET icon = 'mail' WHERE slug = 'contact-form';
UPDATE modules SET icon = 'chart' WHERE slug = 'analytics-tracker';
UPDATE modules SET icon = 'palette' WHERE slug = 'theme-engine';
