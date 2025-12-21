"use client"

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Website, WebsiteExtension, QuotaUsage } from '@/lib/api';
import { 
  useWebsitesQuery, 
  useWebsiteExtensionsQuery, 
  useQuotaQuery,
  queryKeys,
} from '@/lib/query';

// ============================================
// Website Context Types
// ============================================

interface WebsiteContextValue {
  // Current website (from URL)
  currentWebsite: Website | null;
  currentWebsiteId: string | null;
  
  // All websites
  websites: Website[];
  
  // Extensions for current website
  extensions: WebsiteExtension[];
  enabledExtensions: WebsiteExtension[];
  
  // Quota
  quota: QuotaUsage | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingWebsites: boolean;
  isLoadingExtensions: boolean;
  
  // Error
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  refetchWebsites: () => Promise<void>;
  refetchExtensions: () => Promise<void>;
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
  
  // Use React Query hooks
  const { 
    data: websites = [], 
    isLoading: isLoadingWebsites, 
    error: websitesError,
    refetch: refetchWebsitesQuery,
  } = useWebsitesQuery();

  const { 
    data: extensions = [], 
    isLoading: isLoadingExtensions, 
    error: extensionsError,
    refetch: refetchExtensionsQuery,
  } = useWebsiteExtensionsQuery(websiteId);

  const {
    data: quota = null,
    isLoading: isLoadingQuota,
    refetch: refetchQuotaQuery,
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
      refetchWebsitesQuery(),
      refetchExtensionsQuery(),
      refetchQuotaQuery(),
    ]);
  }, [refetchWebsitesQuery, refetchExtensionsQuery, refetchQuotaQuery]);

  // Refetch websites
  const refetchWebsites = useCallback(async () => {
    await refetchWebsitesQuery();
  }, [refetchWebsitesQuery]);

  // Refetch extensions
  const refetchExtensions = useCallback(async () => {
    await refetchExtensionsQuery();
  }, [refetchExtensionsQuery]);

  // Invalidate all cache
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.websites });
    queryClient.invalidateQueries({ queryKey: queryKeys.quota });
    if (websiteId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteExtensions(websiteId) });
    }
  }, [queryClient, websiteId]);

  const value: WebsiteContextValue = {
    currentWebsite,
    currentWebsiteId: websiteId,
    websites,
    extensions,
    enabledExtensions,
    quota,
    isLoading: isLoadingWebsites || isLoadingExtensions || isLoadingQuota,
    isLoadingWebsites,
    isLoadingExtensions,
    error: websitesError?.message || extensionsError?.message || null,
    refetch,
    refetchWebsites,
    refetchExtensions,
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
// Optional useCurrentWebsite Hook (returns null outside provider)
// ============================================

export function useCurrentWebsite(): Website | null {
  const context = useContext(WebsiteContext);
  return context?.currentWebsite ?? null;
}

export function useCurrentWebsiteId(): string | null {
  const context = useContext(WebsiteContext);
  return context?.currentWebsiteId ?? null;
}
