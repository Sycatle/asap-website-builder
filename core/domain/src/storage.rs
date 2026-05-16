use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

/// File visibility levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FileVisibility {
    #[default]
    Private, // Accessible only to owner with auth token
    Public,  // Accessible to anyone via public URL
    Website, // Inherits visibility from associated website
}

impl FileVisibility {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileVisibility::Private => "private",
            FileVisibility::Public => "public",
            FileVisibility::Website => "website",
        }
    }
}

impl FromStr for FileVisibility {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "private" => Ok(FileVisibility::Private),
            "public" => Ok(FileVisibility::Public),
            "website" => Ok(FileVisibility::Website),
            _ => Err(format!("Invalid file visibility: {}", s)),
        }
    }
}

/// Virtual folder for organizing files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileFolder {
    pub id: Uuid,
    pub account_id: Uuid,
    pub website_id: Option<Uuid>,
    pub parent_folder_id: Option<Uuid>,
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl FileFolder {
    pub fn new(
        account_id: Uuid,
        name: String,
        parent_folder_id: Option<Uuid>,
        parent_path: Option<&str>,
    ) -> Self {
        let path = match parent_path {
            Some(p) if !p.is_empty() && p != "/" => format!("{}/{}", p, name),
            _ => format!("/{}", name),
        };

        Self {
            id: Uuid::new_v4(),
            account_id,
            website_id: None,
            parent_folder_id,
            name,
            path,
            icon: None,
            color: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    pub fn new_website_folder(account_id: Uuid, website_id: Uuid, website_name: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            account_id,
            website_id: Some(website_id),
            parent_folder_id: None,
            name: website_name.to_string(),
            path: format!("/websites/{}", website_name),
            icon: Some("globe".to_string()),
            color: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    pub fn is_website_folder(&self) -> bool {
        self.website_id.is_some()
    }

    pub fn is_root(&self) -> bool {
        self.parent_folder_id.is_none()
    }
}

/// File represents a stored file in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    pub id: Uuid,
    pub account_id: Uuid,
    pub folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>,
    pub filename: String,
    pub mime_type: String,
    pub original_size: i64,
    pub compressed_size: i64,
    pub file_hash: String,
    pub storage_key: String,
    pub visibility: FileVisibility,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
}

impl File {
    pub fn new(
        account_id: Uuid,
        filename: String,
        mime_type: String,
        original_size: i64,
        compressed_size: i64,
        file_hash: String,
        storage_key: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            account_id,
            folder_id: None,
            website_id: None,
            filename,
            mime_type,
            original_size,
            compressed_size,
            file_hash,
            storage_key,
            visibility: FileVisibility::Private,
            description: None,
            tags: Vec::new(),
            created_at: Utc::now(),
        }
    }

    pub fn with_folder(mut self, folder_id: Uuid) -> Self {
        self.folder_id = Some(folder_id);
        self
    }

    pub fn with_website(mut self, website_id: Uuid) -> Self {
        self.website_id = Some(website_id);
        self.visibility = FileVisibility::Website;
        self
    }

    pub fn with_visibility(mut self, visibility: FileVisibility) -> Self {
        self.visibility = visibility;
        self
    }

    pub fn is_public(&self) -> bool {
        matches!(self.visibility, FileVisibility::Public)
    }

    /// Calculate compression ratio
    pub fn compression_ratio(&self) -> f64 {
        if self.original_size == 0 {
            0.0
        } else {
            (self.compressed_size as f64 / self.original_size as f64) * 100.0
        }
    }

    /// Get file extension (safely)
    pub fn extension(&self) -> Option<&str> {
        self.filename.rsplit('.').next()
    }
}

/// AccountStorageQuota tracks storage usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountStorageQuota {
    pub account_id: Uuid,
    pub total_size_used: i64,
    pub quota_limit: i64,
    pub updated_at: DateTime<Utc>,
}

impl AccountStorageQuota {
    pub const DEFAULT_QUOTA: i64 = 52_428_800; // 50 MB in bytes (plan standard)

    pub fn new(account_id: Uuid) -> Self {
        Self {
            account_id,
            total_size_used: 0,
            quota_limit: Self::DEFAULT_QUOTA,
            updated_at: Utc::now(),
        }
    }

    /// Check if user can upload a file of given size
    pub fn can_upload(&self, file_size: i64) -> bool {
        self.total_size_used + file_size <= self.quota_limit
    }

