use axum::{
    extract::{multipart::Multipart, Path, Extension},
    http::{StatusCode, header},
    response::Response,
    body::Body,
    Json,
};
use uuid::Uuid;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::storage::FileStorageService;
use asap_core_shared::{Claims, SharedConfig, SharedWsBroadcaster, validate_token};
use asap_core_domain::{FileUploadResponse, StorageQuotaResponse};

// ============================================
// FILE UPDATE TYPES
// ============================================

#[derive(Debug, Deserialize)]
pub struct UpdateFileRequest {
    pub filename: Option<String>,
    pub folder_id: Option<String>,  // UUID string or "root" to move to root folder
    pub visibility: Option<String>,
    pub website_id: Option<Uuid>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ============================================
// FOLDER TYPES
// ============================================

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>, // Optional - None for personal cloud
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFolderRequest {
    pub name: Option<String>,
    pub parent_folder_id: Option<Uuid>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FolderResponse {
    pub id: Uuid,
    pub name: String,
    pub path: String,
    pub parent_folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub file_count: i64,
    pub subfolder_count: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Internal struct for query_as mapping
#[derive(Debug, sqlx::FromRow)]
struct FolderRow {
    id: Uuid,
    name: String,
    path: String,
    parent_folder_id: Option<Uuid>,
    website_id: Option<Uuid>,
    icon: Option<String>,
    color: Option<String>,
    file_count: Option<i64>,
    subfolder_count: Option<i64>,
    created_at: chrono::DateTime<chrono::Utc>,
}

/// Upload file handler with optional metadata (website_id, folder_id, visibility)
pub async fn upload_file(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileUploadResponse>), (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Collect all multipart fields
    let mut file_data: Option<(String, String, bytes::Bytes)> = None;
    let mut website_id: Option<Uuid> = None;
    let mut folder_id: Option<Uuid> = None;
    let mut visibility: Option<String> = None;
    let mut description: Option<String> = None;
    let mut tags: Option<Vec<String>> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Multipart error: {}", e)))?
    {
        let field_name = field.name().map(|s| s.to_string());
        
        match field_name.as_deref() {
            Some("file") => {
                let filename = field
                    .file_name()
                    .ok_or_else(|| (StatusCode::BAD_REQUEST, "Missing filename".to_string()))?
                    .to_string();
                let content_type = field
                    .content_type()
                    .ok_or_else(|| (StatusCode::BAD_REQUEST, "Missing content-type".to_string()))?
                    .to_string();
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to read file: {}", e)))?;
                file_data = Some((filename, content_type, data));
            }
            Some("website_id") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    website_id = Uuid::parse_str(&value).ok();
                }
            }
            Some("folder_id") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    folder_id = Uuid::parse_str(&value).ok();
                }
            }
            Some("visibility") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    visibility = Some(value);
                }
            }
            Some("description") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    description = Some(value);
                }
            }
            Some("tags") => {
                let value = field.text().await.unwrap_or_default();
                if !value.is_empty() {
                    tags = serde_json::from_str(&value).ok();
                }
            }
            _ => {}
        }
    }

    let (filename, content_type, data) = file_data
        .ok_or_else(|| (StatusCode::BAD_REQUEST, "No file provided".to_string()))?;

    // If website_id is provided, verify user has access to this website
    if let Some(wid) = website_id {
        let has_access: Option<bool> = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM websites WHERE id = $1 AND account_id = $2)"
        )
        .bind(wid)
        .bind(account_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
        
        if !has_access.unwrap_or(false) {
            return Err((StatusCode::FORBIDDEN, "Access denied to this website".to_string()));
        }
    }

    // Sanitize filename
    let filename = storage.sanitize_filename(&filename);

    // Security: Validate magic bytes match declared MIME type
    storage
        .validate_magic_bytes(&data, &content_type)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("File validation failed: {}", e)))?;

    // Upload file (with compression and validation)
    let file = storage
        .upload_file_with_metadata(
            account_id, 
            &filename, 
            &content_type, 
            &data,
            website_id,
            folder_id,
            visibility.as_deref(),
            description.as_deref(),
            tags.as_deref(),
        )
        .await
        .map_err(|e: anyhow::Error| (StatusCode::BAD_REQUEST, format!("Upload failed: {}", e)))?;

    let response = FileUploadResponse::from(file);
    
    // Broadcast file uploaded event to all connected clients for this account
    (*ws_broadcaster).sync_file_uploaded(
        &claims.sub,
        website_id.as_ref().map(|w| w.to_string()).as_deref(),
        serde_json::to_value(&response).unwrap_or_default(),
    );

    Ok((StatusCode::CREATED, Json(response)))
}

