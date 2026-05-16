//! Refresh token management for JWT rotation and secure logout
//!
//! This module provides:
//! - Refresh token generation with rotation support
//! - Token family tracking for stolen token detection
//! - Secure token hashing and validation

use chrono::Utc;
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;

use crate::errors::SharedError;

pub type Result<T> = std::result::Result<T, SharedError>;

type HmacSha256 = Hmac<Sha256>;

/// Refresh token lifetime in seconds (7 days) - for "remember me"
pub const REFRESH_TOKEN_LIFETIME_SECS: i64 = 7 * 24 * 60 * 60;

/// Short refresh token lifetime in seconds (24 hours) - for normal sessions
pub const REFRESH_TOKEN_SHORT_LIFETIME_SECS: i64 = 24 * 60 * 60;

/// Access token lifetime in seconds (15 minutes for security)
pub const ACCESS_TOKEN_LIFETIME_SECS: i64 = 15 * 60;

/// Refresh token structure
#[derive(Debug, Clone)]
pub struct RefreshToken {
    /// Raw token (only known at generation time)
    pub token: String,
    /// Token hash for storage
    pub token_hash: String,
    /// Family ID for rotation tracking
    pub family_id: String,
    /// Expiration timestamp
    pub expires_at: i64,
}

/// Generate a new refresh token
///
/// Returns a cryptographically secure token and its hash.
/// The raw token is sent to the client, the hash is stored in the database.
///
/// # Arguments
/// * `secret` - The HMAC secret for signing
/// * `family_id` - Optional family ID for token rotation (pass None for new family)
/// * `remember_me` - If true, uses 7-day lifetime; if false, uses 24-hour lifetime
pub fn generate_refresh_token(
    secret: &str,
    family_id: Option<&str>,
    remember_me: bool,
) -> Result<RefreshToken> {
    // Generate 32 random bytes using OS entropy for security
    let mut random_bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random_bytes);

    // Create timestamp
    let timestamp = Utc::now().timestamp();
    // Use longer lifetime for "remember me", shorter for normal sessions
    let lifetime = if remember_me {
        REFRESH_TOKEN_LIFETIME_SECS
    } else {
        REFRESH_TOKEN_SHORT_LIFETIME_SECS
    };
    let expires_at = timestamp + lifetime;

    // Use provided family_id or generate new one
    let family = family_id
        .map(|f| f.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Combine: timestamp (8 bytes) + family_id (36 bytes) + random (32 bytes)
    let mut data = Vec::with_capacity(76);
    data.extend_from_slice(&timestamp.to_be_bytes());
    data.extend_from_slice(family.as_bytes());
    data.extend_from_slice(&random_bytes);

    // Sign the data with HMAC-SHA256
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::InternalError(format!("HMAC key error: {}", e)))?;
    mac.update(&data);
    let signature = mac.finalize().into_bytes();

    // Combine data + signature and encode as base64
    let mut token_bytes = data;
    token_bytes.extend_from_slice(&signature);
    let token = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        &token_bytes,
    );

    // Hash the token for storage
    let token_hash = hash_refresh_token(&token);

    Ok(RefreshToken {
        token,
        token_hash,
        family_id: family,
        expires_at,
    })
}

