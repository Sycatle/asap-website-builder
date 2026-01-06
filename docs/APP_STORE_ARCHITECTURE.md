# ASAP Extension Store — Architecture de Conception

> **Version**: 1.0.0  
> **Date**: 6 janvier 2026  
> **Auteur**: Architecture Team  
> **Statut**: RFC (Request for Comments)

---

## 1. Résumé Exécutif

### 1.1 Problème Actuel

L'architecture d'extensions actuelle souffre de plusieurs incohérences:

| Problème | Impact |
|----------|--------|
| **Double source de vérité** | `extension.toml` + `extension_catalog.rs` définissent la même chose différemment |
| **Schéma non unifié** | Chaque extension peut avoir une structure de settings arbitraire |
| **Pas de versioning sémantique** | Impossible de gérer les migrations de settings entre versions |
| **Activation fragmentée** | `extensions` table + `website_extensions` table avec logique dupliquée |
| **Pas de marketplace mindset** | Conçu comme "features à activer" pas comme "apps à installer" |
| **Permissions floues** | Pas de déclaration explicite des capabilities requises |

### 1.2 Vision Cible

Transformer le système d'extensions en un **App Store interne** avec:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ASAP APP STORE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  GitHub      │  │    Blog      │  │   Contact    │              │
│  │  Sync        │  │   Engine     │  │    Form      │              │
│  │  ──────────  │  │  ──────────  │  │  ──────────  │              │
│  │  ★★★★☆ 4.2  │  │  ★★★★★ 4.8  │  │  ★★★★☆ 4.5  │              │
│  │  12k users   │  │  8k users    │  │  15k users   │              │
│  │              │  │              │  │              │              │
│  │ [Installer]  │  │ [Installer]  │  │ [Installer]  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  Catégories: Intégrations • Contenu • Engagement • Analytics       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Analyse de l'Existant

### 2.1 Sources de Configuration Actuelles

#### A. Fichiers `extension.toml` (déclaratif)

```toml
# extensions/github-sync/extension.toml
[extension]
slug = "github-sync"
name = "Github Sync"
version = "1.0.0"
description = "..."
category = "integration"

[[fields]]
id = "github_username"
type = "text"
label = "..."

[[actions]]
id = "sync"
endpoint = "/sync"
```

**Avantages**: Lisible, séparé du code, facile à modifier  
**Inconvénients**: Non typé, non validé à la compilation, dupliqué

#### B. Fichier `extension_catalog.rs` (programmatique)

```rust
fn github_sync_extension() -> ExtensionDefinition {
    ExtensionDefinition {
        slug: "github-sync".to_string(),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![...])
        ),
        collections: vec![...],
        variables: vec![...],
    }
}
```

**Avantages**: Typé, validé, proche du code  
**Inconvénients**: Verbeux, mélange définition et logique

#### C. Table `extensions` (runtime)

```sql
CREATE TABLE extensions (
  slug TEXT UNIQUE,
  name TEXT,
  config_schema JSONB,  -- Copie sérialisée
  ...
);
```

**Rôle**: Cache runtime, synchronisé au démarrage

### 2.2 Flux de Données Actuel

```
extension.toml ──┐
                 │   (ignoré actuellement)
                 ▼
extension_catalog.rs ──► ExtensionRegistry ──► sync_extensions_catalog()
                                                       │
                                                       ▼
                                              TABLE extensions
                                                       │
                                                       ▼
                                         TABLE website_extensions
                                           (activation par website)
```

### 2.3 Problèmes Identifiés

1. **`extension.toml` ignoré** → Le fichier TOML existe mais n'est pas utilisé
2. **Définition en Rust** → Chaque modification nécessite recompilation
3. **Pas de manifest standard** → Structure arbitraire par extension
4. **Settings non migrables** → Changement de schema = données perdues
5. **Pas de permissions** → Extension peut tout faire sans déclaration

---

## 3. Architecture Cible: Extension Manifest

### 3.1 Philosophie: Un Manifest Unifié

