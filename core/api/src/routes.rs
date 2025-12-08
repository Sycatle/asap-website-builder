use axum::{
    Router,
    routing::{get, post, put, patch},
};

/// Creates the main API router with all routes
pub fn create_router() -> Router {
    Router::new()
        // Auth routes (public)
        .route("/auth/signup", post(crate::auth::signup))
        .route("/auth/login", post(crate::auth::login))
        .route("/auth/me", get(crate::auth::me))
        
        // User routes (authenticated)
        .route("/users/:id", get(crate::users::get_user))
        .route("/users/:id", put(crate::users::update_user))
        
        // Integration routes (authenticated)
        .route("/users/:id/integrations", get(crate::integrations::get_integrations))
        .route("/users/:id/integrations/github", put(crate::integrations::update_github_integration))
        
        // Portfolio routes (authenticated)
        .route("/portfolios", get(crate::portfolios::list_portfolios))
        .route("/portfolios/:id", get(crate::portfolios::get_portfolio))
        .route("/portfolios/:id", put(crate::portfolios::update_portfolio))
        .route("/portfolios/:id/data", patch(crate::portfolios::patch_portfolio_data))
        .route("/portfolios/:id/publish", post(crate::portfolios::publish_portfolio))
        
        // Event routes (authenticated)
        .route("/events", get(crate::events::get_events))
        .route("/events", post(crate::events::create_event))
        .route("/events/:id", patch(crate::events::mark_processed))
        
        // Module routes (authenticated)
        .route("/modules", get(crate::modules::list_modules))
        .route("/modules/:id/config", get(crate::modules::get_module_config))
        .route("/modules/:id/config", put(crate::modules::update_module_config))
        
        // Public routes
        .route("/public/portfolios/:slug", get(crate::portfolios::get_public_portfolio))
}