    /// Get remaining storage space
    pub fn remaining(&self) -> i64 {
        (self.quota_limit - self.total_size_used).max(0)
    }

    /// Get usage percentage
    pub fn usage_percentage(&self) -> f64 {
        (self.total_size_used as f64 / self.quota_limit as f64) * 100.0
    }
}

/// File upload request
#[derive(Debug, Deserialize)]
pub struct FileUploadRequest {
    pub filename: String,
    pub content_type: String,
    #[serde(default)]
    pub folder_id: Option<Uuid>,
    #[serde(default)]
    pub website_id: Option<Uuid>,
    #[serde(default)]
    pub visibility: Option<FileVisibility>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

/// File upload response
#[derive(Debug, Serialize)]
pub struct FileUploadResponse {
    pub id: Uuid,
    pub filename: String,
    pub original_size: i64,
    pub compressed_size: i64,
    pub mime_type: String,
    pub compression_ratio: f64,
    pub visibility: FileVisibility,
    pub folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<File> for FileUploadResponse {
    fn from(file: File) -> Self {
        let compression_ratio = file.compression_ratio();
        Self {
            id: file.id,
            filename: file.filename,
            original_size: file.original_size,
            compressed_size: file.compressed_size,
            mime_type: file.mime_type,
            compression_ratio,
            visibility: file.visibility,
            folder_id: file.folder_id,
            website_id: file.website_id,
            created_at: file.created_at,
        }
    }
}

/// Folder response
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
    pub created_at: DateTime<Utc>,
}

/// Create folder request
#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_folder_id: Option<Uuid>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

/// Update folder request
#[derive(Debug, Deserialize)]
pub struct UpdateFolderRequest {
    pub name: Option<String>,
    pub parent_folder_id: Option<Uuid>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

/// Update file request
#[derive(Debug, Deserialize)]
pub struct UpdateFileRequest {
    pub filename: Option<String>,
    pub folder_id: Option<Uuid>,
    pub visibility: Option<FileVisibility>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// File list query parameters
#[derive(Debug, Deserialize, Default)]
pub struct FileListQuery {
    pub folder_id: Option<Uuid>,
    pub website_id: Option<Uuid>,
    pub visibility: Option<FileVisibility>,
    pub mime_type: Option<String>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Storage quota response
#[derive(Debug, Serialize)]
pub struct StorageQuotaResponse {
    pub total_size_used: i64,
    pub quota_limit: i64,
    pub remaining: i64,
    pub usage_percentage: f64,
}

impl From<AccountStorageQuota> for StorageQuotaResponse {
    fn from(quota: AccountStorageQuota) -> Self {
        Self {
            total_size_used: quota.total_size_used,
            quota_limit: quota.quota_limit,
            remaining: quota.remaining(),
            usage_percentage: quota.usage_percentage(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_creation() {
        let account_id = Uuid::new_v4();
        let file = File::new(
            account_id,
            "test.txt".to_string(),
            "text/plain".to_string(),
            1000,
            500,
            "abc123".to_string(),
            "s3://bucket/key".to_string(),
        );

        assert_eq!(file.account_id, account_id);
        assert_eq!(file.filename, "test.txt");
        assert!(file.compression_ratio() <= 100.0);
    }

    #[test]
    fn test_quota_can_upload() {
        let account_id = Uuid::new_v4();
        let mut quota = AccountStorageQuota::new(account_id);

        // Should allow upload initially (default quota is 50 MB)
        assert!(quota.can_upload(10_000_000)); // 10 MB

        // Fill quota
        quota.total_size_used = quota.quota_limit;

        // Should not allow upload when full
        assert!(!quota.can_upload(1_000_000));
    }

    #[test]
    fn test_quota_remaining() {
        let account_id = Uuid::new_v4();
        let mut quota = AccountStorageQuota::new(account_id);

        quota.total_size_used = 10_000_000; // 10 MB

        // Remaining should be quota_limit - used
        let expected = AccountStorageQuota::DEFAULT_QUOTA - 10_000_000;
        assert_eq!(quota.remaining(), expected);
    }

    #[test]
    fn test_file_extension() {
        let file = File::new(
            Uuid::new_v4(),
            "document.pdf".to_string(),
            "application/pdf".to_string(),
            1000,
            500,
            "hash".to_string(),
            "key".to_string(),
        );

        assert_eq!(file.extension(), Some("pdf"));
    }
}
