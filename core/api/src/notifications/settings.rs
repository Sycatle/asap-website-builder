//! Notification settings CRUD.

use axum::{extract::State, http::StatusCode, Extension, Json};
use sqlx::PgPool;

use crate::Claims;

use super::{get_account_id, NotificationSettings};

/// Get notification settings
pub async fn get_notification_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<NotificationSettings>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let settings = sqlx::query!(
        r#"
        SELECT push_enabled, email_enabled, enabled_categories, 
               quiet_hours_start, quiet_hours_end
        FROM notification_settings
        WHERE account_id = $1
        "#,
        account_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notification settings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match settings {
        Some(row) => Ok(Json(NotificationSettings {
            push_enabled: row.push_enabled,
            email_enabled: row.email_enabled,
            enabled_categories: serde_json::from_value(row.enabled_categories).unwrap_or_default(),
            quiet_hours_start: row.quiet_hours_start,
            quiet_hours_end: row.quiet_hours_end,
        })),
        None => Ok(Json(NotificationSettings::default())),
    }
}

/// Update notification settings
pub async fn update_notification_settings(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(settings): Json<NotificationSettings>,
) -> Result<Json<NotificationSettings>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let categories_json =
        serde_json::to_value(&settings.enabled_categories).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        r#"
        INSERT INTO notification_settings (
            account_id, push_enabled, email_enabled, enabled_categories,
            quiet_hours_start, quiet_hours_end
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (account_id) DO UPDATE SET
            push_enabled = EXCLUDED.push_enabled,
            email_enabled = EXCLUDED.email_enabled,
            enabled_categories = EXCLUDED.enabled_categories,
            quiet_hours_start = EXCLUDED.quiet_hours_start,
            quiet_hours_end = EXCLUDED.quiet_hours_end,
            updated_at = NOW()
        "#,
        account_id,
        settings.push_enabled,
        settings.email_enabled,
        categories_json,
        settings.quiet_hours_start,
        settings.quiet_hours_end
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update notification settings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(settings))
}
