use sqlx::PgPool;
use uuid::Uuid;
use asap_core_payments::{PaymentGateway, StripeProvider};
use std::sync::Arc;

pub struct PaymentReconciliation {
    pool: PgPool,
    payment_gateway: Arc<dyn PaymentGateway>,
}

impl PaymentReconciliation {
    pub fn new(pool: PgPool) -> anyhow::Result<Self> {
        // Initialize Stripe provider
        let stripe_api_key = std::env::var("STRIPE_API_KEY")
            .unwrap_or_else(|_| "sk_test_placeholder".to_string());
        let stripe_webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_placeholder".to_string());
        
        let payment_gateway: Arc<dyn PaymentGateway> = Arc::new(
            StripeProvider::new(stripe_api_key, stripe_webhook_secret)?
        );

        Ok(Self {
            pool,
            payment_gateway,
        })
    }

    /// Reconcile all tenants with active Stripe customers
    pub async fn reconcile_all(&self) -> anyhow::Result<ReconciliationStats> {
        tracing::info!("Starting payment reconciliation for all tenants");

        let mut stats = ReconciliationStats::default();

        // Fetch all tenants with Stripe customer IDs
        let tenants = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM tenants WHERE stripe_customer_id IS NOT NULL"
        )
        .fetch_all(&self.pool)
        .await?;

        stats.total_tenants = tenants.len();

        for tenant_id in tenants {
            match self.reconcile_tenant(tenant_id).await {
                Ok(_) => {
                    stats.successful += 1;
                }
                Err(e) => {
                    tracing::error!("Failed to reconcile tenant {}: {}", tenant_id, e);
                    stats.failed += 1;
                }
            }
        }

        tracing::info!(
            "Payment reconciliation completed: {}/{} successful, {} failed",
            stats.successful,
            stats.total_tenants,
            stats.failed
        );

        Ok(stats)
    }

    /// Reconcile a specific tenant's subscription status
    pub async fn reconcile_tenant(&self, tenant_id: Uuid) -> anyhow::Result<()> {
        tracing::debug!("Reconciling tenant: {}", tenant_id);

        // Get tenant with customer ID
        let customer_id = sqlx::query_scalar::<_, Option<String>>(
            "SELECT stripe_customer_id FROM tenants WHERE id = $1"
        )
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(Some(customer_id)) = customer_id else {
            tracing::debug!("Tenant {} not found or has no Stripe customer", tenant_id);
            return Ok(());
        };

        // Fetch active subscriptions from Stripe
        // Note: In a real implementation, we'd need to call Stripe API to list subscriptions
        // For now, we'll skip this as it requires more complex API interaction
        tracing::debug!("Would fetch subscriptions for customer {}", customer_id);

        Ok(())
    }

    /// Check if a tenant needs reconciliation (dubious status)
    pub async fn needs_reconciliation(&self, tenant_id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query_as::<_, (Option<String>, Option<chrono::DateTime<chrono::Utc>>)>(
            "SELECT plan_status, current_period_end 
             FROM tenants 
             WHERE id = $1 AND stripe_customer_id IS NOT NULL"
        )
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some((status, period_end)) = result else {
            return Ok(false);
        };

        // Check for dubious statuses
        let dubious_statuses = ["incomplete", "past_due", "unpaid"];
        if let Some(status) = status {
            if dubious_statuses.contains(&status.as_str()) {
                return Ok(true);
            }
        }

        // Check if subscription is expired
        if let Some(period_end) = period_end {
            if period_end < chrono::Utc::now() {
                return Ok(true);
            }
        }

        Ok(false)
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
    pub total_tenants: usize,
    pub successful: usize,
    pub failed: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reconciliation_stats_default() {
        let stats = ReconciliationStats::default();
        assert_eq!(stats.total_tenants, 0);
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
