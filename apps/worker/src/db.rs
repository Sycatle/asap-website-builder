use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await?;

    tracing::info!("Database connection pool created successfully");

    Ok(pool)
}

pub async fn health_check(pool: &PgPool) -> anyhow::Result<()> {
    sqlx::query("SELECT 1").fetch_one(pool).await?;

    Ok(())
}
