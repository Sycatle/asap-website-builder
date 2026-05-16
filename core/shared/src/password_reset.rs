//! Password Reset Token Generation and Validation
//!
//! Generates secure, stateless tokens for password reset requests.
//! Tokens include timestamp and HMAC signature for validation.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::errors::SharedError;

type HmacSha256 = Hmac<Sha256>;

/// Password reset token lifetime in seconds (1 hour)
pub const PASSWORD_RESET_TOKEN_LIFETIME_SECS: u64 = 3600;

/// Password reset token structure
#[derive(Debug, Clone)]
pub struct PasswordResetToken {
    /// The raw token to send to the user (URL-safe base64)
    pub token: String,
    /// SHA-256 hash of the token for storage in database
    pub token_hash: String,
    /// When the token was created (unix timestamp)
    pub created_at: u64,
    /// When the token expires (unix timestamp)
    pub expires_at: u64,
}

/// Generate a new password reset token
///
/// Returns both the raw token (to send to user) and its hash (to store in DB).
/// The token format is: base64(timestamp:random_bytes:hmac_signature)
pub fn generate_password_reset_token(secret: &str) -> Result<PasswordResetToken, SharedError> {
    // Get current timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| SharedError::AuthError(format!("Time error: {}", e)))?
        .as_secs();

    // Generate random bytes (32 bytes for security) using OS entropy
    let mut random_bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random_bytes);

    // Create message to sign: timestamp + random bytes
    let mut message = timestamp.to_be_bytes().to_vec();
    message.extend_from_slice(&random_bytes);

    // Create HMAC signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::AuthError(format!("HMAC error: {}", e)))?;
    mac.update(&message);
    let signature = mac.finalize().into_bytes();

    // Combine all parts and encode as URL-safe base64
    let mut token_data = message;
    token_data.extend_from_slice(&signature);
    let token = URL_SAFE_NO_PAD.encode(&token_data);

    // Create hash for database storage
    let token_hash = hash_token(&token);

    Ok(PasswordResetToken {
        token,
        token_hash,
        created_at: timestamp,
        expires_at: timestamp + PASSWORD_RESET_TOKEN_LIFETIME_SECS,
    })
}

/// Validate a password reset token
///
/// Checks:
/// 1. Token format is valid
/// 2. HMAC signature is correct
/// 3. Token has not expired
pub fn validate_password_reset_token(token: &str, secret: &str) -> Result<bool, SharedError> {
    // Decode token
    let token_data = URL_SAFE_NO_PAD
        .decode(token)
        .map_err(|_| SharedError::AuthError("Invalid token format".to_string()))?;

    // Token should be: 8 bytes timestamp + 32 bytes random + 32 bytes signature = 72 bytes
    if token_data.len() != 72 {
        return Ok(false);
    }

    // Extract parts
    let timestamp_bytes: [u8; 8] = token_data[0..8]
        .try_into()
        .map_err(|_| SharedError::AuthError("Invalid timestamp".to_string()))?;
    let timestamp = u64::from_be_bytes(timestamp_bytes);
    let message = &token_data[0..40]; // timestamp + random
    let signature = &token_data[40..72];

    // Verify HMAC signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::AuthError(format!("HMAC error: {}", e)))?;
    mac.update(message);

    // Use constant-time comparison
    if mac.verify_slice(signature).is_err() {
        return Ok(false);
    }

    // Check expiration
    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| SharedError::AuthError(format!("Time error: {}", e)))?
        .as_secs();

    if current_timestamp > timestamp + PASSWORD_RESET_TOKEN_LIFETIME_SECS {
        return Ok(false);
    }

    Ok(true)
}

/// Hash a token for secure database storage
pub fn hash_token(token: &str) -> String {
    use sha2::Digest;
    let hash = Sha256::digest(token.as_bytes());
    hex::encode(hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-password-reset-secret-key";

    #[test]
    fn test_generate_password_reset_token() {
        let result = generate_password_reset_token(TEST_SECRET);
        assert!(result.is_ok());

        let token = result.unwrap();
        assert!(!token.token.is_empty());
        assert!(!token.token_hash.is_empty());
        assert!(token.created_at > 0);
        assert!(token.expires_at > token.created_at);
    }

    #[test]
    fn test_validate_valid_token() {
        let token = generate_password_reset_token(TEST_SECRET).unwrap();
        let result = validate_password_reset_token(&token.token, TEST_SECRET);

        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_validate_invalid_token() {
        let result = validate_password_reset_token("invalid-token", TEST_SECRET);
        // Should return Ok(false) or Err for invalid format
        assert!(result.is_err() || !result.unwrap());
    }

    #[test]
    fn test_validate_wrong_secret() {
        let token = generate_password_reset_token(TEST_SECRET).unwrap();
        let result = validate_password_reset_token(&token.token, "wrong-secret");

        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_tokens_are_unique() {
        let token1 = generate_password_reset_token(TEST_SECRET).unwrap();
        let token2 = generate_password_reset_token(TEST_SECRET).unwrap();

        assert_ne!(token1.token, token2.token);
        assert_ne!(token1.token_hash, token2.token_hash);
    }

    #[test]
    fn test_hash_token() {
        let token = "test-token-123";
        let hash = hash_token(token);

        // SHA-256 produces 64 hex characters
        assert_eq!(hash.len(), 64);

        // Same input should produce same hash
        let hash2 = hash_token(token);
        assert_eq!(hash, hash2);
    }
}
