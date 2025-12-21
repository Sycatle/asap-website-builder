"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Website, WebsiteExtension, QuotaUsage } from '@/lib/api';
import { useWebsites, useWebsiteExtensions, useQuota, useCacheActions } from '@/hooks/useCache';

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
  // Use cache hooks
  const { 
    websites, 
    isLoading: isLoadingWebsites, 
    error: websitesError,
    refetch: refetchWebsites,
  } = useWebsites();

  const { 
    extensions, 
    isLoading: isLoadingExtensions, 
    error: extensionsError,
    refetch: refetchExtensions,
  } = useWebsiteExtensions(websiteId);

  const {
    quota,
    isLoading: isLoadingQuota,
    refetch: refetchQuota,
  } = useQuota();

  const { invalidate, invalidateWebsiteData } = useCacheActions();

  // Find current website from URL id
  const currentWebsite = websiteId 
    ? websites.find(w => w.id === websiteId) || null
    : null;

  // Enabled extensions filter
  const enabledExtensions = extensions.filter(m => m.enabled);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchWebsites(true),
      refetchExtensions(true),
      refetchQuota(true),
    ]);
  }, [refetchWebsites, refetchExtensions, refetchQuota]);

  // Invalidate all cache
  const invalidateAll = useCallback(() => {
    invalidate('websites');
    invalidate('quota');
    if (websiteId) {
      invalidateWebsiteData(websiteId);
    }
  }, [invalidate, invalidateWebsiteData, websiteId]);

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
    error: websitesError || extensionsError,
    refetch,
    refetchWebsites: async () => { await refetchWebsites(true); },
    refetchExtensions: async () => { await refetchExtensions(true); },
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
