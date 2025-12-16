"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Website, WebsiteModule, QuotaUsage } from '@/lib/api';
import { useWebsites, useWebsiteModules, useQuota, useCacheActions } from '@/hooks/useCache';

// ============================================
// Website Context Types
// ============================================

interface WebsiteContextValue {
  // Current website
  currentWebsite: Website | null;
  currentWebsiteId: string | null;
  
  // All websites
  websites: Website[];
  
  // Modules for current website
  modules: WebsiteModule[];
  enabledModules: WebsiteModule[];
  
  // Quota
  quota: QuotaUsage | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingWebsites: boolean;
  isLoadingModules: boolean;
  
  // Error
  error: string | null;
  
  // Actions
  setCurrentWebsite: (website: Website) => void;
  setCurrentWebsiteById: (websiteId: string) => void;
  refetch: () => Promise<void>;
  refetchWebsites: () => Promise<void>;
  refetchModules: () => Promise<void>;
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
    modules, 
    isLoading: isLoadingModules, 
    error: modulesError,
    refetch: refetchModules,
  } = useWebsiteModules(currentWebsiteId);

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

  // Enabled modules filter
  const enabledModules = modules.filter(m => m.enabled);

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
      refetchModules(true),
      refetchQuota(true),
    ]);
  }, [refetchWebsites, refetchModules, refetchQuota]);

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
    modules,
    enabledModules,
    quota,
    isLoading: isLoadingWebsites || isLoadingModules || isLoadingQuota,
    isLoadingWebsites,
    isLoadingModules,
    error: websitesError || modulesError,
    setCurrentWebsite,
    setCurrentWebsiteById,
    refetch,
    refetchWebsites: async () => { await refetchWebsites(true); },
    refetchModules: async () => { await refetchModules(true); },
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
