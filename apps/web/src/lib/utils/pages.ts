import type { Page } from '@/lib/types';

/**
 * Get the URL path for a page
 */
export function getPagePath(page: Page): string {
  if (page.is_homepage || page.slug === '') {
    return '/';
  }
  return `/${page.slug}`;
}

/**
 * Get the display URL for a page (with domain)
 */
export function getPageDisplayUrl(websiteSlug: string, page: Page): string {
  const basePath = `${websiteSlug}.asap.com`;
  if (page.is_homepage || page.slug === '') {
    return basePath;
  }
  return `${basePath}/${page.slug}`;
}

/**
 * Page type icons mapping
 */
export const PAGE_ICONS: Record<string, string> = {
  '': '🏠',
  'contact': '📧',
  'about': '👤',
  'services': '⚙️',
  'portfolio': '💼',
  'blog': '📝',
  'pricing': '💰',
  'faq': '❓',
  'terms': '📜',
  'privacy': '🔒',
};

/**
 * Get icon for a page based on its slug
 */
export function getPageIcon(slug: string): string {
  return PAGE_ICONS[slug] || '📄';
}

/**
 * Default pages for new websites
 */
export const DEFAULT_PAGES: Omit<Page, 'id' | 'website_id' | 'created_at' | 'updated_at'>[] = [
  {
    slug: '',
    title: 'Accueil',
    description: "Page d'accueil du site",
    is_homepage: true,
    order: 0,
    visible: true,
    metadata: {},
  },
];