Chaque extension déclare TOUT dans un fichier `manifest.toml`:

```
extensions/
├── github-sync/
│   ├── manifest.toml      ← Source unique de vérité
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── handlers.rs    ← Handlers pour les actions
│   │   └── sync.rs        ← Logique métier
│   └── assets/
│       ├── icon.svg
│       └── screenshot.png
```

### 3.2 Structure du Manifest

```toml
# manifest.toml - Version 2.0

[app]
id = "github-sync"
name = "GitHub Sync"
version = "2.0.0"
description = "Import your GitHub repositories automatically"
tagline = "Your code, your site"
author = "ASAP Team"
license = "MIT"
homepage = "https://asap.cool/apps/github-sync"
repository = "https://github.com/asap-cool/extensions"

[app.display]
icon = "assets/icon.svg"
color = "#181717"                    # Brand color
screenshots = ["assets/screenshot.png"]
category = "integration"
tags = ["github", "developer", "portfolio", "open-source"]

[app.requirements]
min_core_version = "1.0.0"
plan = "free"                        # free | pro | enterprise

# ============================================
# PERMISSIONS DÉCLARÉES
# ============================================

[permissions]
# Données accessibles
data = [
    "account:read",                  # Lire profil utilisateur
    "website:read",                  # Lire website courant
    "website:write:collections",     # Écrire dans les collections
    "website:write:variables",       # Écrire les variables
]

# APIs externes
network = [
    "api.github.com",
]

# Événements écoutés
events = [
    "website.published",
    "extension.settings.updated",
]

# ============================================
# CONFIGURATION UTILISATEUR
# ============================================

[config]
# Définition des settings
[config.fields.github_username]
type = "text"
label = "GitHub Username"
description = "Your GitHub username to sync repositories from"
placeholder = "octocat"
required = true
validation = { pattern = "^[a-zA-Z0-9-]+$", message = "Invalid GitHub username" }

[config.fields.auto_sync]
type = "boolean"
label = "Auto-sync"
description = "Automatically sync every 24 hours"
default = false

[config.fields.include_forks]
type = "boolean"
label = "Include Forks"
description = "Include forked repositories"
default = false

[config.fields.max_repos]
type = "number"
label = "Maximum Repositories"
description = "Limit the number of repos to display"
default = 10
validation = { min = 1, max = 100 }

[config.fields.languages_filter]
type = "multiselect"
label = "Filter by Language"
description = "Only show repositories in these languages"
options = [
    { value = "rust", label = "Rust" },
    { value = "typescript", label = "TypeScript" },
    { value = "python", label = "Python" },
    { value = "go", label = "Go" },
]
default = []

# Sections de configuration (groupement UI)
[[config.sections]]
id = "connection"
title = "GitHub Connection"
description = "Configure your GitHub account"
fields = ["github_username"]

[[config.sections]]
id = "sync_options"
title = "Sync Options"
description = "Customize how repositories are synced"
fields = ["auto_sync", "include_forks", "max_repos", "languages_filter"]

# ============================================
# ACTIONS (boutons dans l'UI)
# ============================================

[[actions]]
id = "sync_now"
label = "Sync Now"
description = "Fetch latest repositories from GitHub"
icon = "refresh"
style = "primary"
endpoint = "/sync"
method = "POST"
refresh_after = true

[[actions]]
id = "disconnect"
label = "Disconnect"
description = "Remove GitHub connection"
icon = "unlink"
style = "danger"
endpoint = "/disconnect"
method = "DELETE"
confirm = "Are you sure you want to disconnect your GitHub account?"

# ============================================
# COLLECTIONS (données exposées)
# ============================================

[[collections]]
slug = "github_repos"
name = "GitHub Repositories"
description = "Your synced GitHub repositories"
sync_mode = "manual"                 # manual | auto | realtime

[collections.schema]
primary_key = "id"
display_field = "name"
preview_fields = ["description", "language", "stars"]

[[collections.schema.fields]]
key = "id"
type = "string"
label = "ID"
required = true

[[collections.schema.fields]]
key = "name"
type = "string"
label = "Repository Name"
required = true
sortable = true
searchable = true

[[collections.schema.fields]]
key = "full_name"
type = "string"
label = "Full Name"

[[collections.schema.fields]]
key = "description"
type = "string"
label = "Description"
searchable = true

[[collections.schema.fields]]
key = "url"
type = "url"
label = "URL"
required = true

[[collections.schema.fields]]
key = "homepage"
type = "url"
label = "Homepage"

[[collections.schema.fields]]
key = "language"
type = "string"
label = "Language"
filterable = true
icon = "code"

[[collections.schema.fields]]
key = "stars"
type = "number"
label = "Stars"
sortable = true
icon = "star"

[[collections.schema.fields]]
key = "forks"
type = "number"
label = "Forks"
sortable = true
icon = "git-fork"

[[collections.schema.fields]]
key = "topics"
type = "array"
label = "Topics"
filterable = true

[[collections.schema.fields]]
key = "is_fork"
type = "boolean"
label = "Is Fork"
filterable = true

[[collections.schema.fields]]
key = "is_archived"
type = "boolean"
label = "Is Archived"
filterable = true

[[collections.schema.fields]]
key = "created_at"
type = "datetime"
label = "Created"
sortable = true

[[collections.schema.fields]]
key = "updated_at"
type = "datetime"
label = "Last Updated"
sortable = true

[[collections.schema.fields]]
key = "pushed_at"
type = "datetime"
label = "Last Push"
sortable = true

# ============================================
# VARIABLES (valeurs calculées exposées)
# ============================================

[[variables]]
key = "github_username"
name = "GitHub Username"
type = "string"
source = { type = "config", field = "github_username" }

[[variables]]
key = "github_total_repos"
name = "Total Repositories"
type = "number"
source = { type = "computed", operation = "count", collection = "github_repos" }

[[variables]]
key = "github_total_stars"
name = "Total Stars"
type = "number"
source = { type = "computed", operation = "sum", collection = "github_repos", field = "stars" }
format = { style = "number", notation = "compact" }

[[variables]]
key = "github_total_forks"
name = "Total Forks"
type = "number"
source = { type = "computed", operation = "sum", collection = "github_repos", field = "forks" }

[[variables]]
key = "github_top_language"
name = "Top Language"
type = "string"
source = { type = "computed", operation = "mode", collection = "github_repos", field = "language" }

# ============================================
# HOOKS (points d'extension)
# ============================================

[hooks]
# Appelé à l'installation
on_install = "handlers::on_install"

# Appelé à la désinstallation
on_uninstall = "handlers::on_uninstall"

# Appelé quand les settings changent
on_config_change = "handlers::on_config_change"

# Appelé périodiquement (si auto_sync activé)
on_scheduled_sync = "handlers::on_scheduled_sync"

# ============================================
# MIGRATIONS (pour gérer l'évolution des settings)
# ============================================

[[migrations]]
from_version = "1.0.0"
to_version = "2.0.0"
description = "Rename sync_interval to auto_sync boolean"
script = """
if settings.sync_interval and settings.sync_interval > 0:
    settings.auto_sync = true
del settings.sync_interval
"""
```

