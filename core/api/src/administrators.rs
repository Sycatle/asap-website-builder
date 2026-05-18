//! Website Administrators API Handlers
//!
//! Provides endpoints for managing website administrators:
//! - List administrators
//! - Invite new administrators
//! - Update permissions/role
//! - Revoke access
//! - Resend invitation

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::{error, info};
use uuid::Uuid;

use asap_core_notifications::{AdminInvitationEmail, SharedEmailProvider};
use asap_core_shared::Claims;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
pub struct AdministratorResponse {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub permissions: serde_json::Value,
    pub status: String,
    pub invited_at: String,
    pub accepted_at: Option<String>,
    pub last_access_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdministratorsListResponse {
    pub administrators: Vec<AdministratorResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct InviteAdministratorRequest {
    pub email: String,
    pub role: String,
    #[serde(default)]
    pub custom_permissions: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAdministratorRequest {
    pub role: Option<String>,
    pub permissions: Option<serde_json::Value>,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Check if the current user has permission to manage administrators
async fn check_admin_permission(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    required_permission: &str,
) -> Result<bool, (StatusCode, Json<serde_json::Value>)> {
    let admin = sqlx::query!(
        r#"
        SELECT permissions
        FROM website_administrators
        WHERE website_id = $1 AND account_id = $2 AND status = 'active'
        "#,
        website_id,
        account_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        error!("Database error checking permissions: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let Some(admin) = admin else {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "You are not an administrator of this website"})),
        ));
    };

    // Parse permissions and check the required one
    let has_permission = admin
        .permissions
        .pointer(&format!("/administrators/{}", required_permission))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Ok(has_permission)
}

/// Get default permissions for a role
fn get_role_permissions(role: &str) -> serde_json::Value {
    match role {
        "owner" => serde_json::json!({
            "website": {"edit_settings": true, "publish": true, "delete": true},
            "content": {"create": true, "edit": true, "delete": true},
            "extensions": {"manage": true, "configure": true},
            "administrators": {"view": true, "invite": true, "remove": true}
        }),
        "admin" => serde_json::json!({
            "website": {"edit_settings": true, "publish": true, "delete": false},
            "content": {"create": true, "edit": true, "delete": true},
            "extensions": {"manage": true, "configure": true},
            "administrators": {"view": true, "invite": true, "remove": false}
        }),
        "editor" => serde_json::json!({
            "website": {"edit_settings": false, "publish": false, "delete": false},
            "content": {"create": true, "edit": true, "delete": false},
            "extensions": {"manage": false, "configure": false},
            "administrators": {"view": true, "invite": false, "remove": false}
        }),
        _ => serde_json::json!({
            "website": {"edit_settings": false, "publish": false, "delete": false},
            "content": {"create": false, "edit": false, "delete": false},
            "extensions": {"manage": false, "configure": false},
            "administrators": {"view": true, "invite": false, "remove": false}
        }),
    }
}

// ============================================================================
// Handlers
// ============================================================================

/// List all administrators for a website
pub async fn list_administrators(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(website_id): Path<Uuid>,
) -> Result<Json<AdministratorsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
    })?;

