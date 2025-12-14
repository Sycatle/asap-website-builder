use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// File represents a stored file in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    pub id: Uuid,
    pub account_id: Uuid,
    pub filename: String,
    pub mime_type: String,
    pub original_size: i64,
    pub compressed_size: i64,
    pub file_hash: String,
    pub storage_key: String,
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
            filename,
            mime_type,
            original_size,
            compressed_size,
            file_hash,
            storage_key,
            created_at: Utc::now(),
        }
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
            created_at: file.created_at,
        }
    }
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
        
        // Should allow upload initially
        assert!(quota.can_upload(100_000_000)); // 100 MB
        
        // Fill quota
        quota.total_size_used = 1_000_000_000; // 1 GB
        
        // Should not allow upload
        assert!(!quota.can_upload(1_000_000));
    }

    #[test]
    fn test_quota_remaining() {
        let account_id = Uuid::new_v4();
        let mut quota = AccountStorageQuota::new(account_id);
        
        quota.total_size_used = 500_000_000; // 500 MB
        
        assert_eq!(quota.remaining(), 573_741_824); // ~573 MB
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
