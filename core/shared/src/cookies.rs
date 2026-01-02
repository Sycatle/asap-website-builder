//! Secure Cookie Configuration for Cross-Domain Authentication
//!
//! This module provides utilities for setting secure HTTP cookies
//! for authentication across subdomains (accounts.asap.cool, app.asap.cool, etc.)
//!
//! ## Security Considerations:
//! - `HttpOnly`: Prevents JavaScript access (XSS protection)
//! - `Secure`: Only sent over HTTPS (required for SameSite=None)
//! - `SameSite=None`: Required for cross-domain cookies
//! - `Domain=.asap.cool`: Shared across all subdomains
//! - `Path=/`: Available for all routes

/// Cookie names
pub const AUTH_ACCESS_TOKEN_COOKIE: &str = "asap_access_token";
pub const AUTH_REFRESH_TOKEN_COOKIE: &str = "asap_refresh_token";

/// Default cookie domain for production (shared across subdomains)
pub const DEFAULT_COOKIE_DOMAIN: &str = ".asap.cool";

/// Cookie configuration
#[derive(Debug, Clone)]
pub struct CookieConfig {
    /// Domain for cookies (e.g., ".asap.cool" for cross-subdomain)
    pub domain: String,
    /// Whether to set Secure flag (should be true in production)
    pub secure: bool,
    /// Whether cookies are for cross-site requests (SameSite=None vs Strict)
    pub cross_site: bool,
}

impl Default for CookieConfig {
    fn default() -> Self {
        Self {
            domain: DEFAULT_COOKIE_DOMAIN.to_string(),
            secure: true,
            cross_site: true,
        }
    }
}

impl CookieConfig {
    /// Create config from environment variables
    pub fn from_env() -> Self {
        let environment = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string());
        let is_production = environment == "production";
        
        let domain = std::env::var("COOKIE_DOMAIN").unwrap_or_else(|_| {
            if is_production {
                DEFAULT_COOKIE_DOMAIN.to_string()
            } else {
                // In development, don't set domain to work with localhost
                String::new()
            }
        });
        
        let secure = std::env::var("COOKIE_SECURE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(is_production);
        
        let cross_site = std::env::var("COOKIE_CROSS_SITE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(is_production);
        
        Self {
            domain,
            secure,
            cross_site,
        }
    }
    
    /// Create config for development (localhost)
    pub fn development() -> Self {
        Self {
            domain: String::new(), // No domain for localhost
            secure: false,
            cross_site: false, // SameSite=Strict for dev
        }
    }
    
    /// Create config for production
    pub fn production(domain: &str) -> Self {
        Self {
            domain: domain.to_string(),
            secure: true,
            cross_site: true,
        }
    }
}

/// Builder for creating secure cookie strings
#[derive(Debug)]
pub struct CookieBuilder {
    name: String,
    value: String,
    config: CookieConfig,
    max_age_secs: Option<u64>,
    http_only: bool,
    path: String,
}

impl CookieBuilder {
    /// Create a new cookie builder
    pub fn new(name: &str, value: &str, config: CookieConfig) -> Self {
        Self {
            name: name.to_string(),
            value: value.to_string(),
            config,
            max_age_secs: None,
            http_only: true,
            path: "/".to_string(),
        }
    }
    
    /// Set the max age in seconds
    pub fn max_age(mut self, secs: u64) -> Self {
        self.max_age_secs = Some(secs);
        self
    }
    
    /// Set whether the cookie is HttpOnly (default: true)
    pub fn http_only(mut self, value: bool) -> Self {
        self.http_only = value;
        self
    }
    
    /// Set the path (default: "/")
    pub fn path(mut self, path: &str) -> Self {
        self.path = path.to_string();
        self
    }
    
