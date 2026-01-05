# Cloud Storage Strategy - Website-Scoped Files

> **Date**: 5 janvier 2026  
> **Status**: Phase 1 - MVP Implementation  
> **Author**: AI Assistant

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture cible](#architecture-cible)
3. [Phase 1 : MVP - Website-only storage](#phase-1--mvp---website-only-storage)
4. [Phase 2 : Cloud personnel (Post-MVP)](#phase-2--cloud-personnel-post-mvp)
5. [Schéma de base de données](#schéma-de-base-de-données)
6. [API Endpoints](#api-endpoints)
7. [Checklist d'implémentation](#checklist-dimplémentation)

---

## Vue d'ensemble

### Problème actuel

Le système de fichiers actuel mélange potentiellement :
- Fichiers personnels de l'utilisateur (avatars, exports)
- Fichiers des websites (images, assets, médias)

Cela crée des risques de :
- Fuite de données entre contextes
- Complexité de requêtes avec filtres optionnels
- UX confuse (où sont mes fichiers ?)

### Solution

**Simplifier pour le MVP** : Tous les fichiers appartiennent obligatoirement à un website.

```
Account (tenant)
└── Website A
    └── Media Library
        ├── /images
        ├── /documents
        └── files...
└── Website B
    └── Media Library
        └── files...
```

---

## Architecture cible

### Principes

1. **Isolation stricte** : Un fichier appartient à UN website
2. **website_id obligatoire** : Pas de fichier "orphelin"
3. **Quotas par compte** : Le quota est global au compte, pas par website
4. **Visibilité contextuelle** : `private`, `public`, `website` (hérite du site)

### Modèle de données simplifié

```
┌─────────────────────────────────────────────────────────┐
│                      ACCOUNT                            │
│  - id, email, plan                                      │
│  - storage_quota_bytes (selon plan)                     │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      WEBSITES                           │
│  - id, tenant_id (→ account)                           │
│  - slug, title, status                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    FILE_FOLDERS                         │
│  - id, tenant_id, website_id (NOT NULL)                │
│  - parent_id, name, path                                │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       FILES                             │
│  - id, account_id, website_id (NOT NULL)               │
│  - folder_id, filename, mime_type                       │
│  - visibility: private | public | website               │
│  - original_size, compressed_size                       │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1 : MVP - Website-only storage

### Objectif

Tous les fichiers sont scopés à un website. Pas de cloud personnel.

### Changements requis

#### 1.1 Base de données

```sql
-- Rendre website_id NOT NULL sur files
ALTER TABLE files 
ALTER COLUMN website_id SET NOT NULL;

-- Rendre website_id NOT NULL sur file_folders
ALTER TABLE file_folders 
ALTER COLUMN website_id SET NOT NULL;

-- Index optimisé pour les requêtes par website
CREATE INDEX IF NOT EXISTS idx_files_website_folder 
ON files(website_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_folders_website_parent 
ON file_folders(website_id, parent_id);
```

#### 1.2 API Backend

| Endpoint | Changement |
|----------|-----------|
| `POST /api/files` | `website_id` **obligatoire** dans le multipart |
| `GET /api/files` | `website_id` **obligatoire** en query param |
| `POST /api/folders` | `website_id` **obligatoire** dans le body |
| `GET /api/folders` | `website_id` **obligatoire** en query param |

**Validation serveur** :
```rust
// Si website_id manquant → 400 Bad Request
if website_id.is_none() {
    return Err((StatusCode::BAD_REQUEST, "website_id is required"));
}

// Vérifier que l'user a accès au website
let has_access = verify_website_access(account_id, website_id).await?;
if !has_access {
    return Err((StatusCode::FORBIDDEN, "Access denied"));
}
```

#### 1.3 Frontend

| Composant | Changement |
|-----------|-----------|
| `CloudManager` | Affiche UNIQUEMENT les fichiers du website courant |
| `useWebsiteFilesQuery` | Erreur si `websiteId` est null |
| `useUploadFileMutation` | Passe toujours `website_id` |
| `FilePickerDialog` | Scoped au website, pas d'option "tous les fichiers" |

#### 1.4 Cas spéciaux

| Cas | Solution |
|-----|----------|
| Avatar utilisateur | Upload via endpoint dédié `/api/me/avatar`, stocké dans `account_data.avatar_url` (URL externe ou data URI) |
| Exports/Downloads | Fichiers temporaires, pas stockés en DB, supprimés après téléchargement |
| Fichiers partagés entre sites | Non supporté dans MVP - copie manuelle |

---

## Phase 2 : Cloud personnel (Post-MVP)

### Quand l'implémenter ?

- Après validation du MVP
- Si demande utilisateur forte
- Possiblement feature "Pro"

### Architecture future

```sql
-- Ajouter colonne scope
ALTER TABLE files ADD COLUMN scope VARCHAR(20) DEFAULT 'website';
-- scope: 'website' | 'personal'

-- Constraint: si scope='website', website_id NOT NULL
ALTER TABLE files ADD CONSTRAINT check_website_scope 
CHECK (scope = 'personal' OR website_id IS NOT NULL);
```

### Nouvelles routes

```
# Cloud personnel
GET  /api/me/files
POST /api/me/files
GET  /api/me/folders
POST /api/me/folders

# Cloud website (inchangé)
GET  /api/files?website_id=xxx
POST /api/files (avec website_id)
```

### UI

- Nouvelle page `/settings/storage` pour le cloud personnel
- Onglet dans les settings du compte
- Quota affiché : Personnel + Websites

---

## Schéma de base de données

### Table `files` (Phase 1)

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
    
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    original_size BIGINT NOT NULL,
    compressed_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    
    visibility file_visibility NOT NULL DEFAULT 'website',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT unique_file_hash_per_website UNIQUE (website_id, file_hash)
);

CREATE INDEX idx_files_account ON files(account_id);
CREATE INDEX idx_files_website ON files(website_id);
CREATE INDEX idx_files_website_folder ON files(website_id, folder_id);
CREATE INDEX idx_files_hash ON files(file_hash);
```

### Table `file_folders` (Phase 1)

```sql
CREATE TABLE file_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Un seul dossier avec ce nom par parent dans le même website
    CONSTRAINT unique_folder_name UNIQUE (website_id, parent_id, name)
);

CREATE INDEX idx_folders_website ON file_folders(website_id);
CREATE INDEX idx_folders_website_parent ON file_folders(website_id, parent_id);
```

### Enum `file_visibility`

```sql
CREATE TYPE file_visibility AS ENUM ('private', 'public', 'website');

-- private: Accessible uniquement avec token auth
-- public: Accessible via URL publique sans auth
-- website: Hérite de la visibilité du website (published = public, draft = private)
```

---

## API Endpoints

### Files

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/files?website_id=X` | Liste les fichiers du website | ✅ |
| `GET` | `/api/files?website_id=X&folder_id=Y` | Liste les fichiers d'un dossier | ✅ |
| `POST` | `/api/files` | Upload un fichier (multipart avec website_id) | ✅ |
| `GET` | `/api/files/:id` | Télécharge un fichier | ✅/🌐* |
| `PATCH` | `/api/files/:id` | Met à jour les métadonnées | ✅ |
| `DELETE` | `/api/files/:id` | Supprime un fichier | ✅ |

*🌐 = Public si visibility=public ou website publié

### Folders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/folders?website_id=X` | Liste les dossiers du website | ✅ |
| `POST` | `/api/folders` | Crée un dossier | ✅ |
| `PATCH` | `/api/folders/:id` | Renomme/déplace un dossier | ✅ |
| `DELETE` | `/api/folders/:id` | Supprime un dossier | ✅ |

### Quota

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/files/quota/usage` | Usage global du compte | ✅ |

---

## Checklist d'implémentation

### Phase 1.1 : Migration DB

- [ ] Créer migration pour ajouter contrainte NOT NULL sur `files.website_id`
- [ ] Créer migration pour ajouter contrainte NOT NULL sur `file_folders.website_id`
- [ ] Ajouter index optimisés
- [ ] Migrer les fichiers existants sans website_id (les assigner ou supprimer)

### Phase 1.2 : Backend API

- [ ] `POST /api/files` : Rendre website_id obligatoire, retourner 400 si absent
- [ ] `GET /api/files` : Rendre website_id obligatoire en query param
- [ ] `POST /api/folders` : Rendre website_id obligatoire
- [ ] `GET /api/folders` : Rendre website_id obligatoire
- [ ] Ajouter validation d'accès au website dans tous les handlers
- [ ] Supprimer le code de fallback pour website_id optionnel

### Phase 1.3 : Frontend

- [ ] `useWebsiteFilesQuery` : Throw error si websiteId est null
- [ ] `useFoldersQuery` : Throw error si website_id est null  
- [ ] `CloudManager` : S'assurer que currentWebsiteId est toujours défini
- [ ] Retirer toute référence à des fichiers "personnels" ou "globaux"
- [ ] File picker : Afficher uniquement les fichiers du website courant

### Phase 1.4 : Tests & Validation

- [ ] Tester upload avec website_id
- [ ] Tester upload SANS website_id → doit échouer
- [ ] Tester accès cross-website → doit échouer
- [ ] Tester listage fichiers par website
- [ ] Tester création dossier avec website_id
- [ ] Vérifier quotas toujours corrects

### Phase 1.5 : Cleanup

- [ ] Supprimer fichiers orphelins en DB (website_id = NULL)
- [ ] Documenter le changement dans CHANGELOG
- [ ] Mettre à jour la doc API

---

## Questions ouvertes

1. **Que faire des fichiers existants sans website_id ?**
   - Option A : Les assigner au premier website de l'utilisateur
   - Option B : Les supprimer après backup
   - Option C : Les garder accessibles via endpoint legacy temporaire

2. **Avatar utilisateur ?**
   - Stocké où ? Dans `account_data.avatar_url` comme URL externe
   - Ou endpoint dédié `/api/me/avatar` avec stockage séparé

3. **Limite de taille par website ?**
   - Pour l'instant : quota global au compte
   - Future : quotas par website pour plans entreprise

---

## Références

- [Migration folders et visibility](../infra/migrations/20260104000000_add_file_folders_and_visibility.sql)
- [API Files handler](../core/api/src/files.rs)
- [Storage service](../core/api/src/storage.rs)
- [Frontend Cloud Manager](../apps/web/src/components/features/cloud/cloud-manager/)
