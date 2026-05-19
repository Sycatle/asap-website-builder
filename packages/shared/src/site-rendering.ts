import type { DesignTokens, Element, Page, SEOMetadata, Theme, Website } from './types';

export type SiteModuleKey = string;

export interface SiteAsset {
  id: string;
  url: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface SiteRenderSection extends Element {
  data: Record<string, unknown>;
  /**
   * Absolute (or origin-relative) URL where the compiled JS module lives.
   * Populated by the API when the section has been generated; absent (or
   * null) for sections that haven't been compiled yet.
   */
  module_url?: string | null;
}

export interface SiteRenderPage extends Omit<Page, 'elements'> {
  seo?: SEOMetadata;
  sections: SiteRenderSection[];
}

export interface SiteRenderPayload {
  schemaVersion: 'v1';
  website: Website;
  pages: SiteRenderPage[];
  theme?: Theme;
  tokens?: DesignTokens;
  seo?: SEOMetadata;
  assets?: SiteAsset[];
  modules?: SiteModuleKey[];
  globals?: Record<string, unknown>;
  generatedAt?: string;
}
