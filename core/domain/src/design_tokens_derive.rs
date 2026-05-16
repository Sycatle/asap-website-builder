//! Deterministic derivation of `DesignTokens` from a brief.
//!
//! Given a seed color and a brand brief (sector, tone, formality), produces a
//! coherent set of tokens via HSL rotation, a curated type-pairing library,
//! and sector→philosophy mappings. No AI required for this layer — vision and
//! LLM augmentation sit *on top* of these defaults, not under them.

use crate::design_tokens::{
    ColorMode, DensityScale, DesignTokens, Formality, MotionIntensity, MotionTokens, PaletteTokens,
    RadiusPhilosophy, RadiusTokens, ShadowPhilosophy, ShadowTokens, SpacingTokens,
    TypographyTokens, VoiceTokens,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HarmonyScheme {
    /// Two neighbors on the wheel (subtle, professional)
    Analogous,
    /// Opposite on the wheel (vibrant, contrast-driven)
    Complementary,
    /// Three evenly spaced (energetic, varied)
    Triadic,
}

#[derive(Debug, Clone, Default)]
pub struct BrandBrief {
    pub sector: Option<String>,
    pub tone: Option<String>,
    pub formality: Option<Formality>,
    pub mode: Option<ColorMode>,
    pub harmony: Option<HarmonyScheme>,
}

/// Derive a full `DesignTokens` from a seed hex color and a brand brief.
///
/// The seed color becomes the palette primary. Secondary and accent are
/// generated via HSL rotation according to the harmony scheme. Typography,
/// spacing, radius, motion are picked from curated buckets indexed by
/// sector + formality. The result is deterministic given the same inputs.
pub fn derive_tokens(seed_hex: &str, brief: &BrandBrief) -> DesignTokens {
    let mode = brief.mode.unwrap_or(ColorMode::Dark);
    let harmony = brief.harmony.unwrap_or(HarmonyScheme::Analogous);
    let palette = derive_palette(seed_hex, mode, harmony);

    let typography = pick_typography(brief);
    let radius = pick_radius(brief);
    let spacing = pick_spacing(brief);
    let motion = pick_motion(brief);
    let shadow = pick_shadow(brief);

    DesignTokens {
        version: 1,
        palette,
        typography,
        spacing,
        radius,
        motion,
        shadow,
        voice: Some(VoiceTokens {
            tone: brief.tone.clone(),
            formality: brief.formality,
            sector: brief.sector.clone(),
        }),
    }
}

// --------------------------------------------------------------------
// Palette
// --------------------------------------------------------------------

fn derive_palette(seed_hex: &str, mode: ColorMode, harmony: HarmonyScheme) -> PaletteTokens {
    let (h, s, l) = hex_to_hsl(seed_hex).unwrap_or((240.0, 0.7, 0.6));

    let (sec_h, acc_h) = match harmony {
        HarmonyScheme::Analogous => ((h + 30.0) % 360.0, (h - 30.0 + 360.0) % 360.0),
        HarmonyScheme::Complementary => ((h + 180.0) % 360.0, (h + 150.0) % 360.0),
        HarmonyScheme::Triadic => ((h + 120.0) % 360.0, (h + 240.0) % 360.0),
    };

    let primary = hsl_to_hex(h, s, l);
    let secondary = hsl_to_hex(sec_h, (s * 0.85).clamp(0.2, 0.9), l);
    let accent = hsl_to_hex(
        acc_h,
        (s * 1.05).clamp(0.2, 0.95),
        (l * 1.05).clamp(0.3, 0.85),
    );

    let (bg, fg, muted, border, surface, on_surface) = match mode {
        ColorMode::Dark => (
            "#0a0a0a", "#fafafa", "#1f1f1f", "#2a2a2a", "#111111", "#e5e5e5",
        ),
        ColorMode::Light => (
            "#ffffff", "#0a0a0a", "#f4f4f5", "#e4e4e7", "#fafafa", "#18181b",
        ),
    };

    PaletteTokens {
        mode,
        primary,
        secondary: Some(secondary),
        accent: Some(accent),
        background: bg.into(),
        foreground: fg.into(),
        muted: muted.into(),
        border: border.into(),
        surface: Some(surface.into()),
        on_surface: Some(on_surface.into()),
        neutral_scale: None,
    }
}

// --------------------------------------------------------------------
// Curated typography library
// --------------------------------------------------------------------

struct TypePairing {
    display: &'static str,
    body: &'static str,
    scale: f32,
}

const CURATED_PAIRINGS: &[(&str, TypePairing)] = &[
    (
        "editorial",
        TypePairing {
            display: "Fraunces",
            body: "Inter",
            scale: 1.333,
        },
    ),
    (
        "tech",
        TypePairing {
            display: "Space Grotesk",
            body: "Inter",
            scale: 1.25,
        },
    ),
    (
        "minimal",
        TypePairing {
            display: "Inter",
            body: "Inter",
            scale: 1.2,
        },
    ),
    (
        "warm",
        TypePairing {
            display: "DM Serif Display",
            body: "DM Sans",
            scale: 1.333,
        },
    ),
    (
        "playful",
        TypePairing {
            display: "Outfit",
            body: "Outfit",
            scale: 1.25,
        },
    ),
    (
        "luxury",
        TypePairing {
            display: "Cormorant Garamond",
            body: "Inter",
            scale: 1.414,
        },
    ),
    (
        "brutal",
        TypePairing {
            display: "Archivo Black",
            body: "Archivo",
            scale: 1.333,
        },
    ),
    (
        "trustworthy",
        TypePairing {
            display: "Source Serif 4",
            body: "Source Sans 3",
            scale: 1.25,
        },
    ),
    (
        "creative",
        TypePairing {
            display: "Bricolage Grotesque",
            body: "Inter",
            scale: 1.333,
        },
    ),
    (
        "professional",
        TypePairing {
            display: "Manrope",
            body: "Manrope",
            scale: 1.2,
        },
    ),
];

fn pick_typography(brief: &BrandBrief) -> TypographyTokens {
    let key = match (
        brief.sector.as_deref(),
        brief.formality,
        brief.tone.as_deref(),
    ) {
        (Some(s), _, _) if matches_sector(s, &["law", "finance", "consulting", "legal"]) => {
            "trustworthy"
        }
        (Some(s), _, _)
            if matches_sector(s, &["restaurant", "hospitality", "wedding", "wellness"]) =>
        {
            "warm"
        }
        (Some(s), _, _) if matches_sector(s, &["fashion", "luxury", "jewelry", "art"]) => "luxury",
        (Some(s), _, _) if matches_sector(s, &["tech", "saas", "software", "developer", "ai"]) => {
            "tech"
        }
        (Some(s), _, _) if matches_sector(s, &["agency", "studio", "creative", "design"]) => {
            "creative"
        }
        (Some(s), _, _) if matches_sector(s, &["editorial", "media", "publishing", "writer"]) => {
            "editorial"
        }
        (Some(s), _, _) if matches_sector(s, &["fitness", "kids", "events"]) => "playful",
        (_, Some(Formality::Formal), _) => "trustworthy",
        (_, Some(Formality::Casual), _) => "playful",
        (_, _, Some(t)) if t.contains("bold") || t.contains("loud") => "brutal",
        _ => "professional",
    };

    let pairing = CURATED_PAIRINGS
        .iter()
        .find(|(k, _)| *k == key)
        .map(|(_, p)| p)
        .unwrap_or(&CURATED_PAIRINGS[2].1);

    TypographyTokens {
        display_family: pairing.display.into(),
        body_family: pairing.body.into(),
        scale_ratio: pairing.scale,
        weights: Some(vec![400, 500, 600, 700]),
        tracking: Some(0.0),
    }
}

fn matches_sector(sector: &str, needles: &[&str]) -> bool {
    let s = sector.to_lowercase();
    needles.iter().any(|n| s.contains(n))
}

// --------------------------------------------------------------------
// Radius, spacing, motion, shadow philosophies
// --------------------------------------------------------------------

fn pick_radius(brief: &BrandBrief) -> RadiusTokens {
    let philosophy = match brief.formality {
        Some(Formality::Formal) => RadiusPhilosophy::Sharp,
        Some(Formality::Casual) => RadiusPhilosophy::Pill,
        _ => RadiusPhilosophy::Soft,
    };
    let (sm, md, lg) = match philosophy {
        RadiusPhilosophy::Sharp => (2, 4, 6),
        RadiusPhilosophy::Soft => (4, 8, 16),
        RadiusPhilosophy::Pill => (8, 16, 24),
    };
    RadiusTokens {
        sm,
        md,
        lg,
        full: 9999,
        philosophy,
    }
}

fn pick_spacing(brief: &BrandBrief) -> SpacingTokens {
    let density = match brief.formality {
        Some(Formality::Formal) => DensityScale::Compact,
        Some(Formality::Casual) => DensityScale::Airy,
        _ => DensityScale::Default,
    };
    SpacingTokens {
        base: 4,
        scale_ratio: 1.5,
        density,
    }
}

fn pick_motion(brief: &BrandBrief) -> MotionTokens {
    let intensity = match brief.formality {
        Some(Formality::Formal) => MotionIntensity::Subtle,
        Some(Formality::Casual) => MotionIntensity::Expressive,
        _ => MotionIntensity::Subtle,
    };
    let duration_scale = match intensity {
        MotionIntensity::None => 0.0,
        MotionIntensity::Subtle => 1.0,
        MotionIntensity::Expressive => 1.4,
    };
    MotionTokens {
        duration_scale,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)".into(),
        intensity,
    }
}