    /// Build the Set-Cookie header value
    pub fn build(self) -> String {
        let mut parts = vec![
            format!("{}={}", self.name, self.value),
            format!("Path={}", self.path),
        ];
        
        // Add domain if specified (empty string means omit for localhost)
        if !self.config.domain.is_empty() {
            parts.push(format!("Domain={}", self.config.domain));
        }
        
        // Add HttpOnly flag
        if self.http_only {
            parts.push("HttpOnly".to_string());
        }
        
        // Add Secure flag
        if self.config.secure {
            parts.push("Secure".to_string());
        }
        
        // Add SameSite attribute
        // Note: SameSite=None requires Secure flag
        if self.config.cross_site {
            parts.push("SameSite=None".to_string());
        } else {
            parts.push("SameSite=Strict".to_string());
        }
        
        // Add Max-Age
        if let Some(secs) = self.max_age_secs {
            parts.push(format!("Max-Age={}", secs));
        }
        
        parts.join("; ")
    }
}

/// Create a cookie to delete/clear a cookie (set Max-Age=0)
pub fn clear_cookie(name: &str, config: &CookieConfig) -> String {
    let mut parts = vec![
        format!("{}=", name),
        "Path=/".to_string(),
        "Max-Age=0".to_string(),
    ];
    
    if !config.domain.is_empty() {
        parts.push(format!("Domain={}", config.domain));
    }
    
    if config.secure {
        parts.push("Secure".to_string());
    }
    
    if config.cross_site {
        parts.push("SameSite=None".to_string());
    } else {
        parts.push("SameSite=Strict".to_string());
    }
    
    parts.join("; ")
}

/// Helper to set auth cookies on a response
pub struct AuthCookies {
    pub access_token: String,
    pub refresh_token: String,
    pub access_token_expires_secs: u64,
    pub refresh_token_expires_secs: u64,
}

impl AuthCookies {
    /// Create Set-Cookie header values for auth tokens
    pub fn to_cookie_headers(&self, config: &CookieConfig) -> (String, String) {
        let access_cookie = CookieBuilder::new(
            AUTH_ACCESS_TOKEN_COOKIE,
            &self.access_token,
            config.clone(),
        )
        .max_age(self.access_token_expires_secs)
        .http_only(true)
        .build();
        
        let refresh_cookie = CookieBuilder::new(
            AUTH_REFRESH_TOKEN_COOKIE,
            &self.refresh_token,
            config.clone(),
        )
        .max_age(self.refresh_token_expires_secs)
        .http_only(true)
        .build();
        
        (access_cookie, refresh_cookie)
    }
    
    /// Create clear cookie headers (for logout)
    pub fn clear_headers(config: &CookieConfig) -> (String, String) {
        (
            clear_cookie(AUTH_ACCESS_TOKEN_COOKIE, config),
            clear_cookie(AUTH_REFRESH_TOKEN_COOKIE, config),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cookie_builder_production() {
        let config = CookieConfig::production(".asap.cool");
        let cookie = CookieBuilder::new("test", "value", config)
            .max_age(3600)
            .build();
        
        assert!(cookie.contains("test=value"));
        assert!(cookie.contains("Domain=.asap.cool"));
        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("Secure"));
        assert!(cookie.contains("SameSite=None"));
        assert!(cookie.contains("Max-Age=3600"));
        assert!(cookie.contains("Path=/"));
    }

    #[test]
    fn test_cookie_builder_development() {
        let config = CookieConfig::development();
        let cookie = CookieBuilder::new("test", "value", config)
            .max_age(3600)
            .build();
        
        assert!(cookie.contains("test=value"));
        assert!(!cookie.contains("Domain=")); // No domain for localhost
        assert!(cookie.contains("HttpOnly"));
        assert!(!cookie.contains("Secure")); // Not secure in dev
        assert!(cookie.contains("SameSite=Strict"));
        assert!(cookie.contains("Max-Age=3600"));
    }

    #[test]
    fn test_clear_cookie() {
        let config = CookieConfig::production(".asap.cool");
        let cookie = clear_cookie("test", &config);
        
        assert!(cookie.contains("test="));
        assert!(cookie.contains("Max-Age=0"));
        assert!(cookie.contains("Domain=.asap.cool"));
    }

    #[test]
    fn test_auth_cookies() {
        let config = CookieConfig::production(".asap.cool");
        let auth = AuthCookies {
            access_token: "access123".to_string(),
            refresh_token: "refresh456".to_string(),
            access_token_expires_secs: 900,
            refresh_token_expires_secs: 604800,
        };
        
        let (access, refresh) = auth.to_cookie_headers(&config);
        
        assert!(access.contains("asap_access_token=access123"));
        assert!(access.contains("Max-Age=900"));
        
        assert!(refresh.contains("asap_refresh_token=refresh456"));
        assert!(refresh.contains("Max-Age=604800"));
    }
}
