use axum::{extract::Path, response::IntoResponse, http::StatusCode};

pub async fn get_events() -> impl IntoResponse {
    // TODO: Implement get events logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn create_event() -> impl IntoResponse {
    // TODO: Implement create event logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn mark_processed(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement mark event processed logic
    StatusCode::NOT_IMPLEMENTED
}
