"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Website, WebsiteExtension, QuotaUsage } from '@/lib/api';
import { useWebsites, useWebsiteExtensions, useQuota, useCacheActions } from '@/hooks/useCache';

// ============================================
// Website Context Types
// ============================================

interface WebsiteContextValue {
  // Current website
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
  setCurrentWebsite: (website: Website) => void;
  setCurrentWebsiteById: (websiteId: string) => void;
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
}

const STORAGE_KEY = 'asap_current_website_id';

export function WebsiteProvider({ children }: WebsiteProviderProps) {
  // Track current website ID (persisted to localStorage)
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

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
  } = useWebsiteExtensions(currentWebsiteId);

  const {
    quota,
    isLoading: isLoadingQuota,
    refetch: refetchQuota,
  } = useQuota();

  const { invalidate, invalidateWebsiteData } = useCacheActions();

  // Helper to persist website ID to localStorage
  const persistWebsiteId = useCallback((websiteId: string) => {
    setCurrentWebsiteId(websiteId);
    localStorage.setItem(STORAGE_KEY, websiteId);
  }, []);

  // Auto-select first website when websites load and none selected
  // Also handles case where stored ID doesn't exist in websites list
  useEffect(() => {
    if (websites.length === 0) return;
    
    // No current selection - select first
    if (!currentWebsiteId) {
      persistWebsiteId(websites[0].id);
      return;
    }
    
    // Current selection doesn't exist anymore - select first
    if (!websites.find(w => w.id === currentWebsiteId)) {
      persistWebsiteId(websites[0].id);
    }
  }, [websites, currentWebsiteId, persistWebsiteId]);

  // Determine current website - only use currentWebsiteId if it exists in websites
  const currentWebsite = currentWebsiteId && websites.find(w => w.id === currentWebsiteId)
    ? websites.find(w => w.id === currentWebsiteId)!
    : websites[0] || null;

  // Enabled extensions filter
  const enabledExtensions = extensions.filter(m => m.enabled);

  // Set current website handler
  const setCurrentWebsite = useCallback((website: Website) => {
    persistWebsiteId(website.id);
  }, [persistWebsiteId]);

  // Set current website by ID handler
  const setCurrentWebsiteById = useCallback((websiteId: string) => {
    persistWebsiteId(websiteId);
  }, [persistWebsiteId]);

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
    if (currentWebsiteId) {
      invalidateWebsiteData(currentWebsiteId);
    }
  }, [invalidate, invalidateWebsiteData, currentWebsiteId]);

  const value: WebsiteContextValue = {
    currentWebsite,
    currentWebsiteId,
    websites,
    extensions,
    enabledExtensions,
    quota,
    isLoading: isLoadingWebsites || isLoadingExtensions || isLoadingQuota,
    isLoadingWebsites,
    isLoadingExtensions,
    error: websitesError || extensionsError,
    setCurrentWebsite,
    setCurrentWebsiteById,
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
