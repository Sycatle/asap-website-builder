use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// User represents a person who can authenticate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

/// Tenant represents an isolated workspace for multi-tenancy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tenant {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub slug: String,
    pub plan: String,
    pub created_at: DateTime<Utc>,
}

/// UserData stores extended user information in JSONB format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserData {
    pub user_id: Uuid,
    pub data: serde_json::Value,
    pub updated_at: DateTime<Utc>,
}

impl UserData {
    pub fn new(user_id: Uuid) -> Self {
        Self {
            user_id,
            data: serde_json::json!({}),
            updated_at: Utc::now(),
        }
    }
}
