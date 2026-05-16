# ASAP Extension Store — Architecture & Plan d'Implémentation

> **Version**: 2.0.0  
> **Date**: 6 janvier 2026  
> **Auteur**: Architecture Team  
> **Statut**: RFC (Request for Comments)

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Analyse de l'Existant](#2-analyse-de-lexistant)
3. [Architecture Cible: manifest.toml](#3-architecture-cible-manifesttoml)
4. [Types de Champs Standardisés](#4-types-de-champs-standardisés)
5. [Modèle de Permissions](#5-modèle-de-permissions)
6. [Cycle de Vie des Extensions](#6-cycle-de-vie-des-extensions)
7. [Schéma Base de Données](#7-schéma-base-de-données-revisé)
8. [API du Store](#8-api-du-store)
9. [Interface Utilisateur](#9-interface-utilisateur)
10. [Plan d'Implémentation](#10-plan-dimplémentation)
11. [Restructuration Frontend](#11-restructuration-frontend)
12. [Questions Ouvertes](#12-questions-ouvertes)
13. [Conclusion](#13-conclusion)

---

## 1. Résumé Exécutif

### 1.1 Contexte & Problématique

L'architecture d'extensions actuelle présente des défauts de conception qui freinent l'évolutivité :

| Problème | Impact | Criticité |
|----------|--------|:---------:|
| **Double source de vérité** | `extension.toml` + `extension_catalog.rs` définissent les mêmes données différemment | 🔴 Haute |
| **Schéma non unifié** | Chaque extension a une structure de settings arbitraire | 🔴 Haute |
| **Pas de versioning sémantique** | Migrations de settings impossibles entre versions | 🟠 Moyenne |
| **Activation fragmentée** | `extensions` + `website_extensions` avec logique dupliquée | 🟠 Moyenne |
| **Permissions implicites** | Pas de déclaration explicite des capabilities requises | 🟠 Moyenne |
| **UX sous-optimale** | Conçu comme "features techniques" pas "produits à découvrir" | 🟡 Basse |

### 1.2 Vision Cible

Transformer le système en un **Extension Store** structuré :

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ASAP EXTENSION STORE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  📦 GitHub   │  │  📝 Blog     │  │  📬 Contact  │              │
│  │    Sync      │  │   Engine     │  │    Form      │              │
│  │  ──────────  │  │  ──────────  │  │  ──────────  │              │
│  │  ★★★★☆ 4.2  │  │  ★★★★★ 4.8  │  │  ★★★★☆ 4.5  │              │
│  │  12k users   │  │  8k users    │  │  15k users   │              │
│  │              │  │              │  │              │              │
│  │ [Installer]  │  │ [Installer]  │  │ [Pro Plan]   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  Catégories: Intégrations • Contenu • Engagement • Analytics       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Objectifs Clés

| Objectif | Métrique de Succès |
|----------|--------------------|
| **Source unique de vérité** | 100% des extensions définies via `manifest.toml` uniquement |
| **Schéma standardisé** | Tous les champs de config utilisent les 17 types définis |
| **Permissions explicites** | Chaque extension déclare ses accès data/network/events |
| **UX Store** | Temps moyen d'installation < 30 secondes |
| **Migration sans rupture** | 0 perte de données utilisateur existantes |

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
│  EXTENSION STORE                                                    │
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
| Store UI | Expérience Extension Store cohérente |
| Versioning + Migrations | Évolution sans casse |
| Ratings/Reviews | Social proof, feedback loop |

### 10.3 Plan d'Implémentation Détaillé

Ce plan utilise une approche **incrémentale par couches**, permettant des livraisons fréquentes et une validation continue.

#### Principes Directeurs

| Principe | Application |
|----------|-------------|
| **Vertical Slicing** | Chaque phase livre une fonctionnalité utilisable end-to-end |
| **Feature Flags** | Nouveau système activable progressivement sans couper l'ancien |
| **Zero Downtime** | Migration des données en background, pas de maintenance |
| **Test-First** | Critères d'acceptation définis avant le développement |

---

### Phase 0: Fondations & Contrats (3 jours)

**Objectif**: Établir les contrats d'interface entre backend et frontend.

#### Livrables

| Composant | Fichier | Description |
|-----------|---------|-------------|
| Manifest Schema | `extensions/manifest.schema.json` | JSON Schema validant tous les manifests |
| Rust Types | `core/domain/src/extensions/manifest.rs` | Struct `ExtensionManifest` avec serde |
| TS Types | `packages/shared/src/types/extensions.ts` | Types miroir synchronisés |
| Parser | `core/domain/src/extensions/parser.rs` | Parse TOML → ExtensionManifest |

#### Critères d'Acceptation

```gherkin
GIVEN un fichier manifest.toml valide
WHEN le parser le traite
THEN il retourne un ExtensionManifest typé sans erreur

GIVEN un fichier manifest.toml avec un champ inconnu
WHEN le parser le traite  
THEN il ignore le champ et log un warning (forward compatibility)

GIVEN les types Rust ExtensionManifest
WHEN on génère les types TypeScript
THEN ils sont structurellement identiques
```

#### Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Désynchronisation types Rust/TS | Moyenne | Haute | Script CI de vérification |
| Schema trop restrictif | Basse | Moyenne | Champs `extra: Map<String, Value>` |

---

### Phase 1: Infrastructure Base de Données (1 semaine)

**Objectif**: Nouvelle structure DB coexistant avec l'ancienne.

#### Migration SQL

```sql
-- Phase 1: Création (coexistence avec ancien système)
CREATE TABLE extensions_v2 (
    slug VARCHAR(64) PRIMARY KEY,
    manifest JSONB NOT NULL,
    manifest_version VARCHAR(20) NOT NULL,
    -- Métadonnées store
    install_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE account_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    extension_slug VARCHAR(64) NOT NULL REFERENCES extensions_v2(slug),
    installed_version VARCHAR(20) NOT NULL,
    global_settings JSONB DEFAULT '{}',
    granted_permissions TEXT[] NOT NULL,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, extension_slug)
);

CREATE TABLE website_extensions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    account_extension_id UUID NOT NULL REFERENCES account_extensions(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    website_settings JSONB DEFAULT '{}',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(website_id, account_extension_id)
);

-- Index pour performances
CREATE INDEX idx_account_extensions_account ON account_extensions(account_id);
CREATE INDEX idx_website_extensions_website ON website_extensions_v2(website_id);
CREATE INDEX idx_extensions_v2_featured ON extensions_v2(featured) WHERE featured = TRUE;
```

#### Critères d'Acceptation

```gherkin
GIVEN la migration appliquée
WHEN je query les anciennes tables (extensions, website_extensions)
THEN elles existent toujours et fonctionnent

GIVEN un manifest.toml valide
WHEN je seed l'extension dans extensions_v2
THEN le JSONB contient le manifest complet parsé
```

#### Tâches Parallélisables

| Backend | Frontend |
|---------|----------|
| Migration SQL | Setup structure dossiers `features/extensions-store/` |
| Seed script depuis manifests | Types TypeScript depuis schema |
| Repository pattern `ExtensionRepository` | Constantes (catégories, couleurs) |

---

### Phase 2: API Store (Lecture Seule) (1 semaine)

**Objectif**: API publique pour lister et consulter les extensions.

#### Endpoints

```
GET  /api/store/extensions
     ?category={category}
     ?search={query}
     ?featured=true
     ?sort=popular|newest|rating
     &page={n}&per_page={n}
     
GET  /api/store/extensions/{slug}
GET  /api/store/extensions/{slug}/manifest
GET  /api/store/categories
```

#### Response Schemas

```typescript
// GET /api/store/extensions
interface ExtensionListResponse {
  extensions: ExtensionSummary[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  categories: Category[];
}

// GET /api/store/extensions/{slug}
interface ExtensionDetailResponse {
  slug: string;
  manifest: ExtensionManifest;
  stats: {
    install_count: number;
    rating_avg: number;
    rating_count: number;
  };
  installed?: boolean; // Si authentifié
}
```

#### Critères d'Acceptation

```gherkin
GIVEN des extensions dans le store
WHEN je GET /api/store/extensions?category=integration
THEN je reçois uniquement les extensions de cette catégorie

GIVEN une extension "github-sync"
WHEN je GET /api/store/extensions/github-sync
THEN je reçois le manifest complet + statistiques

GIVEN un utilisateur non authentifié
WHEN je GET /api/store/extensions
THEN je reçois la liste sans le champ "installed"
```

#### Tâches Parallélisables

| Backend | Frontend |
|---------|----------|
| Handler `list_extensions` | `extensionsAPI.list()` |
| Handler `get_extension` | `useExtensionStore()` hook |
| Pagination + filtres | `ExtensionStorePage` layout |
| Cache Redis (5min TTL) | `ExtensionCard`, `ExtensionGrid` |
| Tests API | `ExtensionFilters`, `ExtensionSearch` |

---

### Phase 3: Installation & Permissions (1 semaine)

**Objectif**: Flow complet d'installation avec review des permissions.

#### Endpoints

```
POST   /api/account/extensions/{slug}/install
       Body: { granted_permissions: string[] }
       
DELETE /api/account/extensions/{slug}

GET    /api/account/extensions
```

#### Flow Installation

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Store     │────▶│ Permissions      │────▶│  Installation   │
│   Detail    │     │ Review Dialog    │     │  en cours...    │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                    ┌──────────────────┐              │
                    │  ✓ Installée!    │◀─────────────┘
                    │  [Configurer]    │
                    └──────────────────┘
```

#### Critères d'Acceptation

```gherkin
GIVEN une extension avec permissions [data.websites.read, network.github.com]
WHEN l'utilisateur clique "Installer"
THEN un dialog affiche ces permissions avec explications

GIVEN l'utilisateur accepte les permissions
WHEN l'installation réussit
THEN l'extension apparaît dans /api/account/extensions
AND on_install hook est exécuté si défini

GIVEN une extension déjà installée
WHEN l'utilisateur tente de la réinstaller
THEN erreur 409 Conflict
```

#### Tâches Parallélisables

| Backend | Frontend |
|---------|----------|
| Handler `install_extension` | `useInstalledExtensions()` hook |
| Handler `uninstall_extension` | `InstallDialog` component |
| Lifecycle: `on_install` executor | `PermissionsReview` component |
| Validation permissions | `InstallProgress` component |
| Tests install/uninstall | Tests E2E flow installation |

---

### Phase 4: Activation par Website (1 semaine)

**Objectif**: Activer/désactiver une extension installée sur un website spécifique.

#### Endpoints

```
GET    /api/websites/{id}/extensions
POST   /api/websites/{id}/extensions/{slug}/activate
DELETE /api/websites/{id}/extensions/{slug}/deactivate
```

#### Modèle Mental

```
Account Level                    Website Level
─────────────                    ─────────────
                                 
┌─────────────────┐              ┌─────────────────┐
│ GitHub Sync     │              │ portfolio.com   │
│ (installée)     │─────────────▶│ [✓] GitHub Sync │
│                 │              │ [ ] Analytics   │
│ Analytics Pro   │              └─────────────────┘
│ (installée)     │              
│                 │              ┌─────────────────┐
│                 │              │ blog.io         │
│                 │─────────────▶│ [ ] GitHub Sync │
└─────────────────┘              │ [✓] Analytics   │
                                 └─────────────────┘
```

#### Critères d'Acceptation

```gherkin
GIVEN une extension installée au niveau compte
WHEN je POST /api/websites/{id}/extensions/{slug}/activate
THEN l'extension est active sur ce website uniquement

GIVEN une extension NON installée au niveau compte
WHEN je tente de l'activer sur un website
THEN erreur 400 "Extension must be installed first"

GIVEN une extension activée sur un website
WHEN on_activate hook est défini
THEN il est exécuté avec le contexte du website
```

---

### Phase 5: Configuration (1 semaine)

**Objectif**: Interface de configuration dynamique depuis le manifest.

#### Endpoints

```
GET  /api/account/extensions/{slug}/settings
PUT  /api/account/extensions/{slug}/settings
     Body: { settings: Record<string, any> }

GET  /api/websites/{id}/extensions/{slug}/settings  
PUT  /api/websites/{id}/extensions/{slug}/settings
     Body: { settings: Record<string, any> }
```

#### FormRenderer Architecture

```
                    ┌─────────────────────────┐
                    │      FormRenderer       │
                    │  (Orchestrateur)        │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  FormSection  │       │  FormSection  │       │  FormSection  │
│  "Connection" │       │   "Options"   │       │  "Advanced"   │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ OAuthField    │       │ BooleanField  │       │ NumberField   │
│ TextField     │       │ SelectField   │       │ SecretField   │
└───────────────┘       └───────────────┘       └───────────────┘
```

#### Critères d'Acceptation

```gherkin
GIVEN un manifest avec [config.fields.api_key] de type "secret"
WHEN le FormRenderer le rend
THEN le champ est masqué avec toggle de visibilité

GIVEN un manifest avec validation { min: 1, max: 100 }
WHEN l'utilisateur entre 150
THEN erreur de validation inline avant soumission

GIVEN un champ avec visible_if = "auth_type == 'oauth'"
WHEN auth_type != 'oauth'
THEN le champ est masqué
```

---

### Phase 6: Actions (3 jours)

**Objectif**: Boutons d'action définis dans le manifest.

#### Endpoint

```
POST /api/websites/{id}/extensions/{slug}/actions/{action_id}
```

#### Response

```typescript
interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  refresh?: boolean; // Recharger les collections
}
```

#### Critères d'Acceptation

```gherkin
GIVEN une action "sync_now" avec confirm = "Êtes-vous sûr?"
WHEN l'utilisateur clique le bouton
THEN un dialog de confirmation apparaît

GIVEN l'action exécutée avec succès
WHEN refresh_after = true dans le manifest
THEN les collections de l'extension sont rechargées
```

---

### Phase 7: Intégration Studio (1 semaine)

**Objectif**: Collections et variables des extensions utilisables dans le Studio.

#### Data Flow

```
Extension                    Studio Editor
─────────                    ─────────────

┌──────────────┐            ┌──────────────────────────────┐
│ github-sync  │            │  Section: Projects           │
│              │            │  ─────────────────           │
│ Collections: │            │                              │
│  └ repos     │───────────▶│  Data Source: [github-sync ▼]│
│              │            │  Collection:  [repos      ▼] │
│ Variables:   │            │  Limit: 6                    │
│  └ username  │───────────▶│                              │
│  └ avatar    │            │  Title: {{github.username}}  │
└──────────────┘            └──────────────────────────────┘
```

#### Critères d'Acceptation

```gherkin
GIVEN une extension avec collections définies
WHEN j'ouvre le DataSourceEditor dans le Studio
THEN je vois l'extension comme source disponible

GIVEN une extension avec variables définies
WHEN j'ouvre le VariablePicker
THEN je vois les variables groupées par extension
```

---

### Phase 8: Migration Legacy & Cleanup (1 semaine)

**Objectif**: Supprimer l'ancien système sans perte de données.

#### Script de Migration

```sql
-- Migrer les données existantes
INSERT INTO account_extensions (account_id, extension_slug, ...)
SELECT DISTINCT 
    we.account_id,
    e.slug,
    ...
FROM website_extensions we
JOIN extensions e ON e.id = we.extension_id;

-- Après validation complète
DROP TABLE website_extensions;
DROP TABLE extensions;
ALTER TABLE extensions_v2 RENAME TO extensions;
ALTER TABLE website_extensions_v2 RENAME TO website_extensions;
```

#### Critères d'Acceptation

```gherkin
GIVEN des extensions configurées dans l'ancien système
WHEN la migration s'exécute
THEN 100% des settings sont préservés dans le nouveau format

GIVEN la migration terminée
WHEN je vérifie les anciennes routes API
THEN elles retournent 301 Redirect vers les nouvelles
```

#### Checklist de Cleanup

**Backend**:
- [ ] Supprimer `extension_catalog.rs`
- [ ] Supprimer anciens handlers `/api/extensions/*`
- [ ] Supprimer anciennes migrations (archiver)
- [ ] Mettre à jour la documentation API

**Frontend**:
- [ ] Supprimer `components/features/extensions/`
- [ ] Supprimer `components/settings/extension-settings/`
- [ ] Supprimer `SchemaRenderer.tsx` global
- [ ] Mettre à jour la navigation

---

### Phase 9: Améliorations Continues (Post-Launch)

| Feature | Priorité | Effort |
|---------|:--------:|:------:|
| Ratings & Reviews | P1 | 3j |
| Extension Updates & Changelog | P1 | 2j |
| Settings Migrations entre versions | P2 | 3j |
| Analytics (installs, usage) | P2 | 2j |
| Documentation développeur | P2 | 2j |
| Notifications de nouvelles extensions | P3 | 1j |

---

### Résumé Planning

```
Semaine 1    Semaine 2    Semaine 3    Semaine 4    Semaine 5    Semaine 6    Semaine 7    Semaine 8
────────────────────────────────────────────────────────────────────────────────────────────────────
█ Phase 0    ██████████   ██████████   ██████████   ██████████   █████        ██████████   ██████████
  (3j)       Phase 1      Phase 2      Phase 3      Phase 4      Phase 5      Phase 6+7    Phase 8
             Foundation   Store API    Install      Activation   Config       Actions+     Migration
                                                                              Studio
```

| Phase | Durée | Dépendances | Livrable Clé |
|:-----:|:-----:|-------------|--------------|
| **0** | 3j | - | Types Rust/TS synchronisés |
| **1** | 1 sem | Phase 0 | DB prête + FormRenderer |
| **2** | 1 sem | Phase 1 | Store browsable publiquement |
| **3** | 1 sem | Phase 2 | Installation avec permissions |
| **4** | 1 sem | Phase 3 | Activation par website |
| **5** | 1 sem | Phase 4 | Configuration dynamique |
| **6** | 3j | Phase 5 | Actions exécutables |
| **7** | 1 sem | Phase 6 | Intégration Studio |
| **8** | 1 sem | Phases 0-7 | Ancien système supprimé |
| **Total** | **~8 sem** | | **Extension Store complet** |

---

## 11. Questions Ouvertes

| # | Question | Options | Recommandation |
|:-:|----------|---------|----------------|
| 1 | **Marketplace externe ?** | Oui (complexe) / Non (interne only) | Non pour V1, roadmap V2 |
| 2 | **Extensions payantes ?** | Revenue share / Flat fee / Free only | Free only pour V1 |
| 3 | **Sandbox isolation ?** | WASM / Containers / Trust-based | Trust-based pour V1 |
| 4 | **SemVer strict ?** | Enforced / Recommended / None | Recommended |
| 5 | **i18n manifests ?** | Dans manifest / Fichiers séparés | Fichiers séparés |

---

## 12. Conclusion

Cette refonte transforme un système d'extensions technique en un **Extension Store** structuré :

- **Pour l'utilisateur**: Expérience cohérente, permissions claires, installation simple
- **Pour le développeur**: Un seul fichier manifest, hooks clairs, migrations gérées
- **Pour la plateforme**: Extensibilité maîtrisée, métriques, potentiel marketplace

Le manifest unifié `manifest.toml` devient le **contrat** entre l'extension et la plateforme — tout ce qu'une extension peut faire doit y être déclaré.

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
│   │   ├── extensions-store/          # NOUVEAU: Feature Extension Store complète
│   │   │   ├── components/
│   │   │   │   ├── store/             # Pages catalogue
│   │   │   │   │   ├── ExtensionStorePage.tsx
│   │   │   │   │   ├── ExtensionStoreGrid.tsx
│   │   │   │   │   ├── ExtensionStoreFilters.tsx
│   │   │   │   │   ├── ExtensionStoreFeatured.tsx
│   │   │   │   │   └── ExtensionStoreSearch.tsx
│   │   │   │   ├── detail/            # Page détail extension
│   │   │   │   │   ├── ExtensionDetailPage.tsx
│   │   │   │   │   ├── ExtensionHeader.tsx
│   │   │   │   │   ├── ExtensionScreenshots.tsx
│   │   │   │   │   ├── ExtensionPermissions.tsx
│   │   │   │   │   ├── ExtensionCollections.tsx
│   │   │   │   │   ├── ExtensionVariables.tsx
│   │   │   │   │   └── ExtensionReviews.tsx
│   │   │   │   ├── cards/             # Composants cartes
│   │   │   │   │   ├── ExtensionCard.tsx
│   │   │   │   │   ├── ExtensionCardCompact.tsx
│   │   │   │   │   ├── ExtensionCardFeatured.tsx
│   │   │   │   │   └── ExtensionRating.tsx
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

### 13.4 Composants Extension Store

#### ExtensionCard

```typescript
// features/extensions-store/components/cards/ExtensionCard.tsx

interface ExtensionCardProps {
  extension: ExtensionSummary;
  installed?: boolean;
  onInstall?: () => void;
  onConfigure?: () => void;
}

export function ExtensionCard({ extension, installed, onInstall, onConfigure }: ExtensionCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div 
            className="p-2 rounded-lg" 
            style={{ backgroundColor: `${extension.color}15` }}
          >
            <ExtensionIcon icon={extension.icon} color={extension.color} className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{extension.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              by {extension.author}
            </p>
          </div>
          {extension.featured && (
            <Badge variant="secondary">Featured</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {extension.description}
        </p>
        
        <div className="flex items-center gap-3 mt-3">
          <ExtensionRating rating={extension.rating_avg} count={extension.rating_count} />
          <span className="text-xs text-muted-foreground">
            {formatNumber(extension.install_count)} installs
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
            {extension.required_plan === 'free' ? 'Install Free' : `Requires ${extension.required_plan}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

#### ExtensionPermissions

```typescript
// features/extensions-store/components/detail/ExtensionPermissions.tsx

interface ExtensionPermissionsProps {
  permissions: ExtensionPermissions;
  compact?: boolean;
}

export function ExtensionPermissions({ permissions, compact }: ExtensionPermissionsProps) {
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
// features/extensions-store/components/install/InstallDialog.tsx

interface InstallDialogProps {
  extension: ExtensionDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (grantedPermissions: string[]) => Promise<void>;
}

export function InstallDialog({ extension, open, onOpenChange, onInstall }: InstallDialogProps) {
  const [step, setStep] = useState<'review' | 'installing' | 'success'>('review');
  const [isInstalling, setIsInstalling] = useState(false);
  
  const handleInstall = async () => {
    setIsInstalling(true);
    setStep('installing');
    
    try {
      await onInstall(Object.keys(extension.permissions));
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
            <ExtensionIcon icon={extension.icon} color={extension.color} className="h-10 w-10" />
            <div>
              <DialogTitle>Install {extension.name}?</DialogTitle>
              <DialogDescription>v{extension.version} by {extension.author}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {step === 'review' && (
          <>
            <div className="py-4">
              <ExtensionPermissions permissions={extension.permissions} compact />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Install {extension.name}
              </Button>
            </DialogFooter>
          </>
        )}
        
        {step === 'installing' && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Installing {extension.name}...</p>
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

### 13.5 Hooks Extension Store

```typescript
// features/extensions-store/hooks/useExtensionStore.ts

interface UseExtensionStoreOptions {
  category?: string;
  search?: string;
  featured?: boolean;
  sort?: 'popular' | 'newest' | 'rating';
}

export function useExtensionStore(options: UseExtensionStoreOptions = {}) {
  const [extensions, setExtensions] = useState<ExtensionSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchExtensions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await extensionsAPI.list(options);
      setExtensions(response.extensions);
      setCategories(response.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch extensions');
    } finally {
      setIsLoading(false);
    }
  }, [options]);
  
  useEffect(() => {
    fetchExtensions();
  }, [fetchExtensions]);
  
  return {
    extensions,
    categories,
    isLoading,
    error,
    refetch: fetchExtensions,
  };
}
```

```typescript
// features/extensions-store/hooks/useInstalledExtensions.ts

export function useInstalledExtensions() {
  const [extensions, setExtensions] = useState<InstalledExtension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const install = useCallback(async (slug: string, permissions: string[]) => {
    const installed = await extensionsAPI.install(slug, permissions);
    setExtensions(prev => [...prev, installed]);
    return installed;
  }, []);
  
  const uninstall = useCallback(async (slug: string) => {
    await extensionsAPI.uninstall(slug);
    setExtensions(prev => prev.filter(e => e.slug !== slug));
  }, []);
  
  const updateConfig = useCallback(async (slug: string, settings: Record<string, unknown>) => {
    const updated = await extensionsAPI.updateSettings(slug, settings);
    setExtensions(prev => prev.map(e => e.slug === slug ? updated : e));
    return updated;
  }, []);
  
  // ... fetch logic
  
  return {
    extensions,
    isLoading,
    error,
    install,
    uninstall,
    updateConfig,
    isInstalled: (slug: string) => extensions.some(e => e.slug === slug),
  };
}
```

```typescript
// features/extensions-store/hooks/useExtensionActions.ts

export function useExtensionActions(websiteId: string, extensionSlug: string) {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  
  const executeAction = useCallback(async (actionId: string) => {
    setIsExecuting(actionId);
    setLastResult(null);
    
    try {
      const result = await extensionsAPI.executeAction(websiteId, extensionSlug, actionId);
      setLastResult(result);
      return result;
    } finally {
      setIsExecuting(null);
    }
  }, [websiteId, extensionSlug]);
  
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
// features/extensions-store/types.ts

/**
 * Extension summary for listing (compact)
 */
export interface ExtensionSummary {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  icon: string;
  color: string;
  category: ExtensionCategory;
  tags: string[];
  author: string;
  required_plan: PlanType;
  rating_avg: number;
  rating_count: number;
  install_count: number;
  featured: boolean;
}

/**
 * Full extension details
 */
export interface ExtensionDetail extends ExtensionSummary {
  version: string;
  homepage?: string;
  repository?: string;
  screenshots: string[];
  permissions: ExtensionPermissions;
  config: ConfigSchema;
  actions: ExtensionAction[];
  collections: CollectionDefinition[];
  variables: VariableDefinition[];
}

/**
 * Installed extension (account level)
 */
export interface InstalledExtension {
  id: string;
  extension: ExtensionSummary;
  installed_version: string;
  installed_at: string;
  global_settings: Record<string, unknown>;
  granted_permissions: string[];
  websites: WebsiteExtensionStatus[];
}

/**
 * Extension activation status per website
 */
export interface WebsiteExtensionStatus {
  website_id: string;
  website_name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  activated_at: string;
}

/**
 * Extension permissions structure
 */
export interface ExtensionPermissions {
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
 * Extension action definition
 */
export interface ExtensionAction {
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
 * Extension categories
 */
export type ExtensionCategory = 
  | 'integration'
  | 'content'
  | 'engagement'
  | 'analytics'
  | 'design'
  | 'monetization';

export const EXTENSION_CATEGORIES: Record<ExtensionCategory, { label: string; icon: string }> = {
  integration: { label: 'Integrations', icon: 'puzzle' },
  content: { label: 'Content', icon: 'file-text' },
  engagement: { label: 'Engagement', icon: 'users' },
  analytics: { label: 'Analytics', icon: 'chart-bar' },
  design: { label: 'Design', icon: 'palette' },
  monetization: { label: 'Monetization', icon: 'dollar-sign' },
};
```

### 13.7 API Client Extensions

```typescript
// lib/api/extensions.ts

import { apiClient } from './client';
import type { 
  ExtensionSummary, 
  ExtensionDetail, 
  InstalledExtension,
  ActionResult 
} from '@/features/extensions-store/types';

export const extensionsAPI = {
  // Store
  list: (params?: ExtensionListParams) => 
    apiClient.get<ExtensionListResponse>('/store/extensions', { params }),
    
  get: (slug: string) => 
    apiClient.get<ExtensionDetail>(`/store/extensions/${slug}`),
  
  // Account level
  installed: () => 
    apiClient.get<InstalledExtension[]>('/account/extensions'),
    
  install: (slug: string, permissions: string[]) => 
    apiClient.post<InstalledExtension>(`/account/extensions/${slug}/install`, { 
      granted_permissions: permissions 
    }),
    
  uninstall: (slug: string) => 
    apiClient.delete(`/account/extensions/${slug}/uninstall`),
    
  updateGlobalSettings: (slug: string, settings: Record<string, unknown>) =>
    apiClient.put<InstalledExtension>(`/account/extensions/${slug}/settings`, { settings }),
  
  // Website level  
  websiteExtensions: (websiteId: string) =>
    apiClient.get<WebsiteExtension[]>(`/websites/${websiteId}/extensions`),
    
  activate: (websiteId: string, slug: string) =>
    apiClient.post(`/websites/${websiteId}/extensions/${slug}/activate`),
    
  deactivate: (websiteId: string, slug: string) =>
    apiClient.delete(`/websites/${websiteId}/extensions/${slug}/deactivate`),
    
  updateWebsiteSettings: (websiteId: string, slug: string, settings: Record<string, unknown>) =>
    apiClient.put(`/websites/${websiteId}/extensions/${slug}/settings`, { settings }),
    
  // Actions
  executeAction: (websiteId: string, slug: string, actionId: string) =>
    apiClient.post<ActionResult>(
      `/websites/${websiteId}/extensions/${slug}/actions/${actionId}`
    ),
};
```

### 13.8 Interface Unifiée `/{website_id}/extensions`

> **Décision d'Architecture**: Plutôt que de créer des pages séparées pour le store et les extensions activées,
> nous fusionnons tout en une **interface unique** à `/{website_id}/extensions`.

#### Pourquoi une Interface Unifiée ?

| Approche Séparée | Approche Unifiée (Choisie) |
|------------------|----------------------------|
| `/extensions` → Store global | `/{website_id}/extensions` → Tout en un |
| `/account/extensions` → Installées | Onglets dans la même page |
| `/{website_id}/extensions` → Activées | Context-aware selon le website |
| 3+ pages à maintenir | 1 seule page + composants |

#### Architecture de la Page Unifiée

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Dashboard           Extensions                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Installées] [Découvrir]                    🔍 Rechercher...        │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  ┌─ ONGLET "INSTALLÉES" ────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ● Extensions actives sur ce site (3)                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │ GitHub Sync  │  │  Analytics   │  │   Contact    │       │  │
│  │  │ [Configurer] │  │ [Configurer] │  │ [Configurer] │       │  │
│  │  │ [Désactiver] │  │ [Désactiver] │  │ [Désactiver] │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  │                                                               │  │
│  │  ○ Installées mais inactives (2)                             │  │
│  │  ┌──────────────┐  ┌──────────────┐                         │  │
│  │  │   Blog       │  │   SEO Pro    │                         │  │
│  │  │  [Activer]   │  │  [Activer]   │                         │  │
│  │  └──────────────┘  └──────────────┘                         │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ ONGLET "DÉCOUVRIR" ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  [Toutes] [Intégrations] [Contenu] [Analytics] [Engagement]  │  │
│  │                                                               │  │
│  │  ★ En vedette                                                │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  GitHub Sync - Import your repos automatically        │   │  │
│  │  │  ★★★★★ (423) • 12k installs         [Installer]      │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  Toutes les extensions                                       │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │  │
│  │  │ Analytics Pro │  │   Contact     │  │    Blog       │   │  │
│  │  │  [Installer]  │  │  [Installer]  │  │  [Installer]  │   │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘   │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Composants de la Page Unifiée

```typescript
// WebsiteExtensionsPage - Point d'entrée
// Combine le store et les extensions installées

interface WebsiteExtensionsPageProps {
  websiteId: string;
}

// Tabs structure:
// - "installed": InstalledExtensionsList (active + inactive on this website)
// - "discover": ExtensionStorePage (browse & install)

// Sub-routes handled:
// /{website_id}/extensions              → Page principale (onglet "installed")
// /{website_id}/extensions?tab=discover → Onglet "discover"
// /{website_id}/extensions/{slug}       → ExtensionConfig (configuration)
```

#### Flux Utilisateur

```
Utilisateur arrive sur /{website_id}/extensions
        │
        ▼
┌─ Tab "Installées" ─────────────────────────────────────────────┐
│  Voir mes extensions actives et inactives pour CE website      │
│                                                                │
│  Actions disponibles:                                          │
│  • Configurer une extension active                             │
│  • Désactiver une extension active                             │
│  • Activer une extension installée mais inactive               │
│  • Aller vers "Découvrir" pour installer plus                  │
└────────────────────────────────────────────────────────────────┘
        │
        │ [Clic sur "Découvrir"]
        ▼
┌─ Tab "Découvrir" ──────────────────────────────────────────────┐
│  Parcourir le catalogue d'extensions                           │
│                                                                │
│  Actions disponibles:                                          │
│  • Filtrer par catégorie, rechercher                           │
│  • Voir détails d'une extension                                │
│  • Installer une extension (ouvre permissions dialog)          │
│  • L'extension installée apparaît immédiatement dans           │
│    "Installées" et peut être activée                           │
└────────────────────────────────────────────────────────────────┘
```

#### Routing Final

```typescript
// app-router.tsx routes (client-side React routing)

// /{website_id}/extensions              → WebsiteExtensionsPage
// /{website_id}/extensions/{slug}       → ExtensionConfig (configuration)

// Pas de routes globales /extensions ou /account/extensions
// Tout passe par le contexte du website sélectionné
```

### 13.9 Migration Frontend

Voir **Section 10.3 Plan d'Implémentation Détaillé** pour le détail des phases frontend intégrées au plan global.

#### Fichiers à Supprimer (Phase 8)

```
❌ apps/web/src/components/SchemaRenderer.tsx        → Migré vers ui/form-renderer
❌ apps/web/src/components/features/extensions/      → Remplacé par extensions-store
❌ apps/web/src/components/features/settings/extension-settings/
```

#### Fichiers à Créer (Phases 1-7)

```
✅ apps/web/src/components/ui/form-renderer/         → Phase 1
✅ apps/web/src/components/features/extensions-store/→ Phases 2-6
✅ apps/web/src/lib/api/extensions.ts                → Phase 2
✅ apps/web/src/pages/extensions/                    → Phases 2-3
```

#### Fichiers à Modifier (Phase 7)

```
📝 apps/web/src/components/studio/data-binding/     → Utiliser nouveaux types
📝 apps/web/src/hooks/useCollections.ts             → Adapter aux extensions
📝 apps/web/src/lib/api/index.ts                    → Export extensions API
```

---

## 14. Questions Ouvertes

La section 11 du plan d'implémentation contient les questions ouvertes sous forme de tableau avec recommandations.

---

## 15. Conclusion

Cette refonte transforme un système d'extensions technique en un **Extension Store** structuré :

- **Pour l'utilisateur**: Expérience cohérente, permissions claires, installation simple
- **Pour le développeur**: Un seul fichier manifest, hooks clairs, migrations gérées
- **Pour la plateforme**: Extensibilité maîtrisée, métriques, potentiel marketplace

Le manifest unifié `manifest.toml` devient le **contrat** entre l'extension et la plateforme — tout ce qu'une extension peut faire doit y être déclaré.

Le **FormRenderer** côté frontend garantit une UX cohérente pour toute extension — chaque type de champ est rendu de manière uniforme et validé selon le même système.
