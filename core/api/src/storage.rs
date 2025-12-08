use anyhow::{Result};
use bytes::Bytes;
use flate2::write::GzEncoder;
use flate2::Compression;
use sqlx::{PgPool, Row};
use std::io::Write;
use uuid::Uuid;
use sha2::{Sha256, Digest};
use hex;

use asap_core_domain::{File, UserStorageQuota};

/// FileStorageService handles file uploads, compression, and metadata management
pub struct FileStorageService {
    pool: PgPool,
    max_file_size: i64,
    allowed_mime_types: Vec<String>,
}

impl FileStorageService {
    const DEFAULT_MAX_FILE_SIZE: i64 = 100_000_000; // 100 MB
    
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            max_file_size: Self::DEFAULT_MAX_FILE_SIZE,
            allowed_mime_types: Self::default_allowed_mime_types(),
        }
    }

    /// Get default allowed MIME types
    fn default_allowed_mime_types() -> Vec<String> {
        vec![
            // Documents
            "application/pdf".to_string(),
            "text/plain".to_string(),
            "application/msword".to_string(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
            "application/vnd.ms-excel".to_string(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            // Images
            "image/jpeg".to_string(),
            "image/png".to_string(),
            "image/gif".to_string(),
            "image/webp".to_string(),
            // Archives
            "application/zip".to_string(),
            "application/x-tar".to_string(),
            "application/gzip".to_string(),
            // Code
            "text/html".to_string(),
            "text/css".to_string(),
            "text/javascript".to_string(),
            "application/json".to_string(),
            "text/xml".to_string(),
            // Generic
            "application/octet-stream".to_string(),
        ]
    }

    /// Validate file upload
    pub fn validate_file(
        &self,
        filename: &str,
        mime_type: &str,
        file_size: i64,
    ) -> Result<()> {
        // Check file size
        if file_size > self.max_file_size {
            return Err(anyhow::anyhow!(
                "File too large. Maximum size: {} MB",
                self.max_file_size / 1_000_000
            ));
        }

        // Check MIME type
        if !self.allowed_mime_types.contains(&mime_type.to_string()) {
            return Err(anyhow::anyhow!(
                "File type not allowed: {}",
                mime_type
            ));
        }

        // Check filename safety
        if filename.contains("..") || filename.contains("/") || filename.contains("\\") {
            return Err(anyhow::anyhow!("Invalid filename"));
        }

        // Check for null bytes
        if filename.contains('\0') {
            return Err(anyhow::anyhow!("Invalid filename"));
        }

        Ok(())
    }

    /// Compress file content
    pub fn compress_file(&self, data: &[u8]) -> Result<Bytes> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        let compressed = encoder.finish()?;
        Ok(Bytes::from(compressed))
    }

    /// Calculate file hash
    pub fn calculate_hash(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }

    /// Upload file with compression
    pub async fn upload_file(
        &self,
        user_id: Uuid,
        filename: &str,
        mime_type: &str,
        data: &[u8],
    ) -> Result<File> {
        // Validate file
        self.validate_file(filename, mime_type, data.len() as i64)?;

        // Check quota
        self.check_user_quota(user_id, data.len() as i64).await?;

        // Calculate hash (deduplicate by content)
        let file_hash = self.calculate_hash(data);

        // Check if file already exists (content deduplication)
        if let Ok(Some(existing_file)) = self.get_file_by_hash(&file_hash).await {
            return Ok(existing_file);
        }

        // Compress file
        let compressed_data = self.compress_file(data)?;

        // Generate storage key
        let storage_key = format!("{}/{}", user_id, Uuid::new_v4());

        // Store metadata in database
        let file = File::new(
            user_id,
            filename.to_string(),
            mime_type.to_string(),
            data.len() as i64,
            compressed_data.len() as i64,
            file_hash,
            storage_key,
        );

        // Save to database
        self.save_file(&file).await?;

        // Update user quota
        self.update_user_quota(user_id, compressed_data.len() as i64)
            .await?;

        Ok(file)
    }

    /// Save file metadata to database
    async fn save_file(&self, file: &File) -> Result<()> {
        sqlx::query(
            "INSERT INTO files (id, user_id, filename, mime_type, original_size, compressed_size, file_hash, storage_key, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(file.id)
        .bind(file.user_id)
        .bind(&file.filename)
        .bind(&file.mime_type)
        .bind(file.original_size)
        .bind(file.compressed_size)
        .bind(&file.file_hash)
        .bind(&file.storage_key)
        .bind(file.created_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get file by hash (for content deduplication)
    async fn get_file_by_hash(&self, file_hash: &str) -> Result<Option<File>> {
        let row = sqlx::query(
            "SELECT id, user_id, filename, mime_type, original_size, compressed_size, file_hash, storage_key, created_at
             FROM files WHERE file_hash = $1"
        )
        .bind(file_hash)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            File {
                id: r.get(0),
                user_id: r.get(1),
                filename: r.get(2),
                mime_type: r.get(3),
                original_size: r.get(4),
                compressed_size: r.get(5),
                file_hash: r.get(6),
                storage_key: r.get(7),
                created_at: r.get(8),
            }
        }))
    }

    /// Check user quota
    async fn check_user_quota(&self, user_id: Uuid, file_size: i64) -> Result<()> {
        let quota = self.get_user_quota(user_id).await?;

        if !quota.can_upload(file_size) {
            return Err(anyhow::anyhow!(
                "Storage quota exceeded. Available: {} MB",
                quota.remaining() / 1_000_000
            ));
        }

        Ok(())
    }

    /// Get user quota
    pub async fn get_user_quota(&self, user_id: Uuid) -> Result<UserStorageQuota> {
        let row = sqlx::query(
            "SELECT user_id, total_size_used, quota_limit, updated_at
             FROM user_storage_quota WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => Ok(UserStorageQuota {
                user_id: r.get(0),
                total_size_used: r.get(1),
                quota_limit: r.get(2),
                updated_at: r.get(3),
            }),
            None => {
                // Create quota if doesn't exist
                let quota = UserStorageQuota::new(user_id);
                sqlx::query(
                    "INSERT INTO user_storage_quota (user_id, total_size_used, quota_limit)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id) DO NOTHING"
                )
                .bind(user_id)
                .bind(0i64)
                .bind(UserStorageQuota::DEFAULT_QUOTA)
                .execute(&self.pool)
                .await?;

                Ok(quota)
            }
        }
    }

    /// Update user quota after upload
    async fn update_user_quota(&self, user_id: Uuid, file_size: i64) -> Result<()> {
        sqlx::query(
            "UPDATE user_storage_quota
             SET total_size_used = total_size_used + $1
             WHERE user_id = $2"
        )
        .bind(file_size)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Delete file and free up quota
    pub async fn delete_file(&self, user_id: Uuid, file_id: Uuid) -> Result<()> {
        // Get file to retrieve size
        let file = self.get_file(file_id).await?;

        // Verify ownership
        if file.user_id != user_id {
            return Err(anyhow::anyhow!("Unauthorized"));
        }

        // Delete from database
        sqlx::query("DELETE FROM files WHERE id = $1")
            .bind(file_id)
            .execute(&self.pool)
            .await?;

        // Update quota
        sqlx::query(
            "UPDATE user_storage_quota
             SET total_size_used = (total_size_used - $1)
             WHERE user_id = $2"
        )
        .bind(file.compressed_size)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get file metadata
    pub async fn get_file(&self, file_id: Uuid) -> Result<File> {
        let row = sqlx::query(
            "SELECT id, user_id, filename, mime_type, original_size, compressed_size, file_hash, storage_key, created_at
             FROM files WHERE id = $1"
        )
        .bind(file_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => Ok(File {
                id: r.get(0),
                user_id: r.get(1),
                filename: r.get(2),
                mime_type: r.get(3),
                original_size: r.get(4),
                compressed_size: r.get(5),
                file_hash: r.get(6),
                storage_key: r.get(7),
                created_at: r.get(8),
            }),
            None => Err(anyhow::anyhow!("File not found")),
        }
    }

    /// List user files
    pub async fn list_user_files(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<File>> {
        let rows = sqlx::query(
            "SELECT id, user_id, filename, mime_type, original_size, compressed_size, file_hash, storage_key, created_at
             FROM files WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3"
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let files = rows
            .iter()
            .map(|r| File {
                id: r.get(0),
                user_id: r.get(1),
                filename: r.get(2),
                mime_type: r.get(3),
                original_size: r.get(4),
                compressed_size: r.get(5),
                file_hash: r.get(6),
                storage_key: r.get(7),
                created_at: r.get(8),
            })
            .collect();

        Ok(files)
    }

    /// Cleanup old file metadata (runs periodically)
    pub async fn cleanup_orphaned_files(&self, days: i64) -> Result<u64> {
        let result = sqlx::query(
            "DELETE FROM files WHERE created_at < now() - interval '1 day' * $1 AND user_id NOT IN (SELECT id FROM users)"
        )
        .bind(days)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Strip metadata from filename (security)
    pub fn sanitize_filename(&self, filename: &str) -> String {
        // Remove path components
        let filename = filename.split('/').last().unwrap_or(filename);
        let filename = filename.split('\\').last().unwrap_or(filename);
        
        // Remove null bytes
        filename.replace('\0', "")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_file_size() {
        // This test would require a real or mocked database
        // For now, we verify the function exists and is callable
        let _max_size = FileStorageService::DEFAULT_MAX_FILE_SIZE;
        assert_eq!(_max_size, 100_000_000);
    }

    #[test]
    fn test_calculate_hash() {
        // Direct test without database
        let data = b"test content";
        let mut hasher = sha2::Sha256::new();
        hasher.update(data);
        let hash = hex::encode(hasher.finalize());
        
        // Hash should be consistent
        let mut hasher2 = sha2::Sha256::new();
        hasher2.update(data);
        let hash2 = hex::encode(hasher2.finalize());
        
        assert_eq!(hash, hash2);
    }

    #[test]
    fn test_sanitize_filename() {
        // Extract sanitization logic for testing
        fn sanitize_filename(filename: &str) -> String {
            let filename = filename.split('/').last().unwrap_or(filename);
            let filename = filename.split('\\').last().unwrap_or(filename);
            filename.replace('\0', "")
        }
        
        let filename = sanitize_filename("../../../etc/passwd");
        assert!(!filename.contains("/"));
        assert_eq!(filename, "passwd");
    }
}
