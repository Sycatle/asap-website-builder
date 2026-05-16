//! Administrator Domain Models
//!
//! This module defines the domain models for website administrators,
//! including roles, permissions, and invitation status.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Administrator role enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdministratorRole {
    Owner,
    Admin,
    Editor,
    Viewer,
}

impl Default for AdministratorRole {
    fn default() -> Self {
        Self::Viewer
    }
}

impl std::fmt::Display for AdministratorRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Owner => write!(f, "owner"),
            Self::Admin => write!(f, "admin"),
            Self::Editor => write!(f, "editor"),
            Self::Viewer => write!(f, "viewer"),
        }
    }
}

impl std::str::FromStr for AdministratorRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "editor" => Ok(Self::Editor),
            "viewer" => Ok(Self::Viewer),
            _ => Err(format!("Invalid role: {}", s)),
        }
    }
}

/// Administrator invitation status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdministratorStatus {
    Active,
    Pending,
    Revoked,
}

impl Default for AdministratorStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl std::fmt::Display for AdministratorStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Pending => write!(f, "pending"),
            Self::Revoked => write!(f, "revoked"),
        }
    }
}

impl std::str::FromStr for AdministratorStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "pending" => Ok(Self::Pending),
            "revoked" => Ok(Self::Revoked),
            _ => Err(format!("Invalid status: {}", s)),
        }
    }
}

/// Granular permissions for website operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WebsitePermissions {
    pub edit_settings: bool,
    pub publish: bool,
    pub delete: bool,
}

/// Granular permissions for content operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ContentPermissions {
    pub create: bool,
    pub edit: bool,
    pub delete: bool,
}

/// Granular permissions for extension operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionPermissions {
    pub manage: bool,
    pub configure: bool,
}

/// Granular permissions for administrator management
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AdministratorManagementPermissions {
    pub view: bool,
    pub invite: bool,
    pub remove: bool,
}

/// Complete permission set for an administrator
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AdministratorPermissions {
    pub website: WebsitePermissions,
    pub content: ContentPermissions,
    pub extensions: ExtensionPermissions,
    pub administrators: AdministratorManagementPermissions,
}

impl AdministratorPermissions {
    /// Get default permissions for a role
    pub fn for_role(role: &AdministratorRole) -> Self {
        match role {
            AdministratorRole::Owner => Self {
                website: WebsitePermissions {
                    edit_settings: true,
                    publish: true,
                    delete: true,
                },
                content: ContentPermissions {
                    create: true,
                    edit: true,
                    delete: true,
                },
                extensions: ExtensionPermissions {
                    manage: true,
                    configure: true,
                },
                administrators: AdministratorManagementPermissions {
                    view: true,
                    invite: true,
                    remove: true,
                },
            },
            AdministratorRole::Admin => Self {
                website: WebsitePermissions {
                    edit_settings: true,
                    publish: true,
                    delete: false,
                },
                content: ContentPermissions {
                    create: true,
                    edit: true,
                    delete: true,
                },
                extensions: ExtensionPermissions {
                    manage: true,
                    configure: true,
                },
                administrators: AdministratorManagementPermissions {
                    view: true,
                    invite: true,
                    remove: false,
                },
            },
            AdministratorRole::Editor => Self {
                website: WebsitePermissions {
                    edit_settings: false,
                    publish: false,
                    delete: false,
                },
                content: ContentPermissions {
                    create: true,
                    edit: true,
                    delete: false,
                },
                extensions: ExtensionPermissions {
                    manage: false,
                    configure: false,
                },
                administrators: AdministratorManagementPermissions {
                    view: true,
                    invite: false,
                    remove: false,
                },
            },
            AdministratorRole::Viewer => Self {
                website: WebsitePermissions {
                    edit_settings: false,
                    publish: false,
                    delete: false,
                },
                content: ContentPermissions {
                    create: false,
                    edit: false,
                    delete: false,
                },
                extensions: ExtensionPermissions {
                    manage: false,
                    configure: false,
                },
                administrators: AdministratorManagementPermissions {
                    view: true,
                    invite: false,
                    remove: false,
                },
            },
        }
    }
}

/// Website Administrator entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteAdministrator {
    pub id: Uuid,
    pub website_id: Uuid,
    pub account_id: Option<Uuid>,
    pub email: String,
    pub role: AdministratorRole,
    pub permissions: AdministratorPermissions,
    pub status: AdministratorStatus,
    pub invited_by: Option<Uuid>,
    pub invitation_token: Option<Uuid>,
    pub invited_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
    pub last_access_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to invite a new administrator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteAdministratorRequest {
    pub email: String,
    pub role: AdministratorRole,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_permissions: Option<AdministratorPermissions>,
}

/// Request to update an administrator's permissions or role
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAdministratorRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<AdministratorRole>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<AdministratorPermissions>,
}

/// Administrator audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdministratorAuditLog {
    pub id: Uuid,
    pub website_id: Uuid,
    pub administrator_id: Option<Uuid>,
    pub actor_id: Option<Uuid>,
    pub action: String,
    pub details: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_display() {
        assert_eq!(AdministratorRole::Owner.to_string(), "owner");
        assert_eq!(AdministratorRole::Admin.to_string(), "admin");
        assert_eq!(AdministratorRole::Editor.to_string(), "editor");
        assert_eq!(AdministratorRole::Viewer.to_string(), "viewer");
    }

    #[test]
    fn test_role_from_str() {
        assert_eq!(
            "owner".parse::<AdministratorRole>().unwrap(),
            AdministratorRole::Owner
        );
        assert_eq!(
            "ADMIN".parse::<AdministratorRole>().unwrap(),
            AdministratorRole::Admin
        );
        assert!("invalid".parse::<AdministratorRole>().is_err());
    }

    #[test]
    fn test_permissions_for_role() {
        let owner_perms = AdministratorPermissions::for_role(&AdministratorRole::Owner);
        assert!(owner_perms.website.delete);
        assert!(owner_perms.administrators.remove);

        let viewer_perms = AdministratorPermissions::for_role(&AdministratorRole::Viewer);
        assert!(!viewer_perms.website.edit_settings);
        assert!(!viewer_perms.content.create);
        assert!(viewer_perms.administrators.view);
    }
}