fn pick_shadow(brief: &BrandBrief) -> ShadowTokens {
    let philosophy = match brief.formality {
        Some(Formality::Formal) => ShadowPhilosophy::Flat,
        Some(Formality::Casual) => ShadowPhilosophy::Glow,
        _ => ShadowPhilosophy::Layered,
    };
    let elevation_scale = match philosophy {
        ShadowPhilosophy::Flat => vec![
            "none".into(),
            "0 1px 0 0 rgb(0 0 0 / 0.05)".into(),
            "0 1px 0 0 rgb(0 0 0 / 0.08)".into(),
            "0 2px 0 0 rgb(0 0 0 / 0.08)".into(),
            "0 3px 0 0 rgb(0 0 0 / 0.1)".into(),
        ],
        ShadowPhilosophy::Layered => vec![
            "0 1px 2px 0 rgb(0 0 0 / 0.05)".into(),
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)".into(),
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)".into(),
            "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)".into(),
            "0 25px 50px -12px rgb(0 0 0 / 0.25)".into(),
        ],
        ShadowPhilosophy::Glow => vec![
            "0 0 8px 0 rgb(99 102 241 / 0.15)".into(),
            "0 0 16px 0 rgb(99 102 241 / 0.2)".into(),
            "0 0 24px 0 rgb(99 102 241 / 0.25)".into(),
            "0 0 32px 0 rgb(99 102 241 / 0.3)".into(),
            "0 0 48px 0 rgb(99 102 241 / 0.35)".into(),
        ],
    };
    ShadowTokens {
        elevation_scale,
        philosophy,
    }
}

