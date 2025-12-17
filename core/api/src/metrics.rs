//! V1 MVP: Metrics API handlers
//! 
//! Routes for product analytics:
//! - Track events
//! - Batch track events
//! - Get activation metrics

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use asap_core_shared::Claims;

// ============================================
// Types
// ============================================

#[derive(Debug, Deserialize)]
pub struct TrackEventRequest {
    pub event_type: String,
    pub website_id: Uuid,
    pub event_data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct BatchEventsRequest {
    pub events: Vec<TrackEventRequest>,
}

#[derive(Debug, Serialize)]
pub struct ActivationMetrics {
    pub is_published: bool,
    pub has_minimum_projects: bool,
    pub has_cta: bool,
    pub has_contact_email: bool,
    pub is_activated: bool,
    pub project_count: i32,
    pub activation_score: i32, // 0-100
}

#[derive(Debug, Serialize)]
pub struct AggregatedMetrics {
    pub total_signups: i64,
    pub github_connected: i64,
    pub projects_imported: i64,
    pub sites_published: i64,
    pub activated_users: i64,
    pub signup_to_github: f64,
    pub github_to_import: f64,
    pub import_to_publish: f64,
    pub publish_to_activation: f64,
    pub avg_projects_per_site: f64,
    pub avg_time_to_publish: f64,
    pub period: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, FromRow)]
struct WebsiteWithDataRow {
    id: Uuid,
    account_id: Uuid,
    status: String,
    website_data: Option<serde_json::Value>,
}

// ============================================
// Handlers
// ============================================

/// Track a single event
pub async fn track_event(
    State(_pool): State<PgPool>,
    Json(payload): Json<TrackEventRequest>,
) -> StatusCode {
    // V1: Just log events - no database storage yet
    tracing::info!(
        "Metric event: {} for website {}",
        payload.event_type,
        payload.website_id
    );
    
    if let Some(data) = &payload.event_data {
        tracing::debug!("Event data: {:?}", data);
    }

    StatusCode::ACCEPTED
}

/// Track multiple events (batch)
pub async fn track_events_batch(
    State(_pool): State<PgPool>,
    Json(payload): Json<BatchEventsRequest>,
) -> StatusCode {
    // V1: Just log events - no database storage yet
    tracing::info!("Batch metrics: {} events", payload.events.len());
    
    for event in &payload.events {
        tracing::debug!(
            "Metric event: {} for website {}",
            event.event_type,
            event.website_id
        );
    }

    StatusCode::ACCEPTED
}

/// Get activation metrics for a website
pub async fn get_activation_metrics(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let website_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                "error": "Invalid website ID format"
            }))).into_response();
        }
    };

    let account_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Invalid token"
            }))).into_response();
        }
    };

    // Verify ownership and get website with its data
    let website: Option<WebsiteWithDataRow> = sqlx::query_as(
        r#"
        SELECT 
            w.id, 
            w.account_id, 
            w.status,
            wd.data as website_data
        FROM websites w 
        LEFT JOIN website_data wd ON wd.website_id = w.id
        WHERE w.id = $1
        "#
    )
    .bind(website_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let website = match website {
        Some(w) => w,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "Website not found"
            }))).into_response();
        }
    };

    if website.account_id != account_id {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Not authorized"
        }))).into_response();
    }

    // Parse website data to check activation criteria
    let data = website.website_data.unwrap_or_else(|| serde_json::json!({}));
    let profile = data.get("profile").cloned().unwrap_or_else(|| serde_json::json!({}));
    
    // Count projects
    let projects = profile.get("projects")
        .and_then(|p| p.as_array())
        .map(|arr| arr.len() as i32)
        .unwrap_or(0);
    
    // Check CTA
    let cta = profile.get("cta").cloned().unwrap_or_else(|| serde_json::json!({}));
    let has_cta = cta.get("text").and_then(|t| t.as_str()).map(|s| !s.is_empty()).unwrap_or(false)
        && cta.get("link").and_then(|l| l.as_str()).map(|s| !s.is_empty()).unwrap_or(false);
    
    // Check contact email
    let contact = profile.get("contact").cloned().unwrap_or_else(|| serde_json::json!({}));
    let has_contact_email = contact.get("email")
        .and_then(|e| e.as_str())
        .map(|s| !s.is_empty() && s.contains('@'))
        .unwrap_or(false);
    
    let is_published = website.status == "published";
    let has_minimum_projects = projects >= 3;
    
    // Activation = all criteria met
    let is_activated = is_published && has_minimum_projects && has_cta && has_contact_email;
    
    // Score: 25 points per criteria
    let mut score = 0;
    if is_published { score += 25; }
    if has_minimum_projects { score += 25; }
    if has_cta { score += 25; }
    if has_contact_email { score += 25; }

    (StatusCode::OK, Json(ActivationMetrics {
        is_published,
        has_minimum_projects,
        has_cta,
        has_contact_email,
        is_activated,
        project_count: projects,
        activation_score: score,
    })).into_response()
}

/// Get aggregated metrics (admin only)
pub async fn get_aggregated_metrics(
    State(_pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> impl IntoResponse {
    // V1: Return mock data - real aggregation would query events table
    // TODO: Add admin role check
    
    let now = chrono::Utc::now();
    let week_ago = now - chrono::Duration::days(7);

    (StatusCode::OK, Json(AggregatedMetrics {
        total_signups: 0,
        github_connected: 0,
        projects_imported: 0,
        sites_published: 0,
        activated_users: 0,
        signup_to_github: 0.0,
        github_to_import: 0.0,
        import_to_publish: 0.0,
        publish_to_activation: 0.0,
        avg_projects_per_site: 0.0,
        avg_time_to_publish: 0.0,
        period: "week".to_string(),
        start_date: week_ago.format("%Y-%m-%d").to_string(),
        end_date: now.format("%Y-%m-%d").to_string(),
    })).into_response()
}
