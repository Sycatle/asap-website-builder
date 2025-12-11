//! Tenant module queries

use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value as JsonValue;
use chrono::{DateTime, Utc};

use super::types::TenantModuleRow;

/// List modules activated for a tenant
pub async fn list_tenant_modules(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<TenantModuleRow>, Box<dyn std::error::Error + Send + Sync>> {
    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, Option<String>, JsonValue, bool, DateTime<Utc>, Option<String>, i32)>(
        r#"
        SELECT 
            tm.id, tm.tenant_id, tm.module_id, 
            m.name as module_name, m.slug as module_slug, m.icon,
            tm.settings, tm.enabled, tm.activated_at, 
            m.sidebar_label, COALESCE(m.sidebar_order, 100) as sidebar_order
        FROM tenant_modules tm
        JOIN modules m ON tm.module_id = m.id
        WHERE tm.tenant_id = $1
        ORDER BY m.sidebar_order, tm.activated_at
        "#
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(id, tenant_id, module_id, module_name, module_slug, module_icon, settings, enabled, activated_at, sidebar_label, sidebar_order)| {
        TenantModuleRow {
            id,
            tenant_id,
            module_id,
            module_name,
            module_slug,
            module_icon,
            settings,
            enabled,
            activated_at,
            sidebar_label,
            sidebar_order,
        }
    }).collect())
}

/// Activate a module for a tenant
pub async fn activate_tenant_module(
    pool: &PgPool,
    tenant_id: Uuid,
    module_id: Uuid,
    settings: JsonValue,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Verify module exists
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM modules WHERE id = $1 AND enabled = true"
    )
    .bind(module_id)
    .fetch_one(pool)
    .await?;

    if count.0 == 0 {
        return Err("Module not found".into());
    }

    // Insert or update module activation
    sqlx::query(
        r#"
        INSERT INTO tenant_modules (tenant_id, module_id, settings, enabled)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET settings = $3, enabled = true, updated_at = now()
        "#
    )
    .bind(tenant_id)
    .bind(module_id)
    .bind(&settings)
    .execute(pool)
    .await?;

    Ok(())
}

/// Update a tenant module settings
pub async fn update_tenant_module(
    pool: &PgPool,
    tenant_id: Uuid,
    module_id: Uuid,
    settings: &JsonValue,
    enabled: Option<bool>,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    let result = if let Some(en) = enabled {
        sqlx::query(
            "UPDATE tenant_modules SET settings = $1, enabled = $2, updated_at = now() WHERE tenant_id = $3 AND module_id = $4"
        )
        .bind(settings)
        .bind(en)
        .bind(tenant_id)
        .bind(module_id)
        .execute(pool)
        .await?
    } else {
        sqlx::query(
            "UPDATE tenant_modules SET settings = $1, updated_at = now() WHERE tenant_id = $2 AND module_id = $3"
        )
        .bind(settings)
        .bind(tenant_id)
        .bind(module_id)
        .execute(pool)
        .await?
    };

    Ok(result.rows_affected() > 0)
}

/// Get a tenant module by slug
pub async fn get_tenant_module_by_slug(
    pool: &PgPool,
    tenant_id: Uuid,
    module_slug: &str,
) -> Result<Option<TenantModuleRow>, Box<dyn std::error::Error + Send + Sync>> {
    let row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, Option<String>, JsonValue, bool, DateTime<Utc>, Option<String>, i32)>(
        r#"
        SELECT 
            tm.id, tm.tenant_id, tm.module_id, 
            m.name as module_name, m.slug as module_slug, m.icon,
            tm.settings, tm.enabled, tm.activated_at, 
            m.sidebar_label, COALESCE(m.sidebar_order, 100) as sidebar_order
        FROM tenant_modules tm
        JOIN modules m ON tm.module_id = m.id
        WHERE tm.tenant_id = $1 AND m.slug = $2
        "#
    )
    .bind(tenant_id)
    .bind(module_slug)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|(id, tenant_id, module_id, module_name, module_slug, module_icon, settings, enabled, activated_at, sidebar_label, sidebar_order)| {
        TenantModuleRow {
            id,
            tenant_id,
            module_id,
            module_name,
            module_slug,
            module_icon,
            settings,
            enabled,
            activated_at,
            sidebar_label,
            sidebar_order,
        }
    }))
}