// --------------------------------------------------------------------
// HSL helpers
// --------------------------------------------------------------------

pub fn hex_to_hsl(hex: &str) -> Option<(f32, f32, f32)> {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&h[0..2], 16).ok()? as f32 / 255.0;
    let g = u8::from_str_radix(&h[2..4], 16).ok()? as f32 / 255.0;
    let b = u8::from_str_radix(&h[4..6], 16).ok()? as f32 / 255.0;
    let max = r.max(g.max(b));
    let min = r.min(g.min(b));
    let l = (max + min) / 2.0;
    let d = max - min;
    if d.abs() < f32::EPSILON {
        return Some((0.0, 0.0, l));
    }
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) * 60.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) * 60.0
    } else {
        ((r - g) / d + 4.0) * 60.0
    };
    Some((h, s, l))
}

pub fn hsl_to_hex(h: f32, s: f32, l: f32) -> String {
    let h = ((h % 360.0) + 360.0) % 360.0;
    let s = s.clamp(0.0, 1.0);
    let l = l.clamp(0.0, 1.0);
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
    let m = l - c / 2.0;
    let (r1, g1, b1) = match h as u32 {
        0..=59 => (c, x, 0.0),
        60..=119 => (x, c, 0.0),
        120..=179 => (0.0, c, x),
        180..=239 => (0.0, x, c),
        240..=299 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let r = ((r1 + m) * 255.0).round() as u8;
    let g = ((g1 + m) * 255.0).round() as u8;
    let b = ((b1 + m) * 255.0).round() as u8;
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hsl_roundtrip_is_close() {
        let original = "#6366f1";
        let (h, s, l) = hex_to_hsl(original).unwrap();
        let back = hsl_to_hex(h, s, l);
        // Allow a 1-bit drift per channel from float rounding.
        let orig_bytes = u32::from_str_radix(&original[1..], 16).unwrap();
        let back_bytes = u32::from_str_radix(&back[1..], 16).unwrap();
        let diff = |a: u32, b: u32, shift: u32| ((a >> shift) & 0xff).abs_diff((b >> shift) & 0xff);
        assert!(diff(orig_bytes, back_bytes, 16) <= 2);
        assert!(diff(orig_bytes, back_bytes, 8) <= 2);
        assert!(diff(orig_bytes, back_bytes, 0) <= 2);
    }

    #[test]
    fn analogous_secondary_differs_from_primary() {
        let palette = derive_palette("#6366f1", ColorMode::Dark, HarmonyScheme::Analogous);
        assert_ne!(
            palette.primary.to_lowercase(),
            palette.secondary.as_ref().unwrap().to_lowercase()
        );
    }

    #[test]
    fn tech_sector_picks_tech_pairing() {
        let brief = BrandBrief {
            sector: Some("saas".into()),
            ..Default::default()
        };
        let typography = pick_typography(&brief);
        assert_eq!(typography.display_family, "Space Grotesk");
    }

    #[test]
    fn formal_brief_yields_sharp_radius_and_flat_shadow() {
        let brief = BrandBrief {
            formality: Some(Formality::Formal),
            ..Default::default()
        };
        assert_eq!(pick_radius(&brief).philosophy, RadiusPhilosophy::Sharp);
        assert_eq!(pick_shadow(&brief).philosophy, ShadowPhilosophy::Flat);
    }

    #[test]
    fn derive_tokens_round_trips_via_json() {
        let brief = BrandBrief {
            sector: Some("tech".into()),
            formality: Some(Formality::Neutral),
            ..Default::default()
        };
        let tokens = derive_tokens("#6366f1", &brief);
        let json = serde_json::to_value(&tokens).expect("serialize");
        let parsed: DesignTokens = serde_json::from_value(json).expect("deserialize");
        assert_eq!(
            parsed.palette.primary.to_lowercase(),
            tokens.palette.primary.to_lowercase()
        );
    }
}
