use axum::{
    extract::{multipart::Multipart, Path, Extension},
    http::{StatusCode, header},
    response::Response,
    body::Body,
    Json,
};
use uuid::Uuid;
use std::collections::HashMap;

use crate::storage::FileStorageService;
use asap_core_shared::{Claims, SharedConfig, validate_token};
use asap_core_domain::{FileUploadResponse, StorageQuotaResponse};

/// Upload file handler
pub async fn upload_file(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileUploadResponse>), (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Multipart error: {}", e)))?
    {
        let filename = field
            .file_name()
            .ok_or_else(|| (StatusCode::BAD_REQUEST, "Missing filename".to_string()))?
            .to_string();

        let content_type = field
            .content_type()
            .ok_or_else(|| (StatusCode::BAD_REQUEST, "Missing content-type".to_string()))?
            .to_string();

        // Sanitize filename
        let filename = storage.sanitize_filename(&filename);

        // Read file content
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to read file: {}", e)))?;

        // Security: Validate magic bytes match declared MIME type
        storage
            .validate_magic_bytes(&data, &content_type)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("File validation failed: {}", e)))?;

        // Upload file (with compression and validation)
        let file = storage
            .upload_file(account_id, &filename, &content_type, &data)
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Upload failed: {}", e)))?;

        return Ok((StatusCode::CREATED, Json(FileUploadResponse::from(file))));
    }

    Err((StatusCode::BAD_REQUEST, "No file provided".to_string()))
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

    let files = storage
        .list_account_files(account_id, limit, offset)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
    Path(file_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let account_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid account ID".to_string()))?;

    storage
        .delete_file(account_id, file_id)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

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
        .map_err(|_| (StatusCode::NOT_FOUND, "File not found".to_string()))?;

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
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &file.mime_type)
        .header(header::CONTENT_LENGTH, content.len())
        .header(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", file.filename)
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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StorageQuotaResponse::from(quota)))
}