    // Check if user has view permission
    let has_view = check_admin_permission(&pool, website_id, account_id, "view").await?;
    if !has_view {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "You don't have permission to view administrators"})),
        ));
    }

    let administrators = sqlx::query!(
        r#"
        SELECT 
            id, email, role, permissions, status,
            invited_at, accepted_at, last_access_at
        FROM website_administrators
        WHERE website_id = $1
        ORDER BY 
            CASE role 
                WHEN 'owner' THEN 0 
                WHEN 'admin' THEN 1 
                WHEN 'editor' THEN 2 
                ELSE 3 
            END,
            invited_at ASC
        "#,
        website_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("Database error listing administrators: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let total = administrators.len() as i64;
    let admins: Vec<AdministratorResponse> = administrators
        .into_iter()
        .map(|a| AdministratorResponse {
            id: a.id,
            email: a.email,
            role: a.role,
            permissions: a.permissions,
            status: a.status,
            invited_at: a.invited_at.to_rfc3339(),
            accepted_at: a.accepted_at.map(|d| d.to_rfc3339()),
            last_access_at: a.last_access_at.map(|d| d.to_rfc3339()),
        })
        .collect();

    Ok(Json(AdministratorsListResponse {
        administrators: admins,
        total,
    }))
}

/// Invite a new administrator
pub async fn invite_administrator(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Extension(email): Extension<SharedEmailProvider>,
    Path(website_id): Path<Uuid>,
    Json(request): Json<InviteAdministratorRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
    })?;

    // Validate email format
    if !request.email.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid email format"})),
        ));
    }

    // Validate role
    let valid_roles = ["admin", "editor", "viewer"];
    if !valid_roles.contains(&request.role.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid role. Must be: admin, editor, or viewer"})),
        ));
    }

    // Check if user has invite permission
    let has_invite = check_admin_permission(&pool, website_id, account_id, "invite").await?;
    if !has_invite {
        return Err((
            StatusCode::FORBIDDEN,
            Json(
                serde_json::json!({"error": "You don't have permission to invite administrators"}),
            ),
        ));
    }

    // Check if email is already an administrator
    let existing = sqlx::query!(
        "SELECT id, status FROM website_administrators WHERE website_id = $1 AND email = $2",
        website_id,
        request.email
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("Database error checking existing admin: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    if let Some(existing) = existing {
        if existing.status == "active" || existing.status == "pending" {
            return Err((
                StatusCode::CONFLICT,
                Json(
                    serde_json::json!({"error": "This email is already an administrator or has a pending invitation"}),
                ),
            ));
        }

        // If revoked, reactivate instead of creating a new entry
        if existing.status == "revoked" {
            // Check if user already exists in the system
            let existing_user =
                sqlx::query!("SELECT id FROM accounts WHERE email = $1", request.email)
                    .fetch_optional(&pool)
                    .await
                    .map_err(|e| {
                        error!("Database error checking user: {}", e);
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(serde_json::json!({"error": "Database error"})),
                        )
                    })?;

            // Get permissions (custom or default for role)
            let permissions = request
                .custom_permissions
                .unwrap_or_else(|| get_role_permissions(&request.role));

            // If user already has an account, activate immediately. Otherwise, pending.
            let new_status = if existing_user.is_some() {
                "active"
            } else {
                "pending"
            };

            // Update the existing administrator
            let admin = sqlx::query!(
                r#"
                UPDATE website_administrators 
                SET role = $1, 
                    permissions = $2, 
                    status = $3,
                    account_id = $4,
                    invitation_token = $5,
                    accepted_at = CASE WHEN $3 = 'active' THEN now() ELSE NULL END,
                    updated_at = now()
                WHERE id = $6
                RETURNING id, email, role, status, invited_at
                "#,
                request.role,
                permissions,
                new_status,
                existing_user.map(|u| u.id),
                Uuid::new_v4(),
                existing.id
            )
            .fetch_one(&pool)
            .await
            .map_err(|e| {
                error!("Database error reactivating admin: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Failed to reactivate administrator"})),
                )
            })?;

            info!(
                "Administrator reactivated: {} to website {}",
                request.email, website_id
            );

            let message = if new_status == "active" {
                "Administrator reactivated successfully (user already has an account)"
            } else {
                "Administrator reactivated, invitation sent"
            };

            return Ok(Json(serde_json::json!({
                "success": true,
                "administrator": {
                    "id": admin.id,
                    "email": admin.email,
                    "role": admin.role,
                    "status": admin.status,
                    "invited_at": admin.invited_at.to_rfc3339()
                },
                "message": message
            })));
        }
    }

    // Get permissions (custom or default for role)
    let permissions = request
        .custom_permissions
        .unwrap_or_else(|| get_role_permissions(&request.role));

    // Check if user already exists in the system
    let existing_user = sqlx::query!("SELECT id FROM accounts WHERE email = $1", request.email)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            error!("Database error checking user: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let invitation_token = Uuid::new_v4();

    // If user already has an account, activate immediately. Otherwise, pending.
    let status = if existing_user.is_some() {
        "active"
    } else {
        "pending"
    };

    // Insert the new administrator
    let admin = sqlx::query!(
        r#"
        INSERT INTO website_administrators 
            (website_id, account_id, email, role, permissions, status, invited_by, invitation_token, accepted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $6 = 'active' THEN now() ELSE NULL END)
        RETURNING id, email, role, status, invited_at
        "#,
        website_id,
        existing_user.map(|u| u.id),
        request.email,
        request.role,
        permissions,
        status,
        account_id,
        invitation_token
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        error!("Database error creating admin: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create invitation"})),
        )
    })?;

    // Log the action
    sqlx::query!(
        r#"
        INSERT INTO administrator_audit_log (website_id, administrator_id, actor_id, action, details)
        VALUES ($1, $2, $3, 'invited', $4)
        "#,
        website_id,
        admin.id,
        account_id,
        serde_json::json!({
            "email": request.email,
            "role": request.role
        })
    )
    .execute(&pool)
    .await
    .ok();

    info!(
        "Administrator invited: {} to website {}",
        request.email, website_id
    );

    // Send invitation email (best-effort: log failures, don't fail the request).
    // Use runtime sqlx::query to avoid bloating the offline cache for cosmetic lookups.
    if status == "pending" {
        let website_name: String =
            sqlx::query_scalar::<_, String>("SELECT name FROM websites WHERE id = $1")
                .bind(website_id)
                .fetch_optional(&pool)
                .await
                .ok()
                .flatten()
                .unwrap_or_else(|| "your site".to_string());

        let inviter_email: String =
            sqlx::query_scalar::<_, String>("SELECT email FROM accounts WHERE id = $1")
                .bind(account_id)
                .fetch_optional(&pool)
                .await
                .ok()
                .flatten()
                .unwrap_or_else(|| "An administrator".to_string());

        let accept_url = format!(
            "{}/admin-invite?token={}",
            crate::helpers::frontend_url(),
            invitation_token
        );
        let from =
            std::env::var("EMAIL_FROM").unwrap_or_else(|_| "ASAP <noreply@asap.cool>".into());
        let app_name = std::env::var("APP_NAME").unwrap_or_else(|_| "ASAP".into());
        let message = AdminInvitationEmail {
            to: &request.email,
            inviter_email: &inviter_email,
            website_name: &website_name,
            accept_url: &accept_url,
            app_name: &app_name,
        }
        .render(from);

        if let Err(e) = email.send(message).await {
            error!(error = %e, "failed to send admin invitation email");
        }
    }

    let message = if status == "active" {
        "Administrator added successfully (user already has an account)"
    } else {
        "Invitation sent successfully"
    };

    Ok(Json(serde_json::json!({
        "success": true,
        "administrator": {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role,
            "status": admin.status,
            "invited_at": admin.invited_at.to_rfc3339()
        },
        "message": message
    })))
}

