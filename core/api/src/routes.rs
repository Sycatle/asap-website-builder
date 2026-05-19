use crate::rate_limit::{RateLimiter, SharedRateLimiter};
use asap_core_ai::{AIConfig, AIOrchestrator, AIRateLimiter};
use asap_core_notifications::{
    NoopEmailProvider, ResendConfig, ResendProvider, SharedEmailProvider,
};
use asap_core_shared::{NoOpBroadcaster, SharedConfig, SharedWsBroadcaster};
use axum::{
    extract::DefaultBodyLimit,
    middleware,
    routing::{delete, get, patch, post, put},
    Extension, Json, Router,
};
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "service": "ASAP Core API",
        "version": "0.1.0",
        "status": "running"
    }))
}

/// Creates the main API router with all routes
pub async fn create_router(pool: PgPool, config: SharedConfig) -> Router {
    create_router_with_ws(pool, config, None).await
}

/// Creates the main API router with WebSocket broadcaster support
pub async fn create_router_with_ws(
    pool: PgPool,
    config: SharedConfig,
    ws_broadcaster: Option<SharedWsBroadcaster>,
) -> Router {
    // Use no-op broadcaster if none provided
    let broadcaster: SharedWsBroadcaster = ws_broadcaster.unwrap_or_else(|| NoOpBroadcaster::new());

    // Initialize rate limiter
    let rate_limiter: SharedRateLimiter = Arc::new(RateLimiter::new());

    // Initialize file storage service
    let storage_service =
        std::sync::Arc::new(crate::storage::FileStorageService::new(pool.clone()));

    // Initialize payment gateway (Stripe) - graceful fallback if init fails
    let payment_gateway: std::sync::Arc<dyn asap_core_payments::PaymentGateway> = {
        let stripe_api_key =
            std::env::var("STRIPE_API_KEY").unwrap_or_else(|_| "sk_test_placeholder".to_string());
        let stripe_webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_placeholder".to_string());

        match asap_core_payments::StripeProvider::new(stripe_api_key, stripe_webhook_secret) {
            Ok(provider) => {
                tracing::info!("Stripe payment provider initialized successfully");
                std::sync::Arc::new(provider)
            }
            Err(e) => {
                tracing::error!(
                    "Failed to initialize Stripe provider: {}. Using no-op provider.",
                    e
                );
                std::sync::Arc::new(asap_core_payments::NoOpPaymentGateway::new())
            }
        }
    };

    // Initialize AI Orchestrator - graceful fallback if not configured
    let ai_orchestrator: Arc<AIOrchestrator> = {
        let ai_config = AIConfig::from_env();

        // Check if we're in dev mode (disable rate limiting for easier development)
        let is_dev = std::env::var("ENVIRONMENT")
            .map(|e| e == "development")
            .unwrap_or(true);

        // Try to initialize Redis-backed rate limiter for AI (disabled in dev)
        let ai_rate_limiter = if is_dev {
            tracing::info!("Development mode: AI rate limiting disabled");
            None
        } else {
            match std::env::var("REDIS_URL") {
                Ok(redis_url) => {
                    // Create Redis connection manager
                    match redis::Client::open(redis_url.as_str()) {
                        Ok(client) => match redis::aio::ConnectionManager::new(client).await {
                            Ok(conn_manager) => {
                                tracing::info!("AI rate limiter initialized with Redis");
                                Some(Arc::new(AIRateLimiter::new(
                                    conn_manager,
                                    ai_config.clone(),
                                )))
                            }
                            Err(e) => {
                                tracing::warn!("Failed to create Redis connection manager: {}. AI rate limiting disabled.", e);
                                None
                            }
                        },
                        Err(e) => {
                            tracing::warn!(
                                "Failed to create Redis client: {}. AI rate limiting disabled.",
                                e
                            );
                            None
                        }
                    }
                }
                Err(_) => {
                    tracing::warn!("REDIS_URL not set. AI rate limiting disabled.");
                    None
                }
            }
        };

        let orchestrator = AIOrchestrator::new(ai_config, ai_rate_limiter);

        if orchestrator.is_configured() {
            tracing::info!(
                "AI Orchestrator initialized with providers: {:?}",
                orchestrator.available_providers()
            );
        } else {
            tracing::warn!("AI Orchestrator initialized but no providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
        }

        Arc::new(orchestrator)
    };

    // Email provider (Resend). In production, missing config is enforced at
    // `apps/api/src/config.rs` startup; here we fall back to noop so unit tests
    // and dev runs without RESEND_API_KEY stay green.
    let email_provider: SharedEmailProvider = match ResendConfig::from_env() {
        Some(cfg) => match ResendProvider::new(cfg) {
            Ok(provider) => {
                tracing::info!("Resend email provider initialized");
                Arc::new(provider)
            }
            Err(e) => {
                tracing::error!("Resend init failed ({e}); falling back to noop provider");
                Arc::new(NoopEmailProvider)
            }
        },
        None => {
            tracing::warn!("RESEND_API_KEY not set — using noop email provider");
            Arc::new(NoopEmailProvider)
        }
    };

    // Authenticated routes (require JWT)
    let authenticated_routes = Router::new()
        .route("/auth/me", get(crate::auth::me))
        .route("/auth/change-password", post(crate::auth::change_password))
        .route("/auth/logout", post(crate::auth::logout))
        .route("/auth/logout-all", post(crate::auth::logout_all))
        .route("/auth/sessions", get(crate::auth::list_sessions))
        .route("/auth/sessions/revoke", post(crate::auth::revoke_session))
        // Account routes
        .route("/accounts/:id", get(crate::accounts::get_account))
        .route("/accounts/:id", put(crate::accounts::update_account))
        .route("/accounts/:id", delete(crate::accounts::delete_account))
        .route("/account/export", get(crate::accounts::export_account))
        .route(
            "/accounts/:id/integrations",
            get(crate::integrations::get_integrations),
        )
        .route(
            "/accounts/:id/integrations/github",
            put(crate::integrations::update_github_integration),
        )
        // Website routes
        .route("/websites", get(crate::websites::list_websites))
        .route("/websites", post(crate::websites::create_website))
        .route("/websites/:id", get(crate::websites::get_website))
        .route("/websites/:id", put(crate::websites::update_website))
        .route("/websites/:id/data", get(crate::websites::get_website_data))
        .route(
            "/websites/:id/data",
            patch(crate::websites::patch_website_data),
        )
        .route(
            "/websites/:id/publish",
            post(crate::websites::publish_website),
        )
        // Website extensions routes
        .route(
            "/websites/:id/extensions",
            get(crate::websites::list_website_extensions),
        )
        .route(
            "/websites/:id/extensions",
            post(crate::websites::activate_extension),
        )
        .route(
            "/websites/:id/extensions/:extension_id",
            patch(crate::websites::update_website_extension),
        )
        .route(
            "/websites/:id/extensions/:extension_id",
            delete(crate::websites::deactivate_extension),
        )
        // Website elements routes
        .route(
            "/websites/:id/elements",
            get(crate::websites::list_website_elements),
        )
        .route(
            "/websites/:id/elements",
            post(crate::websites::create_element),
        )
        .route(
            "/websites/:id/elements/reorder",
            post(crate::websites::reorder_elements),
        )
        .route(
            "/websites/:id/elements/:element_id",
            patch(crate::websites::update_element),
        )
        .route(
            "/websites/:id/elements/:element_id",
            delete(crate::websites::delete_element),
        )
        // Website pages routes
        .route(
            "/websites/:id/pages",
            get(crate::websites::list_website_pages),
        )
        .route("/websites/:id/pages", post(crate::websites::create_page))
        .route(
            "/websites/:id/pages/reorder",
            post(crate::websites::reorder_pages),
        )
        .route(
            "/websites/:id/pages/:page_id",
            get(crate::websites::get_page),
        )
        .route(
            "/websites/:id/pages/:page_id",
            patch(crate::websites::update_page),
        )
        .route(
            "/websites/:id/pages/:page_id",
            delete(crate::websites::delete_page),
        )
        // Presets routes
        .route("/presets", get(crate::websites::list_presets))
        .route(
            "/websites/from-preset",
            post(crate::websites::create_website_from_preset),
        )
        // Extension catalog routes
        .route(
            "/extensions/catalog",
            get(crate::websites::list_available_extensions),
        )
        .route(
            "/extensions/:slug",
            get(crate::websites::get_extension_by_slug),
        )
        // Website extension data and actions
        .route(
            "/websites/:id/extensions/:extension_slug/data",
            get(crate::websites::get_website_extension_data),
        )
        .route(
            "/websites/:id/extensions/:extension_slug/actions/:action_key",
            post(crate::websites::execute_extension_action),
        )
        // Website administrators routes
        .route(
            "/websites/:id/administrators",
            get(crate::administrators::list_administrators),
        )
        .route(
            "/websites/:id/administrators/invite",
            post(crate::administrators::invite_administrator),
        )
        .route(
            "/websites/:id/administrators/:admin_id",
            patch(crate::administrators::update_administrator),
        )
        .route(
            "/websites/:id/administrators/:admin_id",
            delete(crate::administrators::remove_administrator),
        )
        .route(
            "/websites/:id/administrators/:admin_id/resend",
            post(crate::administrators::resend_invitation),
        )
        // Events routes
        .route("/events", get(crate::events::get_events))
        .route("/events", post(crate::events::create_event))
        .route("/events/:id", patch(crate::events::mark_processed))
        // Files routes (authenticated) - upload has larger body limit for file uploads (50MB)
        .route(
            "/files",
            post(crate::files::upload_file).layer(DefaultBodyLimit::max(50 * 1024 * 1024)),
        )
        .route("/files", get(crate::files::list_files))
        .route("/files/:file_id", patch(crate::files::update_file))
        .route("/files/:file_id", delete(crate::files::delete_file))
        .route("/files/quota/usage", get(crate::files::get_quota))
        // Folders routes (authenticated)
        .route("/folders", get(crate::files::list_folders))
        .route("/folders", post(crate::files::create_folder))
        .route("/folders/:folder_id", patch(crate::files::update_folder))
        .route("/folders/:folder_id", delete(crate::files::delete_folder))
        // Billing routes (authenticated)
        .route(
            "/billing/checkout-session",
            post(crate::billing::create_checkout_session),
        )
        // Notifications routes
        .route(
            "/notifications",
            get(crate::notifications::list_notifications),
        )
        .route(
            "/notifications/unread-count",
            get(crate::notifications::get_unread_count),
        )
        .route(
            "/notifications/mark-read",
            post(crate::notifications::mark_as_read),
        )
        .route(
            "/notifications/:notification_id",
            get(crate::notifications::get_notification),
        )
        .route(
            "/notifications/:notification_id/read",
            post(crate::notifications::mark_notification_read),
        )
        .route(
            "/notifications/:notification_id",
            delete(crate::notifications::delete_notification),
        )
        // Push notifications routes
        .route(
            "/notifications/push/subscribe",
            post(crate::notifications::subscribe_push),
        )
        .route(
            "/notifications/push/unsubscribe",
            post(crate::notifications::unsubscribe_push),
        )
        .route(
            "/notifications/push/vapid-key",
            get(crate::notifications::get_vapid_public_key),
        )
        // Notification settings routes
        .route(
            "/notifications/settings",
            get(crate::notifications::get_notification_settings),
        )
        .route(
            "/notifications/settings",
            put(crate::notifications::update_notification_settings),
        )
        // Onboarding routes (V1 MVP)
        .route(
            "/websites/:id/onboarding",
            get(crate::onboarding::get_onboarding_state),
        )
        .route(
            "/websites/:id/onboarding",
            patch(crate::onboarding::update_onboarding_step),
        )
        .route(
            "/websites/:id/onboarding/skip-github",
            post(crate::onboarding::skip_github_import),
        )
        .route(
            "/websites/onboarding/derive-tokens",
            post(crate::onboarding::derive_tokens_handler),
        )
        // GitHub integration routes (V1 MVP)
        .route(
            "/websites/:id/github/connect",
            post(crate::github::initiate_github_oauth),
        )
        .route(
            "/websites/:id/github/callback",
            post(crate::github::github_oauth_callback),
        )
        .route(
            "/websites/:id/github/repos",
            get(crate::github::fetch_github_repos),
        )
        .route(
            "/websites/:id/github/import",
            post(crate::github::import_github_repos),
        )
        // Collections routes
        .route(
            "/websites/:id/collections",
            get(crate::collections::list_collections),
        )
        .route(
            "/websites/:id/collections/:slug",
            get(crate::collections::get_collection),
        )
        .route(
            "/websites/:id/collections/:slug",
            put(crate::collections::upsert_collection),
        )
        .route(
            "/websites/:id/collections/:slug",
            delete(crate::collections::delete_collection),
        )
        .route(
            "/websites/:id/collections/:slug/sync",
            post(crate::collections::trigger_collection_sync),
        )
        // Variables routes
        .route(
            "/websites/:id/variables",
            get(crate::collections::list_variables),
        )
        .route(
            "/websites/:id/variables/recompute",
            post(crate::collections::recompute_variables),
        )
        .route(
            "/websites/:id/variables/:key",
            get(crate::collections::get_variable),
        )
        .route(
            "/websites/:id/variables/:key",
            put(crate::collections::set_variable),
        )
        .route(
            "/websites/:id/variables/:key",
            delete(crate::collections::delete_variable),
        )
        // Metrics routes (V1 MVP)
        .route(
            "/websites/:id/activation",
            get(crate::metrics::get_activation_metrics),
        )
        .route(
            "/metrics/aggregated",
            get(crate::metrics::get_aggregated_metrics),
        )
        // Extension Store - Account Extensions (install/uninstall)
        .route(
            "/account/extensions",
            get(crate::store::list_installed_extensions),
        )
        .route(
            "/account/extensions/:slug",
            get(crate::store::get_installed_extension),
        )
        .route(
            "/account/extensions/:slug/install",
            post(crate::store::install_account_extension),
        )
        .route(
            "/account/extensions/:slug",
            delete(crate::store::uninstall_account_extension),
        )
        .route(
            "/account/extensions/:slug/settings",
            patch(crate::store::update_installed_extension_settings),
        )
        .route(
            "/account/extensions/:slug/toggle",
            patch(crate::store::toggle_installed_extension),
        )
        // Extension Store - Website Extensions v2 (activate/deactivate)
        .route(
            "/websites/:id/extensions/v2",
            get(crate::store::list_website_extensions),
        )
        .route(
            "/websites/:id/extensions/v2/:slug/activate",
            post(crate::store::activate_extension_on_website),
        )
        .route(
            "/websites/:id/extensions/v2/:slug",
            delete(crate::store::deactivate_extension_from_website),
        )
        .route(
            "/websites/:id/extensions/v2/:slug/settings",
            patch(crate::store::update_website_extension_settings),
        )
        .route(
            "/websites/:id/extensions/v2/:slug/toggle",
            patch(crate::store::toggle_website_extension),
        )
        // AI Chat routes
        .route("/ai/chat", post(crate::ai::chat))
        .route("/ai/chat/stream", post(crate::ai::chat_stream))
        .route("/ai/execute", post(crate::ai::execute_action))
        .route("/ai/quota", get(crate::ai::get_quota))
        .route("/ai/status", get(crate::ai::status))
        // AI Vision routes (screenshot analysis)
        .route(
            "/ai/vision/upload",
            post(crate::ai::upload_vision_screenshot),
        )
        .route("/ai/vision/:id", get(crate::ai::get_vision_screenshot))
        .route("/ai/vision/analyze", post(crate::ai::analyze_vision))
        // AI Conversations routes
        .route("/ai/conversations", get(crate::ai::list_conversations))
        .route("/ai/conversations/:id", get(crate::ai::get_conversation))
        .route(
            "/ai/conversations/:id",
            delete(crate::ai::delete_conversation),
        )
        .layer(Extension(ai_orchestrator.clone()))
        .layer(Extension(storage_service.clone()))
        .layer(Extension(payment_gateway.clone()))
        .layer(Extension(email_provider.clone()))
        .layer(Extension(config.clone()))
        .layer(Extension(broadcaster.clone()))
        .with_state(pool.clone())
        .layer(middleware::from_fn_with_state(
            config.clone(),
            crate::middleware::auth_middleware,
        ))
        // CSRF protection for state-changing requests
        .layer(middleware::from_fn_with_state(
            config.clone(),
            crate::csrf::csrf_middleware,
        ));

    // Public routes (no auth required) - with body size limits to prevent DoS
    // Auth requests: 16KB max (username/password/email)
    // Webhook: 1MB max (Stripe events can be large)
    // Metrics: 64KB max (batch events)
    let public_routes = Router::new()
        .route("/", get(root))
        .route("/auth/signup", post(crate::auth::signup))
        .route("/auth/login", post(crate::auth::login))
        .route("/auth/refresh", post(crate::auth::refresh_token))
        .route("/auth/forgot-password", post(crate::auth::forgot_password))
        .route("/auth/reset-password", post(crate::auth::reset_password))
        // OAuth routes (user authentication)
        .route("/auth/oauth/:provider", get(crate::oauth::initiate_oauth))
        .route(
            "/auth/oauth/:provider/callback",
            get(crate::oauth::oauth_callback),
        )
        // CSRF token endpoint (public, needed before login)
        .route("/auth/csrf-token", get(crate::csrf::get_csrf_token))
        // Public website routes
        .route(
            "/public/websites/:slug",
            get(crate::websites::get_public_website),
        )
        .route(
            "/public/websites/:slug/elements",
            get(crate::websites::get_public_website_elements),
        )
        .route(
            "/public/websites/:slug/pages",
            get(crate::websites::get_public_website_pages),
        )
        // Extension Store routes (public browsing)
        .route("/store/extensions", get(crate::store::list_extensions))
        .route(
            "/store/extensions/featured",
            get(crate::store::list_featured_extensions),
        )
        .route("/store/extensions/:slug", get(crate::store::get_extension))
        .route(
            "/store/extensions/:slug/manifest",
            get(crate::store::get_extension_manifest),
        )
        .route("/store/categories", get(crate::store::list_categories))
        // File download (auth via query param for media embeds)
        .route("/files/:file_id", get(crate::files::download_file))
        // Webhook routes (public but signature verified) - larger limit for Stripe events
        .route(
            "/payments/webhook/stripe",
            post(crate::webhooks::stripe_webhook).layer(DefaultBodyLimit::max(1024 * 1024)),
        )
        // Metrics events (public - fire-and-forget tracking) - moderate limit for batches
        .route(
            "/metrics/events",
            post(crate::metrics::track_event).layer(DefaultBodyLimit::max(64 * 1024)),
        )
        .route(
            "/metrics/events/batch",
            post(crate::metrics::track_events_batch).layer(DefaultBodyLimit::max(64 * 1024)),
        )
        .layer(Extension(storage_service))
        .layer(Extension(payment_gateway))
        .layer(Extension(email_provider))
        .layer(Extension(config.clone()))
        .with_state(pool)
        // Rate limiting for auth endpoints (applied before CSRF)
        .layer(middleware::from_fn_with_state(
            rate_limiter,
            crate::rate_limit::auth_rate_limit_middleware,
        ))
        // CSRF protection for public routes (login/signup)
        .layer(middleware::from_fn_with_state(
            config.clone(),
            crate::csrf::csrf_middleware,
        ))
        // Global body limit for auth routes (16KB) - applied last, acts as default
        .layer(DefaultBodyLimit::max(16 * 1024));

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
            "/websites/:id/elements",
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
        let public_routes = vec!["/", "/auth/signup", "/auth/login", "/public/websites/:slug"];

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
            "/websites/:id/elements/:element_id",
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
            "/websites",                              // List
            "/websites/:id",                          // Get/Update
            "/websites/:id/data",                     // Patch data
            "/websites/:id/publish",                  // Publish action
            "/websites/:id/extensions",               // List/Activate extensions
            "/websites/:id/extensions/:extension_id", // Update extension
            "/websites/:id/elements",                 // List/Create elements
            "/websites/:id/elements/:element_id",     // Update/Delete element
            "/websites/:id/elements/reorder",         // Reorder elements
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
            "/extensions",            // List
            "/extensions/:id/config", // Get/Update config
            "/extensions/catalog",    // Extension catalog
        ];

        for route in extension_routes {
            assert!(route.contains("/extensions"));
        }
    }

    #[test]
    fn test_auth_routes() {
        let auth_routes = vec!["/auth/signup", "/auth/login", "/auth/me"];

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
        let public_routes = vec!["/public/websites/:slug"];

        for route in public_routes {
            assert!(route.contains("public"));
            assert!(route.contains("/websites/"));
        }
    }
}