---

## 4. Types de Champs Standardisés

### 4.1 Catalogue des Types de Champs

| Type | Description | Validation possible | UI Component |
|------|-------------|---------------------|--------------|
| `text` | Texte court | `pattern`, `min_length`, `max_length` | `<Input>` |
| `textarea` | Texte long | `min_length`, `max_length` | `<Textarea>` |
| `number` | Nombre | `min`, `max`, `step` | `<Input type="number">` |
| `boolean` | Vrai/Faux | — | `<Switch>` |
| `select` | Choix unique | `options[]` | `<Select>` |
| `multiselect` | Choix multiples | `options[]`, `min`, `max` | `<MultiSelect>` |
| `url` | URL valide | `schemes[]` | `<Input>` + validation |
| `email` | Email valide | — | `<Input type="email">` |
| `password` | Mot de passe | `min_length` | `<Input type="password">` |
| `color` | Couleur hex | — | `<ColorPicker>` |
| `date` | Date | `min`, `max` | `<DatePicker>` |
| `datetime` | Date + heure | `min`, `max` | `<DateTimePicker>` |
| `file` | Upload fichier | `accept`, `max_size` | `<FileUpload>` |
| `image` | Upload image | `accept`, `max_size`, `dimensions` | `<ImageUpload>` |
| `json` | JSON brut | `schema` | `<CodeEditor>` |
| `secret` | Secret chiffré | — | `<SecretInput>` |
| `oauth` | OAuth flow | `provider` | `<OAuthButton>` |

