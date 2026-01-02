"use client"

import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useWebsitesQuery, 
  useWebsiteExtensionsQuery, 
  useQuotaQuery,
  usePagesQuery,
  useElementsQuery,
  queryKeys,
} from '@/lib/query';
import type { Website, WebsiteExtension, QuotaUsage, Page, WebsiteElement } from '@/lib/types';

// ============================================
// Website Context Types
// ============================================

interface WebsiteContextValue {
  // Current website (from URL)
  currentWebsite: Website | null;
  currentWebsiteId: string | null;
  
  // All websites
  websites: Website[];
  
  // Pages for current website
  pages: Page[];
  
  // Elements for current website
  elements: WebsiteElement[];
  
  // Extensions for current website
  extensions: WebsiteExtension[];
  enabledExtensions: WebsiteExtension[];
  
  // Quota
  quota: QuotaUsage | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingWebsites: boolean;
  isLoadingPages: boolean;
  isLoadingElements: boolean;
  isLoadingExtensions: boolean;
  
  // Error
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  invalidateAll: () => void;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

// ============================================
// Website Provider
// ============================================

interface WebsiteProviderProps {
  children: ReactNode;
  websiteId: string | null;
}

export function WebsiteProvider({ children, websiteId }: WebsiteProviderProps) {
  const queryClient = useQueryClient();
  
  // Store last visited website ID in localStorage for navigation fallback
  useEffect(() => {
    if (websiteId) {
      localStorage.setItem('last_website_id', websiteId);
    }
  }, [websiteId]);
  
  // Use React Query hooks directly
  const { 
    data: websites = [], 
    isLoading: isLoadingWebsites, 
    error: websitesError,
    refetch: refetchWebsites,
  } = useWebsitesQuery();

  const { 
    data: pages = [], 
    isLoading: isLoadingPages, 
    error: pagesError,
    refetch: refetchPages,
  } = usePagesQuery(websiteId);

  const { 
    data: elements = [], 
    isLoading: isLoadingElements, 
    error: elementsError,
    refetch: refetchElements,
  } = useElementsQuery(websiteId);

  const { 
    data: extensions = [], 
    isLoading: isLoadingExtensions, 
    error: extensionsError,
    refetch: refetchExtensions,
  } = useWebsiteExtensionsQuery(websiteId);

  const {
    data: quota = null,
    refetch: refetchQuota,
  } = useQuotaQuery();

  // Find current website from URL id
  const currentWebsite = websiteId 
    ? websites.find(w => w.id === websiteId) || null
    : null;

  // Enabled extensions filter
  const enabledExtensions = extensions.filter(m => m.enabled);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchWebsites(),
      refetchPages(),
      refetchElements(),
      refetchExtensions(),
      refetchQuota(),
    ]);
  }, [refetchWebsites, refetchPages, refetchElements, refetchExtensions, refetchQuota]);

  // Invalidate all cache
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
    if (websiteId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.list(websiteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.elements.list(websiteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.extensions.list(websiteId) });
    }
  }, [queryClient, websiteId]);

  // Combine errors
  const error = websitesError?.message 
    || pagesError?.message 
    || elementsError?.message 
    || extensionsError?.message 
    || null;

  const value: WebsiteContextValue = {
    currentWebsite,
    currentWebsiteId: websiteId,
    websites,
    pages,
    elements,
    extensions,
    enabledExtensions,
    quota,
    isLoading: isLoadingWebsites || isLoadingPages || isLoadingElements || isLoadingExtensions,
    isLoadingWebsites,
    isLoadingPages,
    isLoadingElements,
    isLoadingExtensions,
    error,
    refetch,
    invalidateAll,
  };

  return (
    <WebsiteContext.Provider value={value}>
      {children}
    </WebsiteContext.Provider>
  );
}

// ============================================
// useWebsiteContext Hook
// ============================================

export function useWebsiteContext(): WebsiteContextValue {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error('useWebsiteContext must be used within a WebsiteProvider');
  }
  return context;
}

// ============================================
// Convenience hooks (can be used outside provider too)
// ============================================

export function useCurrentWebsite(): Website | null {
  const context = useContext(WebsiteContext);
  return context?.currentWebsite ?? null;
}

export function useCurrentWebsiteId(): string | null {
  const context = useContext(WebsiteContext);
  return context?.currentWebsiteId ?? null;
}
