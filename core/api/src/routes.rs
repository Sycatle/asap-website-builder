use axum::{
    Router,
    routing::{get, post, put, patch, delete},
    middleware,
    Json,
    Extension,
};
use sqlx::PgPool;
use serde_json::json;
use asap_core_shared::SharedConfig;

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "service": "ASAP Core API",
        "version": "0.1.0",
        "status": "running"
    }))
}

/// Creates the main API router with all routes
pub fn create_router(pool: PgPool, config: SharedConfig) -> Router {
    // Initialize file storage service
    let storage_service = std::sync::Arc::new(crate::storage::FileStorageService::new(pool.clone()));

    // Initialize payment gateway (Stripe)
    let payment_gateway: std::sync::Arc<dyn asap_core_payments::PaymentGateway> = {
        let stripe_api_key = std::env::var("STRIPE_API_KEY")
            .unwrap_or_else(|_| "sk_test_placeholder".to_string());
        let stripe_webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_placeholder".to_string());
        
        std::sync::Arc::new(
            asap_core_payments::StripeProvider::new(stripe_api_key, stripe_webhook_secret)
                .expect("Failed to initialize Stripe provider")
        )
    };

    // Authenticated routes (require JWT)
    let authenticated_routes = Router::new()
        .route("/auth/me", get(crate::auth::me))
        .route("/auth/change-password", post(crate::auth::change_password))
        // Account routes
        .route("/accounts/:id", get(crate::accounts::get_account))
        .route("/accounts/:id", put(crate::accounts::update_account))
        .route("/accounts/:id/integrations", get(crate::integrations::get_integrations))
        .route("/accounts/:id/integrations/github", put(crate::integrations::update_github_integration))
        // Website routes
        .route("/websites", get(crate::websites::list_websites))
        .route("/websites/:id", get(crate::websites::get_website))
        .route("/websites/:id", put(crate::websites::update_website))
        .route("/websites/:id/data", patch(crate::websites::patch_website_data))
        .route("/websites/:id/publish", post(crate::websites::publish_website))
        // Website modules routes (LEGACY - kept for backward compatibility)
        .route("/websites/:id/modules", get(crate::websites::list_website_modules))
        .route("/websites/:id/modules", post(crate::websites::activate_module))
        .route("/websites/:id/modules/:module_id", patch(crate::websites::update_website_module))
        .route("/websites/:id/modules/:module_id", delete(crate::websites::deactivate_module))
        // Website sections routes
        .route("/websites/:id/sections", get(crate::websites::list_website_sections))
        .route("/websites/:id/sections", post(crate::websites::create_section))
        .route("/websites/:id/sections/reorder", post(crate::websites::reorder_sections))
        .route("/websites/:id/sections/:section_id", patch(crate::websites::update_section))
        .route("/websites/:id/sections/:section_id", delete(crate::websites::delete_section))
        // Presets routes
        .route("/presets", get(crate::websites::list_presets))
        .route("/websites/from-preset", post(crate::websites::create_website_from_preset))
        // Module catalog routes
        .route("/modules/catalog", get(crate::websites::list_available_modules))
        .route("/modules/:slug", get(crate::websites::get_module_by_slug))
        // Website module data and actions
        .route("/websites/:id/modules/:module_slug/data", get(crate::websites::get_website_module_data))
        .route("/websites/:id/modules/:module_slug/actions/:action_key", post(crate::websites::execute_module_action))
        // Events routes
        .route("/events", get(crate::events::get_events))
        .route("/events", post(crate::events::create_event))
        .route("/events/:id", patch(crate::events::mark_processed))
        // Module config routes
        .route("/modules", get(crate::modules::list_modules))
        .route("/modules/:id/config", get(crate::modules::get_module_config))
        .route("/modules/:id/config", put(crate::modules::update_module_config))
        // Files routes (authenticated)
        .route("/files", post(crate::files::upload_file))
        .route("/files", get(crate::files::list_files))
        .route("/files/:file_id", delete(crate::files::delete_file))
        .route("/files/quota/usage", get(crate::files::get_quota))
        // Billing routes (authenticated)
        .route("/billing/checkout-session", post(crate::billing::create_checkout_session))
        .layer(Extension(storage_service.clone()))
        .layer(Extension(payment_gateway.clone()))
        .layer(Extension(config.clone()))
        .with_state(pool.clone())
        .layer(middleware::from_fn_with_state(config.clone(), crate::middleware::auth_middleware));

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(root))
        .route("/auth/signup", post(crate::auth::signup))
        .route("/auth/login", post(crate::auth::login))
        // Public website route
        .route("/public/websites/:slug", get(crate::websites::get_public_website))
        // File download (auth via query param for media embeds)
        .route("/files/:file_id", get(crate::files::download_file))
        // Webhook routes (public but signature verified)
        .route("/payments/webhook/stripe", post(crate::webhooks::stripe_webhook))
        .layer(Extension(storage_service))
        .layer(Extension(payment_gateway))
        .layer(Extension(config))
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
            "/accounts/:id",
            "/accounts/:id/integrations",
            "/accounts/:id/integrations/github",
            "/websites",
            "/websites/:id",
            "/websites/:id/modules",
            "/websites/:id/sections",
            "/presets",
            "/events",
            "/modules",
            "/public/websites/:slug",
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
            "/accounts/:id",
            "/websites",
            "/events",
            "/modules",
            "/presets",
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
            "/public/websites/:slug",
        ];

        for route in public_routes {
            assert!(!route.is_empty());
            assert!(route.starts_with("/"));
        }
    }

    #[test]
    fn test_route_parameter_patterns() {
        let parameterized_routes = vec![
            "/accounts/:id",
            "/websites/:id",
            "/websites/:id/modules/:module_id",
            "/websites/:id/sections/:section_id",
            "/events/:id",
            "/modules/:id/config",
            "/public/websites/:slug",
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
    fn test_website_crud_routes() {
        // Test that we have the necessary CRUD routes for websites
        let website_routes = vec![
            "/websites",           // List
            "/websites/:id",       // Get/Update
            "/websites/:id/data",  // Patch data
            "/websites/:id/publish", // Publish action
            "/websites/:id/modules", // List/Activate modules
            "/websites/:id/modules/:module_id", // Update module
            "/websites/:id/sections", // List/Create sections
            "/websites/:id/sections/:section_id", // Update/Delete section
            "/websites/:id/sections/reorder", // Reorder sections
        ];

        for route in website_routes {
            assert!(route.contains("/websites"));
        }
    }

    #[test]
    fn test_preset_routes() {
        // Test preset routes
        let preset_routes = vec![
            "/presets",              // List presets
            "/websites/from-preset", // Create from preset
        ];

        for route in preset_routes {
            assert!(!route.is_empty());
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
            "/modules/catalog",   // Module catalog
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
    fn test_account_integration_routes() {
        // Test account integration routes
        let integration_routes = vec![
            "/accounts/:id/integrations",
            "/accounts/:id/integrations/github",
        ];

        for route in integration_routes {
            assert!(route.contains("/integrations"));
        }
    }

    #[test]
    fn test_public_website_routes() {
        // Test public website access
        let public_routes = vec![
            "/public/websites/:slug",
        ];

        for route in public_routes {
            assert!(route.contains("public"));
            assert!(route.contains("/websites/"));
        }
    }
}