/// List account files
pub async fn list_files(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<FileUploadResponse>>, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;
    
    // Security: Strict pagination limits to prevent DoS
    const MAX_LIMIT: i64 = 100;
    const MAX_OFFSET: i64 = 10_000;
    
    let limit = params
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .map(|l| l.clamp(1, MAX_LIMIT)) // Enforce bounds
        .unwrap_or(50);
    let offset = params
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .map(|o| o.clamp(0, MAX_OFFSET)) // Enforce bounds
        .unwrap_or(0);
    
    // Optional folder filter - "root" means files at root level (folder_id IS NULL)
    let folder_id = params.get("folder_id").and_then(|s| {
        if s == "root" {
            None // Will be handled specially to filter for NULL folder_id
        } else {
            Uuid::parse_str(s).ok()
        }
    });
    let filter_root = params.get("folder_id").map(|s| s == "root").unwrap_or(false);
    
    // Optional website_id filter - None for personal cloud, Some for website-scoped
    let website_id = params.get("website_id").and_then(|s| Uuid::parse_str(s).ok());

    let files = storage
        .list_account_files(account_id, limit, offset, folder_id, filter_root, website_id)
        .await
        .map_err(|e: anyhow::Error| {
            tracing::error!("Failed to list files: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to list files".to_string())
        })?;

    let responses = files
        .into_iter()
        .map(FileUploadResponse::from)
        .collect();

    Ok(Json(responses))
}

