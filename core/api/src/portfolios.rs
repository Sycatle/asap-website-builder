use axum::{extract::Path, response::IntoResponse, http::StatusCode};

pub async fn list_portfolios() -> impl IntoResponse {
    // TODO: Implement list portfolios logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_portfolio(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement get portfolio logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn update_portfolio(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement update portfolio logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn patch_portfolio_data(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement patch portfolio data logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn publish_portfolio(Path(_id): Path<String>) -> impl IntoResponse {
    // TODO: Implement publish portfolio logic
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_public_portfolio(Path(_slug): Path<String>) -> impl IntoResponse {
    // TODO: Implement get public portfolio logic
    StatusCode::NOT_IMPLEMENTED
}
