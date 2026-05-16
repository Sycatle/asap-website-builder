//! Mirror of the TypeScript variant catalog in `packages/renderers/src/variant-catalog.ts`.
//!
//! Used by the AI tooling to know which `variant_key`s are valid and to
//! validate `variant_params` before persisting an AI-proposed variant.
//!
//! Keep this in lockstep with the TS file — adding a variant in one
//! place but not the other will surface as a `validate_variant` failure
//! at runtime and as a missing renderer at render time.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VariantParamType {
    Select,
    Number,
    Boolean,
    String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantParamSpec {
    pub key: &'static str,
    pub label: &'static str,
    #[serde(rename = "type")]
    pub param_type: VariantParamType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<&'static str>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantSpec {
    pub key: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub params: Vec<VariantParamSpec>,
}

pub fn variant_catalog() -> BTreeMap<&'static str, Vec<VariantSpec>> {
    let mut map: BTreeMap<&'static str, Vec<VariantSpec>> = BTreeMap::new();

    map.insert(
        "hero",
        vec![
            VariantSpec {
                key: "hero/centered-minimal",
                label: "Centered Minimal",
                description: "Centered headline with CTAs and optional social proof. The default.",
                params: vec![density_param()],
            },
            VariantSpec {
                key: "hero/split-asymmetric",
                label: "Split Asymmetric",
                description: "Text on the left, oversized visual on the right.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "image_ratio",
                        label: "Visual width ratio",
                        param_type: VariantParamType::Number,
                        options: None,
                        min: Some(0.35),
                        max: Some(0.7),
                    },
                    free_string_param("visual_url", "Visual URL"),
                    free_string_param("visual_alt", "Visual alt text"),
                ],
            },
            VariantSpec {
                key: "hero/full-bleed",
                label: "Full Bleed",
                description: "Full-viewport background image with centered text overlay.",
                params: vec![
                    density_param(),
                    free_string_param("background_url", "Background URL"),
                    VariantParamSpec {
                        key: "overlay_opacity",
                        label: "Overlay opacity",
                        param_type: VariantParamType::Number,
                        options: None,
                        min: Some(0.0),
                        max: Some(1.0),
                    },
                    VariantParamSpec {
                        key: "align",
                        label: "Alignment",
                        param_type: VariantParamType::Select,
                        options: Some(vec!["left", "center", "right"]),
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map.insert(
        "features",
        vec![
            VariantSpec {
                key: "features/cards-grid",
                label: "Cards Grid",
                description: "Classic 2/3/4-column grid of feature cards. The default.",
                params: vec![],
            },
            VariantSpec {
                key: "features/compact-list",
                label: "Compact List",
                description: "Editorial numbered list, optionally two columns.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "columns",
                        label: "Columns",
                        param_type: VariantParamType::Select,
                        options: Some(vec!["1", "2"]),
                        min: None,
                        max: None,
                    },
                    VariantParamSpec {
                        key: "show_numbers",
                        label: "Show numbers",
                        param_type: VariantParamType::Boolean,
                        options: None,
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map.insert(
        "testimonials",
        vec![
            VariantSpec {
                key: "testimonials/grid",
                label: "Grid",
                description: "Multi-column grid of testimonial cards. The default.",
                params: vec![],
            },
            VariantSpec {
                key: "testimonials/pull-quote",
                label: "Pull Quote",
                description: "One oversized featured testimonial with a thin row of secondaries below.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "featured_index",
                        label: "Featured index",
                        param_type: VariantParamType::Number,
                        options: None,
                        min: Some(0.0),
                        max: Some(20.0),
                    },
                ],
            },
        ],
    );

    map.insert(
        "pricing",
        vec![
            VariantSpec {
                key: "pricing/cards",
                label: "Cards",
                description: "Side-by-side pricing cards with features and CTAs. The default.",
                params: vec![],
            },
            VariantSpec {
                key: "pricing/comparison-table",
                label: "Comparison Table",
                description: "Tabular comparison with feature rows shared across plans.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "highlight_popular",
                        label: "Highlight popular plan",
                        param_type: VariantParamType::Boolean,
                        options: None,
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map.insert(
        "faq",
        vec![
            VariantSpec {
                key: "faq/default",
                label: "Default",
                description: "Existing accordion / grid / two-column variants driven by data.variant.",
                params: vec![],
            },
            VariantSpec {
                key: "faq/two-column",
                label: "Two Column",
                description: "Title block on the left, Q&A list on the right. Long-form friendly.",
                params: vec![density_param()],
            },
        ],
    );

    map.insert(
        "contact",
        vec![
            VariantSpec {
                key: "contact/default",
                label: "Default",
                description: "Existing form-driven variants (simple, split, map).",
                params: vec![],
            },
            VariantSpec {
                key: "contact/inline-strip",
                label: "Inline Strip",
                description: "Headline + inline contact methods (email, phone, location). No form.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "align",
                        label: "Alignment",
                        param_type: VariantParamType::Select,
                        options: Some(vec!["left", "center"]),
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map.insert(
        "cta",
        vec![
            VariantSpec {
                key: "cta/centered",
                label: "Centered",
                description: "Centered headline + CTAs over a primary background. The default.",
                params: vec![],
            },
            VariantSpec {
                key: "cta/banner",
                label: "Banner",
                description: "Compact horizontal banner — headline left, CTAs right.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "tone",
                        label: "Tone",
                        param_type: VariantParamType::Select,
                        options: Some(vec!["primary", "muted", "surface"]),
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map.insert(
        "about",
        vec![
            VariantSpec {
                key: "about/default",
                label: "Default",
                description: "Existing bio layout with optional avatar / team / timeline modes.",
                params: vec![],
            },
            VariantSpec {
                key: "about/quote-statement",
                label: "Quote Statement",
                description: "Oversized editorial quote, no avatar.",
                params: vec![
                    density_param(),
                    VariantParamSpec {
                        key: "align",
                        label: "Alignment",
                        param_type: VariantParamType::Select,
                        options: Some(vec!["left", "center"]),
                        min: None,
                        max: None,
                    },
                    VariantParamSpec {
                        key: "show_quote_mark",
                        label: "Show quote mark",
                        param_type: VariantParamType::Boolean,
                        options: None,
                        min: None,
                        max: None,
                    },
                ],
            },
        ],
    );

    map
}

fn density_param() -> VariantParamSpec {
    VariantParamSpec {
        key: "density",
        label: "Density",
        param_type: VariantParamType::Select,
        options: Some(vec!["compact", "default", "airy"]),
        min: None,
        max: None,
    }
}

fn free_string_param(key: &'static str, label: &'static str) -> VariantParamSpec {
    VariantParamSpec {
        key,
        label,
        param_type: VariantParamType::String,
        options: None,
        min: None,
        max: None,
    }
}

/// Find the variant spec for a given key, scanning all section types.
pub fn find_variant(variant_key: &str) -> Option<VariantSpec> {
    variant_catalog()
        .into_values()
        .flatten()
        .find(|v| v.key == variant_key)
}

/// Return the default variant key for a section type, or `None` if unknown.
pub fn default_variant_key_for(section_type: &str) -> Option<&'static str> {
    match section_type {
        "hero" => Some("hero/centered-minimal"),
        "features" => Some("features/cards-grid"),
        "about" => Some("about/default"),
        "testimonials" => Some("testimonials/grid"),
        "cta" => Some("cta/centered"),
        "pricing" => Some("pricing/cards"),
        "faq" => Some("faq/default"),
        "contact" => Some("contact/default"),
        _ => None,
    }
}

/// Validation outcome for an AI-proposed variant.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VariantValidation {
    /// The proposal is valid as-is.
    Ok,
    /// The proposal is structurally valid but used some unknown param keys;
    /// they were dropped silently. Caller may persist the proposal.
    Cleaned { dropped: Vec<String> },
    /// The variant_key is not in the catalog. Caller should fall back to the
    /// default variant for the section type.
    UnknownVariant,
    /// A param value failed its constraints (e.g. number out of range).
    InvalidParam { key: String, reason: String },
}

/// Validate a (variant_key, variant_params) pair against the catalog.
///
/// Unknown param keys are dropped rather than rejected — the AI is allowed
/// to over-specify, we just ignore what we don't know. Wrong-type or
/// out-of-range values are hard rejections.
pub fn validate_variant(
    variant_key: &str,
    variant_params: &serde_json::Value,
) -> (VariantValidation, serde_json::Value) {
    let Some(spec) = find_variant(variant_key) else {
        return (VariantValidation::UnknownVariant, serde_json::json!({}));
    };

    let Some(obj) = variant_params.as_object() else {
        // No params provided — that's fine, variant takes its defaults.
        return (VariantValidation::Ok, serde_json::json!({}));
    };

    let known_keys: std::collections::HashSet<&str> = spec.params.iter().map(|p| p.key).collect();
    let mut cleaned = serde_json::Map::new();
    let mut dropped: Vec<String> = Vec::new();

    for (k, v) in obj {
        if !known_keys.contains(k.as_str()) {
            dropped.push(k.clone());
            continue;
        }
        let param_spec = spec.params.iter().find(|p| p.key == k).unwrap();
        if let Err(reason) = type_check(param_spec, v) {
            return (
                VariantValidation::InvalidParam {
                    key: k.clone(),
                    reason,
                },
                serde_json::json!({}),
            );
        }
        cleaned.insert(k.clone(), v.clone());
    }

    let outcome = if dropped.is_empty() {
        VariantValidation::Ok
    } else {
        VariantValidation::Cleaned { dropped }
    };
    (outcome, serde_json::Value::Object(cleaned))
}

fn type_check(spec: &VariantParamSpec, value: &serde_json::Value) -> Result<(), String> {
    match spec.param_type {
        VariantParamType::Boolean => {
            if !value.is_boolean() {
                return Err(format!("expected boolean, got {}", value));
            }
        }
        VariantParamType::String => {
            if !value.is_string() {
                return Err(format!("expected string, got {}", value));
            }
        }
        VariantParamType::Number => {
            let n = value
                .as_f64()
                .ok_or_else(|| format!("expected number, got {}", value))?;
            if let Some(min) = spec.min {
                if n < min {
                    return Err(format!("value {} below min {}", n, min));
                }
            }
            if let Some(max) = spec.max {
                if n > max {
                    return Err(format!("value {} above max {}", n, max));
                }
            }
        }
        VariantParamType::Select => {
            let s = value
                .as_str()
                .ok_or_else(|| format!("expected string for select, got {}", value))?;
            let options = spec.options.as_ref().ok_or("select missing options")?;
            if !options.contains(&s) {
                return Err(format!(
                    "value '{}' not in allowed options {:?}",
                    s, options
                ));
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn catalog_contains_three_sections() {
        let catalog = variant_catalog();
        assert!(catalog.contains_key("hero"));
        assert!(catalog.contains_key("features"));
        assert!(catalog.contains_key("about"));
    }

    #[test]
    fn find_known_variant() {
        assert!(find_variant("hero/split-asymmetric").is_some());
        assert!(find_variant("about/quote-statement").is_some());
        assert!(find_variant("hero/does-not-exist").is_none());
    }

    #[test]
    fn validate_unknown_variant_falls_back() {
        let (outcome, params) = validate_variant("hero/does-not-exist", &json!({}));
        assert_eq!(outcome, VariantValidation::UnknownVariant);
        assert!(params.as_object().unwrap().is_empty());
    }

    #[test]
    fn validate_drops_unknown_params() {
        let (outcome, params) = validate_variant(
            "hero/split-asymmetric",
            &json!({"image_ratio": 0.5, "totally_made_up": "ignore me"}),
        );
        match outcome {
            VariantValidation::Cleaned { dropped } => {
                assert_eq!(dropped, vec!["totally_made_up".to_string()]);
            }
            other => panic!("expected Cleaned, got {:?}", other),
        }
        assert!(params.get("image_ratio").is_some());
        assert!(params.get("totally_made_up").is_none());
    }

    #[test]
    fn validate_rejects_out_of_range_number() {
        let (outcome, _) = validate_variant(
            "hero/split-asymmetric",
            &json!({"image_ratio": 2.0}),
        );
        match outcome {
            VariantValidation::InvalidParam { key, .. } => assert_eq!(key, "image_ratio"),
            other => panic!("expected InvalidParam, got {:?}", other),
        }
    }

    #[test]
    fn validate_rejects_select_outside_options() {
        let (outcome, _) = validate_variant(
            "hero/full-bleed",
            &json!({"align": "diagonal"}),
        );
        assert!(matches!(outcome, VariantValidation::InvalidParam { .. }));
    }

    #[test]
    fn default_variant_keys() {
        assert_eq!(default_variant_key_for("hero"), Some("hero/centered-minimal"));
        assert_eq!(default_variant_key_for("about"), Some("about/default"));
        assert_eq!(default_variant_key_for("unknown"), None);
    }
}
