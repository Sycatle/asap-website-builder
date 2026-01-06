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

---

## 13. Restructuration Frontend

### 13.1 Analyse de l'Existant Frontend

#### Structure Actuelle des Composants Extensions

```
apps/web/src/components/
├── features/
│   ├── extensions/                    ← Actuellement fragmenté
│   │   └── extension-manager/
│   │       ├── components/
│   │       │   ├── ExtensionCard.tsx
│   │       │   ├── ExtensionGrid.tsx
│   │       │   └── InstallDialog.tsx
│   │       ├── hooks.ts
│   │       ├── types.ts
│   │       └── index.ts
│   └── settings/
│       └── extension-settings/        ← Logique dupliquée
│           ├── ExtensionConfigForm.tsx
│           └── SchemaRenderer.tsx
├── studio/
│   └── data-binding/                  ← Collections (Phase 3)
│       ├── CollectionSelector.tsx
│       ├── VariablePicker.tsx
│       └── ...
└── SchemaRenderer.tsx                 ← Global, devrait être dans ui/
```

#### Problèmes Identifiés

| Problème | Impact |
|----------|--------|
| **SchemaRenderer global** | Pas dans la bonne couche, difficile à maintenir |
| **Extension config dans settings** | Devrait être dans la feature extensions |
| **Pas de composants Store** | Manque pages catalogue/détail app |
| **Types dispersés** | `types.ts` dans chaque feature |
| **Hooks non réutilisables** | Couplés aux composants spécifiques |

### 13.2 Architecture Frontend Cible

```
apps/web/src/
├── components/
│   ├── ui/                            # Composants atomiques (shadcn)
│   │   ├── form-renderer/             # NOUVEAU: Rendu dynamique de formulaires
│   │   │   ├── FormRenderer.tsx       # Orchestrateur principal
│   │   │   ├── field-renderers/       # Un renderer par type de champ
│   │   │   │   ├── TextField.tsx
│   │   │   │   ├── NumberField.tsx
│   │   │   │   ├── SelectField.tsx
│   │   │   │   ├── BooleanField.tsx
│   │   │   │   ├── MultiSelectField.tsx
│   │   │   │   ├── OAuthField.tsx
│   │   │   │   ├── ColorField.tsx
│   │   │   │   ├── DateField.tsx
│   │   │   │   ├── FileField.tsx
│   │   │   │   ├── SecretField.tsx
│   │   │   │   └── index.ts
│   │   │   ├── section-renderer/      # Groupement de champs
│   │   │   │   └── FormSection.tsx
│   │   │   └── index.ts
│   │   └── ... (autres composants ui)
│   │
│   ├── features/
│   │   ├── app-store/                 # NOUVEAU: Feature App Store complète
│   │   │   ├── components/
│   │   │   │   ├── store/             # Pages catalogue
│   │   │   │   │   ├── AppStorePage.tsx
│   │   │   │   │   ├── AppStoreGrid.tsx
│   │   │   │   │   ├── AppStoreFilters.tsx
│   │   │   │   │   ├── AppStoreFeatured.tsx
│   │   │   │   │   └── AppStoreSearch.tsx
│   │   │   │   ├── detail/            # Page détail app
│   │   │   │   │   ├── AppDetailPage.tsx
│   │   │   │   │   ├── AppHeader.tsx
│   │   │   │   │   ├── AppScreenshots.tsx
│   │   │   │   │   ├── AppPermissions.tsx
│   │   │   │   │   ├── AppCollections.tsx
│   │   │   │   │   ├── AppVariables.tsx
│   │   │   │   │   └── AppReviews.tsx
│   │   │   │   ├── cards/             # Composants cartes
│   │   │   │   │   ├── AppCard.tsx
│   │   │   │   │   ├── AppCardCompact.tsx
│   │   │   │   │   ├── AppCardFeatured.tsx
│   │   │   │   │   └── AppRating.tsx
│   │   │   │   ├── install/           # Flow installation
│   │   │   │   │   ├── InstallDialog.tsx
│   │   │   │   │   ├── PermissionsReview.tsx
│   │   │   │   │   └── InstallProgress.tsx
│   │   │   │   └── config/            # Configuration app
│   │   │   │       ├── AppConfigPage.tsx
│   │   │   │       ├── AppConfigForm.tsx
│   │   │   │       ├── AppActions.tsx
│   │   │   │       ├── AppDataPreview.tsx
│   │   │   │       └── AppWebsiteSelector.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAppStore.ts     # Liste apps catalogue
│   │   │   │   ├── useAppDetail.ts    # Détails d'une app
│   │   │   │   ├── useInstalledApps.ts # Apps installées (compte)
│   │   │   │   ├── useWebsiteApps.ts  # Apps activées (website)
│   │   │   │   ├── useAppConfig.ts    # Config d'une app
│   │   │   │   ├── useAppActions.ts   # Actions d'une app
│   │   │   │   └── index.ts
│   │   │   ├── api/
│   │   │   │   └── apps.ts            # Client API apps
│   │   │   ├── types.ts               # Types frontend apps
│   │   │   ├── constants.ts           # Categories, etc.
│   │   │   └── index.ts
│   │   │
│   │   └── ... (autres features)
│   │
│   └── studio/
│       └── data-binding/              # Existant (Collections Phase 3)
│
├── hooks/
│   ├── useCollections.ts              # Existant
│   ├── useVariables.ts                # Existant
│   └── ... 
│
└── lib/
    ├── api/
    │   ├── apps.ts                    # NOUVEAU: API client apps
    │   ├── collections.ts             # Existant
    │   └── ...
    └── types/
        └── apps.ts                    # NOUVEAU: Types partagés apps
```

