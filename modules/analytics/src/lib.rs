// Analytics Module
// Tracks page views and user interactions

use chrono::Utc;
use serde::{Deserialize, Serialize};

/// Represents an analytics event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsEvent {
    pub event_type: String,
    pub portfolio_slug: Option<String>,
    pub user_id: Option<String>,
    pub timestamp: String,
    pub metadata: serde_json::Value,
}

impl AnalyticsEvent {
    pub fn new(event_type: &str, portfolio_slug: Option<String>, user_id: Option<String>) -> Self {
        Self {
            event_type: event_type.to_string(),
            portfolio_slug,
            user_id,
            timestamp: Utc::now().to_rfc3339(),
            metadata: serde_json::json!({}),
        }
    }
    
    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = metadata;
        self
    }
}

/// Track an analytics event
pub fn track_event(event_type: &str) -> anyhow::Result<()> {
    let event = AnalyticsEvent::new(event_type, None, None);
    tracing::info!(
        "Tracking event: {} at {}",
        event.event_type,
        event.timestamp
    );
    
    // In a real implementation, this would:
    // 1. Send to an analytics backend (e.g., PostHog, Mixpanel)
    // 2. Store in a time-series database
    // 3. Queue for batch processing
    // For now, we just log it
    
    Ok(())
}

/// Track a detailed analytics event with full context
pub fn track_detailed_event(event: AnalyticsEvent) -> anyhow::Result<()> {
    tracing::info!(
        "Tracking detailed event: {} for portfolio {:?} at {}",
        event.event_type,
        event.portfolio_slug,
        event.timestamp
    );
    
    // Serialize for storage/transmission
    let json = serde_json::to_string(&event)?;
    
    // TODO: In production, send to analytics backend (e.g., PostHog, Mixpanel)
    // For now, we log the serialized event for debugging
    tracing::debug!("Analytics event JSON: {}", json);
    
    Ok(())
}

/// Track a page view
pub fn track_page_view(portfolio_slug: &str, user_id: Option<String>) -> anyhow::Result<()> {
    let event = AnalyticsEvent::new("page_view", Some(portfolio_slug.to_string()), user_id);
    track_detailed_event(event)
}

/// Track a button click
pub fn track_click(button_id: &str, portfolio_slug: Option<String>) -> anyhow::Result<()> {
    let metadata = serde_json::json!({
        "button_id": button_id
    });
    
    let event = AnalyticsEvent::new("click", portfolio_slug, None)
        .with_metadata(metadata);
    
    track_detailed_event(event)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_track_event_page_view() {
        let result = track_event("page_view");
        assert!(result.is_ok());
    }

    #[test]
    fn test_track_event_click() {
        let result = track_event("click");
        assert!(result.is_ok());
    }

    #[test]
    fn test_track_event_form_submit() {
        let result = track_event("form_submit");
        assert!(result.is_ok());
    }

    #[test]
    fn test_track_event_custom_event() {
        let result = track_event("custom_event_name");
        assert!(result.is_ok());
    }

    #[test]
    fn test_track_event_empty_string() {
        let result = track_event("");
        assert!(result.is_ok());
    }

    #[test]
    fn test_track_multiple_events() {
        let events = vec!["event1", "event2", "event3"];
        for event in events {
            let result = track_event(event);
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_track_event_with_special_chars() {
        let result = track_event("event_with_special-chars.123");
        assert!(result.is_ok());
    }
}

