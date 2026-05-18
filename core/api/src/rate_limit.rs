use axum::{
    extract::{ConnectInfo, Request, State},
    http::{HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

/// Rate limiter configuration for different endpoint types
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests allowed in the window
    pub max_requests: u32,
    /// Time window in seconds
    pub window_secs: u64,
    /// Block duration after exceeding limit (seconds)
    pub block_duration_secs: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: 5,
            window_secs: 60,
            block_duration_secs: 300, // 5 minutes block
        }
    }
}

/// Configuration presets for different security levels
impl RateLimitConfig {
    /// Strict limits for login attempts (5 per minute, 15 min block)
    pub fn login() -> Self {
        Self {
            max_requests: 5,
            window_secs: 60,
            block_duration_secs: 900, // 15 minutes
        }
    }

    /// Strict limits for signup (3 per minute, 30 min block)  
    pub fn signup() -> Self {
        Self {
            max_requests: 3,
            window_secs: 60,
            block_duration_secs: 1800, // 30 minutes
        }
    }

    /// Moderate limits for password change (3 per 5 minutes)
    pub fn password_change() -> Self {
        Self {
            max_requests: 3,
            window_secs: 300,
            block_duration_secs: 600, // 10 minutes
        }
    }

    /// Strict limit for password-reset request (anti-enumeration / mailbomb)
    pub fn forgot_password() -> Self {
        Self {
            max_requests: 3,
            window_secs: 600,         // 10 minutes
            block_duration_secs: 900, // 15 minutes
        }
    }

    /// Moderate limit for token refresh (catches stolen refresh-token spam)
    pub fn refresh() -> Self {
        Self {
            max_requests: 30,
            window_secs: 60,
            block_duration_secs: 120,
        }
    }

    /// Standard API rate limit (100 per minute)
    pub fn standard() -> Self {
        Self {
            max_requests: 100,
            window_secs: 60,
            block_duration_secs: 60,
        }
    }
}

/// Tracks request count and timing for an IP
#[derive(Debug, Clone)]
struct RateLimitEntry {
    /// Number of requests in current window
    count: u32,
    /// Start of current window
    window_start: Instant,
    /// If blocked, when the block expires
    blocked_until: Option<Instant>,
}

impl RateLimitEntry {
    fn new() -> Self {
        Self {
            count: 0,
            window_start: Instant::now(),
            blocked_until: None,
        }
    }
}

/// Thread-safe rate limiter store
#[derive(Debug, Clone)]
pub struct RateLimiter {
    /// Map of IP -> endpoint -> rate limit entry
    entries: Arc<RwLock<HashMap<String, HashMap<String, RateLimitEntry>>>>,
    /// Cleanup interval tracking
    last_cleanup: Arc<RwLock<Instant>>,
}

