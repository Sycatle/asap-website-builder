/**
 * Variant Catalog
 *
 * Single source of truth for the available `variant_key` values per
 * section type. The AI generator picks from this catalog; the studio
 * uses it to render variant pickers; downstream validators check that
 * `Element.variant_key` is a known key.
 *
 * Each entry pairs a key with the parameter shape interpreted by the
 * variant component (free-form JSON, but the studio can render typed
 * controls from these definitions).
 */

export interface VariantParamSpec {
  key: string;
  label: string;
  type: 'select' | 'number' | 'boolean' | 'string';
  options?: string[];
  min?: number;
  max?: number;
  default?: unknown;
}

export interface VariantSpec {
  key: string;          // e.g. "hero/split-asymmetric"
  label: string;        // human label for the picker
  description: string;
  params: VariantParamSpec[];
}

export const VARIANT_CATALOG: Record<string, VariantSpec[]> = {
  hero: [
    {
      key: 'hero/centered-minimal',
      label: 'Centered Minimal',
      description: 'Centered headline with CTAs and optional social proof. The default.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
      ],
    },
    {
      key: 'hero/split-asymmetric',
      label: 'Split Asymmetric',
      description: 'Text on the left, oversized visual on the right.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'image_ratio', label: 'Visual width ratio', type: 'number', min: 0.35, max: 0.7, default: 0.55 },
        { key: 'visual_url', label: 'Visual URL', type: 'string' },
        { key: 'visual_alt', label: 'Visual alt text', type: 'string' },
      ],
    },
    {
      key: 'hero/full-bleed',
      label: 'Full Bleed',
      description: 'Full-viewport background image with centered text overlay.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'background_url', label: 'Background URL', type: 'string' },
        { key: 'overlay_opacity', label: 'Overlay opacity', type: 'number', min: 0, max: 1, default: 0.55 },
        { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'], default: 'center' },
      ],
    },
  ],
  features: [
    {
      key: 'features/cards-grid',
      label: 'Cards Grid',
      description: 'Classic 2/3/4-column grid of feature cards. The default.',
      params: [],
    },
    {
      key: 'features/compact-list',
      label: 'Compact List',
      description: 'Editorial numbered list, optionally two columns.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'columns', label: 'Columns', type: 'select', options: ['1', '2'], default: '2' },
        { key: 'show_numbers', label: 'Show numbers', type: 'boolean', default: true },
      ],
    },
  ],
  about: [
    {
      key: 'about/default',
      label: 'Default',
      description: 'Existing bio layout with optional avatar / team / timeline modes.',
      params: [],
    },
    {
      key: 'about/quote-statement',
      label: 'Quote Statement',
      description: 'Oversized editorial quote, no avatar. Strong personal brand feel.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center'], default: 'left' },
        { key: 'show_quote_mark', label: 'Show quote mark', type: 'boolean', default: true },
      ],
    },
  ],
  testimonials: [
    {
      key: 'testimonials/grid',
      label: 'Grid',
      description: 'Multi-column grid of testimonial cards. The default.',
      params: [],
    },
    {
      key: 'testimonials/pull-quote',
      label: 'Pull Quote',
      description: 'One oversized featured testimonial with a thin row of secondaries below.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'featured_index', label: 'Featured index', type: 'number', min: 0, max: 20, default: 0 },
      ],
    },
  ],
  cta: [
    {
      key: 'cta/centered',
      label: 'Centered',
      description: 'Centered headline + CTAs over a primary background. The default.',
      params: [],
    },
    {
      key: 'cta/banner',
      label: 'Banner',
      description: 'Compact horizontal banner — headline left, CTAs right.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'tone', label: 'Tone', type: 'select', options: ['primary', 'muted', 'surface'], default: 'primary' },
      ],
    },
  ],
  pricing: [
    {
      key: 'pricing/cards',
      label: 'Cards',
      description: 'Side-by-side pricing cards with features and CTAs. The default.',
      params: [],
    },
    {
      key: 'pricing/comparison-table',
      label: 'Comparison Table',
      description: 'Tabular comparison with feature rows shared across plans.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'highlight_popular', label: 'Highlight popular plan', type: 'boolean', default: true },
      ],
    },
  ],
  faq: [
    {
      key: 'faq/default',
      label: 'Default',
      description: 'Existing accordion / grid / two-column variants driven by data.variant.',
      params: [],
    },
    {
      key: 'faq/two-column',
      label: 'Two Column',
      description: 'Title block on the left, Q&A list on the right. Long-form friendly.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
      ],
    },
  ],
  contact: [
    {
      key: 'contact/default',
      label: 'Default',
      description: 'Existing form-driven variants (simple, split, map).',
      params: [],
    },
    {
      key: 'contact/inline-strip',
      label: 'Inline Strip',
      description: 'Headline + inline contact methods (email, phone, location). No form.',
      params: [
        { key: 'density', label: 'Density', type: 'select', options: ['compact', 'default', 'airy'], default: 'default' },
        { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center'], default: 'left' },
      ],
    },
  ],
};

/** All variant keys flattened, for fast validation. */
export const KNOWN_VARIANT_KEYS: ReadonlySet<string> = new Set(
  Object.values(VARIANT_CATALOG).flatMap((variants) => variants.map((v) => v.key)),
);

export function isKnownVariantKey(key: string | undefined | null): boolean {
  return !!key && KNOWN_VARIANT_KEYS.has(key);
}

export function variantsForSection(sectionType: string): VariantSpec[] {
  return VARIANT_CATALOG[sectionType] ?? [];
}
