//! List / update / delete / download / quota handlers (file-level, not folders).

use axum::{
    body::Body,
    extract::{Extension, Path},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

use super::UpdateFileRequest;
use crate::storage::FileStorageService;
use asap_core_domain::{FileUploadResponse, StorageQuotaResponse};
use asap_core_shared::{validate_token, Claims, SharedConfig, SharedWsBroadcaster};

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
    let filter_root = params
        .get("folder_id")
        .map(|s| s == "root")
        .unwrap_or(false);

    // Optional website_id filter - None for personal cloud, Some for website-scoped
    let website_id = params
        .get("website_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let files = storage
        .list_account_files(
            account_id,
            limit,
            offset,
            folder_id,
            filter_root,
            website_id,
        )
        .await
        .map_err(|e: anyhow::Error| {
            tracing::error!("Failed to list files: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to list files".to_string(),
            )
        })?;

    let responses = files.into_iter().map(FileUploadResponse::from).collect();

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
                (
                    StatusCode::FORBIDDEN,
                    "Not authorized to delete this file".to_string(),
                )
            } else {
                tracing::error!("Failed to delete file {}: {}", file_id, e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to delete file".to_string(),
                )
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
    let token = params
        .get("token")
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
    let safe_filename = file
        .filename
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace(['\r', '\n'], "");

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &file.mime_type)
        .header(header::CONTENT_LENGTH, content.len())
        .header(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", safe_filename),
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
    let file_tags: Vec<String> = file_row
        .get::<Option<Vec<String>>, _>("tags")
        .unwrap_or_default();

    // Build update query dynamically
    let new_filename = request.filename.unwrap_or(file_filename);
    // Handle folder_id: "root" means move to root (NULL), UUID string means specific folder
    let new_folder_id: Option<Uuid> = match request.folder_id.as_deref() {
        Some("root") => None, // Explicitly move to root
        Some(id) => Some(
            Uuid::parse_str(id)
                .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid folder_id".to_string()))?,
        ),
        None => file_folder_id, // Keep existing
    };
    let new_visibility = request
        .visibility
        .as_deref()
        .unwrap_or(file_visibility.as_deref().unwrap_or("private"));
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
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
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
