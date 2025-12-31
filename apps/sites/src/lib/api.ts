/**
 * Backward-compatible exports for public site data access.
 * New code should import from @/lib/site-data.
 */

export { buildThemeStyles, hexToRgb } from '@asap/shared';
export type { Element, ElementType, Page, SEOMetadata, Theme, Website } from '@asap/shared';

export { getSiteRenderPayload, resolveSitePage, buildSeo } from '@/lib/site-data';