### 4.2 Type Definitions (TypeScript)

```typescript
// Types de base pour les champs de configuration
interface BaseField {
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  visible_if?: Condition;           // Affichage conditionnel
  disabled_if?: Condition;          // Désactivation conditionnelle
}

interface TextField extends BaseField {
  type: 'text' | 'textarea' | 'email' | 'url' | 'password';
  placeholder?: string;
  validation?: {
    pattern?: string;
    min_length?: number;
    max_length?: number;
    message?: string;
  };
}

interface NumberField extends BaseField {
  type: 'number';
  validation?: {
    min?: number;
    max?: number;
    step?: number;
  };
  format?: {
    style: 'decimal' | 'percent' | 'currency';
    currency?: string;
  };
}

interface SelectField extends BaseField {
  type: 'select' | 'multiselect';
  options: Array<{ value: string; label: string; icon?: string }>;
  validation?: {
    min?: number;              // Min selections (multiselect)
    max?: number;              // Max selections (multiselect)
  };
}

interface OAuthField extends BaseField {
  type: 'oauth';
  provider: 'github' | 'google' | 'twitter' | 'notion' | 'figma';
  scopes: string[];
}

// Condition pour affichage/désactivation conditionnel
interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'exists' | 'empty';
  value?: unknown;
}
```

---

## 5. Système de Permissions

### 5.1 Modèle de Permissions

```
┌──────────────────────────────────────────────────────────────┐
│                    PERMISSION MODEL                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DATA PERMISSIONS                                            │
│  ├── account:read           Lire les infos du compte        │
│  ├── account:write          Modifier le compte              │
│  ├── website:read           Lire le website courant         │
│  ├── website:write          Modifier le website             │
│  ├── website:write:sections Modifier les sections           │
│  ├── website:write:collections Modifier les collections     │
│  ├── website:write:variables   Modifier les variables       │
│  └── storage:write          Upload des fichiers             │
│                                                              │
│  NETWORK PERMISSIONS                                         │
│  ├── network:github.com     Appeler l'API GitHub            │
│  ├── network:notion.so      Appeler l'API Notion            │
│  └── network:*              Tout domaine (dangereux)        │
│                                                              │
│  EVENT SUBSCRIPTIONS                                         │
│  ├── event:website.published                                │
│  ├── event:website.settings.changed                         │
│  ├── event:extension.installed                              │
│  └── event:scheduled.*      Tâches planifiées               │
│                                                              │
│  SPECIAL PERMISSIONS                                         │
│  ├── billing:usage          Reporter l'usage (métriques)    │
│  └── notifications:send     Envoyer des notifications       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Affichage à l'Installation

```
┌─────────────────────────────────────────────────────────────┐
│                 Install GitHub Sync?                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This app will be able to:                                  │
│                                                             │
│  ✓ Read your account profile                                │
│  ✓ Read your website data                                   │
│  ✓ Create and modify collections                            │
│  ✓ Create computed variables                                │
│  ✓ Connect to api.github.com                                │
│                                                             │
│  This app listens to:                                       │
│  • Website published events                                 │
│  • Settings changed events                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Cancel]                     [Install GitHub Sync] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Lifecycle des Extensions

