import type {
  Element,
  Page,
  SEOMetadata,
  SiteRenderPage,
  SiteRenderPayload,
  SiteRenderSection,
  Theme,
  Website,
} from '@asap/shared';

// Sort sections by order_index then order. Inlined since the AI-codegen
// refactor removed the rendering/normalize helper module.
function sortSections(elements: Element[]): Element[] {
  return [...elements].sort((a, b) => {
    const ai = a.order_index ?? a.order ?? 0;
    const bi = b.order_index ?? b.order ?? 0;
    return ai - bi;
  });
}

// Use INTERNAL_API_URL for server-side (SSR) requests within Docker network
// Falls back to PUBLIC_API_URL for client-side or local development
const API_URL = import.meta.env.INTERNAL_API_URL || import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching public data:', error);
    return null;
  }
}

export interface PublicSiteData {
  collections: Record<string, { slug: string; items: Array<{ id: string } & Record<string, unknown>> }>;
  variables: Record<string, unknown>;
}

export async function getSiteRenderPayload(slug: string): Promise<SiteRenderPayload | null> {
  const normalizedSlug = slug.toLowerCase();
  const aggregated = await fetchJson<SiteRenderPayload>(`${API_URL}/public/sites/${normalizedSlug}/render`);

  if (aggregated?.website) {
    return normalizeRenderPayload(aggregated);
  }

  return buildLegacyPayload(normalizedSlug);
}

/**
 * Fetches the data envelope (collections + variables) for a published site.
 * Returns an empty envelope when the API has no data — generated sections
 * are written to degrade gracefully on missing keys.
 */
export async function getSiteData(slug: string): Promise<PublicSiteData> {
  const normalizedSlug = slug.toLowerCase();
  const data = await fetchJson<PublicSiteData>(
    `${API_URL}/public/websites/${normalizedSlug}/data`,
  );
  return data ?? { collections: {}, variables: {} };
}

export function resolveSitePage(payload: SiteRenderPayload, pageSlug?: string | null): SiteRenderPage | null {
  const normalizedSlug = pageSlug ? pageSlug.toLowerCase() : null;
  const pages = payload.pages
    .filter((page) => page.visible !== false)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  if (!normalizedSlug || normalizedSlug === 'index') {
    return pages.find((page) => page.is_homepage) ?? pages[0] ?? null;
  }

  return pages.find((page) => page.slug.toLowerCase() === normalizedSlug) ?? null;
}

export function buildSeo(
  payload: SiteRenderPayload,
  page: SiteRenderPage,
  siteSlug: string,
  pageSlug?: string | null,
): SEOMetadata & { title: string; url: string; canonicalUrl: string; siteName: string; type: 'website' } {
  const website = payload.website;
  const baseUrl = `https://${siteSlug}.asap.cool`;
  const pagePath = pageSlug ? `/${pageSlug}` : '';
  const pageUrl = `${baseUrl}${pagePath}`;
  const seo = payload.seo ?? website.metadata?.seo ?? {};

  return {
    title: seo.title || page.title || website.title,
    description: page.description || seo.description || website.tagline || '',
    keywords: seo.keywords || [],
    author: seo.author,
    image: seo.image || website.metadata?.socialImage,
    twitterHandle: seo.twitterHandle,
    canonicalUrl: seo.canonicalUrl || pageUrl,
    noIndex: seo.noIndex || false,
    noFollow: seo.noFollow || false,
    url: pageUrl,
    siteName: website.title,
    type: 'website',
  };
}

function normalizeRenderPayload(payload: SiteRenderPayload): SiteRenderPayload {
  return {
    ...payload,
    pages: payload.pages.map(normalizePage),
    theme: payload.theme ?? payload.website.metadata?.theme,
    tokens: payload.tokens ?? payload.website.metadata?.tokens,
    seo: payload.seo ?? payload.website.metadata?.seo,
    schemaVersion: payload.schemaVersion ?? 'v1',
  };
}

function normalizePage(page: SiteRenderPage): SiteRenderPage {
  return {
    ...page,
    sections: sortSections((page.sections ?? []) as Element[]) as SiteRenderSection[],
  };
}

// Transform element to ensure settings are also in data for renderer compatibility
function normalizeElement(element: Element): Element {
  return {
    ...element,
    // Copy settings to data for backward compatibility with renderers
    data: element.data || element.settings || {},
  };
}

async function buildLegacyPayload(slug: string): Promise<SiteRenderPayload | null> {
  const website = await fetchJson<Website>(`${API_URL}/public/websites/${slug}`);
  if (!website) {
    return null;
  }

  const pages = await fetchJson<Page[]>(`${API_URL}/public/websites/${slug}/pages`);
  const rawElements = await fetchJson<Element[]>(`${API_URL}/public/websites/${slug}/elements`);
  
  // Normalize elements to ensure data field is populated
  const elements = rawElements?.map(normalizeElement) ?? [];

  const theme = (website.metadata?.theme || (website.data as { theme?: Theme } | undefined)?.theme) as Theme | undefined;
  const seo = (website.metadata?.seo || (website.data as { seo?: SEOMetadata } | undefined)?.seo) as SEOMetadata | undefined;

  // If we have pages but no elements in them, assign all website elements to the homepage
  // This handles the case where the API doesn't include page.elements
  const hasPageElements = pages && pages.some((page) => page.elements && page.elements.length > 0);
  
  const normalizedPages = pages && pages.length > 0
    ? pages.map((page) => ({
        ...page,
        // Use page.elements if available, otherwise use website elements for homepage
        sections: sortSections(
          (page.elements && page.elements.length > 0)
            ? page.elements.map(normalizeElement)
            : (page.is_homepage && !hasPageElements ? elements : [])
        ) as SiteRenderSection[],
      }))
    : [{
        id: `${website.id}-home`,
        website_id: website.id,
        slug: 'index',
        title: website.title,
        description: website.tagline,
        is_homepage: true,
        visible: true,
        order_index: 0,
        sections: sortSections(elements) as SiteRenderSection[],
      }];

  return normalizeRenderPayload({
    schemaVersion: 'v1',
    website,
    pages: normalizedPages,
    theme,
    seo,
  });
}
