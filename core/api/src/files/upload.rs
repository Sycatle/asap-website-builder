//! Multipart file upload handler.

use axum::{extract::multipart::Multipart, http::StatusCode, Extension, Json};
use uuid::Uuid;

use crate::storage::{FileStorageService, UploadParams};
use asap_core_domain::FileUploadResponse;
use asap_core_shared::{Claims, SharedWsBroadcaster};

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
                let data = field.bytes().await.map_err(|e| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!("Failed to read file: {}", e),
                    )
                })?;
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

    let (filename, content_type, data) =
        file_data.ok_or_else(|| (StatusCode::BAD_REQUEST, "No file provided".to_string()))?;

    // If website_id is provided, verify user has access to this website
    if let Some(wid) = website_id {
        let has_access: Option<bool> = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM websites WHERE id = $1 AND account_id = $2)",
        )
        .bind(wid)
        .bind(account_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
        })?;

        if !has_access.unwrap_or(false) {
            return Err((
                StatusCode::FORBIDDEN,
                "Access denied to this website".to_string(),
            ));
        }
    }

    // Sanitize filename
    let filename = storage.sanitize_filename(&filename);

    // Security: Validate magic bytes match declared MIME type
    storage
        .validate_magic_bytes(&data, &content_type)
        .map_err(|e| {
            (
                StatusCode::BAD_REQUEST,
                format!("File validation failed: {}", e),
            )
        })?;

    // Upload file (with compression and validation)
    let file = storage
        .upload_file_with_metadata(
            account_id,
            UploadParams {
                filename: &filename,
                mime_type: &content_type,
                data: &data,
                website_id,
                folder_id,
                visibility: visibility.as_deref(),
                description: description.as_deref(),
                tags: tags.as_deref(),
            },
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