### 6.1 États d'une Extension

```
                    ┌──────────────┐
                    │   CATALOG    │
                    │  (available) │
                    └──────┬───────┘
                           │
                      [Install]
                           │
                           ▼
                    ┌──────────────┐
         ┌─────────│  INSTALLED   │──────────┐
         │         │  (inactive)  │          │
         │         └──────┬───────┘          │
         │                │                   │
    [Uninstall]      [Activate]          [Configure]
         │                │                   │
         │                ▼                   │
         │         ┌──────────────┐          │
         │         │   ACTIVE     │◄─────────┘
         │         │ (per website)│
         │         └──────┬───────┘
         │                │
         │           [Deactivate]
         │                │
         │                ▼
         │         ┌──────────────┐
         └────────►│  INSTALLED   │
                   │  (inactive)  │
                   └──────────────┘
```

### 6.2 Hooks du Lifecycle

| Hook | Quand | Usage |
|------|-------|-------|
| `on_install` | Installation | Créer resources initiales |
| `on_activate` | Activation sur un website | Setup per-website |
| `on_config_change` | Settings modifiés | Revalider, re-sync |
| `on_deactivate` | Désactivation | Cleanup per-website |
| `on_uninstall` | Désinstallation | Supprimer toutes données |
| `on_upgrade` | Mise à jour version | Migrer données |
| `on_scheduled_sync` | Timer périodique | Auto-sync |

---

## 7. Schéma Base de Données Révisé

### 7.1 Nouvelles Tables

```sql
-- Catalogue des apps (synchronisé depuis manifests)
CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    tagline VARCHAR(255),
    
    -- Display
    icon_url TEXT,
    color VARCHAR(7),
    category VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- Requirements
    min_core_version VARCHAR(20),
    required_plan VARCHAR(20) DEFAULT 'free',
    
    -- Permissions
    permissions JSONB NOT NULL DEFAULT '{}',
    
    -- Full manifest (cached)
    manifest JSONB NOT NULL,
    
    -- Metadata
    author VARCHAR(255),
    homepage TEXT,
    repository TEXT,
    
    -- Stats
    install_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, deprecated, disabled
    featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apps installées par compte (niveau compte, pas website)
CREATE TABLE account_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id),
    
    -- Installation
    installed_version VARCHAR(20) NOT NULL,
    installed_at TIMESTAMPTZ DEFAULT now(),
    
    -- Config globale (niveau compte)
    global_settings JSONB DEFAULT '{}',
    
    -- Permissions accordées (subset de app.permissions)
    granted_permissions JSONB NOT NULL,
    
    -- OAuth tokens (encrypted)
    oauth_tokens JSONB,
    
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(account_id, app_id)
);

-- Apps activées par website
CREATE TABLE website_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    account_app_id UUID NOT NULL REFERENCES account_apps(id) ON DELETE CASCADE,
    
    -- Config spécifique au website
    settings JSONB DEFAULT '{}',
    
    -- État
    enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    activated_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(website_id, account_app_id)
);

-- Settings migrations history
CREATE TABLE app_settings_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_app_id UUID NOT NULL REFERENCES account_apps(id) ON DELETE CASCADE,
    from_version VARCHAR(20) NOT NULL,
    to_version VARCHAR(20) NOT NULL,
    settings_before JSONB NOT NULL,
    settings_after JSONB NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_apps_category ON apps(category);
CREATE INDEX idx_apps_status ON apps(status);
CREATE INDEX idx_apps_featured ON apps(featured) WHERE featured = true;
CREATE INDEX idx_apps_tags ON apps USING GIN(tags);
CREATE INDEX idx_account_apps_account ON account_apps(account_id);
CREATE INDEX idx_website_apps_website ON website_apps(website_id);
```

### 7.2 Migration depuis l'Ancien Schéma

