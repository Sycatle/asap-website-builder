/**
 * Utility functions for section renderers
 */

import type { Section } from './types';

export { getData, getContent, cn, toSlug } from '@asap/shared';

/**
 * Returns the section with `variant_key` / `variant_params` lifted from
 * `settings` when they are not already on the element.
 *
 * Persisting variant info in `settings` keeps the studio working without a
 * DB migration: the dispatcher reads it at render time exactly as if the
 * fields were promoted to top-level columns.
 */
export function withVariantFields(section: Section): Section {
  if (section.variant_key) return section;
  const settings = section.settings as Record<string, unknown> | undefined;
  const vk = settings?.variant_key;
  if (typeof vk !== 'string') return section;
  const vp = settings?.variant_params;
  return {
    ...section,
    variant_key: vk,
    variant_params:
      vp && typeof vp === 'object' && !Array.isArray(vp)
        ? (vp as Record<string, unknown>)
        : undefined,
  };
}