/// Hash a refresh token for secure storage
///
/// Uses SHA-256 to create a hash that can be stored in the database.
/// This prevents token exposure if the database is compromised.
pub fn hash_refresh_token(token: &str) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(token.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Validate a refresh token's signature and expiration
///
/// Returns the family_id if valid, or an error if invalid/expired.
pub fn validate_refresh_token(token: &str, secret: &str) -> Result<ValidatedRefreshToken> {
    // Decode base64
    let token_bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, token)
            .map_err(|_| SharedError::InvalidToken("Invalid token format".to_string()))?;

    // Token should be: timestamp (8) + family_id (36) + random (32) + signature (32) = 108 bytes
    if token_bytes.len() < 108 {
        return Err(SharedError::InvalidToken("Token too short".to_string()));
    }

    let data = &token_bytes[..76];
    let signature = &token_bytes[76..];

    // Verify HMAC signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::InternalError(format!("HMAC key error: {}", e)))?;
    mac.update(data);
    mac.verify_slice(signature)
        .map_err(|_| SharedError::InvalidToken("Invalid signature".to_string()))?;

    // Extract timestamp and check expiration
    let timestamp_bytes: [u8; 8] = data[..8]
        .try_into()
        .map_err(|_| SharedError::InvalidToken("Invalid timestamp in token".to_string()))?;
    let timestamp = i64::from_be_bytes(timestamp_bytes);
    let expires_at = timestamp + REFRESH_TOKEN_LIFETIME_SECS;
    let now = Utc::now().timestamp();

    if now > expires_at {
        return Err(SharedError::InvalidToken("Token expired".to_string()));
    }

    // Extract family_id
    let family_id = String::from_utf8(data[8..44].to_vec())
        .map_err(|_| SharedError::InvalidToken("Invalid family ID".to_string()))?;

    Ok(ValidatedRefreshToken {
        family_id,
        expires_at,
        token_hash: hash_refresh_token(token),
    })
}

/// Result of validating a refresh token
#[derive(Debug, Clone)]
pub struct ValidatedRefreshToken {
    /// Family ID for token rotation tracking
    pub family_id: String,
    /// Token expiration timestamp
    pub expires_at: i64,
    /// Hash of the validated token
    pub token_hash: String,
}

/// Generate a unique JWT ID (jti) for access tokens
///
/// This allows individual access tokens to be blacklisted if needed.
pub fn generate_jti() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-for-refresh-tokens-min-32-bytes";

    #[test]
    fn test_generate_refresh_token() {
        let token = generate_refresh_token(TEST_SECRET, None, false).unwrap();

        assert!(!token.token.is_empty());
        assert!(!token.token_hash.is_empty());
        assert!(!token.family_id.is_empty());
        assert!(token.expires_at > Utc::now().timestamp());
    }

    #[test]
    fn test_generate_with_family_id() {
        let family = "550e8400-e29b-41d4-a716-446655440000";
        let token = generate_refresh_token(TEST_SECRET, Some(family), false).unwrap();

        assert_eq!(token.family_id, family);
    }

    #[test]
    fn test_validate_refresh_token() {
        let token = generate_refresh_token(TEST_SECRET, None, false).unwrap();
        let validated = validate_refresh_token(&token.token, TEST_SECRET).unwrap();

        assert_eq!(validated.family_id, token.family_id);
        assert_eq!(validated.token_hash, token.token_hash);
    }

    #[test]
    fn test_invalid_signature() {
        let token = generate_refresh_token(TEST_SECRET, None, false).unwrap();
        let result = validate_refresh_token(&token.token, "wrong-secret-key-different-32-b");

        assert!(result.is_err());
    }

    #[test]
    fn test_hash_refresh_token() {
        let token = "test-token";
        let hash1 = hash_refresh_token(token);
        let hash2 = hash_refresh_token(token);

        // Same token should produce same hash
        assert_eq!(hash1, hash2);
        // Hash should be 64 chars (SHA-256 in hex)
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_different_tokens_different_hashes() {
        let token1 = generate_refresh_token(TEST_SECRET, None, false).unwrap();
        let token2 = generate_refresh_token(TEST_SECRET, None, true).unwrap();

        assert_ne!(token1.token_hash, token2.token_hash);
    }

    #[test]
    fn test_generate_jti() {
        let jti1 = generate_jti();
        let jti2 = generate_jti();

        assert!(!jti1.is_empty());
        assert_ne!(jti1, jti2);
        // Should be UUID format (36 chars with hyphens)
        assert_eq!(jti1.len(), 36);
    }
}
