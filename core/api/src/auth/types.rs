//! Request/response DTOs for the authentication endpoints.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    /// Optional website slug - if provided, creates a website during signup
    /// For V1, website creation is handled by onboarding in the dashboard
    #[serde(alias = "portfolio_slug")] // Backward compatibility
    pub website_slug: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SignupResponse {
    pub token: String,
    pub account: AccountResponse,
}

#[derive(Debug, Serialize)]
pub struct AccountResponse {
    pub id: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub id: String,
    pub email: String,
    pub plan: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct TokenPairResponse {
    pub access_token: String,
    pub refresh_token: String,
    /// Access token expires in seconds
    pub expires_in: i64,
}

#[derive(Debug, Serialize)]
pub struct LoginResponseV2 {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    /// Legacy field for backward compatibility
    pub token: String,
}
