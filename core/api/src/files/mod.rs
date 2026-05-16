//! File storage and folder management.
//!
//! Split into focused modules:
//! - `upload` — multipart upload handler
//! - `list` — list / update / delete / download / quota
//! - `folders` — folder CRUD
//!
//! Shared request/response types live here so callers from outside the
//! module continue to use `crate::files::UpdateFileRequest`, etc.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

mod folders;
mod list;
mod upload;

pub use folders::{create_folder, delete_folder, list_folders, update_folder};
pub use list::{delete_file, download_file, get_quota, list_files, update_file};
pub use upload::upload_file;

// ============================================
// FILE UPDATE TYPES
// ============================================

#[derive(Debug, Deserialize)]
pub struct UpdateFileRequest {
    pub filename: Option<String>,
    pub folder_id: Option<String>, // UUID string or "root" to move to root folder
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
pub(crate) struct FolderRow {
    pub id: Uuid,
    pub name: String,
    pub path: String,
    pub parent_folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub file_count: Option<i64>,
    pub subfolder_count: Option<i64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
