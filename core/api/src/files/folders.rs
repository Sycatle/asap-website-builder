//! Folder CRUD handlers.

use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    Json,
};
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

use super::{CreateFolderRequest, FolderResponse, FolderRow, UpdateFolderRequest};
use asap_core_shared::Claims;

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
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to list folders".to_string(),
        )
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
        return Err((
            StatusCode::BAD_REQUEST,
            "Folder name cannot be empty".to_string(),
        ));
    }

    if request.name.len() > 255 {
        return Err((StatusCode::BAD_REQUEST, "Folder name too long".to_string()));
    }

    // If website_id is provided, verify user has access to this website
    if let Some(wid) = request.website_id {
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

    // Build path based on parent
    let (path, effective_website_id) = if let Some(parent_id) = request.parent_folder_id {
        // Verify parent exists and belongs to user (use dynamic query to avoid SQLx cache issues)
        let parent_row = sqlx::query(
            "SELECT path, website_id FROM file_folders WHERE id = $1 AND account_id = $2",
        )
        .bind(parent_id)
        .bind(account_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch parent folder: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
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

    sqlx::query("UPDATE file_folders SET name = $1, path = $2, updated_at = NOW() WHERE id = $3")
        .bind(&new_name)
        .bind(&new_path)
        .bind(folder_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update folder: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update folder".to_string(),
            )
        })?;

    // Get counts
    let file_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM files WHERE folder_id = $1")
        .bind(folder_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let subfolder_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM file_folders WHERE parent_id = $1")
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
    let folder_exists =
        sqlx::query("SELECT id FROM file_folders WHERE id = $1 AND account_id = $2")
            .bind(folder_id)
            .bind(account_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to check folder: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
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

    let has_subfolders: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM file_folders WHERE parent_folder_id = $1")
            .bind(folder_id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

    if (has_files > 0 || has_subfolders > 0) && !delete_contents {
        return Err((
            StatusCode::CONFLICT,
            "Folder is not empty. Use delete_contents=true to delete anyway.".to_string(),
        ));
    }

    // Delete folder (cascade will handle contents if any)
    sqlx::query("DELETE FROM file_folders WHERE id = $1 AND account_id = $2")
        .bind(folder_id)
        .bind(account_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete folder: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete folder".to_string(),
            )
        })?;

    Ok(StatusCode::NO_CONTENT)
}
