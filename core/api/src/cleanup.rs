use sqlx::PgPool;
use anyhow::Result;
use chrono::{DateTime, Utc};
use tracing::info;
use serde::Serialize;

/// FileCleanupService handles periodic cleanup of file metadata and orphaned files
pub struct FileCleanupService {
    pool: PgPool,
}

impl FileCleanupService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Run cleanup tasks periodically
    pub async fn run_cleanup(&self) -> Result<CleanupStats> {
        info!("Starting file cleanup tasks");

        let mut stats = CleanupStats::default();

        // Clean orphaned file metadata (files with deleted accounts)
        stats.orphaned_files_cleaned = self.cleanup_orphaned_files().await?;

        // Clean old audit logs
        stats.audit_logs_cleaned = self.cleanup_old_audit_logs().await?;

        // Reset quotas for deleted users
        stats.quotas_cleaned = self.cleanup_deleted_user_quotas().await?;

        info!("File cleanup completed: {:?}", stats);

        Ok(stats)
    }

    /// Remove metadata for orphaned files (account deleted but files remain)
    async fn cleanup_orphaned_files(&self) -> Result<u64> {
        let result = sqlx::query(
            "DELETE FROM files 
             WHERE account_id NOT IN (SELECT id FROM accounts)"
        )
        .execute(&self.pool)
        .await?;

        info!("Cleaned {} orphaned file entries", result.rows_affected());

        Ok(result.rows_affected())
    }

    /// Remove old audit logs (older than 90 days)
    async fn cleanup_old_audit_logs(&self) -> Result<u64> {
        let result = sqlx::query(
            "DELETE FROM file_operations_audit 
             WHERE created_at < now() - interval '90 days'"
        )
        .execute(&self.pool)
        .await?;

        info!("Cleaned {} old audit log entries", result.rows_affected());

        Ok(result.rows_affected())
    }

    /// Remove quota entries for deleted users
    async fn cleanup_deleted_user_quotas(&self) -> Result<u64> {
        let result = sqlx::query(
            "DELETE FROM user_storage_quota 
             WHERE account_id NOT IN (SELECT id FROM accounts)"
        )
        .execute(&self.pool)
        .await?;

        info!("Cleaned {} quota entries for deleted users", result.rows_affected());

        Ok(result.rows_affected())
    }

    /// Get storage stats for admin dashboard
    pub async fn get_storage_stats(&self) -> Result<StorageStats> {
        let row = sqlx::query_as::<_, (i64, Option<i64>, Option<i64>)>(
            "SELECT 
                COUNT(*) as total_files,
                SUM(compressed_size) as total_compressed_size,
                SUM(original_size) as total_original_size
             FROM files"
        )
        .fetch_one(&self.pool)
        .await?;

        let total_users = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;

        Ok(StorageStats {
            total_files: row.0,
            total_compressed_size: row.1.unwrap_or(0),
            total_original_size: row.2.unwrap_or(0),
            total_users,
            calculated_at: Utc::now(),
        })
    }

    /// Audit file operation for security logging
    pub async fn audit_operation(
        &self,
        account_id: uuid::Uuid,
        file_id: Option<uuid::Uuid>,
        operation: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO file_operations_audit (account_id, file_id, operation, ip_address, user_agent, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(account_id)
        .bind(file_id)
        .bind(operation)
        .bind(ip_address)
        .bind(user_agent)
        .bind(Utc::now())
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

/// Statistics for cleanup operations
#[derive(Debug, Default)]
pub struct CleanupStats {
    pub orphaned_files_cleaned: u64,
    pub audit_logs_cleaned: u64,
    pub quotas_cleaned: u64,
}

/// Overall storage statistics
#[derive(Debug, Serialize)]
pub struct StorageStats {
    pub total_files: i64,
    pub total_compressed_size: i64,
    pub total_original_size: i64,
    pub total_users: i64,
    pub calculated_at: DateTime<Utc>,
}

impl StorageStats {
    /// Calculate overall compression ratio
    pub fn compression_ratio(&self) -> f64 {
        if self.total_original_size == 0 {
            0.0
        } else {
            (self.total_compressed_size as f64 / self.total_original_size as f64) * 100.0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_stats_compression_ratio() {
        let stats = StorageStats {
            total_files: 10,
            total_compressed_size: 5_000_000,
            total_original_size: 10_000_000,
            total_users: 5,
            calculated_at: Utc::now(),
        };

        assert_eq!(stats.compression_ratio(), 50.0);
    }
}
