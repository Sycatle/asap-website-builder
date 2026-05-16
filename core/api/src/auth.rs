//! Auth module: signup, login, password reset, sessions, refresh-token rotation.
//!
//! Submodules:
//! - `types`: request/response DTOs
//! - `password`: bcrypt + strength validation
//! - `cookies`: response builders that set/clear auth cookies
//! - `signup` / `login` / `account` / `logout` / `refresh`: HTTP handlers
//! - `password_reset`: forgot/reset password flow
//! - `sessions`: list and revoke refresh tokens

mod account;
mod cookies;
mod login;
mod logout;
mod password;
mod password_reset;
mod refresh;
mod sessions;
mod signup;
mod types;

pub use account::{change_password, me};
pub use login::login;
pub use logout::{is_token_blacklisted, logout, logout_all};
pub use password_reset::{forgot_password, reset_password};
pub use refresh::refresh_token;
pub use sessions::{list_sessions, revoke_session};
pub use signup::signup;
pub use types::{
    AccountResponse, ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, LoginResponse,
    LoginResponseV2, MeResponse, RefreshTokenRequest, ResetPasswordRequest, SignupRequest,
    SignupResponse, TokenPairResponse,
};

/// JWT issuer constant for token validation
pub const JWT_ISSUER: &str = "asap-auth";
pub const JWT_AUDIENCE: &str = "asap-api";

// Cookie builders are re-bound at this level so submodules can write
// `use super::build_logout_response` instead of reaching into the sibling
// `cookies` module directly.
use cookies::{build_auth_response_with_cookies, build_logout_response};
