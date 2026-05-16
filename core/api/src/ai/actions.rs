//! Action execution for AI
//!
//! Functions to execute AI-generated actions on websites
//! (update sections, add/remove sections, change themes, etc.)

use axum::{extract::State, http::StatusCode, Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::Claims;
use asap_core_ai::AIAction;

use super::helpers::get_account_id;
use super::types::{ErrorResponse, ExecuteActionRequest, ExecuteActionResponse};

// ============================================================================
// Handler
// ============================================================================

/// Execute an AI action
/// POST /api/v1/ai/execute
pub async fn execute_action(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExecuteActionRequest>,
) -> Result<Json<ExecuteActionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let account_id = get_account_id(&claims).map_err(|s| {
        (
            s,
            Json(ErrorResponse {
                error: "Unauthorized".to_string(),
                code: "unauthorized".to_string(),
                ..Default::default()
            }),
        )
    })?;

    // Verify website access
    let has_access = crate::queries::verify_website_access(&pool, req.website_id, account_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to verify website access: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "Failed to verify access".to_string(),
                    code: "internal_error".to_string(),
                    ..Default::default()
                }),
            )
        })?;

    if !has_access {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Access denied to this website".to_string(),
                code: "forbidden".to_string(),
                ..Default::default()
            }),
        ));
    }

    tracing::info!(
        website_id = %req.website_id,
        account_id = %account_id,
        action_type = ?req.action.action_type(),
        "Executing AI action"
    );

    // Execute the action
    let result = execute_ai_action(&pool, req.website_id, account_id, &req.action).await;

    match result {
        Ok((message, affected_id)) => Ok(Json(ExecuteActionResponse {
            success: true,
            message,
            affected_element_id: affected_id,
            error: None,
        })),
        Err(e) => {
            tracing::error!("Action execution failed: {}", e);
            Ok(Json(ExecuteActionResponse {
                success: false,
                message: "Action failed".to_string(),
                affected_element_id: None,
                error: Some(e.to_string()),
            }))
        }
    }
}

// ============================================================================
// Action Execution Logic
// ============================================================================

/// Execute a single AI action against the database
pub async fn execute_ai_action(
    pool: &PgPool,
    website_id: Uuid,
    account_id: Uuid,
    action: &AIAction,
) -> Result<(String, Option<Uuid>), Box<dyn std::error::Error + Send + Sync>> {
    match action {
        AIAction::UpdateSectionProperty {
            section_id,
            property,
            value,
        } => {
            // Update settings or data based on property type
            // Properties like "headline", "subheadline", etc. go in settings
            // Dynamic content goes in data

            // First, get current element
            let elements =
                crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let element = elements
                .iter()
                .find(|e| e.id == *section_id)
                .ok_or("Section not found")?;

            // Update settings with the new property value
            let mut settings = element.settings.clone();
            if let serde_json::Value::Object(ref mut map) = settings {
                map.insert(property.clone(), value.clone());
            }

            crate::queries::update_website_element(
                pool,
                *section_id,
                website_id,
                account_id,
                None,
                None,
                Some(&settings),
                None,
                None,
            )
            .await?;

            Ok((
                format!("Updated '{}' on section", property),
                Some(*section_id),
            ))
        }

        AIAction::AddSection {
            section_type,
            position,
            variant,
            properties,
        } => {
            // Get max order
            let elements =
                crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let order = position.unwrap_or_else(|| elements.len() as i32);

            // Build settings from properties and variant
            let mut settings = properties.clone().unwrap_or_else(|| serde_json::json!({}));
            if let Some(v) = variant {
                if let serde_json::Value::Object(ref mut map) = settings {
                    map.insert("variant".to_string(), serde_json::json!(v));
                }
            }

            let slug = format!(
                "{}-{}",
                section_type,
                uuid::Uuid::new_v4()
                    .to_string()
                    .split('-')
                    .next()
                    .unwrap_or("new")
            );

            let element_id = crate::queries::create_website_element(
                pool,
                website_id,
                account_id,
                None, // extension_id
                section_type,
                &slug,
                section_type, // title = section_type for now
                order,
                "default", // layout
                &settings,
                &serde_json::json!({}), // data
            )
            .await?;

            Ok((format!("Added {} section", section_type), Some(element_id)))
        }

        AIAction::RemoveSection { section_id } => {
            crate::queries::delete_website_element(pool, *section_id, website_id, account_id)
                .await?;
            Ok(("Section removed".to_string(), Some(*section_id)))
        }

        AIAction::ReorderSections { order } => {
            crate::queries::reorder_website_elements(pool, website_id, account_id, order).await?;
            Ok((format!("Reordered {} sections", order.len()), None))
        }

        AIAction::ChangeVariant {
            section_id,
            variant,
        } => {
            // Get current element
            let elements =
                crate::queries::list_website_elements(pool, website_id, account_id).await?;
            let element = elements
                .iter()
                .find(|e| e.id == *section_id)
                .ok_or("Section not found")?;

            // Update settings with new variant
            let mut settings = element.settings.clone();
            if let serde_json::Value::Object(ref mut map) = settings {
                map.insert("variant".to_string(), serde_json::json!(variant));
            }

            crate::queries::update_website_element(
                pool,
                *section_id,
                website_id,
                account_id,
                None,
                None,
                Some(&settings),
                None,
                None,
            )
            .await?;

            Ok((
                format!("Changed variant to '{}'", variant),
                Some(*section_id),
            ))
        }

        AIAction::UpdateTheme { changes } => {
            // Theme is stored in website_data
            // Update the theme object in the data JSONB column
            sqlx::query(
                r#"
                UPDATE websites 
                SET data = jsonb_set(
                    COALESCE(data, '{}'::jsonb),
                    '{theme}',
                    COALESCE(data->'theme', '{}'::jsonb) || $1::jsonb,
                    true
                ),
                updated_at = now()
                WHERE id = $2 AND account_id = $3
                "#,
            )
            .bind(changes)
            .bind(website_id)
            .bind(account_id)
            .execute(pool)
            .await?;

            Ok(("Theme updated".to_string(), None))
        }

        AIAction::UpdateMetadata { changes } => {
            // Update website metadata (title, description, etc.)
            if let serde_json::Value::Object(map) = changes {
                if let Some(title) = map.get("title").and_then(|v| v.as_str()) {
                    sqlx::query("UPDATE websites SET title = $1, updated_at = now() WHERE id = $2 AND account_id = $3")
                        .bind(title)
                        .bind(website_id)
                        .bind(account_id)
                        .execute(pool)
                        .await?;
                }
                // Add more metadata fields as needed
            }

            Ok(("Metadata updated".to_string(), None))
        }

        AIAction::GenerateImage {
            prompt,
            target_section_id,
            target_property,
        } => {
            // Image generation is handled separately through the AI orchestrator
            // For now, just acknowledge the request
            tracing::info!(
                prompt = prompt,
                target_section_id = ?target_section_id,
                target_property = ?target_property,
                "Image generation requested - not yet implemented"
            );

            Ok((
                "Image generation queued (coming soon)".to_string(),
                *target_section_id,
            ))
        }
    }
}
