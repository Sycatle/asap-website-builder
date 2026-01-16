//! Action Executor
//!
//! Executes AI actions against the database via a pluggable backend.
//! The core/ai crate defines the trait, apps/api provides the real implementation.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

use crate::error::{AIError, AIResult};
use crate::types::AIAction;

/// Result of executing an action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub success: bool,
    pub action_type: String,
    pub message: String,
    pub affected_section_id: Option<Uuid>,
    /// Error details if success is false
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ActionResult {
    pub fn success(action_type: &str, message: String, section_id: Option<Uuid>) -> Self {
        Self {
            success: true,
            action_type: action_type.to_string(),
            message,
            affected_section_id: section_id,
            error: None,
        }
    }

    pub fn failure(action_type: &str, message: String, error: String) -> Self {
        Self {
            success: false,
            action_type: action_type.to_string(),
            message,
            affected_section_id: None,
            error: Some(error),
        }
    }
}

/// Trait for action execution backends
/// 
/// Implement this trait in apps/api to provide real database operations.
/// The AI orchestrator uses this trait to execute actions without knowing
/// about the database implementation.
#[async_trait]
pub trait ActionBackend: Send + Sync {
    /// Execute a single action
    async fn execute(
        &self,
        action: &AIAction,
        website_id: Uuid,
        account_id: Uuid,
    ) -> AIResult<ActionResult>;

    /// Validate that account owns the website (security check)
    async fn validate_ownership(&self, website_id: Uuid, account_id: Uuid) -> AIResult<bool>;

    /// Check if the backend is connected and ready
    fn is_ready(&self) -> bool;
}

/// Action executor that delegates to a pluggable backend
pub struct ActionExecutor {
    backend: Option<Arc<dyn ActionBackend>>,
    /// If true, fail loudly when no backend. If false, use dry-run mode.
    strict_mode: bool,
}

impl Default for ActionExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionExecutor {
    /// Create executor without backend (dry-run mode, logs but doesn't persist)
    pub fn new() -> Self {
        Self {
            backend: None,
            strict_mode: false,
        }
    }

    /// Create executor with a real backend for production use
    pub fn with_backend(backend: Arc<dyn ActionBackend>) -> Self {
        Self {
            backend: Some(backend),
            strict_mode: true,
        }
    }

    /// Create executor in strict mode (fails if no backend configured)
    pub fn strict() -> Self {
        Self {
            backend: None,
            strict_mode: true,
        }
    }

    /// Set the backend after construction
    pub fn set_backend(&mut self, backend: Arc<dyn ActionBackend>) {
        self.backend = Some(backend);
    }

    /// Check if a real backend is configured
    pub fn has_backend(&self) -> bool {
        self.backend.as_ref().map(|b| b.is_ready()).unwrap_or(false)
    }

    /// Execute an action
    pub async fn execute(
        &self,
        action: &AIAction,
        website_id: Uuid,
        account_id: Uuid,
    ) -> AIResult<ActionResult> {
        info!(
            website_id = %website_id,
            account_id = %account_id,
            action_type = action.action_type(),
            has_backend = self.has_backend(),
            "Executing AI action"
        );

        // If we have a real backend, use it
        if let Some(ref backend) = self.backend {
            if backend.is_ready() {
                // Security: validate ownership first
                match backend.validate_ownership(website_id, account_id).await {
                    Ok(true) => {
                        // Ownership confirmed, execute action
                        return backend.execute(action, website_id, account_id).await;
                    }
                    Ok(false) => {
                        error!(
                            website_id = %website_id,
                            account_id = %account_id,
                            "Account does not own website - action denied"
                        );
                        return Err(AIError::PermissionDenied(format!(
                            "Account {} does not own website {}",
                            account_id, website_id
                        )));
                    }
                    Err(e) => {
                        error!(
                            website_id = %website_id,
                            account_id = %account_id,
                            error = %e,
                            "Failed to validate ownership"
                        );
                        return Err(e);
                    }
                }
            }
        }

        // No backend available
        if self.strict_mode {
            error!("Action execution failed: no backend configured (strict mode)");
            return Err(AIError::ConfigError(
                "Action backend not configured. Actions cannot be persisted.".to_string()
            ));
        }

        // Dry-run mode: log and return simulated success
        warn!(
            action_type = action.action_type(),
            website_id = %website_id,
            "DRY-RUN: Action logged but NOT persisted (no backend configured)"
        );

        Ok(self.dry_run_execute(action))
    }

