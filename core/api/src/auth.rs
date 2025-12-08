use axum::{Json, response::IntoResponse, http::StatusCode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub portfolio_slug: String,
}

#[derive(Debug, Serialize)]
pub struct SignupResponse {
    pub token: String,
    pub user: UserResponse,
    pub tenant: TenantResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct TenantResponse {
    pub id: String,
    pub slug: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

pub async fn signup(
    Json(_payload): Json<SignupRequest>,
) -> impl IntoResponse {
    // TODO: Implement signup logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn login(
    Json(_payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // TODO: Implement login logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn me() -> impl IntoResponse {
    // TODO: Implement get current user logic
    StatusCode::NOT_IMPLEMENTED
}