/// Maximum number of IPs to track (prevents memory exhaustion during DDoS)
const MAX_TRACKED_IPS: usize = 100_000;

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
            last_cleanup: Arc::new(RwLock::new(Instant::now())),
        }
    }

    /// Check if request is allowed and update counters
    /// Returns (allowed, remaining, reset_at_secs)
    pub async fn check_rate_limit(
        &self,
        ip: &str,
        endpoint: &str,
        config: &RateLimitConfig,
    ) -> (bool, u32, u64) {
        // Periodic cleanup (every 5 minutes)
        self.maybe_cleanup().await;

        let mut entries = self.entries.write().await;

        // Enforce maximum entries to prevent memory exhaustion during DDoS
        if entries.len() >= MAX_TRACKED_IPS && !entries.contains_key(ip) {
            // Emergency cleanup: remove oldest 10%
            self.emergency_cleanup(&mut entries);

            // If still at capacity after cleanup, temporarily block new IPs
            if entries.len() >= MAX_TRACKED_IPS {
                tracing::warn!(
                    "Rate limiter at capacity ({}), temporarily blocking new IP",
                    MAX_TRACKED_IPS
                );
                return (false, 0, 60); // Block for 60 seconds
            }
        }

        let ip_entries = entries.entry(ip.to_string()).or_insert_with(HashMap::new);

        let now = Instant::now();
        let window_duration = Duration::from_secs(config.window_secs);

        // Get or create entry for this endpoint
        let entry = ip_entries
            .entry(endpoint.to_string())
            .or_insert_with(RateLimitEntry::new);

        // Check if currently blocked
        if let Some(blocked_until) = entry.blocked_until {
            if now < blocked_until {
                let remaining_block = blocked_until.duration_since(now).as_secs();
                return (false, 0, remaining_block);
            }
            // Block expired, reset
            entry.blocked_until = None;
            entry.count = 0;
            entry.window_start = now;
        }

        // Check if window has expired
        if now.duration_since(entry.window_start) >= window_duration {
            // Start new window
            entry.count = 1;
            entry.window_start = now;
            let remaining = config.max_requests.saturating_sub(1);
            let reset_at = config.window_secs;
            return (true, remaining, reset_at);
        }

        // Within current window
        entry.count += 1;

        if entry.count > config.max_requests {
            // Rate limit exceeded - block the IP
            entry.blocked_until = Some(now + Duration::from_secs(config.block_duration_secs));
            tracing::warn!(
                "Rate limit exceeded for IP {} on endpoint {}: {} requests in {}s, blocked for {}s",
                ip,
                endpoint,
                entry.count,
                config.window_secs,
                config.block_duration_secs
            );
            return (false, 0, config.block_duration_secs);
        }

        let remaining = config.max_requests.saturating_sub(entry.count);
        let elapsed = now.duration_since(entry.window_start).as_secs();
        let reset_at = config.window_secs.saturating_sub(elapsed);

        (true, remaining, reset_at)
    }

    /// Clean up old entries to prevent memory growth
    async fn maybe_cleanup(&self) {
        let cleanup_interval = Duration::from_secs(300); // 5 minutes

        {
            let last = self.last_cleanup.read().await;
            if last.elapsed() < cleanup_interval {
                return;
            }
        }

        // Do cleanup
        let mut last = self.last_cleanup.write().await;
        *last = Instant::now();
        drop(last);

        let mut entries = self.entries.write().await;
        let max_age = Duration::from_secs(3600); // Remove entries older than 1 hour
        let now = Instant::now();

        entries.retain(|_ip, ip_entries| {
            ip_entries.retain(|_endpoint, entry| {
                // Keep if still blocked or window is recent
                entry.blocked_until.is_some_and(|b| b > now)
                    || now.duration_since(entry.window_start) < max_age
            });
            !ip_entries.is_empty()
        });

        tracing::debug!(
            "Rate limiter cleanup complete, {} IPs tracked",
            entries.len()
        );
    }

    /// Emergency cleanup when at capacity - removes oldest 20% of entries
    fn emergency_cleanup(&self, entries: &mut HashMap<String, HashMap<String, RateLimitEntry>>) {
        let to_remove = entries.len() / 5; // Remove 20%
        if to_remove == 0 {
            return;
        }

        // Collect IPs with their oldest window_start
        let mut ip_ages: Vec<(String, Instant)> = entries
            .iter()
            .map(|(ip, ip_entries)| {
                let oldest = ip_entries
                    .values()
                    .map(|e| e.window_start)
                    .min()
                    .unwrap_or_else(Instant::now);
                (ip.clone(), oldest)
            })
            .collect();

        // Sort by age (oldest first)
        ip_ages.sort_by(|a, b| a.1.cmp(&b.1));

        // Remove oldest entries
        for (ip, _) in ip_ages.into_iter().take(to_remove) {
            entries.remove(&ip);
        }

        tracing::warn!(
            "Emergency rate limiter cleanup: removed {} oldest IPs, {} remaining",
            to_remove,
            entries.len()
        );
    }
}

/// Shared rate limiter type for Axum state
pub type SharedRateLimiter = Arc<RateLimiter>;

/// Validate IP address format (basic check)
fn is_valid_ip(ip: &str) -> bool {
    ip.parse::<std::net::IpAddr>().is_ok()
}

/// Get trusted proxy IPs from environment
fn get_trusted_proxies() -> Vec<std::net::IpAddr> {
    std::env::var("TRUSTED_PROXIES")
        .unwrap_or_default()
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect()
}

