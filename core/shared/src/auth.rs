use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::config::SharedConfig;
use crate::errors::SharedError;
use crate::refresh_token::ACCESS_TOKEN_LIFETIME_SECS;

pub type Result<T> = std::result::Result<T, SharedError>;

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // account_id
    pub exp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,  // JWT ID for token blacklisting
}

/// Generate a JWT token for an account (legacy, longer expiration)
pub fn generate_token(
    account_id: &str,
    config: &SharedConfig,
) -> Result<String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(config.jwt_expiration_hours))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: account_id.to_string(),
        exp: expiration,
        jti: None,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_ref()),
    )
    .map_err(SharedError::from)
}

/// Generate a short-lived JWT access token with JTI for revocation support
pub fn generate_token_with_jti(
    account_id: &str,
    jti: &str,
    config: &SharedConfig,
) -> Result<String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::seconds(ACCESS_TOKEN_LIFETIME_SECS))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: account_id.to_string(),
        exp: expiration,
        jti: Some(jti.to_string()),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_ref()),
    )
    .map_err(SharedError::from)
}

/// Validate and decode a JWT token
pub fn validate_token(
    token: &str,
    config: &SharedConfig,
) -> Result<Claims> {
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
        let account_id = "account-123";

        let token = generate_token(account_id, &config).unwrap();

        // Token should not be empty
        assert!(!token.is_empty());
        // JWT tokens have 3 parts separated by dots
        assert_eq!(token.split('.').count(), 3);
    }

    #[test]
    fn test_generate_token_different_accounts() {
        let config = SharedConfig::default();
        let account1_token = generate_token("account1", &config).unwrap();
        let account2_token = generate_token("account2", &config).unwrap();

        // Different accounts should have different tokens
        assert_ne!(account1_token, account2_token);
    }

    #[test]
    fn test_validate_token() {
        let config = SharedConfig::default();
        let account_id = "account-123";

        let token = generate_token(account_id, &config).unwrap();
        let claims = validate_token(&token, &config).unwrap();

        assert_eq!(claims.sub, account_id);
    }

    #[test]
    fn test_validate_invalid_token() {
        let config = SharedConfig::default();
        let result = validate_token("invalid.token.here", &config);

        assert!(result.is_err());
    }

    #[test]
    fn test_claims_structure() {
        let account_id = "test-account";
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: account_id.to_string(),
            exp: expiration,
            jti: None,
        };

        assert_eq!(claims.sub, account_id);
        assert!(claims.exp > Utc::now().timestamp());
    }

    #[test]
    fn test_generate_token_with_jti() {
        let config = SharedConfig::default();
        let account_id = "account-123";
        let jti = "unique-token-id";

        let token = generate_token_with_jti(account_id, jti, &config).unwrap();
        let claims = validate_token(&token, &config).unwrap();

        assert_eq!(claims.sub, account_id);
        assert_eq!(claims.jti, Some(jti.to_string()));
    }

    #[test]
    fn test_short_lived_token_expiration() {
        let config = SharedConfig::default();
        let account_id = "account-123";
        let jti = "unique-token-id";

        let token = generate_token_with_jti(account_id, jti, &config).unwrap();
        let claims = validate_token(&token, &config).unwrap();

        // Short-lived token should expire within ACCESS_TOKEN_LIFETIME_SECS
        let max_exp = Utc::now().timestamp() + ACCESS_TOKEN_LIFETIME_SECS + 5; // 5s buffer
        assert!(claims.exp <= max_exp);
    }
}
