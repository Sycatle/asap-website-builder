use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use rand::RngCore;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::errors::SharedError;

type HmacSha256 = Hmac<Sha256>;

/// CSRF token lifetime in seconds (1 hour)
const CSRF_TOKEN_LIFETIME_SECS: u64 = 3600;

/// CSRF token structure containing timestamp and random data
#[derive(Debug, Clone)]
pub struct CsrfToken {
    pub token: String,
    pub created_at: u64,
}

/// Generate a new CSRF token
/// 
/// The token format is: base64(timestamp:random_bytes:hmac_signature)
/// This allows stateless validation without storing tokens server-side.
pub fn generate_csrf_token(secret: &str) -> Result<CsrfToken, SharedError> {
    // Get current timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| SharedError::CsrfError(format!("Time error: {}", e)))?
        .as_secs();
    
    // Generate random bytes
    let mut random_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut random_bytes);
    
    // Create message to sign: timestamp + random bytes
    let mut message = timestamp.to_be_bytes().to_vec();
    message.extend_from_slice(&random_bytes);
    
    // Create HMAC signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::CsrfError(format!("HMAC error: {}", e)))?;
    mac.update(&message);
    let signature = mac.finalize().into_bytes();
    
    // Combine all parts and encode
    let mut token_data = message;
    token_data.extend_from_slice(&signature);
    let token = URL_SAFE_NO_PAD.encode(&token_data);
    
    Ok(CsrfToken {
        token,
        created_at: timestamp,
    })
}

/// Validate a CSRF token
/// 
/// Checks:
/// 1. Token format is valid
/// 2. HMAC signature is correct
/// 3. Token has not expired
pub fn validate_csrf_token(token: &str, secret: &str) -> Result<bool, SharedError> {
    // Decode token
    let token_data = URL_SAFE_NO_PAD
        .decode(token)
        .map_err(|_| SharedError::CsrfError("Invalid token format".to_string()))?;
    
    // Token should be: 8 bytes timestamp + 16 bytes random + 32 bytes signature = 56 bytes
    if token_data.len() != 56 {
        return Ok(false);
    }
    
    // Extract parts
    let timestamp_bytes: [u8; 8] = token_data[0..8]
        .try_into()
        .map_err(|_| SharedError::CsrfError("Invalid timestamp".to_string()))?;
    let timestamp = u64::from_be_bytes(timestamp_bytes);
    let message = &token_data[0..24]; // timestamp + random
    let signature = &token_data[24..56];
    
    // Verify HMAC signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| SharedError::CsrfError(format!("HMAC error: {}", e)))?;
    mac.update(message);
    
    // Use constant-time comparison
    if mac.verify_slice(signature).is_err() {
        return Ok(false);
    }
    
    // Check expiration
    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| SharedError::CsrfError(format!("Time error: {}", e)))?
        .as_secs();
    
    if current_timestamp > timestamp + CSRF_TOKEN_LIFETIME_SECS {
        return Ok(false);
    }
    
    Ok(true)
}

/// CSRF header name
pub const CSRF_HEADER: &str = "X-CSRF-Token";

/// CSRF cookie name
pub const CSRF_COOKIE: &str = "csrf_token";

#[cfg(test)]
mod tests {
    use super::*;
    
    const TEST_SECRET: &str = "test-csrf-secret-key-for-testing";
    
    #[test]
    fn test_generate_csrf_token() {
        let result = generate_csrf_token(TEST_SECRET);
        assert!(result.is_ok());
        
        let token = result.unwrap();
        assert!(!token.token.is_empty());
        assert!(token.created_at > 0);
    }
    
    #[test]
    fn test_validate_valid_token() {
        let token = generate_csrf_token(TEST_SECRET).unwrap();
        let result = validate_csrf_token(&token.token, TEST_SECRET);
        
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_validate_invalid_token() {
        let result = validate_csrf_token("invalid-token", TEST_SECRET);
        // Should return Ok(false) or Err for invalid format
        assert!(result.is_err() || !result.unwrap());
    }
    
    #[test]
    fn test_validate_wrong_secret() {
        let token = generate_csrf_token(TEST_SECRET).unwrap();
        let result = validate_csrf_token(&token.token, "wrong-secret");
        
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
    
    #[test]
    fn test_tokens_are_unique() {
        let token1 = generate_csrf_token(TEST_SECRET).unwrap();
        let token2 = generate_csrf_token(TEST_SECRET).unwrap();
        
        assert_ne!(token1.token, token2.token);
    }
}