### 13.3 Composants UI: FormRenderer

Le `FormRenderer` est le cœur du système — il génère dynamiquement les formulaires depuis les manifests.

#### Architecture du FormRenderer

```typescript
// components/ui/form-renderer/FormRenderer.tsx

interface FormRendererProps {
  /** Schema from app manifest */
  schema: ConfigSchema;
  /** Current values */
  values: Record<string, unknown>;
  /** Change handler */
  onChange: (values: Record<string, unknown>) => void;
  /** Validation errors */
  errors?: Record<string, string>;
  /** Loading state */
  isLoading?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * Renders a dynamic form from a config schema.
 * 
 * Features:
 * - Type-safe field rendering
 * - Conditional visibility (visible_if)
 * - Section grouping
 * - Validation display
 * - Responsive layout
 */
export function FormRenderer({
  schema,
  values,
  onChange,
  errors,
  isLoading,
  readOnly,
}: FormRendererProps) {
  // Group fields by section
  const sections = useMemo(() => 
    groupFieldsBySections(schema.fields, schema.sections),
    [schema]
  );

  // Evaluate conditional visibility
  const visibleFields = useMemo(() =>
    evaluateVisibility(schema.fields, values),
    [schema.fields, values]
  );

  return (
    <form className="space-y-6">
      {sections.map((section) => (
        <FormSection
          key={section.id}
          section={section}
          visibleFields={visibleFields}
        >
          {section.fields.map((field) => (
            visibleFields.has(field.key) && (
              <FieldRenderer
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => onChange({ ...values, [field.key]: v })}
                error={errors?.[field.key]}
                disabled={isLoading || readOnly}
              />
            )
          ))}
        </FormSection>
      ))}
    </form>
  );
}
```

#### Field Renderers Registry

```typescript
// components/ui/form-renderer/field-renderers/index.ts

import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { BooleanField } from './BooleanField';
import { SelectField } from './SelectField';
import { MultiSelectField } from './MultiSelectField';
import { OAuthField } from './OAuthField';
import { ColorField } from './ColorField';
import { DateField } from './DateField';
import { FileField } from './FileField';
import { SecretField } from './SecretField';
import { JsonField } from './JsonField';

/**
 * Registry of field renderers by type.
 * Add new field types here.
 */
export const fieldRenderers: Record<FieldType, React.ComponentType<FieldProps>> = {
  text: TextField,
  textarea: TextField,
  email: TextField,
  url: TextField,
  password: TextField,
  number: NumberField,
  boolean: BooleanField,
  select: SelectField,
  multiselect: MultiSelectField,
  oauth: OAuthField,
  color: ColorField,
  date: DateField,
  datetime: DateField,
  file: FileField,
  image: FileField,
  secret: SecretField,
  json: JsonField,
};

/**
 * Unified field renderer that delegates to specific type renderer.
 */
export function FieldRenderer({ field, ...props }: FieldRendererProps) {
  const Renderer = fieldRenderers[field.type];
  
  if (!Renderer) {
    console.warn(`Unknown field type: ${field.type}`);
    return null;
  }
  
  return <Renderer field={field} {...props} />;
}
```

