//! List / get / mark-as-read / delete handlers.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::Claims;
use asap_core_shared::SharedWsBroadcaster;

use super::{
    get_account_id, get_unread_count_for_account, MarkReadRequest, MarkReadResponse, Notification,
    NotificationFilters, NotificationListResponse, UnreadCountResponse,
};

/// List notifications for the authenticated user
pub async fn list_notifications(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(filters): Query<NotificationFilters>,
) -> Result<Json<NotificationListResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let limit = filters.limit.unwrap_or(50).min(100);
    let offset = filters.offset.unwrap_or(0);

    let notifications = sqlx::query_as!(
        Notification,
        r#"
        SELECT 
            id, account_id, title, message, notification_type,
            category, priority, read, action_url, icon, 
            metadata, created_at, read_at
        FROM notifications
        WHERE account_id = $1
            AND ($2::TEXT IS NULL OR category = $2)
            AND ($3::BOOLEAN IS NULL OR read = $3)
            AND ($4::TEXT IS NULL OR priority = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
        account_id,
        filters.category,
        filters.read,
        filters.priority,
        limit,
        offset
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notifications: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Get total count with same filters
    let total: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)::BIGINT
        FROM notifications
        WHERE account_id = $1
            AND ($2::TEXT IS NULL OR category = $2)
            AND ($3::BOOLEAN IS NULL OR read = $3)
            AND ($4::TEXT IS NULL OR priority = $4)
        "#,
    )
    .bind(account_id)
    .bind(&filters.category)
    .bind(filters.read)
    .bind(&filters.priority)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let unread = get_unread_count_for_account(&pool, account_id).await?;

    Ok(Json(NotificationListResponse {
        notifications,
        total: total.0,
        unread_count: unread,
    }))
}

/// Get unread notification count
pub async fn get_unread_count(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<UnreadCountResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let count = get_unread_count_for_account(&pool, account_id).await?;
    Ok(Json(UnreadCountResponse { count }))
}

/// Get a single notification
pub async fn get_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(notification_id): Path<Uuid>,
) -> Result<Json<Notification>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let notification = sqlx::query_as!(
        Notification,
        r#"
        SELECT 
            id, account_id, title, message, notification_type,
            category, priority, read, action_url, icon, 
            metadata, created_at, read_at
        FROM notifications
        WHERE id = $1 AND account_id = $2
        "#,
        notification_id,
        account_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch notification: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match notification {
        Some(n) => Ok(Json(n)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// Mark notifications as read
pub async fn mark_as_read(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Json<MarkReadResponse>, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let now = Utc::now();

    let (updated, notification_ids) = if req.all.unwrap_or(false) {
        // Mark all as read
        let result = sqlx::query!(
            r#"
            UPDATE notifications 
            SET read = true, read_at = $1
            WHERE account_id = $2 AND read = false
            "#,
            now,
            account_id
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to mark all as read: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        (result.rows_affected() as i64, None)
    } else if let Some(ids) = req.notification_ids {
        // Mark specific notifications as read
        let result = sqlx::query!(
            r#"
            UPDATE notifications 
            SET read = true, read_at = $1
            WHERE account_id = $2 AND id = ANY($3) AND read = false
            "#,
            now,
            account_id,
            &ids
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to mark notifications as read: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let ids_as_strings: Vec<String> = ids.iter().map(|id| id.to_string()).collect();
        (result.rows_affected() as i64, Some(ids_as_strings))
    } else {
        return Err(StatusCode::BAD_REQUEST);
    };

    // Broadcast via WebSocket if any were updated
    if updated > 0 {
        if let Ok(unread_count) = get_unread_count_for_account(&pool, account_id).await {
            if let Some(ids) = notification_ids {
                (*ws_broadcaster).notify_batch_read(&account_id.to_string(), &ids, unread_count);
            } else {
                // All marked as read - just send count update
                (*ws_broadcaster).notify_unread_count(&account_id.to_string(), unread_count);
            }
        }
    }

    Ok(Json(MarkReadResponse { updated }))
}

/// Mark a single notification as read
pub async fn mark_notification_read(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(notification_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;
    let result = sqlx::query!(
        r#"
        UPDATE notifications 
        SET read = true, read_at = $1
        WHERE id = $2 AND account_id = $3 AND read = false
        "#,
        Utc::now(),
        notification_id,
        account_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to mark notification as read: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        // Get updated unread count and broadcast via WebSocket
        if let Ok(unread_count) = get_unread_count_for_account(&pool, account_id).await {
            (*ws_broadcaster).notify_notification_read(
                &account_id.to_string(),
                &notification_id.to_string(),
                unread_count,
            );
        }
        Ok(StatusCode::OK)
    } else {
        Ok(StatusCode::NOT_MODIFIED)
    }
}

/// Delete a notification
pub async fn delete_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(ws_broadcaster): Extension<SharedWsBroadcaster>,
    Path(notification_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let account_id = get_account_id(&claims)?;

    let result = sqlx::query!(
        "DELETE FROM notifications WHERE id = $1 AND account_id = $2",
        notification_id,
        account_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to delete notification: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() > 0 {
        // Broadcast deletion via WebSocket
        if let Ok(unread_count) = get_unread_count_for_account(&pool, account_id).await {
            (*ws_broadcaster).notify_notification_deleted(
                &account_id.to_string(),
                &notification_id.to_string(),
                unread_count,
            );
        }
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}
