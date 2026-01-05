# Cloud Storage Strategy - Dual Architecture

> **Date**: 5 janvier 2026  
> **Status**: Implemented  
> **Author**: AI Assistant

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Cloud Personnel vs Cloud Website](#cloud-personnel-vs-cloud-website)
4. [Schéma de base de données](#schéma-de-base-de-données)
5. [API Endpoints](#api-endpoints)
6. [Comportement par application](#comportement-par-application)

---

## Vue d'ensemble

### Architecture duale

Le système de fichiers supporte deux contextes :

1. **Cloud Personnel** (`website_id = NULL`) - Accessible depuis l'app Accounts
2. **Cloud Website** (`website_id = UUID`) - Accessible depuis l'app Web (Studio)

```
Account (tenant)
├── 📁 Cloud Personnel (website_id = NULL)
│   ├── /photos
│   ├── /documents
│   └── fichiers personnels...
│
├── 🌐 Website A (website_id = UUID)
│   └── Media Library
│       ├── /images
│       └── assets du site...
│
└── 🌐 Website B (website_id = UUID)
    └── Media Library
        └── assets du site...
```

### Principes

1. **Isolation stricte** : Le cloud d'un website est isolé des autres
2. **website_id optionnel** : `NULL` = cloud personnel, `UUID` = cloud website
3. **Quotas globaux** : Le quota est partagé entre cloud personnel et tous les websites
4. **Visibilité** : `private` (défaut), `public`, `website`

---

## Architecture

### Modèle de données

```
┌─────────────────────────────────────────────────────────┐
│                      ACCOUNT                            │
│  - id, email, plan                                      │
│  - storage_quota_bytes (global pour tout le compte)     │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Cloud Personnel │ │   Website A     │ │   Website B     │
│ (website_id=∅)  │ │ (website_id=A)  │ │ (website_id=B)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    FILE_FOLDERS                         │
│  - tenant_id (NOT NULL) → account isolation             │
│  - website_id (NULL = personal, UUID = website)         │
│  - parent_id, name, path                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       FILES                             │
│  - account_id (NOT NULL) → account isolation            │
│  - website_id (NULL = personal, UUID = website)         │
│  - folder_id, filename, mime_type, visibility           │
│  - original_size, compressed_size                       │
└─────────────────────────────────────────────────────────┘
```

---

## Cloud Personnel vs Cloud Website

### Cloud Personnel (`website_id = NULL`)

- **Accès** : App Accounts uniquement
- **Contenu** : Photos personnelles, exports, fichiers divers
- **Visibilité** : `private` par défaut
- **Use cases** :
  - Exporter ses données
  - Stocker des fichiers personnels
  - Brouillons avant publication

### Cloud Website (`website_id = UUID`)

- **Accès** : App Web (Studio) pour le website sélectionné
- **Contenu** : Images du site, assets, médias
- **Visibilité** : `website` par défaut (hérite du site)
- **Isolation** : Un website ne voit PAS les fichiers d'un autre
- **Use cases** :
  - Media library du site
  - Images pour sections Hero, Projects, etc.
  - Documents publics du portfolio

---

## Schéma de base de données

### Table `files`

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    website_id UUID REFERENCES websites(id),  -- NULL = personal cloud
    folder_id UUID REFERENCES file_folders(id),
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    visibility file_visibility DEFAULT 'private',
    -- ... autres colonnes
);

-- Index pour requêtes optimisées
CREATE INDEX idx_files_account_website ON files(account_id, website_id);
```

### Table `file_folders`

```sql
CREATE TABLE file_folders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES accounts(id),
    website_id UUID REFERENCES websites(id),  -- NULL = personal cloud
    parent_id UUID REFERENCES file_folders(id),
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    -- ... autres colonnes
);

-- Unique constraint: même nom dans même parent ET même website
CREATE UNIQUE INDEX unique_folder_in_parent 
ON file_folders(tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), 
                COALESCE(website_id, '00000000-0000-0000-0000-000000000000'), name);
```

---

## API Endpoints

### Files

| Endpoint | website_id | Comportement |
|----------|------------|--------------|
| `POST /files` | Optionnel | NULL = personal, UUID = website cloud |
| `GET /files` | Optionnel | Filtre par website_id (NULL = personal) |
| `GET /files/:id` | - | Vérifie account_id seulement |
| `DELETE /files/:id` | - | Vérifie account_id seulement |

### Folders

| Endpoint | website_id | Comportement |
|----------|------------|--------------|
| `POST /folders` | Optionnel | NULL = personal, UUID = website |
| `GET /folders` | Optionnel | Filtre par website_id (NULL = personal) |

### Exemples de requêtes

```bash
# Upload dans cloud personnel
curl -X POST /api/files \
  -F "file=@photo.jpg"

# Upload dans website
curl -X POST /api/files \
  -F "file=@hero.jpg" \
  -F "website_id=550e8400-e29b-41d4-a716-446655440000"

# Lister fichiers du cloud personnel
GET /api/files  # website_id non fourni = personal cloud

# Lister fichiers d'un website
GET /api/files?website_id=550e8400-e29b-41d4-a716-446655440000
```

---

## Comportement par application

### App Accounts (`accounts.asap.cool`)

- Affiche le **cloud personnel** (`website_id = NULL`)
- Liste tous les fichiers sans website_id
- Permet de gérer les fichiers personnels
- Peut voir un aperçu des quotas globaux

### App Web / Studio (`app.asap.cool`)

- Affiche le **cloud du website sélectionné** (`website_id = currentWebsite.id`)
- **DOIT** toujours fournir `website_id` dans les requêtes
- Ne voit PAS les fichiers personnels
- Ne voit PAS les fichiers des autres websites

```typescript
// Dans le frontend Studio, toujours passer websiteId
const { data: files } = useQuery({
  queryKey: ['files', currentWebsiteId],
  queryFn: () => api.get(`/files?website_id=${currentWebsiteId}`),
  enabled: !!currentWebsiteId, // Désactivé si pas de website
});
```

### App Sites (`sites.asap.cool`)

- Accède aux fichiers **publics** des websites
- N'accède jamais au cloud personnel
- Utilise `visibility = 'public'` ou `visibility = 'website'`

---

## Résumé

| Aspect | Cloud Personnel | Cloud Website |
|--------|-----------------|---------------|
| `website_id` | `NULL` | `UUID` |
| App | Accounts | Web (Studio) |
| Isolation | Par account | Par website |
| Visibilité défaut | `private` | `website` |
| Quota | Partagé | Partagé |