    /// Simulate action execution for dry-run/testing
    fn dry_run_execute(&self, action: &AIAction) -> ActionResult {
        let (action_type, message, section_id) = match action {
            AIAction::UpdateSectionProperty { section_id, property, .. } => {
                debug!(section_id = %section_id, property = property, "DRY-RUN: Update property");
                (
                    action.action_type(),
                    format!("[DRY-RUN] Would update {} on section {}", property, section_id),
                    Some(*section_id),
                )
            }
            AIAction::AddSection { section_type, position, variant, .. } => {
                let fake_id = Uuid::new_v4();
                debug!(section_type = section_type, position = ?position, variant = ?variant, "DRY-RUN: Add section");
                (
                    action.action_type(),
                    format!("[DRY-RUN] Would add {} section at position {:?}", section_type, position),
                    Some(fake_id),
                )
            }
            AIAction::RemoveSection { section_id } => {
                debug!(section_id = %section_id, "DRY-RUN: Remove section");
                (
                    action.action_type(),
                    format!("[DRY-RUN] Would remove section {}", section_id),
                    Some(*section_id),
                )
            }
            AIAction::ReorderSections { order } => {
                debug!(order = ?order, "DRY-RUN: Reorder sections");
                (
                    action.action_type(),
                    format!("[DRY-RUN] Would reorder {} sections", order.len()),
                    None,
                )
            }
            AIAction::ChangeVariant { section_id, variant } => {
                debug!(section_id = %section_id, variant = variant, "DRY-RUN: Change variant");
                (
                    action.action_type(),
                    format!("[DRY-RUN] Would change variant to {} on section {}", variant, section_id),
                    Some(*section_id),
                )
            }
            AIAction::UpdateTheme { changes } => {
                debug!(changes = ?changes, "DRY-RUN: Update theme");
                (
                    action.action_type(),
                    "[DRY-RUN] Would update theme".to_string(),
                    None,
                )
            }
            AIAction::UpdateMetadata { changes } => {
                debug!(changes = ?changes, "DRY-RUN: Update metadata");
                (
                    action.action_type(),
                    "[DRY-RUN] Would update website metadata".to_string(),
                    None,
                )
            }
            AIAction::GenerateImage { prompt, target_section_id, target_property } => {
                debug!(
                    prompt = prompt,
                    target_section_id = ?target_section_id,
                    target_property = ?target_property,
                    "DRY-RUN: Generate image"
                );
                (
                    action.action_type(),
                    "[DRY-RUN] Would queue image generation".to_string(),
                    *target_section_id,
                )
            }
        };

        ActionResult {
            success: true, // Dry-run always "succeeds"
            action_type: action_type.to_string(),
            message,
            affected_section_id: section_id,
            error: None,
        }
    }

    /// Execute multiple actions in sequence
    pub async fn execute_batch(
        &self,
        actions: &[AIAction],
        website_id: Uuid,
        account_id: Uuid,
    ) -> Vec<AIResult<ActionResult>> {
        let mut results = Vec::with_capacity(actions.len());

        for action in actions {
            let result = self.execute(action, website_id, account_id).await;
            
            // In strict mode, stop on first error
            if self.strict_mode && result.is_err() {
                results.push(result);
                break;
            }
            
            results.push(result);
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_execute_update_property_dry_run() {
        // Without backend = dry-run mode
        let executor = ActionExecutor::new();
        let action = AIAction::UpdateSectionProperty {
            section_id: Uuid::new_v4(),
            property: "headline".to_string(),
            value: json!("New Headline"),
        };

        let result = executor
            .execute(&action, Uuid::new_v4(), Uuid::new_v4())
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.action_type, "UPDATE_SECTION_PROPERTY");
        assert!(result.message.contains("DRY-RUN"));
    }

    #[tokio::test]
    async fn test_strict_mode_fails_without_backend() {
        let executor = ActionExecutor::strict();
        let action = AIAction::UpdateSectionProperty {
            section_id: Uuid::new_v4(),
            property: "headline".to_string(),
            value: json!("New Headline"),
        };

        let result = executor
            .execute(&action, Uuid::new_v4(), Uuid::new_v4())
            .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_execute_add_section_dry_run() {
        let executor = ActionExecutor::new();
        let action = AIAction::AddSection {
            section_type: "faq".to_string(),
            position: Some(3),
            variant: Some("accordion".to_string()),
            properties: None,
        };

        let result = executor
            .execute(&action, Uuid::new_v4(), Uuid::new_v4())
            .await
            .unwrap();

        assert!(result.success);
        assert!(result.affected_section_id.is_some());
        assert!(result.message.contains("DRY-RUN"));
    }

    #[tokio::test]
    async fn test_execute_batch_dry_run() {
        let executor = ActionExecutor::new();
        let actions = vec![
            AIAction::UpdateSectionProperty {
                section_id: Uuid::new_v4(),
                property: "headline".to_string(),
                value: json!("Hello"),
            },
            AIAction::UpdateTheme {
                changes: json!({"primaryColor": "#FF0000"}),
            },
        ];

        let results = executor
            .execute_batch(&actions, Uuid::new_v4(), Uuid::new_v4())
            .await;

        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.is_ok()));
    }

    #[tokio::test]
    async fn test_has_backend() {
        let executor = ActionExecutor::new();
        assert!(!executor.has_backend());
    }
}
