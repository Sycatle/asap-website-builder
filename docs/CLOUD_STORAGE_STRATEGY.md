# Cloud Storage Strategy - Dual Architecture

> **Date**: 5 janvier 2026  
> **Status**: Implemented  
> **Author**: AI Assistant

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Cloud Personnel vs Cloud Website](#cloud-personnel-vs-cloud-website)
4. [Gestion des Avatars](#gestion-des-avatars)
5. [Convertisseur d'images](#convertisseur-dimages)
6. [Schéma de base de données](#schéma-de-base-de-données)
7. [API Endpoints](#api-endpoints)
8. [Comportement par application](#comportement-par-application)

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
- **Contenu** : Photos personnelles, exports, fichiers divers, **avatars**
- **Visibilité** : `private` par défaut
- **Use cases** :
  - **Avatar du compte** (public)
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

## Gestion des Avatars

### Règles

1. **Stockage** : Cloud personnel (`website_id = NULL`)
2. **Visibilité** : Toujours `public` (accessible sans authentification)
3. **Remplacement** : Un nouvel avatar remplace l'ancien (même nom de fichier)

### Convention de nommage

| Source | Nom de fichier | Exemple |
|--------|----------------|---------|
| Upload manuel | `avatar.{ext}` | `avatar.png` |
| OAuth GitHub | `github-avatar.{ext}` | `github-avatar.png` |
| OAuth Google | `google-avatar.{ext}` | `google-avatar.webp` |
| OAuth Discord | `discord-avatar.{ext}` | `discord-avatar.png` |

### Flux d'upload avatar

```typescript
// Upload avatar (manual ou OAuth)
const uploadAvatar = async (file: File, provider?: string) => {
  const filename = provider 
    ? `${provider}-avatar.${getExtension(file)}`
    : `avatar.${getExtension(file)}`;
  
  const renamedFile = new File([file], filename, { type: file.type });
  
  return filesAPI.upload(renamedFile, {
    // Pas de website_id → cloud personnel
    visibility: 'public', // Avatar toujours public
    description: provider ? `Avatar from ${provider}` : 'User avatar',
  });
};
```

### Récupération automatique OAuth

Lors de la connexion OAuth, si le provider fournit un avatar :

1. Télécharger l'image depuis l'URL du provider
2. Convertir en format web-friendly (voir convertisseur)
3. Uploader avec le nom `{provider}-avatar.{ext}`
4. Mettre à jour `account_data.avatar` avec l'URL du fichier

```rust
// Backend: Après OAuth success
async fn sync_oauth_avatar(account_id: Uuid, provider: &str, avatar_url: &str) {
    // 1. Download from provider
    let image_bytes = fetch_avatar(avatar_url).await?;
    
    // 2. Convert to WebP
    let webp_bytes = convert_to_webp(&image_bytes)?;
    
    // 3. Upload to personal cloud
    let filename = format!("{}-avatar.webp", provider);
    let file = storage.upload_file_with_metadata(
        account_id,
        &filename,
        "image/webp",
        &webp_bytes,
        None,  // website_id = NULL (personal cloud)
        None,  // folder_id
        Some("public"),
        Some(&format!("Avatar from {}", provider)),
        None,
    ).await?;
    
    // 4. Update account data
    update_account_avatar(account_id, file.id).await?;
}
```

---

## Convertisseur d'images

### Objectif

Convertir automatiquement les images uploadées en formats web-friendly pour :
- Réduire la taille des fichiers
- Améliorer les performances de chargement
- Assurer la compatibilité navigateurs

### Formats supportés

| Format source | Format cible | Conditions |
|---------------|--------------|------------|
| HEIC/HEIF | WebP | Toujours convertir (iOS) |
| PNG | WebP | Si taille > 100KB |
| BMP | WebP | Toujours convertir |
| TIFF | WebP | Toujours convertir |
| JPEG | WebP | Si taille > 500KB |
| GIF | WebP animé | Si non animé, sinon garder |
| WebP | WebP | Pas de conversion |
| SVG | SVG | Pas de conversion (vectoriel) |

### Configuration

```rust
pub struct ImageConverterConfig {
    /// Enable/disable automatic conversion
    pub enabled: bool,
    
    /// Max size before conversion (bytes)
    pub png_threshold: usize,    // 100KB
    pub jpeg_threshold: usize,   // 500KB
    
    /// WebP quality (0-100)
    pub webp_quality: u8,        // 85
    
    /// Max dimensions (resize if larger)
    pub max_width: u32,          // 2048
    pub max_height: u32,         // 2048
    
    /// Preserve original alongside converted
    pub keep_original: bool,     // false
}

impl Default for ImageConverterConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            png_threshold: 100 * 1024,
            jpeg_threshold: 500 * 1024,
            webp_quality: 85,
            max_width: 2048,
            max_height: 2048,
            keep_original: false,
        }
    }
}
```

### Flux de conversion

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Upload    │ ──▶ │  Converter   │ ──▶ │   Storage   │
│  (original) │     │  (si besoin) │     │   (final)   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Conditions  │
                    │  - Format    │
                    │  - Taille    │
                    │  - Dimensions│
                    └──────────────┘
```

### Intégration dans l'upload

```rust
// Dans storage.rs - upload_file_with_metadata()
pub async fn upload_file_with_metadata(...) -> Result<File> {
    let (final_data, final_mime) = if self.converter_config.enabled 
        && is_image(mime_type) 
    {
        self.maybe_convert_image(data, mime_type)?
    } else {
        (data.to_vec(), mime_type.to_string())
    };
    
    // Continue with upload...
}

fn maybe_convert_image(&self, data: &[u8], mime_type: &str) -> Result<(Vec<u8>, String)> {
    match mime_type {
        "image/heic" | "image/heif" => {
            let webp = convert_heic_to_webp(data, self.converter_config.webp_quality)?;
            Ok((webp, "image/webp".to_string()))
        }
        "image/png" if data.len() > self.converter_config.png_threshold => {
            let webp = convert_to_webp(data, self.converter_config.webp_quality)?;
            Ok((webp, "image/webp".to_string()))
        }
        "image/bmp" | "image/tiff" => {
            let webp = convert_to_webp(data, self.converter_config.webp_quality)?;
            Ok((webp, "image/webp".to_string()))
        }
        "image/jpeg" if data.len() > self.converter_config.jpeg_threshold => {
            let webp = convert_to_webp(data, self.converter_config.webp_quality)?;
            Ok((webp, "image/webp".to_string()))
        }
        _ => Ok((data.to_vec(), mime_type.to_string()))
    }
}
```

### Dépendances Rust suggérées

```toml
# Cargo.toml
[dependencies]
image = "0.25"           # Image processing
webp = "0.3"             # WebP encoding
libheif-rs = "0.20"      # HEIC/HEIF support (optional)
```

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
