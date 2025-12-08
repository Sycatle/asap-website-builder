use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::config::SharedConfig;

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // user_id
    pub tenant_id: String,
    pub exp: i64,
}

/// Generate a JWT token for a user
pub fn generate_token(
    user_id: &str,
    tenant_id: &str,
    config: &SharedConfig,
) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(config.jwt_expiration_hours))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_string(),
        tenant_id: tenant_id.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_ref()),
    )
}

/// Validate and decode a JWT token
pub fn validate_token(
    token: &str,
    config: &SharedConfig,
) -> Result<Claims, jsonwebtoken::errors::Error> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_ref()),
        &Validation::default(),
    )?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_token() {
        let config = SharedConfig::default();
        let user_id = "user-123";
        let tenant_id = "tenant-456";

        let token = generate_token(user_id, tenant_id, &config).unwrap();

        // Token should not be empty
        assert!(!token.is_empty());
        // JWT tokens have 3 parts separated by dots
        assert_eq!(token.split('.').count(), 3);
    }

    #[test]
    fn test_generate_token_different_users() {
        let config = SharedConfig::default();
        let user1_token = generate_token("user1", "tenant1", &config).unwrap();
        let user2_token = generate_token("user2", "tenant2", &config).unwrap();

        // Different users should have different tokens
        assert_ne!(user1_token, user2_token);
    }

    #[test]
    fn test_validate_token() {
        let config = SharedConfig::default();
        let user_id = "user-123";
        let tenant_id = "tenant-456";

        let token = generate_token(user_id, tenant_id, &config).unwrap();
        let claims = validate_token(&token, &config).unwrap();

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.tenant_id, tenant_id);
    }

    #[test]
    fn test_validate_invalid_token() {
        let config = SharedConfig::default();
        let result = validate_token("invalid.token.here", &config);

        assert!(result.is_err());
    }

    #[test]
    fn test_claims_structure() {
        let user_id = "test-user";
        let tenant_id = "test-tenant";
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_string(),
            tenant_id: tenant_id.to_string(),
            exp: expiration,
        };

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.tenant_id, tenant_id);
        assert!(claims.exp > Utc::now().timestamp());
    }
}