#### Exemple: TextField

```typescript
// components/ui/form-renderer/field-renderers/TextField.tsx

interface TextFieldProps extends FieldProps {
  field: TextFieldDef;
}

export function TextField({ field, value, onChange, error, disabled }: TextFieldProps) {
  const InputComponent = field.type === 'textarea' ? Textarea : Input;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <InputComponent
        id={field.key}
        type={field.type === 'password' ? 'password' : 
              field.type === 'email' ? 'email' : 
              field.type === 'url' ? 'url' : 'text'}
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={cn(error && 'border-destructive')}
        {...(field.validation?.maxLength && { maxLength: field.validation.maxLength })}
      />
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

#### Exemple: OAuthField (Spécial)

```typescript
// components/ui/form-renderer/field-renderers/OAuthField.tsx

export function OAuthField({ field, value, onChange, disabled }: OAuthFieldProps) {
  const oauthValue = value as OAuthValue | undefined;
  const isConnected = !!oauthValue?.access_token;
  
  const handleConnect = async () => {
    // Open OAuth popup
    const result = await openOAuthFlow(field.provider, field.scopes);
    onChange(result);
  };
  
  const handleDisconnect = () => {
    onChange(undefined);
  };
  
  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      
      {isConnected ? (
        <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/50">
          <ProviderIcon provider={field.provider} className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">{oauthValue.user_name || 'Connected'}</p>
            <p className="text-sm text-muted-foreground">
              Connected to {formatProviderName(field.provider)}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisconnect}
            disabled={disabled}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleConnect}
          disabled={disabled}
          className="w-full justify-start gap-2"
        >
          <ProviderIcon provider={field.provider} className="h-4 w-4" />
          Connect with {formatProviderName(field.provider)}
        </Button>
      )}
      
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
```

### 13.4 Composants App Store

#### AppCard

```typescript
// features/app-store/components/cards/AppCard.tsx

interface AppCardProps {
  app: AppSummary;
  installed?: boolean;
  onInstall?: () => void;
  onConfigure?: () => void;
}