/// Extract client IP from request
/// SECURITY: Only trusts X-Forwarded-For when request comes from a trusted proxy
fn extract_client_ip(req: &Request) -> String {
    // Get direct connection IP first
    let direct_ip = req
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|ci| ci.0.ip());

    // Only trust forwarded headers if from a trusted proxy
    let trusted_proxies = get_trusted_proxies();
    let from_trusted_proxy = direct_ip
        .map(|ip| trusted_proxies.contains(&ip))
        .unwrap_or(false);

    if from_trusted_proxy {
        // Trust X-Forwarded-For only from trusted proxies
        if let Some(forwarded) = req.headers().get("x-forwarded-for") {
            if let Ok(forwarded_str) = forwarded.to_str() {
                // Take first IP in the chain and validate it
                if let Some(ip) = forwarded_str.split(',').next() {
                    let ip = ip.trim();
                    if is_valid_ip(ip) {
                        return ip.to_string();
                    }
                }
            }
        }

        // Trust X-Real-IP only from trusted proxies
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(ip) = real_ip.to_str() {
                if is_valid_ip(ip) {
                    return ip.to_string();
                }
            }
        }
    }

    // Use direct connection IP (cannot be spoofed)
    direct_ip
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Rate limit middleware for authentication endpoints
pub async fn auth_rate_limit_middleware(
    State(limiter): State<SharedRateLimiter>,
    req: Request,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();
    let method = req.method().as_str();

    // Only rate limit POST requests to auth endpoints
    if method != "POST" {
        return next.run(req).await;
    }

    // Determine rate limit config based on endpoint
    let config = match path.as_str() {
        "/auth/login" | "/api/auth/login" => RateLimitConfig::login(),
        "/auth/signup" | "/api/auth/signup" => RateLimitConfig::signup(),
        "/auth/change-password" | "/api/auth/change-password" => RateLimitConfig::password_change(),
        "/auth/forgot-password" | "/api/auth/forgot-password" => RateLimitConfig::forgot_password(),
        "/auth/reset-password" | "/api/auth/reset-password" => RateLimitConfig::forgot_password(),
        "/auth/refresh" | "/api/auth/refresh" => RateLimitConfig::refresh(),
        _ => return next.run(req).await, // Not a rate-limited endpoint
    };

    let client_ip = extract_client_ip(&req);
    let (allowed, remaining, reset_at) = limiter.check_rate_limit(&client_ip, &path, &config).await;

    if !allowed {
        tracing::warn!("Rate limit blocked request from {} to {}", client_ip, path);

        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Trop de tentatives. Veuillez réessayer plus tard.",
                "code": "RATE_LIMITED",
                "retry_after": reset_at
            })),
        )
            .into_response();

        // Add rate limit headers
        let headers = response.headers_mut();
        headers.insert(
            "Retry-After",
            HeaderValue::from_str(&reset_at.to_string()).unwrap(),
        );
        headers.insert(
            "X-RateLimit-Limit",
            HeaderValue::from_str(&config.max_requests.to_string()).unwrap(),
        );
        headers.insert("X-RateLimit-Remaining", HeaderValue::from_static("0"));
        headers.insert(
            "X-RateLimit-Reset",
            HeaderValue::from_str(&reset_at.to_string()).unwrap(),
        );

        return response;
    }

    // Process request
    let mut response = next.run(req).await;

    // Add rate limit headers to successful responses too
    let headers = response.headers_mut();
    headers.insert(
        "X-RateLimit-Limit",
        HeaderValue::from_str(&config.max_requests.to_string()).unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        HeaderValue::from_str(&remaining.to_string()).unwrap(),
    );
    headers.insert(
        "X-RateLimit-Reset",
        HeaderValue::from_str(&reset_at.to_string()).unwrap(),
    );

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_allows_requests_under_limit() {
        let limiter = RateLimiter::new();
        let config = RateLimitConfig {
            max_requests: 3,
            window_secs: 60,
            block_duration_secs: 60,
        };

        for i in 1..=3 {
            let (allowed, remaining, _) = limiter
                .check_rate_limit("127.0.0.1", "/test", &config)
                .await;
            assert!(allowed, "Request {} should be allowed", i);
            assert_eq!(remaining, 3 - i);
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_after_limit() {
        let limiter = RateLimiter::new();
        let config = RateLimitConfig {
            max_requests: 2,
            window_secs: 60,
            block_duration_secs: 60,
        };

        // First 2 requests should pass
        limiter
            .check_rate_limit("127.0.0.1", "/test", &config)
            .await;
        limiter
            .check_rate_limit("127.0.0.1", "/test", &config)
            .await;

        // Third request should be blocked
        let (allowed, remaining, _) = limiter
            .check_rate_limit("127.0.0.1", "/test", &config)
            .await;
        assert!(!allowed, "Third request should be blocked");
        assert_eq!(remaining, 0);
    }

    #[tokio::test]
    async fn test_rate_limiter_separate_endpoints() {
        let limiter = RateLimiter::new();
        let config = RateLimitConfig {
            max_requests: 1,
            window_secs: 60,
            block_duration_secs: 60,
        };

        // First request to /login should pass
        let (allowed, _, _) = limiter
            .check_rate_limit("127.0.0.1", "/login", &config)
            .await;
        assert!(allowed);

        // Second request to /login should be blocked
        let (allowed, _, _) = limiter
            .check_rate_limit("127.0.0.1", "/login", &config)
            .await;
        assert!(!allowed);

        // Request to /signup should still pass (different endpoint)
        let (allowed, _, _) = limiter
            .check_rate_limit("127.0.0.1", "/signup", &config)
            .await;
        assert!(allowed);
    }

    #[tokio::test]
    async fn test_rate_limiter_separate_ips() {
        let limiter = RateLimiter::new();
        let config = RateLimitConfig {
            max_requests: 1,
            window_secs: 60,
            block_duration_secs: 60,
        };

        // First IP gets blocked after 1 request
        limiter
            .check_rate_limit("192.168.1.1", "/test", &config)
            .await;
        let (allowed, _, _) = limiter
            .check_rate_limit("192.168.1.1", "/test", &config)
            .await;
        assert!(!allowed);

        // Second IP can still make requests
        let (allowed, _, _) = limiter
            .check_rate_limit("192.168.1.2", "/test", &config)
            .await;
        assert!(allowed);
    }

    #[tokio::test]
    async fn test_rate_limit_configs() {
        let login = RateLimitConfig::login();
        assert_eq!(login.max_requests, 5);
        assert_eq!(login.window_secs, 60);
        assert_eq!(login.block_duration_secs, 900);

        let signup = RateLimitConfig::signup();
        assert_eq!(signup.max_requests, 3);
        assert_eq!(signup.block_duration_secs, 1800);
    }
}
