import { useState, useEffect, useCallback } from 'react';
import { pagesAPI, type Page, type CreatePageRequest, type UpdatePageRequest } from '@/lib/api';

interface UsePagesReturn {
  pages: Page[];
  isLoading: boolean;
  error: string | null;
  // CRUD operations
  createPage: (data: CreatePageRequest) => Promise<{ id: string } | null>;
  updatePage: (pageId: string, data: UpdatePageRequest) => Promise<boolean>;
  deletePage: (pageId: string) => Promise<boolean>;
  reorderPages: (pageIds: string[]) => Promise<boolean>;
  // Helpers
  getHomepage: () => Page | undefined;
  getPageBySlug: (slug: string) => Page | undefined;
  refetch: () => Promise<void>;
}

export function usePages(websiteId: string | null | undefined): UsePagesReturn {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pages
  const fetchPages = useCallback(async () => {
    if (!websiteId) {
      setPages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await pagesAPI.list(websiteId);
      setPages(data);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des pages');
    } finally {
      setIsLoading(false);
    }
  }, [websiteId]);

  // Initial fetch and refetch on websiteId change
  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Create page
  const createPage = useCallback(async (data: CreatePageRequest): Promise<{ id: string } | null> => {
    if (!websiteId) return null;

    try {
      const result = await pagesAPI.create(websiteId, data);
      
      // Optimistic update
      const newPage: Page = {
        id: result.id,
        website_id: websiteId,
        slug: data.slug,
        title: data.title,
        description: data.description || '',
        is_homepage: data.is_homepage || false,
        order: data.order ?? pages.length,
        visible: data.visible ?? true,
        metadata: data.metadata || {},
      };
      
      setPages(prev => [...prev, newPage].sort((a, b) => a.order - b.order));
      
      return { id: result.id };
    } catch (err) {
      console.error('Error creating page:', err);
      throw err;
    }
  }, [websiteId, pages.length]);

  // Update page
  const updatePage = useCallback(async (pageId: string, data: UpdatePageRequest): Promise<boolean> => {
    if (!websiteId) return false;

    try {
      await pagesAPI.update(websiteId, pageId, data);
      
      // Optimistic update
      setPages(prev => prev.map(page => 
        page.id === pageId 
          ? { ...page, ...data } 
          : page
      ).sort((a, b) => a.order - b.order));
      
      return true;
    } catch (err) {
      console.error('Error updating page:', err);
      throw err;
    }
  }, [websiteId]);

  // Delete page
  const deletePage = useCallback(async (pageId: string): Promise<boolean> => {
    if (!websiteId) return false;

    try {
      await pagesAPI.delete(websiteId, pageId);
      
      // Optimistic update
      setPages(prev => prev.filter(page => page.id !== pageId));
      
      return true;
    } catch (err) {
      console.error('Error deleting page:', err);
      throw err;
    }
  }, [websiteId]);

  // Reorder pages
  const reorderPages = useCallback(async (pageIds: string[]): Promise<boolean> => {
    if (!websiteId) return false;

    // Save current order for rollback
    const previousPages = [...pages];

    // Optimistic update
    const reorderedPages = pageIds
      .map((id, index) => {
        const page = pages.find(p => p.id === id);
        return page ? { ...page, order: index } : null;
      })
      .filter((page): page is Page => page !== null);

    setPages(reorderedPages);

    try {
      await pagesAPI.reorder(websiteId, { page_ids: pageIds });
      return true;
    } catch (err) {
      console.error('Error reordering pages:', err);
      // Rollback on error
      setPages(previousPages);
      throw err;
    }
  }, [websiteId, pages]);

  // Get homepage
  const getHomepage = useCallback(() => {
    return pages.find(page => page.is_homepage);
  }, [pages]);

  // Get page by slug
  const getPageBySlug = useCallback((slug: string) => {
    return pages.find(page => page.slug === slug);
  }, [pages]);

  return {
    pages,
    isLoading,
    error,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
    getHomepage,
    getPageBySlug,
    refetch: fetchPages,
  };
}

// Utility functions for page URLs
export function getPagePath(page: Page): string {
  if (page.is_homepage || page.slug === '') {
    return '/';
  }
  return `/${page.slug}`;
}

export function getPageDisplayUrl(websiteSlug: string, page: Page): string {
  const basePath = `${websiteSlug}.asap.com`;
  if (page.is_homepage || page.slug === '') {
    return basePath;
  }
  return `${basePath}/${page.slug}`;
}

// Default pages for new websites
export const DEFAULT_PAGES: Omit<Page, 'id' | 'website_id' | 'created_at' | 'updated_at'>[] = [
  {
    slug: '',
    title: 'Accueil',
    description: 'Page d\'accueil du site',
    is_homepage: true,
    order: 0,
    visible: true,
    metadata: {},
  },
];

// Page type icons for UI
export const PAGE_ICONS: Record<string, string> = {
  '': '🏠',       // Homepage
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

export function getPageIcon(slug: string): string {
  return PAGE_ICONS[slug] || '📄';
}
