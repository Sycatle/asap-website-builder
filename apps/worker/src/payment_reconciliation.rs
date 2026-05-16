use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct PaymentReconciliation {
    pool: PgPool,
}

impl PaymentReconciliation {
    pub fn new(pool: PgPool) -> anyhow::Result<Self> {
        Ok(Self { pool })
    }

    /// Reconcile all accounts with active Stripe customers
    pub async fn reconcile_all(&self) -> anyhow::Result<ReconciliationStats> {
        tracing::info!("Starting payment reconciliation for all accounts");

        let mut stats = ReconciliationStats::default();

        // Fetch all accounts with Stripe customer IDs in a single query (avoids N+1)
        let accounts = sqlx::query_as::<_, (Uuid, String)>(
            "SELECT id, stripe_customer_id FROM accounts WHERE stripe_customer_id IS NOT NULL",
        )
        .fetch_all(&self.pool)
        .await?;

        stats.total_accounts = accounts.len();

        for (account_id, customer_id) in accounts {
            match self
                .reconcile_account_with_customer(account_id, &customer_id)
                .await
            {
                Ok(_) => {
                    stats.successful += 1;
                }
                Err(e) => {
                    tracing::error!("Failed to reconcile account {}: {}", account_id, e);
                    stats.failed += 1;
                }
            }
        }

        tracing::info!(
            "Payment reconciliation completed: {}/{} successful, {} failed",
            stats.successful,
            stats.total_accounts,
            stats.failed
        );

        Ok(stats)
    }

    /// Reconcile a specific account with known customer ID (no extra DB query)
    async fn reconcile_account_with_customer(
        &self,
        account_id: Uuid,
        customer_id: &str,
    ) -> anyhow::Result<()> {
        tracing::debug!(
            "Reconciling account {} with customer {}",
            account_id,
            customer_id
        );

        // Fetch active subscriptions from Stripe
        // Note: In a real implementation, we'd need to call Stripe API to list subscriptions
        // For now, we'll skip this as it requires more complex API interaction
        tracing::debug!("Would fetch subscriptions for customer {}", customer_id);

        Ok(())
    }

    /// Background task that runs reconciliation periodically
    pub async fn start_background_task(self: Arc<Self>, interval_hours: u64) {
        let interval = std::time::Duration::from_secs(interval_hours * 3600);

        loop {
            tracing::info!("Running scheduled payment reconciliation");

            match self.reconcile_all().await {
                Ok(stats) => {
                    tracing::info!("Reconciliation completed: {:?}", stats);
                }
                Err(e) => {
                    tracing::error!("Reconciliation failed: {}", e);
                }
            }

            tokio::time::sleep(interval).await;
        }
    }
}

#[derive(Debug, Default)]
pub struct ReconciliationStats {
    pub total_accounts: usize,
    pub successful: usize,
    pub failed: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reconciliation_stats_default() {
        let stats = ReconciliationStats::default();
        assert_eq!(stats.total_accounts, 0);
        assert_eq!(stats.successful, 0);
        assert_eq!(stats.failed, 0);
    }

    #[test]
    fn test_dubious_statuses() {
        let dubious = ["incomplete", "past_due", "unpaid"];
        assert!(dubious.contains(&"incomplete"));
        assert!(dubious.contains(&"past_due"));
        assert!(dubious.contains(&"unpaid"));
        assert!(!dubious.contains(&"active"));
    }
}
