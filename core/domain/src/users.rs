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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let email = "test@example.com".to_string();
        let password_hash = "hash123".to_string();

        let user = User {
            id,
            email: email.clone(),
            password_hash: password_hash.clone(),
            tenant_id,
            created_at: Utc::now(),
        };

        assert_eq!(user.id, id);
        assert_eq!(user.email, email);
        assert_eq!(user.password_hash, password_hash);
        assert_eq!(user.tenant_id, tenant_id);
    }

    #[test]
    fn test_user_clone() {
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash123".to_string(),
            tenant_id: Uuid::new_v4(),
            created_at: Utc::now(),
        };

        let cloned = user.clone();
        assert_eq!(user.id, cloned.id);
        assert_eq!(user.email, cloned.email);
    }

    #[test]
    fn test_tenant_creation() {
        let id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();
        let slug = "my-workspace".to_string();
        let plan = "pro".to_string();

        let tenant = Tenant {
            id,
            owner_id,
            slug: slug.clone(),
            plan: plan.clone(),
            created_at: Utc::now(),
        };

        assert_eq!(tenant.id, id);
        assert_eq!(tenant.owner_id, owner_id);
        assert_eq!(tenant.slug, slug);
        assert_eq!(tenant.plan, plan);
    }

    #[test]
    fn test_user_data_creation() {
        let user_id = Uuid::new_v4();
        let user_data = UserData::new(user_id);

        assert_eq!(user_data.user_id, user_id);
        assert_eq!(user_data.data, serde_json::json!({}));
    }

    #[test]
    fn test_user_data_serialization() {
        let user_id = Uuid::new_v4();
        let mut user_data = UserData::new(user_id);
        user_data.data = serde_json::json!({
            "name": "John Doe",
            "bio": "Software Developer"
        });

        let serialized = serde_json::to_string(&user_data).unwrap();
        let deserialized: UserData = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.user_id, user_id);
        assert_eq!(deserialized.data["name"], "John Doe");
    }
}