/// Update an administrator's role or permissions
pub async fn update_administrator(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, admin_id)): Path<(Uuid, Uuid)>,
    Json(request): Json<UpdateAdministratorRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
    })?;

    // Check if user has invite permission (same as modify)
    let has_permission = check_admin_permission(&pool, website_id, account_id, "invite").await?;
    if !has_permission {
        return Err((
            StatusCode::FORBIDDEN,
            Json(
                serde_json::json!({"error": "You don't have permission to modify administrators"}),
            ),
        ));
    }

    // Get the target administrator
    let target = sqlx::query!(
        "SELECT role, email FROM website_administrators WHERE id = $1 AND website_id = $2",
        admin_id,
        website_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Administrator not found"})),
        )
    })?;

    // Cannot modify owner
    if target.role == "owner" {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Cannot modify the owner's permissions"})),
        ));
    }

    // Validate new role if provided
    if let Some(ref role) = request.role {
        let valid_roles = ["admin", "editor", "viewer"];
        if !valid_roles.contains(&role.as_str()) {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid role"})),
            ));
        }
    }

    // Update the administrator
    let new_role = request.role.as_ref().unwrap_or(&target.role);
    let new_permissions = request
        .permissions
        .clone()
        .unwrap_or_else(|| get_role_permissions(new_role));

    sqlx::query!(
        r#"
        UPDATE website_administrators 
        SET role = $1, permissions = $2, updated_at = now()
        WHERE id = $3
        "#,
        new_role,
        new_permissions,
        admin_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        error!("Database error updating admin: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to update administrator"})),
        )
    })?;

    // Log the action
    sqlx::query!(
        r#"
        INSERT INTO administrator_audit_log (website_id, administrator_id, actor_id, action, details)
        VALUES ($1, $2, $3, 'permissions_changed', $4)
        "#,
        website_id,
        admin_id,
        account_id,
        serde_json::json!({
            "email": target.email,
            "new_role": new_role,
            "new_permissions": new_permissions
        })
    )
    .execute(&pool)
    .await
    .ok();

    info!(
        "Administrator {} updated in website {}",
        admin_id, website_id
    );

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Administrator updated successfully"
    })))
}

