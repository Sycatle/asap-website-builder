use axum::{
    Router,
    routing::{get, post, put, patch},
    middleware,
    Json,
};
use sqlx::PgPool;
use serde_json::json;

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "service": "ASAP Core API",
        "version": "0.1.0",
        "status": "running"
    }))
}

/// Creates the main API router with all routes
pub fn create_router(pool: PgPool) -> Router {
    // Authenticated routes (require JWT)
    let authenticated_routes = Router::new()
        .route("/auth/me", get(crate::auth::me))
        .route("/users/:id", get(crate::users::get_user))
        .route("/users/:id", put(crate::users::update_user))
        .route("/users/:id/integrations", get(crate::integrations::get_integrations))
        .route("/users/:id/integrations/github", put(crate::integrations::update_github_integration))
        .route("/portfolios", get(crate::portfolios::list_portfolios))
        .route("/portfolios/:id", get(crate::portfolios::get_portfolio))
        .route("/portfolios/:id", put(crate::portfolios::update_portfolio))
        .route("/portfolios/:id/data", patch(crate::portfolios::patch_portfolio_data))
        .route("/portfolios/:id/publish", post(crate::portfolios::publish_portfolio))
        .route("/events", get(crate::events::get_events))
        .route("/events", post(crate::events::create_event))
        .route("/events/:id", patch(crate::events::mark_processed))
        .route("/modules", get(crate::modules::list_modules))
        .route("/modules/:id/config", get(crate::modules::get_module_config))
        .route("/modules/:id/config", put(crate::modules::update_module_config))
        .with_state(pool.clone())
        .layer(middleware::from_fn(crate::middleware::auth_middleware));

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(root))
        .route("/auth/signup", post(crate::auth::signup))
        .route("/auth/login", post(crate::auth::login))
        .route("/public/portfolios/:slug", get(crate::portfolios::get_public_portfolio))
        .with_state(pool);

    // Combine routers
    Router::new()
        .merge(authenticated_routes)
        .merge(public_routes)
}
