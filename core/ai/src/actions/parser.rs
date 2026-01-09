//! Action Parser
//!
//! Extracts AI actions from model responses.

use regex::Regex;
use tracing::debug;

use crate::error::{AIError, AIResult};
use crate::types::AIAction;

/// Parser for extracting actions from AI responses
pub struct ActionParser {
    json_block_regex: Regex,
}

impl Default for ActionParser {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionParser {
    pub fn new() -> Self {
        // Match ```json ... ``` blocks
        let json_block_regex = Regex::new(r"```json\s*\n?([\s\S]*?)\n?```").unwrap();
        Self { json_block_regex }
    }

    /// Extract all actions from an AI response
    pub fn extract_actions(&self, response: &str) -> Vec<AIAction> {
        let mut actions = Vec::new();

        // Find all JSON blocks
        for cap in self.json_block_regex.captures_iter(response) {
            if let Some(json_match) = cap.get(1) {
                let json_str = json_match.as_str().trim();
                
                // Try to parse as single action
                if let Ok(action) = serde_json::from_str::<AIAction>(json_str) {
                    debug!("Parsed single action: {:?}", action.action_type());
                    actions.push(action);
                    continue;
                }

                // Try to parse as array of actions
                if let Ok(action_list) = serde_json::from_str::<Vec<AIAction>>(json_str) {
                    debug!("Parsed {} actions from array", action_list.len());
                    actions.extend(action_list);
                    continue;
                }

                // Try parsing line by line (for multiple objects not in array)
                for line in json_str.lines() {
                    let line = line.trim();
                    if line.starts_with('{') && line.ends_with('}') {
                        if let Ok(action) = serde_json::from_str::<AIAction>(line) {
                            debug!("Parsed action from line: {:?}", action.action_type());
                            actions.push(action);
                        }
                    }
                }
            }
        }

        if actions.is_empty() {
            debug!("No actions found in response");
        } else {
            debug!("Extracted {} total actions", actions.len());
        }

        actions
    }

    /// Validate an action (basic validation)
    pub fn validate_action(&self, action: &AIAction) -> AIResult<()> {
        match action {
            AIAction::UpdateSectionProperty { property, .. } => {
                if property.is_empty() {
                    return Err(AIError::InvalidAction("Property name cannot be empty".to_string()));
                }
            }
            AIAction::AddSection { section_type, .. } => {
                if section_type.is_empty() {
                    return Err(AIError::InvalidAction("Section type cannot be empty".to_string()));
                }
            }
            AIAction::ChangeVariant { variant, .. } => {
                if variant.is_empty() {
                    return Err(AIError::InvalidAction("Variant cannot be empty".to_string()));
                }
            }
            AIAction::ReorderSections { order } => {
                if order.is_empty() {
                    return Err(AIError::InvalidAction("Order cannot be empty".to_string()));
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// Extract text content (non-action parts) from response
    pub fn extract_text(&self, response: &str) -> String {
        self.json_block_regex.replace_all(response, "").trim().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_extract_single_action() {
        let parser = ActionParser::new();
        let response = r#"
I'll update the headline for you.

```json
{"type": "UPDATE_SECTION_PROPERTY", "section_id": "550e8400-e29b-41d4-a716-446655440000", "property": "headline", "value": "Welcome!"}
```

Done!
"#;

        let actions = parser.extract_actions(response);
        assert_eq!(actions.len(), 1);
        
        match &actions[0] {
            AIAction::UpdateSectionProperty { property, value, .. } => {
                assert_eq!(property, "headline");
                assert_eq!(value, "Welcome!");
            }
            _ => panic!("Wrong action type"),
        }
    }

    #[test]
    fn test_extract_multiple_actions() {
        let parser = ActionParser::new();
        let response = r#"
I'll make those changes.

```json
[
  {"type": "UPDATE_SECTION_PROPERTY", "section_id": "550e8400-e29b-41d4-a716-446655440000", "property": "headline", "value": "Hello"},
  {"type": "CHANGE_VARIANT", "section_id": "550e8400-e29b-41d4-a716-446655440000", "variant": "centered"}
]
```
"#;

        let actions = parser.extract_actions(response);
        assert_eq!(actions.len(), 2);
    }

    #[test]
    fn test_extract_add_section() {
        let parser = ActionParser::new();
        let response = r#"
```json
{"type": "ADD_SECTION", "section_type": "faq", "position": 3, "variant": "accordion"}
```
"#;

        let actions = parser.extract_actions(response);
        assert_eq!(actions.len(), 1);
        
        match &actions[0] {
            AIAction::AddSection { section_type, position, variant, .. } => {
                assert_eq!(section_type, "faq");
                assert_eq!(*position, Some(3));
                assert_eq!(variant.as_deref(), Some("accordion"));
            }
            _ => panic!("Wrong action type"),
        }
    }

    #[test]
    fn test_extract_text() {
        let parser = ActionParser::new();
        let response = r#"
I'll update the headline for you.

```json
{"type": "UPDATE_SECTION_PROPERTY", "section_id": "550e8400-e29b-41d4-a716-446655440000", "property": "headline", "value": "Welcome!"}
```

Is there anything else you'd like me to change?
"#;

        let text = parser.extract_text(response);
        assert!(text.contains("I'll update the headline"));
        assert!(text.contains("anything else"));
        assert!(!text.contains("UPDATE_SECTION_PROPERTY"));
    }

    #[test]
    fn test_no_actions() {
        let parser = ActionParser::new();
        let response = "Sure, I can help you with that. What would you like to change?";
        
        let actions = parser.extract_actions(response);
        assert!(actions.is_empty());
    }

    #[test]
    fn test_validate_action() {
        let parser = ActionParser::new();
        
        // Valid action
        let action = AIAction::UpdateSectionProperty {
            section_id: Uuid::new_v4(),
            property: "headline".to_string(),
            value: serde_json::json!("Hello"),
        };
        assert!(parser.validate_action(&action).is_ok());
        
        // Invalid: empty property
        let action = AIAction::UpdateSectionProperty {
            section_id: Uuid::new_v4(),
            property: "".to_string(),
            value: serde_json::json!("Hello"),
        };
        assert!(parser.validate_action(&action).is_err());
    }
}