```sql
-- Migration: extensions → apps
INSERT INTO apps (slug, name, version, description, category, manifest)
SELECT 
    slug, 
    name, 
    version, 
    description, 
    category,
    jsonb_build_object(
        'app', jsonb_build_object('id', slug, 'name', name, 'version', version),
        'config', config_schema
    )
FROM extensions;

-- Migration: website_extensions → account_apps + website_apps
-- (nécessite logique plus complexe en application)
```

---

## 8. API du Store

### 8.1 Endpoints Catalogue

```
# Lister les apps du store
GET /api/store/apps
    ?category=integration
    ?search=github
    ?tags[]=developer
    ?featured=true
    ?sort=popular|newest|rating
    
# Détails d'une app
GET /api/store/apps/:slug

# Ratings et reviews (futur)
GET /api/store/apps/:slug/reviews
POST /api/store/apps/:slug/reviews
```

### 8.2 Endpoints Installation

```
# Apps installées pour le compte
GET /api/account/apps
POST /api/account/apps/:slug/install
DELETE /api/account/apps/:slug/uninstall

# Config globale d'une app
GET /api/account/apps/:slug/settings
PUT /api/account/apps/:slug/settings

# Apps activées sur un website
GET /api/websites/:id/apps
POST /api/websites/:id/apps/:slug/activate
PUT /api/websites/:id/apps/:slug/settings
DELETE /api/websites/:id/apps/:slug/deactivate

# Actions d'une app
POST /api/websites/:id/apps/:slug/actions/:action_id
```

---

## 9. Interface Utilisateur

### 9.1 Store View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Dashboard           🔍 Search apps...                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  APP STORE                                                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🌟 FEATURED                                                 │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  [GitHub Sync]  Import your GitHub projects          │   │   │
│  │  │                 automatically. Perfect for           │   │   │
│  │  │    ★★★★★       developer portfolios.                 │   │   │
│  │  │                                       [Install Free] │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  CATEGORIES                                                         │
│  [All] [Integrations] [Content] [Engagement] [Analytics]           │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │ 📝 Blog       │  │ 📬 Contact    │  │ 📊 Analytics  │          │
│  │   Engine      │  │    Form       │  │   Pro         │          │
│  │               │  │               │  │               │          │
│  │ Create and    │  │ Receive       │  │ Track your    │          │
│  │ manage blog   │  │ messages      │  │ visitors      │          │
│  │ posts         │  │ from visitors │  │               │          │
│  │               │  │               │  │               │          │
│  │ ★★★★★ (245)  │  │ ★★★★☆ (182)  │  │ ★★★★☆ (89)   │          │
│  │ [Installed ✓] │  │ [Install]     │  │ [Pro Plan]    │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 App Detail View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Store                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────┐                                                          │
│  │  📦  │  GitHub Sync                           [Install Free]    │
│  │      │  by ASAP Team • v2.0.0                                   │
│  └──────┘  ★★★★★ (423 ratings) • 12,456 installs                  │
│                                                                     │
│  "Your code, your site"                                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  DESCRIPTION                                                        │
│  Import your GitHub repositories and display them beautifully      │
│  on your portfolio. Supports filtering by language, sorting by     │
│  stars, and automatic sync.                                        │
│                                                                     │
│  FEATURES                                                          │
│  • Automatic repository import                                     │
│  • Filter by language, stars, forks                               │
│  • Computed stats (total stars, top language)                     │
│  • Variable interpolation support                                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  SCREENSHOTS                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │             │  │             │  │             │                │
│  │  [Config]   │  │  [Preview]  │  │  [Result]   │                │
│  │             │  │             │  │             │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  PERMISSIONS REQUIRED                                               │
│  ⚠️ This app will be able to:                                      │
│  • Read your account profile                                       │
│  • Create collections on your websites                             │
│  • Connect to api.github.com                                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  COLLECTIONS PROVIDED                                               │
│  • github_repos (16 fields) - Your GitHub repositories             │
│                                                                     │
│  VARIABLES PROVIDED                                                 │
│  • {{github_username}} - Your GitHub username                      │
│  • {{github_total_repos}} - Total repository count                 │
│  • {{github_total_stars}} - Sum of all stars                       │
│  • {{github_top_language}} - Most used language                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 Installed App Config

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Apps                                    [Uninstall]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 GitHub Sync                                    v2.0.0           │
│     Installed • Active on 2 websites                               │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ┌─ GITHUB CONNECTION ──────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  GitHub Username *                                            │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ sycatle                                                  │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │  Your GitHub username to sync repositories from              │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ SYNC OPTIONS ───────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Auto-sync                                         [  OFF  ] │  │
│  │  Automatically sync every 24 hours                           │  │
│  │                                                               │  │
│  │  Include Forks                                     [  OFF  ] │  │
│  │  Include forked repositories                                 │  │
│  │                                                               │  │
│  │  Maximum Repositories                                        │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ 10                                                       │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  Filter by Language                                          │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ [TypeScript ×] [Rust ×]                        [+ Add]  │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ACTIONS                                                            │
│  ┌─────────────────┐  ┌──────────────────┐                        │
│  │  🔄 Sync Now    │  │  🔗 Disconnect   │                        │
│  │  (Primary)      │  │  (Danger)        │                        │
│  └─────────────────┘  └──────────────────┘                        │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  DATA PREVIEW                                                       │
│  Collection: github_repos (24 items) • Last sync: 2h ago           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  1. asap              ★ 847  TypeScript                       │ │
│  │  2. portfolio         ★ 234  TypeScript                       │ │
│  │  3. cli-tools         ★ 156  Rust                             │ │
│  │  ...                                                          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                                              [Save Changes]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Résumé des Changements

