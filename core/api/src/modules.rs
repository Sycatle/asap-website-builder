use axum::{extract::Path, response::IntoResponse, http::StatusCode};

pub async fn list_modules() -> impl IntoResponse {
    // TODO: Implement list modules logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_module_config(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement get module config logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn update_module_config(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement update module config logic
    StatusCode::NOT_IMPLEMENTED
}
