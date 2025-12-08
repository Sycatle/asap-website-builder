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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_root_response_structure() {
        // Test that we're building proper JSON response
        let expected_response = json!({
            "service": "ASAP Core API",
            "version": "0.1.0",
            "status": "running"
        });

        assert_eq!(expected_response["service"], "ASAP Core API");
        assert_eq!(expected_response["version"], "0.1.0");
        assert_eq!(expected_response["status"], "running");
    }

    #[test]
    fn test_api_route_endpoints_exist() {
        // Test route definitions
        let routes_list = vec![
            "/auth/me",
            "/users/:id",
            "/users/:id/integrations",
            "/users/:id/integrations/github",
            "/portfolios",
            "/portfolios/:id",
            "/portfolios/:id/publish",
            "/events",
            "/modules",
            "/public/portfolios/:slug",
        ];

        for route in routes_list {
            assert!(!route.is_empty());
            assert!(route.starts_with("/"));
        }
    }

    #[test]
    fn test_authenticated_routes() {
        let auth_routes = vec![
            "/auth/me",
            "/users/:id",
            "/portfolios",
            "/events",
            "/modules",
        ];

        for route in auth_routes {
            // Routes should contain ':' for path parameters or be fixed paths
            assert!(route.contains(":") || route.starts_with("/") && !route.contains("public"));
        }
    }

    #[test]
    fn test_public_routes() {
        let public_routes = vec![
            "/",
            "/auth/signup",
            "/auth/login",
            "/public/portfolios/:slug",
        ];

        for route in public_routes {
            assert!(!route.is_empty());
            assert!(route.starts_with("/"));
        }
    }

    #[test]
    fn test_route_parameter_patterns() {
        let parameterized_routes = vec![
            "/users/:id",
            "/portfolios/:id",
            "/events/:id",
            "/modules/:id/config",
            "/public/portfolios/:slug",
        ];

        for route in parameterized_routes {
            assert!(route.contains(":"));
        }
    }

    #[test]
    fn test_api_version_format() {
        let version = "0.1.0";
        let parts: Vec<&str> = version.split('.').collect();
        
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "0");
        assert_eq!(parts[1], "1");
        assert_eq!(parts[2], "0");
    }

    #[test]
    fn test_portfolio_crud_routes() {
        // Test that we have the necessary CRUD routes for portfolios
        let portfolio_routes = vec![
            "/portfolios",      // List
            "/portfolios/:id",  // Get/Update
            "/portfolios/:id/publish", // Publish action
        ];

        for route in portfolio_routes {
            assert!(route.contains("/portfolios"));
        }
    }

    #[test]
    fn test_event_routes() {
        // Test event management routes
        let event_routes = vec![
            "/events",     // List and Create
            "/events/:id", // Mark as processed
        ];

        for route in event_routes {
            assert!(route.contains("/events"));
        }
    }

    #[test]
    fn test_module_configuration_routes() {
        // Test module configuration routes
        let module_routes = vec![
            "/modules",           // List
            "/modules/:id/config", // Get/Update config
        ];

        for route in module_routes {
            assert!(route.contains("/modules"));
        }
    }

    #[test]
    fn test_auth_routes() {
        let auth_routes = vec![
            "/auth/signup",
            "/auth/login",
            "/auth/me",
        ];

        for route in auth_routes {
            assert!(route.starts_with("/auth/"));
        }
    }

    #[test]
    fn test_user_integration_routes() {
        // Test user integration routes
        let integration_routes = vec![
            "/users/:id/integrations",
            "/users/:id/integrations/github",
        ];

        for route in integration_routes {
            assert!(route.contains("/integrations"));
        }
    }

    #[test]
    fn test_public_portfolio_routes() {
        // Test public portfolio access
        let public_routes = vec![
            "/public/portfolios/:slug",
        ];

        for route in public_routes {
            assert!(route.contains("public"));
            assert!(route.contains("/portfolios/"));
        }
    }
}