### 10.1 Ce qui Disparaît

| Élément | Raison |
|---------|--------|
| `extension.toml` séparé | Fusionné dans `manifest.toml` |
| `extension_catalog.rs` hardcodé | Remplacé par lecture dynamique des manifests |
| Table `extensions` | Renommée `apps` avec plus de métadonnées |
| Table `website_extensions` | Scindée en `account_apps` + `website_apps` |
| `ExtensionDefinition` struct | Remplacé par `AppManifest` parsé depuis TOML |

### 10.2 Ce qui Apparaît

| Élément | Bénéfice |
|---------|----------|
| `manifest.toml` unifié | Source unique de vérité, complète |
| Système de permissions | Sécurité, transparence pour l'utilisateur |
| Lifecycle hooks | Comportement prévisible, migrations |
| Store UI | Expérience App Store |
| Versioning + Migrations | Évolution sans casse |
| Ratings/Reviews | Social proof, feedback loop |

### 10.3 Plan de Migration

| Phase | Durée | Actions |
|-------|-------|---------|
| **Phase 1** | 1 semaine | Parser `manifest.toml`, garder compatibilité `extension_catalog.rs` |
| **Phase 2** | 1 semaine | Migration DB (`extensions` → `apps`) |
| **Phase 3** | 2 semaines | UI Store + nouvelles permissions |
| **Phase 4** | 1 semaine | Déprécier ancien système |

---

## 11. Questions Ouvertes

1. **Marketplace externe ?** — Permettre des apps tierces à terme ?
2. **Monétisation apps ?** — Apps payantes avec revenue share ?
3. **Sandbox ?** — Isolation des apps (WASM, containers) ?
4. **Versioning SemVer strict ?** — Breaking changes = major bump obligatoire ?

---

## 12. Conclusion

Cette refonte transforme un système d'extensions technique en un **App Store utilisateur-centrique**:

- **Pour l'utilisateur**: Expérience cohérente, permissions claires, installation simple
- **Pour le développeur**: Un seul fichier manifest, hooks clairs, migrations gérées
- **Pour la plateforme**: Extensibilité maîtrisée, métriques, potentiel marketplace

Le manifest unifié `manifest.toml` devient le **contrat** entre l'app et la plateforme — tout ce qu'une app peut faire doit y être déclaré.
