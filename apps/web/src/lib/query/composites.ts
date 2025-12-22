/**
 * Composite hooks for fetching related data together
 * 
 * These hooks combine multiple queries for common use cases,
 * providing a unified interface for complex data requirements.
 */

import { useMemo } from 'react';
import { useWebsiteQuery, useWebsitesQuery } from './websites';
import { usePagesQuery, useHomepage } from './pages';
import { useElementsQuery } from './elements';
import { useWebsiteExtensionsQuery } from './extensions';
import { useQuotaQuery } from './files';
import type { Website, Page, WebsiteElement, WebsiteExtension, QuotaUsage } from '../types';

// ============================================
// useWebsiteData - Complete website data
// ============================================

interface UseWebsiteDataOptions {
  includeExtensions?: boolean;
  includeQuota?: boolean;
}

interface UseWebsiteDataReturn {
  // Core data
  website: Website | null;
  pages: Page[];
  elements: WebsiteElement[];
  homepage: Page | null;
  
  // Optional data
  extensions: WebsiteExtension[];
  enabledExtensions: WebsiteExtension[];
  quota: QuotaUsage | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingWebsite: boolean;
  isLoadingPages: boolean;
  isLoadingElements: boolean;
  isLoadingExtensions: boolean;
  
  // Error handling
  error: Error | null;
  
  // Refetch functions
  refetchAll: () => Promise<void>;
}

/**
 * Hook to fetch complete website data including pages and elements
 * Optionally includes extensions and quota
 */
export function useWebsiteData(
  websiteId: string | null | undefined,
  options: UseWebsiteDataOptions = {}
): UseWebsiteDataReturn {
  const { includeExtensions = false, includeQuota = false } = options;

  // Core queries
  const websiteQuery = useWebsiteQuery(websiteId);
  const pagesQuery = usePagesQuery(websiteId);
  const elementsQuery = useElementsQuery(websiteId);
  
  // Optional queries
  const extensionsQuery = useWebsiteExtensionsQuery(
    includeExtensions ? websiteId : null
  );
  const quotaQuery = useQuotaQuery({ enabled: includeQuota });

  // Derived data
  const homepage = useMemo(() => {
    return pagesQuery.data?.find(page => page.is_homepage) ?? null;
  }, [pagesQuery.data]);

  const enabledExtensions = useMemo(() => {
    return extensionsQuery.data?.filter(ext => ext.enabled) ?? [];
  }, [extensionsQuery.data]);

  // Combined loading state
  const isLoading = 
    websiteQuery.isLoading || 
    pagesQuery.isLoading || 
    elementsQuery.isLoading ||
    (includeExtensions && extensionsQuery.isLoading);

  // Combined error
  const error = 
    websiteQuery.error || 
    pagesQuery.error || 
    elementsQuery.error || 
    extensionsQuery.error || 
    null;

  // Refetch all queries
  const refetchAll = async () => {
    await Promise.all([
      websiteQuery.refetch(),
      pagesQuery.refetch(),
      elementsQuery.refetch(),
      includeExtensions && extensionsQuery.refetch(),
      includeQuota && quotaQuery.refetch(),
    ]);
  };

  return {
    website: websiteQuery.data ?? null,
    pages: pagesQuery.data ?? [],
    elements: elementsQuery.data ?? [],
    homepage,
    extensions: extensionsQuery.data ?? [],
    enabledExtensions,
    quota: quotaQuery.data ?? null,
    isLoading,
    isLoadingWebsite: websiteQuery.isLoading,
    isLoadingPages: pagesQuery.isLoading,
    isLoadingElements: elementsQuery.isLoading,
    isLoadingExtensions: extensionsQuery.isLoading,
    error,
    refetchAll,
  };
}

// ============================================
// useWebsitesList - Websites with summary data
// ============================================

interface WebsiteWithStats extends Website {
  pageCount?: number;
  elementCount?: number;
}

interface UseWebsitesListReturn {
  websites: Website[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch list of websites
 * Use this for dashboards and website selection
 */
export function useWebsitesList(): UseWebsitesListReturn {
  const { data, isLoading, error, refetch } = useWebsitesQuery();

  return {
    websites: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: async () => { await refetch(); },
  };
}

// ============================================
// useWebsiteEditor - Data optimized for editing
// ============================================

interface UseWebsiteEditorReturn {
  website: Website | null;
  pages: Page[];
  elements: WebsiteElement[];
  homepage: Page | null;
  selectedPage: Page | null;
  pageElements: WebsiteElement[];
  
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Hook optimized for the website editor view
 * Provides data organized by page context
 */
export function useWebsiteEditor(
  websiteId: string | null | undefined,
  selectedPageId?: string | null
): UseWebsiteEditorReturn {
  const { 
    website, 
    pages, 
    elements, 
    homepage,
    isLoading,
    error,
  } = useWebsiteData(websiteId);

  // Find selected page or default to homepage
  const selectedPage = useMemo(() => {
    if (selectedPageId) {
      return pages.find(p => p.id === selectedPageId) ?? null;
    }
    return homepage;
  }, [pages, selectedPageId, homepage]);

  // Filter elements for selected page (if pages have page_id association)
  // For now, return all elements sorted by order
  const pageElements = useMemo(() => {
    return [...elements].sort((a, b) => a.order - b.order);
  }, [elements]);

  return {
    website,
    pages,
    elements,
    homepage,
    selectedPage,
    pageElements,
    isLoading,
    isSaving: false, // Can be extended to track mutation states
    error,
  };
}

// ============================================
// useWebsitePreview - Data for preview/render
// ============================================

interface UseWebsitePreviewReturn {
  website: Website | null;
  pages: Page[];
  visibleElements: WebsiteElement[];
  homepage: Page | null;
  isLoading: boolean;
}

/**
 * Hook for website preview/public view
 * Returns only visible elements
 */
export function useWebsitePreview(
  websiteId: string | null | undefined
): UseWebsitePreviewReturn {
  const { website, pages, elements, homepage, isLoading } = useWebsiteData(websiteId);

  const visibleElements = useMemo(() => {
    return elements
      .filter(el => el.visible)
      .sort((a, b) => a.order - b.order);
  }, [elements]);

  return {
    website,
    pages: pages.filter(p => p.visible),
    visibleElements,
    homepage,
    isLoading,
  };
}
