import type { Element, Page, SEOMetadata, Theme, Website } from './types';

export type SiteModuleKey = string;

export interface SiteAsset {
  id: string;
  url: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface SiteRenderSection extends Element {
  data: Record<string, unknown>;
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
  seo?: SEOMetadata;
  assets?: SiteAsset[];
  modules?: SiteModuleKey[];
  globals?: Record<string, unknown>;
  generatedAt?: string;
}
