use axum::{
    extract::{multipart::Multipart, Path, Extension},
    http::StatusCode,
    Json, Router,
    routing::{get, post, delete},
};
use uuid::Uuid;
use std::collections::HashMap;

use crate::storage::FileStorageService;
use asap_core_shared::Claims;
use asap_core_domain::{FileUploadResponse, StorageQuotaResponse};

/// Create files router
pub fn create_router(storage_service: std::sync::Arc<FileStorageService>) -> Router {
    Router::new()
        .route("/", post(upload_file))
        .route("/", get(list_files))
        .route("/:file_id", delete(delete_file))
        .route("/quota/usage", get(get_quota))
        .layer(Extension(storage_service))
}

/// Upload file handler
pub async fn upload_file(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileUploadResponse>), (StatusCode, String)> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

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

        // Upload file (with compression and validation)
        let file = storage
            .upload_file(user_id, &filename, &content_type, &data)
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Upload failed: {}", e)))?;

        return Ok((StatusCode::CREATED, Json(FileUploadResponse::from(file))));
    }

    Err((StatusCode::BAD_REQUEST, "No file provided".to_string()))
}

/// List user files
pub async fn list_files(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<FileUploadResponse>>, (StatusCode, String)> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;
    
    let limit = params
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(50);
    let offset = params
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    let files = storage
        .list_user_files(user_id, limit, offset)
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
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    storage
        .delete_file(user_id, file_id)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get user quota usage
pub async fn get_quota(
    Extension(claims): Extension<Claims>,
    Extension(storage): Extension<std::sync::Arc<FileStorageService>>,
) -> Result<Json<StorageQuotaResponse>, (StatusCode, String)> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let quota = storage
        .get_user_quota(user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StorageQuotaResponse::from(quota)))
}