export function AppCard({ app, installed, onInstall, onConfigure }: AppCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div 
            className="p-2 rounded-lg" 
            style={{ backgroundColor: `${app.color}15` }}
          >
            <AppIcon icon={app.icon} color={app.color} className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{app.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              by {app.author}
            </p>
          </div>
          {app.featured && (
            <Badge variant="secondary">Featured</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {app.description}
        </p>
        
        <div className="flex items-center gap-3 mt-3">
          <AppRating rating={app.rating_avg} count={app.rating_count} />
          <span className="text-xs text-muted-foreground">
            {formatNumber(app.install_count)} installs
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        {installed ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onConfigure}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        ) : (
          <Button 
            className="w-full"
            onClick={onInstall}
          >
            <Download className="h-4 w-4 mr-2" />
            {app.required_plan === 'free' ? 'Install Free' : `Requires ${app.required_plan}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

#### AppPermissions

```typescript
// features/app-store/components/detail/AppPermissions.tsx

interface AppPermissionsProps {
  permissions: AppPermissions;
  compact?: boolean;
}

export function AppPermissions({ permissions, compact }: AppPermissionsProps) {
  const groupedPermissions = useMemo(() => 
    groupPermissions(permissions),
    [permissions]
  );
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Permissions Required
      </h3>
      
      <div className="space-y-3">
        {groupedPermissions.data.length > 0 && (
          <PermissionGroup
            icon={Database}
            title="Data Access"
            permissions={groupedPermissions.data}
            compact={compact}
          />
        )}
        
        {groupedPermissions.network.length > 0 && (
          <PermissionGroup
            icon={Globe}
            title="Network Access"
            permissions={groupedPermissions.network}
            compact={compact}
          />
        )}
        
        {groupedPermissions.events.length > 0 && (
          <PermissionGroup
            icon={Bell}
            title="Event Subscriptions"
            permissions={groupedPermissions.events}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
}

function PermissionGroup({ icon: Icon, title, permissions, compact }: PermissionGroupProps) {
  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </div>
      )}
      <ul className="space-y-1">
        {permissions.map((perm) => (
          <li key={perm} className="flex items-center gap-2 text-sm">
            <Check className="h-3 w-3 text-green-500" />
            {formatPermission(perm)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### InstallDialog

```typescript
// features/app-store/components/install/InstallDialog.tsx

interface InstallDialogProps {
  app: AppDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (grantedPermissions: string[]) => Promise<void>;
}

export function InstallDialog({ app, open, onOpenChange, onInstall }: InstallDialogProps) {
  const [step, setStep] = useState<'review' | 'installing' | 'success'>('review');
  const [isInstalling, setIsInstalling] = useState(false);
  
  const handleInstall = async () => {
    setIsInstalling(true);
    setStep('installing');
    
    try {
      await onInstall(Object.keys(app.permissions));
      setStep('success');
    } catch (error) {
      setStep('review');
    } finally {
      setIsInstalling(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AppIcon icon={app.icon} color={app.color} className="h-10 w-10" />
            <div>
              <DialogTitle>Install {app.name}?</DialogTitle>
              <DialogDescription>v{app.version} by {app.author}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {step === 'review' && (
          <>
            <div className="py-4">
              <AppPermissions permissions={app.permissions} compact />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Install {app.name}
              </Button>
            </DialogFooter>
          </>
        )}
        
        {step === 'installing' && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Installing {app.name}...</p>
          </div>
        )}
        
        {step === 'success' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="font-medium">{app.name} installed!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure it to get started.
            </p>
            <Button 
              className="mt-4"
              onClick={() => {
                onOpenChange(false);
                // Navigate to config
              }}
            >
              Configure Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 13.5 Hooks App Store

```typescript
// features/app-store/hooks/useAppStore.ts

interface UseAppStoreOptions {
  category?: string;
  search?: string;
  featured?: boolean;
  sort?: 'popular' | 'newest' | 'rating';
}

export function useAppStore(options: UseAppStoreOptions = {}) {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchApps = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await appsAPI.list(options);
      setApps(response.apps);
      setCategories(response.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch apps');
    } finally {
      setIsLoading(false);
    }
  }, [options]);
  
  useEffect(() => {
    fetchApps();
  }, [fetchApps]);
  
  return {
    apps,
    categories,
    isLoading,
    error,
    refetch: fetchApps,
  };
}
```

```typescript
// features/app-store/hooks/useInstalledApps.ts

export function useInstalledApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const install = useCallback(async (slug: string, permissions: string[]) => {
    const installed = await appsAPI.install(slug, permissions);
    setApps(prev => [...prev, installed]);
    return installed;
  }, []);
  
  const uninstall = useCallback(async (slug: string) => {
    await appsAPI.uninstall(slug);
    setApps(prev => prev.filter(a => a.slug !== slug));
  }, []);
  
  const updateConfig = useCallback(async (slug: string, settings: Record<string, unknown>) => {
    const updated = await appsAPI.updateSettings(slug, settings);
    setApps(prev => prev.map(a => a.slug === slug ? updated : a));
    return updated;
  }, []);
  
  // ... fetch logic
  
  return {
    apps,
    isLoading,
    error,
    install,
    uninstall,
    updateConfig,
    isInstalled: (slug: string) => apps.some(a => a.slug === slug),
  };
}
```

```typescript
// features/app-store/hooks/useAppActions.ts

export function useAppActions(websiteId: string, appSlug: string) {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  
  const executeAction = useCallback(async (actionId: string) => {
    setIsExecuting(actionId);
    setLastResult(null);
    
    try {
      const result = await appsAPI.executeAction(websiteId, appSlug, actionId);
      setLastResult(result);
      return result;
    } finally {
      setIsExecuting(null);
    }
  }, [websiteId, appSlug]);
  
  return {
    executeAction,
    isExecuting,
    lastResult,
    isActionExecuting: (id: string) => isExecuting === id,
  };
}
```

### 13.6 Types Frontend

```typescript
// features/app-store/types.ts

/**
 * App summary for listing (compact)
 */
export interface AppSummary {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  icon: string;
  color: string;
  category: AppCategory;
  tags: string[];
  author: string;
  required_plan: PlanType;
  rating_avg: number;
  rating_count: number;
  install_count: number;
  featured: boolean;
}

/**
 * Full app details
 */
export interface AppDetail extends AppSummary {
  version: string;
  homepage?: string;
  repository?: string;
  screenshots: string[];
  permissions: AppPermissions;
  config: ConfigSchema;
  actions: AppAction[];
  collections: CollectionDefinition[];
  variables: VariableDefinition[];
}

/**
 * Installed app (account level)
 */
export interface InstalledApp {
  id: string;
  app: AppSummary;
  installed_version: string;
  installed_at: string;
  global_settings: Record<string, unknown>;
  granted_permissions: string[];
  websites: WebsiteAppStatus[];
}

/**
 * App activation status per website
 */
export interface WebsiteAppStatus {
  website_id: string;
  website_name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  activated_at: string;
}

/**
 * App permissions structure
 */
export interface AppPermissions {
  data: string[];
  network: string[];
  events: string[];
}

/**
 * Config schema from manifest
 */
export interface ConfigSchema {
  fields: ConfigField[];
  sections: ConfigSection[];
}

/**
 * App action definition
 */
export interface AppAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  style: 'primary' | 'secondary' | 'danger';
  endpoint: string;
  method: 'POST' | 'DELETE';
  confirm?: string;
  refresh_after?: boolean;
}

/**
 * Action execution result
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * App categories
 */
export type AppCategory = 
  | 'integration'
  | 'content'
  | 'engagement'
  | 'analytics'
  | 'design'
  | 'monetization';

export const APP_CATEGORIES: Record<AppCategory, { label: string; icon: string }> = {
  integration: { label: 'Integrations', icon: 'puzzle' },
  content: { label: 'Content', icon: 'file-text' },
  engagement: { label: 'Engagement', icon: 'users' },
  analytics: { label: 'Analytics', icon: 'chart-bar' },
  design: { label: 'Design', icon: 'palette' },
  monetization: { label: 'Monetization', icon: 'dollar-sign' },
};
```

### 13.7 API Client Apps

```typescript
// lib/api/apps.ts

import { apiClient } from './client';
import type { 
  AppSummary, 
  AppDetail, 
  InstalledApp,
  ActionResult 
} from '@/features/app-store/types';

export const appsAPI = {
  // Store
  list: (params?: AppListParams) => 
    apiClient.get<AppListResponse>('/store/apps', { params }),
    
  get: (slug: string) => 
    apiClient.get<AppDetail>(`/store/apps/${slug}`),
  
  // Account level
  installed: () => 
    apiClient.get<InstalledApp[]>('/account/apps'),
    
  install: (slug: string, permissions: string[]) => 
    apiClient.post<InstalledApp>(`/account/apps/${slug}/install`, { 
      granted_permissions: permissions 
    }),
    
  uninstall: (slug: string) => 
    apiClient.delete(`/account/apps/${slug}/uninstall`),
    
  updateGlobalSettings: (slug: string, settings: Record<string, unknown>) =>
    apiClient.put<InstalledApp>(`/account/apps/${slug}/settings`, { settings }),
  
  // Website level  
  websiteApps: (websiteId: string) =>
    apiClient.get<WebsiteApp[]>(`/websites/${websiteId}/apps`),
    
  activate: (websiteId: string, slug: string) =>
    apiClient.post(`/websites/${websiteId}/apps/${slug}/activate`),
    
  deactivate: (websiteId: string, slug: string) =>
    apiClient.delete(`/websites/${websiteId}/apps/${slug}/deactivate`),
    
  updateWebsiteSettings: (websiteId: string, slug: string, settings: Record<string, unknown>) =>
    apiClient.put(`/websites/${websiteId}/apps/${slug}/settings`, { settings }),
    
  // Actions
  executeAction: (websiteId: string, slug: string, actionId: string) =>
    apiClient.post<ActionResult>(
      `/websites/${websiteId}/apps/${slug}/actions/${actionId}`
    ),
};
```

### 13.8 Routing & Pages

```typescript
// Pages à créer/modifier

// apps/web/src/pages/store/index.astro     → AppStorePage
// apps/web/src/pages/store/[slug].astro    → AppDetailPage  
// apps/web/src/pages/apps/index.astro      → Installed apps list
// apps/web/src/pages/apps/[slug].astro     → App config page
// apps/web/src/pages/websites/[id]/apps.astro → Website apps
```

### 13.9 Migration Frontend

#### Fichiers à Supprimer

```
❌ apps/web/src/components/SchemaRenderer.tsx        → Migré vers ui/form-renderer
❌ apps/web/src/components/features/extensions/      → Remplacé par app-store
❌ apps/web/src/components/features/settings/extension-settings/
```

#### Fichiers à Créer

```
✅ apps/web/src/components/ui/form-renderer/         → Nouveau système
✅ apps/web/src/components/features/app-store/       → Feature complète
✅ apps/web/src/lib/api/apps.ts                      → API client
✅ apps/web/src/pages/store/                         → Pages store
```

#### Fichiers à Modifier

```
📝 apps/web/src/components/studio/data-binding/     → Utiliser nouveaux types
📝 apps/web/src/hooks/useCollections.ts             → Adapter aux apps
📝 apps/web/src/lib/api/index.ts                    → Export apps API
```

### 13.10 Checklist d'Implémentation Frontend

```
Phase 1: Foundation
├── [ ] Créer ui/form-renderer avec tous les field renderers
├── [ ] Créer types.ts pour app-store
├── [ ] Créer api/apps.ts client
└── [ ] Tests unitaires FormRenderer

Phase 2: App Store
├── [ ] AppStorePage + routing
├── [ ] AppCard, AppCardFeatured, AppRating
├── [ ] AppStoreFilters, AppStoreSearch
├── [ ] useAppStore hook
└── [ ] Tests composants store

Phase 3: App Detail & Install
├── [ ] AppDetailPage
├── [ ] AppPermissions, AppScreenshots
├── [ ] InstallDialog avec PermissionsReview
├── [ ] useAppDetail, useInstalledApps hooks
└── [ ] Tests flow installation

Phase 4: App Config
├── [ ] AppConfigPage
├── [ ] AppConfigForm (utilise FormRenderer)
├── [ ] AppActions, AppDataPreview
├── [ ] useAppConfig, useAppActions hooks
└── [ ] Tests configuration

Phase 5: Integration Studio
├── [ ] Adapter CollectionSelector pour apps
├── [ ] Adapter VariablePicker pour apps
├── [ ] Connecter DataSourceEditor aux apps
└── [ ] Tests intégration
```

---

## 14. Questions Ouvertes

1. **Marketplace externe ?** — Permettre des apps tierces à terme ?
2. **Monétisation apps ?** — Apps payantes avec revenue share ?
3. **Sandbox ?** — Isolation des apps (WASM, containers) ?
4. **Versioning SemVer strict ?** — Breaking changes = major bump obligatoire ?
5. **i18n Manifests ?** — Labels traduits dans le manifest ?
6. **Dark mode icons ?** — Variantes d'icônes pour les thèmes ?

---

## 15. Conclusion

Cette refonte transforme un système d'extensions technique en un **App Store utilisateur-centrique**:

- **Pour l'utilisateur**: Expérience cohérente, permissions claires, installation simple
- **Pour le développeur**: Un seul fichier manifest, hooks clairs, migrations gérées
- **Pour la plateforme**: Extensibilité maîtrisée, métriques, potentiel marketplace

Le manifest unifié `manifest.toml` devient le **contrat** entre l'app et la plateforme — tout ce qu'une app peut faire doit y être déclaré.

Le **FormRenderer** côté frontend garantit une UX cohérente peu importe l'app — chaque type de champ est rendu de manière uniforme et validé selon le même système.
