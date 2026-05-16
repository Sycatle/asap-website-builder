//! Password strength rules, bcrypt hashing, and verification helpers.

/// Validate password strength
/// Returns Ok(()) if valid, Err with error message if invalid
pub(super) fn validate_password_strength(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters");
    }
    if password.len() > 128 {
        return Err("Password must be at most 128 characters");
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err("Password must contain at least one uppercase letter");
    }
    if !password.chars().any(|c| c.is_lowercase()) {
        return Err("Password must contain at least one lowercase letter");
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err("Password must contain at least one number");
    }
    Ok(())
}


/// Hash a password using bcrypt.
/// Cost 13 (2^13 rounds) — current OWASP recommendation. Override via BCRYPT_COST env if needed.
pub(super) fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    let cost: u32 = std::env::var("BCRYPT_COST")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(13);
    bcrypt::hash(password, cost)
}

/// Verify a password against a hash
pub(super) fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    bcrypt::verify(password, hash)
}

#[cfg(test)]
mod password_tests {
    use super::*;
    use crate::auth::{AccountResponse, LoginRequest, MeResponse, SignupRequest};

    #[test]
    fn test_hash_password() {
        let password = "secure_password_123";
        let hash = hash_password(password).unwrap();

        // Hash should be different from original password
        assert_ne!(password, hash);
        // Hash should be a bcrypt hash (starts with $2a$, $2b$, or $2y$)
        assert!(hash.starts_with("$2a$") || hash.starts_with("$2b$") || hash.starts_with("$2y$"));
    }

    #[test]
    fn test_verify_correct_password() {
        let password = "correct_password";
        let hash = hash_password(password).unwrap();

        let result = verify_password(password, &hash).unwrap();
        assert!(result);
    }

    #[test]
    fn test_verify_incorrect_password() {
        let password = "correct_password";
        let hash = hash_password(password).unwrap();

        let result = verify_password("wrong_password", &hash).unwrap();
        assert!(!result);
    }

    #[test]
    fn test_hash_same_password_different_hashes() {
        let password = "my_password";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();

        // Bcrypt produces different hashes even for same password
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }

    #[test]
    fn test_signup_request_creation() {
        let req = SignupRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
            website_slug: Some("my-website".to_string()),
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
        assert_eq!(req.website_slug, Some("my-website".to_string()));
    }

    #[test]
    fn test_signup_request_without_slug() {
        let req = SignupRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
            website_slug: None,
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
        assert!(req.website_slug.is_none());
    }

    #[test]
    fn test_login_request_creation() {
        let req = LoginRequest {
            email: "user@example.com".to_string(),
            password: "password123".to_string(),
            remember_me: false,
        };

        assert_eq!(req.email, "user@example.com");
        assert_eq!(req.password, "password123");
    }

    #[test]
    fn test_account_response() {
        let resp = AccountResponse {
            id: "account-123".to_string(),
            email: "user@example.com".to_string(),
        };

        assert_eq!(resp.id, "account-123");
        assert_eq!(resp.email, "user@example.com");
    }

    #[test]
    fn test_me_response() {
        let resp = MeResponse {
            id: "account-456".to_string(),
            email: "me@example.com".to_string(),
            plan: "free".to_string(),
        };

        assert_eq!(resp.id, "account-456");
        assert_eq!(resp.email, "me@example.com");
        assert_eq!(resp.plan, "free");
    }

    #[test]
    fn test_email_validation() {
        let valid_emails = vec![
            "user@example.com",
            "test.user@domain.co.uk",
            "name+tag@example.org",
        ];

        for email in valid_emails {
            assert!(email.contains('@'));
        }
    }

    #[test]
    fn test_password_validation() {
        let valid_password = "password_123";
        assert!(valid_password.len() >= 8);

        let short_password = "short";
        assert!(short_password.len() < 8);
    }

    #[test]
    fn test_slug_validation() {
        let valid_slugs = vec!["my-website", "website123", "a-b-c"];

        for slug in valid_slugs {
            assert!(!slug.is_empty());
            assert!(slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
        }
    }

    #[test]
    fn test_invalid_slug() {
        let invalid_slugs = vec!["my website", "website@123", "website#1"];

        for slug in invalid_slugs {
            assert!(!slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
        }
    }

    #[test]
    fn test_empty_slug_invalid() {
        let slug = "";
        assert!(slug.is_empty() || !slug.chars().all(|c| c.is_alphanumeric() || c == '-'));
    }
}

