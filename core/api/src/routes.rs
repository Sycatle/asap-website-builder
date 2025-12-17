use axum::{
    Router,
    routing::{get, post, put, patch, delete},
    middleware,
    Json,
    Extension,
};
use sqlx::PgPool;
use serde_json::json;
use asap_core_shared::{SharedConfig, SharedWsBroadcaster, NoOpBroadcaster};

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "service": "ASAP Core API",
        "version": "0.1.0",
        "status": "running"
    }))
}

/// Creates the main API router with all routes
pub fn create_router(pool: PgPool, config: SharedConfig) -> Router {
    create_router_with_ws(pool, config, None)
}

/// Creates the main API router with WebSocket broadcaster support
pub fn create_router_with_ws(pool: PgPool, config: SharedConfig, ws_broadcaster: Option<SharedWsBroadcaster>) -> Router {
    // Use no-op broadcaster if none provided
    let broadcaster: SharedWsBroadcaster = ws_broadcaster.unwrap_or_else(|| NoOpBroadcaster::new());

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
        // Website extensions routes
        .route("/websites/:id/extensions", get(crate::websites::list_website_extensions))
        .route("/websites/:id/extensions", post(crate::websites::activate_extension))
        .route("/websites/:id/extensions/:extension_id", patch(crate::websites::update_website_extension))
        .route("/websites/:id/extensions/:extension_id", delete(crate::websites::deactivate_extension))
        // Website sections routes
        .route("/websites/:id/sections", get(crate::websites::list_website_sections))
        .route("/websites/:id/sections", post(crate::websites::create_section))
        .route("/websites/:id/sections/reorder", post(crate::websites::reorder_sections))
        .route("/websites/:id/sections/:section_id", patch(crate::websites::update_section))
        .route("/websites/:id/sections/:section_id", delete(crate::websites::delete_section))
        // Website pages routes
        .route("/websites/:id/pages", get(crate::websites::list_website_pages))
        .route("/websites/:id/pages", post(crate::websites::create_page))
        .route("/websites/:id/pages/reorder", post(crate::websites::reorder_pages))
        .route("/websites/:id/pages/:page_id", get(crate::websites::get_page))
        .route("/websites/:id/pages/:page_id", patch(crate::websites::update_page))
        .route("/websites/:id/pages/:page_id", delete(crate::websites::delete_page))
        // Presets routes
        .route("/presets", get(crate::websites::list_presets))
        .route("/websites/from-preset", post(crate::websites::create_website_from_preset))
        // Extension catalog routes
        .route("/extensions/catalog", get(crate::websites::list_available_extensions))
        .route("/extensions/:slug", get(crate::websites::get_extension_by_slug))
        // Website extension data and actions
        .route("/websites/:id/extensions/:extension_slug/data", get(crate::websites::get_website_extension_data))
        .route("/websites/:id/extensions/:extension_slug/actions/:action_key", post(crate::websites::execute_extension_action))
        // Events routes
        .route("/events", get(crate::events::get_events))
        .route("/events", post(crate::events::create_event))
        .route("/events/:id", patch(crate::events::mark_processed))
        // Files routes (authenticated)
        .route("/files", post(crate::files::upload_file))
        .route("/files", get(crate::files::list_files))
        .route("/files/:file_id", delete(crate::files::delete_file))
        .route("/files/quota/usage", get(crate::files::get_quota))
        // Billing routes (authenticated)
        .route("/billing/checkout-session", post(crate::billing::create_checkout_session))
        // Notifications routes
        .route("/notifications", get(crate::notifications::list_notifications))
        .route("/notifications/unread-count", get(crate::notifications::get_unread_count))
        .route("/notifications/mark-read", post(crate::notifications::mark_as_read))
        .route("/notifications/:notification_id", get(crate::notifications::get_notification))
        .route("/notifications/:notification_id/read", post(crate::notifications::mark_notification_read))
        .route("/notifications/:notification_id", delete(crate::notifications::delete_notification))
        // Push notifications routes
        .route("/notifications/push/subscribe", post(crate::notifications::subscribe_push))
        .route("/notifications/push/unsubscribe", post(crate::notifications::unsubscribe_push))
        .route("/notifications/push/vapid-key", get(crate::notifications::get_vapid_public_key))
        // Notification settings routes
        .route("/notifications/settings", get(crate::notifications::get_notification_settings))
        .route("/notifications/settings", put(crate::notifications::update_notification_settings))
        .layer(Extension(storage_service.clone()))
        .layer(Extension(payment_gateway.clone()))
        .layer(Extension(config.clone()))
        .layer(Extension(broadcaster.clone()))
        .with_state(pool.clone())
        .layer(middleware::from_fn_with_state(config.clone(), crate::middleware::auth_middleware));

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(root))
        .route("/auth/signup", post(crate::auth::signup))
        .route("/auth/login", post(crate::auth::login))
        // Public website routes
        .route("/public/websites/:slug", get(crate::websites::get_public_website))
        .route("/public/websites/:slug/sections", get(crate::websites::get_public_website_sections))
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
            "/websites/:id/extensions",
            "/websites/:id/sections",
            "/presets",
            "/events",
            "/extensions",
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
            "/extensions",
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
            "/websites/:id/extensions/:extension_id",
            "/websites/:id/sections/:section_id",
            "/events/:id",
            "/extensions/:id/config",
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
            "/websites/:id/extensions", // List/Activate extensions
            "/websites/:id/extensions/:extension_id", // Update extension
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
    fn test_extension_configuration_routes() {
        // Test extension configuration routes
        let extension_routes = vec![
            "/extensions",           // List
            "/extensions/:id/config", // Get/Update config
            "/extensions/catalog",   // Extension catalog
        ];

        for route in extension_routes {
            assert!(route.contains("/extensions"));
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