/// Delete file
pub async fn delete_file(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(file_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    storage
        .delete_file(account_id, file_id)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("not found") || error_msg.contains("Not found") {
                tracing::warn!("File {} not found for deletion", file_id);
                (StatusCode::NOT_FOUND, "File not found".to_string())
            } else if error_msg.contains("Unauthorized") {
                tracing::warn!("Unauthorized deletion attempt for file {}", file_id);
                (StatusCode::FORBIDDEN, "Not authorized to delete this file".to_string())
            } else {
                tracing::error!("Failed to delete file {}: {}", file_id, e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete file".to_string())
            }
        })?;

    // Broadcast file deleted event to all connected clients for this account
    (*ws_broadcaster).sync_file_deleted(
        &claims.sub,
        None, // No specific website - files are account-level
        &file_id.to_string(),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// Download/serve file
pub async fn download_file(
    Extension(config): Extension<SharedConfig>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    Path(file_id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Response, (StatusCode, String)> {
    // Support token via query param for media embeds (img/video/audio tags)
    let token = params.get("token")
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Missing token".to_string()))?;
    
    let claims = validate_token(token, &config)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;
    
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Get file metadata
    let file = storage
        .get_file(file_id)
        .await
        .map_err(|_: anyhow::Error| (StatusCode::NOT_FOUND, "File not found".to_string()))?;

    // Security: Verify ownership
    if file.account_id != account_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Get file content (decompressed)
    let content = storage
        .get_file_content(file_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Build response with proper headers
    // SECURITY: Escape filename for Content-Disposition header to prevent header injection
    let safe_filename = file.filename
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace(['\r', '\n'], "");
    
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &file.mime_type)
        .header(header::CONTENT_LENGTH, content.len())
        .header(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", safe_filename)
        )
        .header(header::CACHE_CONTROL, "private, max-age=3600")
        .body(Body::from(content))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(response)
}

/// Get account quota usage
pub async fn get_quota(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
) -> Result<Json<StorageQuotaResponse>, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    let quota = storage
        .get_account_quota(account_id)
        .await
        .map_err(|e: anyhow::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StorageQuotaResponse::from(quota)))
}

/// Update file metadata
pub async fn update_file(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Path(file_id): Path<Uuid>,
    Json(request): Json<UpdateFileRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Verify file exists and belongs to user (use dynamic query to avoid SQLx cache issues)
    let file_row = sqlx::query(
        "SELECT id, filename, folder_id, visibility::text as visibility, website_id, description, tags FROM files WHERE id = $1 AND account_id = $2"
    )
    .bind(file_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch file: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "File not found".to_string()))?;

    let file_filename: String = file_row.get("filename");
    let file_folder_id: Option<Uuid> = file_row.get("folder_id");
    let file_visibility: Option<String> = file_row.get("visibility");
    let file_website_id: Option<Uuid> = file_row.get("website_id");
    let file_description: Option<String> = file_row.get("description");
    let file_tags: Vec<String> = file_row.get::<Option<Vec<String>>, _>("tags").unwrap_or_default();

    // Build update query dynamically
    let new_filename = request.filename.unwrap_or(file_filename);
    // Handle folder_id: "root" means move to root (NULL), UUID string means specific folder
    let new_folder_id: Option<Uuid> = match request.folder_id.as_deref() {
        Some("root") => None,  // Explicitly move to root
        Some(id) => Some(Uuid::parse_str(id).map_err(|_| (StatusCode::BAD_REQUEST, "Invalid folder_id".to_string()))?),
        None => file_folder_id,  // Keep existing
    };
    let new_visibility = request.visibility.as_deref().unwrap_or(file_visibility.as_deref().unwrap_or("private"));
    let new_website_id = request.website_id.or(file_website_id);
    let new_description = request.description.or(file_description);
    let new_tags = request.tags.unwrap_or(file_tags);

    // Use raw query to handle enum type properly
    sqlx::query(
        r#"
        UPDATE files 
        SET filename = $1, folder_id = $2, visibility = $3::file_visibility, website_id = $4, description = $5, tags = $6
        WHERE id = $7 AND account_id = $8
        "#)
    .bind(&new_filename)
    .bind(new_folder_id)
    .bind(new_visibility)
    .bind(new_website_id)
    .bind(&new_description)
    .bind(&new_tags)
    .bind(file_id)
    .bind(account_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update file: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to update file".to_string())
    })?;

    // Return updated file
    let updated = sqlx::query!(
        r#"
        SELECT id, filename, mime_type, original_size, compressed_size, 
               folder_id, visibility::text as visibility, website_id, description, tags,
               created_at
        FROM files 
        WHERE id = $1
        "#,
        file_id,
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch updated file: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?;

    Ok(Json(serde_json::json!({
        "id": updated.id,
        "filename": updated.filename,
        "mime_type": updated.mime_type,
        "original_size": updated.original_size,
        "compressed_size": updated.compressed_size,
        "compression_ratio": if updated.compressed_size > 0 { 
            updated.original_size as f64 / updated.compressed_size as f64 
        } else { 1.0 },
        "folder_id": updated.folder_id,
        "visibility": updated.visibility,
        "website_id": updated.website_id,
        "description": updated.description,
        "tags": updated.tags,
        "created_at": updated.created_at,
    })))
}
// ============================================
// FOLDER HANDLERS
// ============================================

/// List folders
pub async fn list_folders(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<FolderResponse>>, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Handle parent_id: "root" means folders without parent, UUID means specific parent, None means all folders
    let parent_id_param = params.get("parent_id");
    let filter_root = parent_id_param.map(|s| s == "root").unwrap_or(false);
    let parent_id: Option<Uuid> = parent_id_param
        .filter(|s| *s != "root")
        .and_then(|s| Uuid::parse_str(s).ok());
    
    // Optional website_id filter - None for personal cloud, Some for website-scoped
    let website_id: Option<Uuid> = params
        .get("website_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    // Build dynamic query based on filter conditions
    let mut query = String::from(
        r#"
        SELECT 
            ff.id,
            ff.name,
            ff.path,
            ff.parent_folder_id as parent_folder_id,
            ff.website_id,
            ff.icon as icon,
            ff.color as color,
            ff.created_at,
            (SELECT COUNT(*) FROM files f WHERE f.folder_id = ff.id)::bigint as file_count,
            (SELECT COUNT(*) FROM file_folders sf WHERE sf.parent_folder_id = ff.id)::bigint as subfolder_count
        FROM file_folders ff
        WHERE ff.account_id = $1
        "#,
    );

    let mut param_idx = 2;
    
    // Add parent_id filter
    if let Some(_pid) = parent_id {
        query.push_str(&format!(" AND ff.parent_folder_id = ${}", param_idx));
        param_idx += 1;
    } else if filter_root {
        query.push_str(" AND ff.parent_folder_id IS NULL");
    }
    // If neither, no parent filter (returns all folders)
    
    // Add website_id filter
    if website_id.is_some() {
        query.push_str(&format!(" AND ff.website_id = ${}", param_idx));
    } else {
        // Personal cloud: only show folders without website_id
        query.push_str(" AND ff.website_id IS NULL");
    }
    
    query.push_str(" ORDER BY ff.name ASC");

    // Execute with appropriate bindings
    let rows: Vec<FolderRow> = match (parent_id, website_id) {
        (Some(pid), Some(wid)) => {
            sqlx::query_as(&query)
                .bind(account_id)
                .bind(pid)
                .bind(wid)
                .fetch_all(&pool)
                .await
        }
        (Some(pid), None) => {
            sqlx::query_as(&query)
                .bind(account_id)
                .bind(pid)
                .fetch_all(&pool)
                .await
        }
        (None, Some(wid)) => {
            sqlx::query_as(&query)
                .bind(account_id)
                .bind(wid)
                .fetch_all(&pool)
                .await
        }
        (None, None) => {
            sqlx::query_as(&query)
                .bind(account_id)
                .fetch_all(&pool)
                .await
        }
    }
    .map_err(|e| {
        tracing::error!("Failed to list folders: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to list folders".to_string())
    })?;

    let responses: Vec<FolderResponse> = rows
        .into_iter()
        .map(|row| FolderResponse {
            id: row.id,
            name: row.name,
            path: row.path,
            parent_folder_id: row.parent_folder_id,
            website_id: row.website_id,
            icon: row.icon,
            color: row.color,
            file_count: row.file_count.unwrap_or(0),
            subfolder_count: row.subfolder_count.unwrap_or(0),
            created_at: row.created_at,
        })
        .collect();

    Ok(Json(responses))
}

/// Create folder
pub async fn create_folder(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Json(request): Json<CreateFolderRequest>,
) -> Result<(StatusCode, Json<FolderResponse>), (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Validate folder name
    if request.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Folder name cannot be empty".to_string()));
    }
    
    if request.name.len() > 255 {
        return Err((StatusCode::BAD_REQUEST, "Folder name too long".to_string()));
    }

    // If website_id is provided, verify user has access to this website
    if let Some(wid) = request.website_id {
        let has_access: Option<bool> = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM websites WHERE id = $1 AND account_id = $2)"
        )
        .bind(wid)
        .bind(account_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
        
        if !has_access.unwrap_or(false) {
            return Err((StatusCode::FORBIDDEN, "Access denied to this website".to_string()));
        }
    }

    // Build path based on parent
    let (path, effective_website_id) = if let Some(parent_id) = request.parent_folder_id {
        // Verify parent exists and belongs to user (use dynamic query to avoid SQLx cache issues)
        let parent_row = sqlx::query(
            "SELECT path, website_id FROM file_folders WHERE id = $1 AND account_id = $2"
        )
        .bind(parent_id)
        .bind(account_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch parent folder: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
        })?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Parent folder not found".to_string()))?;

        let parent_path: String = parent_row.get("path");
        let parent_website_id: Option<Uuid> = parent_row.get("website_id");

        // Child inherits website_id from parent (or uses request.website_id if parent has none)
        let website_id = parent_website_id.or(request.website_id);

        (format!("{}/{}", parent_path, request.name), website_id)
    } else {
        (format!("/{}", request.name), request.website_id)
    };

    let folder_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO file_folders (id, account_id, parent_folder_id, name, path, website_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)"
    )
    .bind(folder_id)
    .bind(account_id)
    .bind(request.parent_folder_id)
    .bind(&request.name)
    .bind(&path)
    .bind(effective_website_id)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create folder: {}", e);
        if e.to_string().contains("unique_folder") {
            (StatusCode::CONFLICT, "A folder with this name already exists".to_string())
        } else if e.to_string().contains("folder depth") {
            (StatusCode::BAD_REQUEST, "Maximum folder depth of 3 levels exceeded".to_string())
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create folder".to_string())
        }
    })?;

    let response = FolderResponse {
        id: folder_id,
        name: request.name,
        path,
        parent_folder_id: request.parent_folder_id,
        website_id: effective_website_id,
        icon: request.icon,
        color: request.color,
        file_count: 0,
        subfolder_count: 0,
        created_at: now,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Update folder
pub async fn update_folder(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Path(folder_id): Path<Uuid>,
    Json(request): Json<UpdateFolderRequest>,
) -> Result<Json<FolderResponse>, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    // Verify folder exists and belongs to user (use dynamic query to avoid SQLx cache issues)
    let folder_row = sqlx::query(
        "SELECT id, name, path, parent_folder_id, website_id, created_at FROM file_folders WHERE id = $1 AND account_id = $2"
    )
    .bind(folder_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch folder: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Folder not found".to_string()))?;

    let folder_name: String = folder_row.get("name");
    let folder_path: String = folder_row.get("path");
    let folder_parent_id: Option<Uuid> = folder_row.get("parent_folder_id");
    let folder_website_id: Option<Uuid> = folder_row.get("website_id");
    let folder_created_at: chrono::DateTime<chrono::Utc> = folder_row.get("created_at");

    let name_changed = request.name.is_some();
    let new_name = request.name.unwrap_or_else(|| folder_name.clone());
    
    // Update path if name changed
    let new_path = if name_changed {
        let parent_path = folder_path.rsplit_once('/').map(|(p, _)| p).unwrap_or("");
        if parent_path.is_empty() {
            format!("/{}", new_name)
        } else {
            format!("{}/{}", parent_path, new_name)
        }
    } else {
        folder_path.clone()
    };

    sqlx::query(
        "UPDATE file_folders SET name = $1, path = $2, updated_at = NOW() WHERE id = $3"
    )
    .bind(&new_name)
    .bind(&new_path)
    .bind(folder_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update folder: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to update folder".to_string())
    })?;

    // Get counts
    let file_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM files WHERE folder_id = $1")
        .bind(folder_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let subfolder_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM file_folders WHERE parent_id = $1")
        .bind(folder_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    Ok(Json(FolderResponse {
        id: folder_id,
        name: new_name,
        path: new_path,
        parent_folder_id: folder_parent_id,
        website_id: folder_website_id,
        icon: request.icon,
        color: request.color,
        file_count,
        subfolder_count,
        created_at: folder_created_at,
    }))
}

/// Delete folder
pub async fn delete_folder(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Path(folder_id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<StatusCode, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    let delete_contents = params
        .get("delete_contents")
        .map(|s| s == "true")
        .unwrap_or(false);

    // Verify folder exists and belongs to user (use dynamic query to avoid SQLx cache issues)
    let folder_exists = sqlx::query(
        "SELECT id FROM file_folders WHERE id = $1 AND account_id = $2"
    )
    .bind(folder_id)
    .bind(account_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check folder: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?;

    if folder_exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Folder not found".to_string()));
    }

    // Check for contents
    let has_files: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM files WHERE folder_id = $1")
        .bind(folder_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let has_subfolders: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM file_folders WHERE parent_folder_id = $1")
        .bind(folder_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    if (has_files > 0 || has_subfolders > 0) && !delete_contents {
        return Err((StatusCode::CONFLICT, "Folder is not empty. Use delete_contents=true to delete anyway.".to_string()));
    }

    // Delete folder (cascade will handle contents if any)
    sqlx::query(
        "DELETE FROM file_folders WHERE id = $1 AND account_id = $2"
    )
    .bind(folder_id)
    .bind(account_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to delete folder: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete folder".to_string())
    })?;

    Ok(StatusCode::NO_CONTENT)
}
