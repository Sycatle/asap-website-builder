use axum::{extract::Path, response::IntoResponse, http::StatusCode};

pub async fn get_user(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement get user logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn update_user(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement update user logic
    StatusCode::NOT_IMPLEMENTED
}
