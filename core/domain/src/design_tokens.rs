//! Per-site visual identity tokens.
//!
//! Mirrors the TypeScript `DesignTokens` interface in `packages/shared/src/types.ts`.
//! Stored under `Website.metadata.tokens` (JSONB), so no DDL is needed.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ColorMode {
    Dark,
    Light,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DensityScale {
    Compact,
    Default,
    Airy,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RadiusPhilosophy {
    Sharp,
    Soft,
    Pill,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MotionIntensity {
    None,
    Subtle,
    Expressive,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ShadowPhilosophy {
    Flat,
    Layered,
    Glow,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Formality {
    Casual,
    Neutral,
    Formal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaletteTokens {
    pub mode: ColorMode,
    pub primary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accent: Option<String>,
    pub background: String,
    pub foreground: String,
    pub muted: String,
    pub border: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub surface: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_surface: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub neutral_scale: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypographyTokens {
    pub display_family: String,
    pub body_family: String,
    pub scale_ratio: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weights: Option<Vec<u16>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpacingTokens {
    pub base: u16,
    pub scale_ratio: f32,
    pub density: DensityScale,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RadiusTokens {
    pub sm: u16,
    pub md: u16,
    pub lg: u16,
    pub full: u16,
    pub philosophy: RadiusPhilosophy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MotionTokens {
    pub duration_scale: f32,
    pub easing: String,
    pub intensity: MotionIntensity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShadowTokens {
    pub elevation_scale: Vec<String>,
    pub philosophy: ShadowPhilosophy,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VoiceTokens {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formality: Option<Formality>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sector: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignTokens {
    pub version: u8,
    pub palette: PaletteTokens,
    pub typography: TypographyTokens,
    pub spacing: SpacingTokens,
    pub radius: RadiusTokens,
    pub motion: MotionTokens,
    pub shadow: ShadowTokens,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice: Option<VoiceTokens>,
}

impl DesignTokens {
    /// A reasonable dark-mode default; equivalent to `defaultDesignTokens()` on the TS side.
    pub fn default_dark() -> Self {
        Self {
            version: 1,
            palette: PaletteTokens {
                mode: ColorMode::Dark,
                primary: "#6366f1".into(),
                secondary: Some("#a855f7".into()),
                accent: Some("#22d3ee".into()),
                background: "#0a0a0a".into(),
                foreground: "#fafafa".into(),
                muted: "#1f1f1f".into(),
                border: "#2a2a2a".into(),
                surface: Some("#111111".into()),
                on_surface: Some("#e5e5e5".into()),
                neutral_scale: None,
            },
            typography: TypographyTokens {
                display_family: "Inter".into(),
                body_family: "Inter".into(),
                scale_ratio: 1.25,
                weights: Some(vec![400, 500, 600, 700]),
                tracking: Some(0.0),
            },
            spacing: SpacingTokens {
                base: 4,
                scale_ratio: 1.5,
                density: DensityScale::Default,
            },
            radius: RadiusTokens {
                sm: 4,
                md: 8,
                lg: 16,
                full: 9999,
                philosophy: RadiusPhilosophy::Soft,
            },
            motion: MotionTokens {
                duration_scale: 1.0,
                easing: "cubic-bezier(0.2, 0.8, 0.2, 1)".into(),
                intensity: MotionIntensity::Subtle,
            },
            shadow: ShadowTokens {
                philosophy: ShadowPhilosophy::Layered,
                elevation_scale: vec![
                    "0 1px 2px 0 rgb(0 0 0 / 0.05)".into(),
                    "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)".into(),
                    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)".into(),
                    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)".into(),
                    "0 25px 50px -12px rgb(0 0 0 / 0.25)".into(),
                ],
            },
            voice: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_default_tokens_json() {
        let tokens = DesignTokens::default_dark();
        let json = serde_json::to_value(&tokens).expect("serialize");
        let parsed: DesignTokens = serde_json::from_value(json).expect("deserialize");
        assert_eq!(parsed.version, 1);
        assert_eq!(parsed.palette.primary, "#6366f1");
        assert_eq!(parsed.spacing.density, DensityScale::Default);
    }
}
