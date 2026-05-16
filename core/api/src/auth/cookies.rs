//! Cookie-builder helpers used by the auth endpoints to attach (or clear)
//! HttpOnly access/refresh cookies on responses.

use axum::{
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Serialize;

use asap_core_shared::{AuthCookies, CookieConfig};

/// Build auth response with secure HttpOnly cookies
/// This sets both access_token and refresh_token as cookies for cross-domain SSO
pub(super) fn build_auth_response_with_cookies<T: Serialize>(
    status: StatusCode,
    body: T,
    access_token: &str,
    refresh_token: &str,
    access_expires_secs: u64,
    refresh_expires_secs: u64,
) -> axum::response::Response {
    let cookie_config = CookieConfig::from_env();

    let auth_cookies = AuthCookies {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        access_token_expires_secs: access_expires_secs,
        refresh_token_expires_secs: refresh_expires_secs,
    };

    let (access_cookie, refresh_cookie) = auth_cookies.to_cookie_headers(&cookie_config);

    let mut response = (status, Json(body)).into_response();

    // Set auth cookies
    if let Ok(access_header) = header::HeaderValue::from_str(&access_cookie) {
        response
            .headers_mut()
            .append(header::SET_COOKIE, access_header);
    }
    if let Ok(refresh_header) = header::HeaderValue::from_str(&refresh_cookie) {
        response
            .headers_mut()
            .append(header::SET_COOKIE, refresh_header);
    }

    response
}

/// Build logout response that clears auth cookies
pub(super) fn build_logout_response() -> axum::response::Response {
    let cookie_config = CookieConfig::from_env();
    let (clear_access, clear_refresh) = AuthCookies::clear_headers(&cookie_config);

    let mut response = (
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Logged out successfully"
        })),
    )
        .into_response();

    if let Ok(access_header) = header::HeaderValue::from_str(&clear_access) {
        response
            .headers_mut()
            .append(header::SET_COOKIE, access_header);
    }
    if let Ok(refresh_header) = header::HeaderValue::from_str(&clear_refresh) {
        response
            .headers_mut()
            .append(header::SET_COOKIE, refresh_header);
    }

    response
}
