/**
 * Design tokens — defaults, backfill, and CSS emission.
 *
 * Tokens are the per-site visual identity (palette, typography, spacing,
 * radius, motion, shadow). The public renderer reads them and emits CSS
 * custom properties on `:root`. Tailwind utilities are configured to
 * consume those custom properties, so the entire site's look-and-feel
 * is parameterized.
 */

import type {
  DesignTokens,
  PaletteTokens,
  Theme,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  MotionTokens,
  ShadowTokens,
} from './types';
import { hexToRgb } from './utils';

// --------------------------------------------------------------------
// Defaults
// --------------------------------------------------------------------

const DEFAULT_PALETTE_DARK: PaletteTokens = {
  mode: 'dark',
  primary: '#6366f1',
  secondary: '#a855f7',
  accent: '#22d3ee',
  background: '#0a0a0a',
  foreground: '#fafafa',
  muted: '#1f1f1f',
  border: '#2a2a2a',
  surface: '#111111',
  onSurface: '#e5e5e5',
};

const DEFAULT_TYPOGRAPHY: TypographyTokens = {
  displayFamily: 'Inter',
  bodyFamily: 'Inter',
  scaleRatio: 1.25,
  weights: [400, 500, 600, 700],
  tracking: 0,
};

const DEFAULT_SPACING: SpacingTokens = {
  base: 4,
  scaleRatio: 1.5,
  density: 'default',
};

const DEFAULT_RADIUS: RadiusTokens = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
  philosophy: 'soft',
};

const DEFAULT_MOTION: MotionTokens = {
  durationScale: 1,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  intensity: 'subtle',
};

const DEFAULT_SHADOW: ShadowTokens = {
  philosophy: 'layered',
  elevationScale: [
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ],
};

export function defaultDesignTokens(): DesignTokens {
  return {
    version: 1,
    palette: { ...DEFAULT_PALETTE_DARK },
    typography: { ...DEFAULT_TYPOGRAPHY },
    spacing: { ...DEFAULT_SPACING },
    radius: { ...DEFAULT_RADIUS },
    motion: { ...DEFAULT_MOTION },
    shadow: { ...DEFAULT_SHADOW },
  };
}

// --------------------------------------------------------------------
// Backfill — Theme → DesignTokens
// --------------------------------------------------------------------

/**
 * Derive a DesignTokens object from the legacy Theme structure.
 * Used for sites that pre-date the tokens system.
 */
export function themeToDesignTokens(theme: Theme): DesignTokens {
  const base = defaultDesignTokens();
  base.palette.mode = theme.mode;
  base.palette.primary = theme.primaryColor;
  if (theme.secondaryColor) base.palette.secondary = theme.secondaryColor;
  if (theme.accentColor) base.palette.accent = theme.accentColor;
  if (theme.backgroundColor) base.palette.background = theme.backgroundColor;
  if (theme.foregroundColor) base.palette.foreground = theme.foregroundColor;
  if (theme.mutedColor) base.palette.muted = theme.mutedColor;
  if (theme.borderColor) base.palette.border = theme.borderColor;
  if (theme.fontFamily) {
    base.typography.displayFamily = theme.fontFamily;
    base.typography.bodyFamily = theme.fontFamily;
  }
  return base;
}

// --------------------------------------------------------------------
// CSS emission
// --------------------------------------------------------------------

/**
 * Build the CSS custom properties for a DesignTokens object.
 * Returns a string ready to inject inside `:root { … }`.
 *
 * Colors are emitted as space-separated RGB triplets (e.g. "99 102 241")
 * so that Tailwind's `rgb(var(--color-x) / <alpha>)` syntax works.
 */
export function buildTokenStyles(tokens: DesignTokens | undefined): string {
  if (!tokens) return '';

  const parts: string[] = [];
  const { palette, typography, spacing, radius, motion, shadow } = tokens;

  // Palette → RGB triplets
  parts.push(`--color-primary: ${hexToRgb(palette.primary)};`);
  if (palette.secondary) parts.push(`--color-secondary: ${hexToRgb(palette.secondary)};`);
  if (palette.accent) parts.push(`--color-accent: ${hexToRgb(palette.accent)};`);
  parts.push(`--color-background: ${hexToRgb(palette.background)};`);
  parts.push(`--color-foreground: ${hexToRgb(palette.foreground)};`);
  parts.push(`--color-muted: ${hexToRgb(palette.muted)};`);
  parts.push(`--color-border: ${hexToRgb(palette.border)};`);
  if (palette.surface) parts.push(`--color-surface: ${hexToRgb(palette.surface)};`);
  if (palette.onSurface) parts.push(`--color-on-surface: ${hexToRgb(palette.onSurface)};`);
  if (palette.neutralScale && palette.neutralScale.length === 11) {
    const stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    palette.neutralScale.forEach((hex, i) => {
      parts.push(`--color-neutral-${stops[i]}: ${hexToRgb(hex)};`);
    });
  }

  // Typography
  parts.push(`--font-display: '${typography.displayFamily}', system-ui, sans-serif;`);
  parts.push(`--font-body: '${typography.bodyFamily}', system-ui, sans-serif;`);
  parts.push(`--font-scale: ${typography.scaleRatio};`);
  if (typeof typography.tracking === 'number') {
    parts.push(`--font-tracking: ${typography.tracking}em;`);
  }

  // Spacing
  const densityMultiplier =
    spacing.density === 'compact' ? 0.85 : spacing.density === 'airy' ? 1.2 : 1;
  parts.push(`--space-base: ${spacing.base}px;`);
  parts.push(`--space-scale: ${spacing.scaleRatio};`);
  parts.push(`--space-density: ${densityMultiplier};`);

  // Radius
  parts.push(`--radius-sm: ${radius.sm}px;`);
  parts.push(`--radius-md: ${radius.md}px;`);
  parts.push(`--radius-lg: ${radius.lg}px;`);
  parts.push(`--radius-full: ${radius.full}px;`);

  // Motion
  const motionScale = motion.intensity === 'none' ? 0 : motion.durationScale;
  parts.push(`--motion-duration: ${Math.round(200 * motionScale)}ms;`);
  parts.push(`--motion-easing: ${motion.easing};`);

  // Shadow
  shadow.elevationScale.forEach((value, i) => {
    parts.push(`--shadow-${i + 1}: ${value};`);
  });

  return parts.join(' ');
}

/**
 * Resolve the tokens to apply for a website. Order of precedence:
 *   1. metadata.tokens if present
 *   2. else, derive from metadata.theme (legacy)
 *   3. else, defaults
 */
export function resolveTokens(args: {
  tokens?: DesignTokens;
  theme?: Theme;
}): DesignTokens {
  if (args.tokens) return args.tokens;
  if (args.theme) return themeToDesignTokens(args.theme);
  return defaultDesignTokens();
}