/// Remove (revoke) an administrator
pub async fn remove_administrator(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, admin_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
    })?;

    // Check if user has remove permission
    let has_remove = check_admin_permission(&pool, website_id, account_id, "remove").await?;
    if !has_remove {
        return Err((
            StatusCode::FORBIDDEN,
            Json(
                serde_json::json!({"error": "You don't have permission to remove administrators"}),
            ),
        ));
    }

    // Get the target administrator
    let target = sqlx::query!(
        "SELECT role, email FROM website_administrators WHERE id = $1 AND website_id = $2",
        admin_id,
        website_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Administrator not found"})),
        )
    })?;

    // Cannot remove owner
    if target.role == "owner" {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Cannot remove the owner"})),
        ));
    }

    // Cannot remove self
    let is_self = sqlx::query!(
        "SELECT 1 as one FROM website_administrators WHERE id = $1 AND account_id = $2",
        admin_id,
        account_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    if is_self.is_some() {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "You cannot remove yourself"})),
        ));
    }

    // Update status to revoked (soft delete)
    sqlx::query!(
        "UPDATE website_administrators SET status = 'revoked', updated_at = now() WHERE id = $1",
        admin_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        error!("Database error removing admin: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to remove administrator"})),
        )
    })?;

    // Log the action
    sqlx::query!(
        r#"
        INSERT INTO administrator_audit_log (website_id, administrator_id, actor_id, action, details)
        VALUES ($1, $2, $3, 'revoked', $4)
        "#,
        website_id,
        admin_id,
        account_id,
        serde_json::json!({ "email": target.email })
    )
    .execute(&pool)
    .await
    .ok();

    info!(
        "Administrator {} removed from website {}",
        admin_id, website_id
    );

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Administrator removed successfully"
    })))
}

/// Resend invitation to a pending administrator
pub async fn resend_invitation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((website_id, admin_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let account_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
    })?;

    // Check if user has invite permission
    let has_invite = check_admin_permission(&pool, website_id, account_id, "invite").await?;
    if !has_invite {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "You don't have permission to send invitations"})),
        ));
    }

    // Get the administrator
    let admin = sqlx::query!(
        "SELECT email, status FROM website_administrators WHERE id = $1 AND website_id = $2",
        admin_id,
        website_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Administrator not found"})),
        )
    })?;

    if admin.status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(
                serde_json::json!({"error": "Can only resend invitations to pending administrators"}),
            ),
        ));
    }

    // Generate new token
    let new_token = Uuid::new_v4();
    sqlx::query!(
        "UPDATE website_administrators SET invitation_token = $1, updated_at = now() WHERE id = $2",
        new_token,
        admin_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to regenerate invitation"})),
        )
    })?;

    info!(
        "Invitation resent to {} for website {}",
        admin.email, website_id
    );

    // TODO: Send invitation email via notification system

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Invitation resent successfully"
    })))
}
