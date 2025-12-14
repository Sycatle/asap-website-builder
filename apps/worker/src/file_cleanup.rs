use sqlx::PgPool;
use tokio::time::{interval, Duration};
use tracing::{info, error};

/// FileCleanupTask handles periodic cleanup of files and metadata
pub struct FileCleanupTask {
    pool: PgPool,
}

impl FileCleanupTask {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Start the cleanup task that runs periodically
    /// Runs every 6 hours by default
    pub async fn start(self) {
        let mut cleanup_interval = interval(Duration::from_secs(6 * 60 * 60));

        loop {
            cleanup_interval.tick().await;
            
            if let Err(e) = self.run_cleanup().await {
                error!("File cleanup task failed: {}", e);
            }
        }
    }

    /// Run all cleanup operations
    async fn run_cleanup(&self) -> anyhow::Result<()> {
        info!("Starting scheduled file cleanup");

        // Clean orphaned file metadata
        let orphaned = self.cleanup_orphaned_files().await?;
        info!("Cleaned {} orphaned file entries", orphaned);

        // Clean old audit logs (90 days)
        let audit = self.cleanup_old_audit_logs().await?;
        info!("Cleaned {} old audit log entries", audit);

        // Clean quotas for deleted users
        let quotas = self.cleanup_deleted_user_quotas().await?;
        info!("Cleaned {} quota entries for deleted users", quotas);

        // Recalculate quotas based on actual files
        let recalc = self.recalculate_user_quotas().await?;
        info!("Recalculated {} account quotas", recalc);

        info!("File cleanup completed successfully");
        Ok(())
    }

    /// Remove metadata for orphaned files
    async fn cleanup_orphaned_files(&self) -> anyhow::Result<u64> {
        let result = sqlx::query(
            "DELETE FROM files 
             WHERE account_id NOT IN (SELECT id FROM accounts)"
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Remove old audit logs (older than 90 days)
    async fn cleanup_old_audit_logs(&self) -> anyhow::Result<u64> {
        let result = sqlx::query(
            "DELETE FROM file_operations_audit 
             WHERE created_at < now() - interval '90 days'"
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Remove quota entries for deleted users
    async fn cleanup_deleted_user_quotas(&self) -> anyhow::Result<u64> {
        let result = sqlx::query(
            "DELETE FROM account_storage_quota 
             WHERE account_id NOT IN (SELECT id FROM accounts)"
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Recalculate account quotas based on actual file sizes
    /// This ensures quota accuracy even if files are manually deleted
    async fn recalculate_user_quotas(&self) -> anyhow::Result<i64> {
        let updated = sqlx::query(
            "UPDATE account_storage_quota
             SET total_size_used = (
                 SELECT COALESCE(SUM(compressed_size), 0)
                 FROM files
                 WHERE files.account_id = account_storage_quota.account_id
             )
             WHERE account_id IN (SELECT id FROM accounts)
             AND total_size_used != (
                 SELECT COALESCE(SUM(compressed_size), 0)
                 FROM files
                 WHERE files.account_id = account_storage_quota.account_id
             )"
        )
        .execute(&self.pool)
        .await?;

        Ok(updated.rows_affected() as i64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_cleanup_task_creation() {
        // Test can be expanded with mock database
        let _task = FileCleanupTask::new(/* mock pool */);
    }
}
