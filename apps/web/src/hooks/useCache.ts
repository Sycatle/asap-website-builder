import { useEffect, useCallback, useRef } from 'react';
import { useCacheStore, useIsLoading, CACHE_TTL } from '../lib/store/cacheStore';
import type { Website, QuotaUsage, WebsiteModule, Module, ModuleData, FileMetadata } from '../lib/api';

// Stable default values to avoid infinite loops with useSyncExternalStore
const EMPTY_ARRAY: readonly any[] = [];
const EMPTY_WEBSITES: Website[] = EMPTY_ARRAY as Website[];
const EMPTY_MODULES: Module[] = EMPTY_ARRAY as Module[];
const EMPTY_WEBSITE_MODULES: WebsiteModule[] = EMPTY_ARRAY as WebsiteModule[];
const EMPTY_FILES: FileMetadata[] = EMPTY_ARRAY as FileMetadata[];

// ============================================
// useWebsites - Hook for websites list
// ============================================

interface UseWebsitesOptions {
  autoFetch?: boolean;
}

interface UseWebsitesReturn {
  websites: Website[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<Website[]>;
  invalidate: () => void;
}

export function useWebsites(options: UseWebsitesOptions = {}): UseWebsitesReturn {
  const { autoFetch = true } = options;
  
  const websites = useCacheStore((state) => state.websites?.data ?? EMPTY_WEBSITES);
  const websitesEntry = useCacheStore((state) => state.websites);
  const fetchWebsites = useCacheStore((state) => state.fetchWebsites);
  const invalidate = useCacheStore((state) => state.invalidate);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading('websites');
  const error = useCacheStore((state) => state.errors['websites'] ?? null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      // Fetch if no data or stale
      if (!websitesEntry || isStale(websitesEntry, CACHE_TTL.websites)) {
        fetchWebsites();
      }
    }
  }, [autoFetch, websitesEntry, isStale, fetchWebsites]);

  const refetch = useCallback(async (force = true) => {
    return fetchWebsites(force);
  }, [fetchWebsites]);

  const handleInvalidate = useCallback(() => {
    invalidate('websites');
  }, [invalidate]);

  return {
    websites,
    isLoading,
    error,
    refetch,
    invalidate: handleInvalidate,
  };
}

// ============================================
// useWebsite - Hook for single website
// ============================================

interface UseWebsiteOptions {
  autoFetch?: boolean;
}

interface UseWebsiteReturn {
  website: Website | null;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<Website | null>;
  update: (website: Website) => void;
}

export function useWebsite(websiteId: string | null, options: UseWebsiteOptions = {}): UseWebsiteReturn {
  const { autoFetch = true } = options;
  
  const website = useCacheStore((state) => 
    websiteId ? state.websiteById[websiteId]?.data ?? null : null
  );
  const websiteEntry = useCacheStore((state) => 
    websiteId ? state.websiteById[websiteId] : null
  );
  const fetchWebsite = useCacheStore((state) => state.fetchWebsite);
  const updateWebsiteCache = useCacheStore((state) => state.updateWebsiteCache);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading(websiteId ? `website:${websiteId}` : 'website');
  const error = useCacheStore((state) => 
    websiteId ? state.errors[`website:${websiteId}`] ?? null : null
  );
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      if (!websiteEntry || isStale(websiteEntry, CACHE_TTL.website)) {
        fetchWebsite(websiteId);
      }
    }
  }, [autoFetch, websiteId, websiteEntry, isStale, fetchWebsite]);

  // Reset hasFetched when websiteId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [websiteId]);

  const refetch = useCallback(async (force = true) => {
    if (!websiteId) return null;
    return fetchWebsite(websiteId, force);
  }, [websiteId, fetchWebsite]);

  return {
    website,
    isLoading,
    error,
    refetch,
    update: updateWebsiteCache,
  };
}

// ============================================
// useQuota - Hook for quota
// ============================================

interface UseQuotaOptions {
  autoFetch?: boolean;
}

interface UseQuotaReturn {
  quota: QuotaUsage | null;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<QuotaUsage | null>;
}

export function useQuota(options: UseQuotaOptions = {}): UseQuotaReturn {
  const { autoFetch = true } = options;
  
  const quota = useCacheStore((state) => state.quota?.data ?? null);
  const quotaEntry = useCacheStore((state) => state.quota);
  const fetchQuota = useCacheStore((state) => state.fetchQuota);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading('quota');
  const error = useCacheStore((state) => state.errors['quota'] ?? null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      if (!quotaEntry || isStale(quotaEntry, CACHE_TTL.quota)) {
        fetchQuota();
      }
    }
  }, [autoFetch, quotaEntry, isStale, fetchQuota]);

  const refetch = useCallback(async (force = true) => {
    return fetchQuota(force);
  }, [fetchQuota]);

  return {
    quota,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useFiles - Hook for files list
// ============================================

interface UseFilesOptions {
  autoFetch?: boolean;
}

interface UseFilesReturn {
  files: FileMetadata[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<FileMetadata[]>;
  addFile: (file: FileMetadata) => void;
  removeFile: (fileId: string) => void;
  invalidate: () => void;
}

export function useFiles(options: UseFilesOptions = {}): UseFilesReturn {
  const { autoFetch = true } = options;
  
  const files = useCacheStore((state) => state.files?.data ?? EMPTY_FILES);
  const filesEntry = useCacheStore((state) => state.files);
  const fetchFiles = useCacheStore((state) => state.fetchFiles);
  const addFileToCache = useCacheStore((state) => state.addFileToCache);
  const removeFileFromCache = useCacheStore((state) => state.removeFileFromCache);
  const invalidateFiles = useCacheStore((state) => state.invalidateFiles);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading('files');
  const error = useCacheStore((state) => state.errors['files'] ?? null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      if (!filesEntry || isStale(filesEntry, CACHE_TTL.files)) {
        fetchFiles();
      }
    }
  }, [autoFetch, filesEntry, isStale, fetchFiles]);

  const refetch = useCallback(async (force = true) => {
    return fetchFiles(force);
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refetch,
    addFile: addFileToCache,
    removeFile: removeFileFromCache,
    invalidate: invalidateFiles,
  };
}

// ============================================
// useModuleCatalog - Hook for module catalog
// ============================================

interface UseModuleCatalogOptions {
  autoFetch?: boolean;
}

interface UseModuleCatalogReturn {
  modules: Module[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<Module[]>;
}

export function useModuleCatalog(options: UseModuleCatalogOptions = {}): UseModuleCatalogReturn {
  const { autoFetch = true } = options;
  
  const modules = useCacheStore((state) => state.moduleCatalog?.data ?? EMPTY_MODULES);
  const moduleCatalogEntry = useCacheStore((state) => state.moduleCatalog);
  const fetchModuleCatalog = useCacheStore((state) => state.fetchModuleCatalog);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading('moduleCatalog');
  const error = useCacheStore((state) => state.errors['moduleCatalog'] ?? null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      if (!moduleCatalogEntry || isStale(moduleCatalogEntry, CACHE_TTL.modules)) {
        fetchModuleCatalog();
      }
    }
  }, [autoFetch, moduleCatalogEntry, isStale, fetchModuleCatalog]);

  const refetch = useCallback(async (force = true) => {
    return fetchModuleCatalog(force);
  }, [fetchModuleCatalog]);

  return {
    modules,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useWebsiteModules - Hook for website modules
// ============================================

interface UseWebsiteModulesOptions {
  autoFetch?: boolean;
}

interface UseWebsiteModulesReturn {
  modules: WebsiteModule[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<WebsiteModule[]>;
  invalidate: () => void;
}

export function useWebsiteModules(
  websiteId: string | null, 
  options: UseWebsiteModulesOptions = {}
): UseWebsiteModulesReturn {
  const { autoFetch = true } = options;
  
  const modules = useCacheStore((state) => 
    websiteId ? (state.websiteModules[websiteId]?.data ?? EMPTY_WEBSITE_MODULES) : EMPTY_WEBSITE_MODULES
  );
  const modulesEntry = useCacheStore((state) => 
    websiteId ? state.websiteModules[websiteId] : null
  );
  const fetchWebsiteModules = useCacheStore((state) => state.fetchWebsiteModules);
  const invalidateWebsiteData = useCacheStore((state) => state.invalidateWebsiteData);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading(websiteId ? `websiteModules:${websiteId}` : 'websiteModules');
  const error = useCacheStore((state) => 
    websiteId ? state.errors[`websiteModules:${websiteId}`] ?? null : null
  );
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      if (!modulesEntry || isStale(modulesEntry, CACHE_TTL.websiteModules)) {
        fetchWebsiteModules(websiteId);
      }
    }
  }, [autoFetch, websiteId, modulesEntry, isStale, fetchWebsiteModules]);

  // Reset hasFetched when websiteId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [websiteId]);

  const refetch = useCallback(async (force = true) => {
    if (!websiteId) return [];
    return fetchWebsiteModules(websiteId, force);
  }, [websiteId, fetchWebsiteModules]);

  const handleInvalidate = useCallback(() => {
    if (websiteId) {
      invalidateWebsiteData(websiteId);
    }
  }, [websiteId, invalidateWebsiteData]);

  return {
    modules,
    isLoading,
    error,
    refetch,
    invalidate: handleInvalidate,
  };
}

// ============================================
// useModuleData - Hook for module data
// ============================================

interface UseModuleDataOptions {
  autoFetch?: boolean;
}

interface UseModuleDataReturn {
  data: ModuleData | null;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<ModuleData | null>;
  update: (data: Partial<ModuleData>) => void;
  invalidate: () => void;
}

export function useModuleData(
  websiteId: string | null,
  moduleSlug: string | null,
  options: UseModuleDataOptions = {}
): UseModuleDataReturn {
  const { autoFetch = true } = options;
  
  const cacheKey = websiteId && moduleSlug ? `${websiteId}:${moduleSlug}` : null;
  
  const data = useCacheStore((state) => 
    cacheKey ? state.moduleData[cacheKey]?.data ?? null : null
  );
  const dataEntry = useCacheStore((state) => 
    cacheKey ? state.moduleData[cacheKey] : null
  );
  const fetchModuleData = useCacheStore((state) => state.fetchModuleData);
  const updateModuleDataCache = useCacheStore((state) => state.updateModuleDataCache);
  const invalidateModuleData = useCacheStore((state) => state.invalidateModuleData);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading(cacheKey ? `moduleData:${cacheKey}` : 'moduleData');
  const error = useCacheStore((state) => 
    cacheKey ? state.errors[`moduleData:${cacheKey}`] ?? null : null
  );
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && websiteId && moduleSlug && !hasFetched.current) {
      hasFetched.current = true;
      if (!dataEntry || isStale(dataEntry, CACHE_TTL.moduleData)) {
        fetchModuleData(websiteId, moduleSlug);
      }
    }
  }, [autoFetch, websiteId, moduleSlug, dataEntry, isStale, fetchModuleData]);

  // Reset hasFetched when params change
  useEffect(() => {
    hasFetched.current = false;
  }, [websiteId, moduleSlug]);

  const refetch = useCallback(async (force = true) => {
    if (!websiteId || !moduleSlug) return null;
    return fetchModuleData(websiteId, moduleSlug, force);
  }, [websiteId, moduleSlug, fetchModuleData]);

  const update = useCallback((newData: Partial<ModuleData>) => {
    if (websiteId && moduleSlug) {
      updateModuleDataCache(websiteId, moduleSlug, newData);
    }
  }, [websiteId, moduleSlug, updateModuleDataCache]);

  const handleInvalidate = useCallback(() => {
    if (websiteId && moduleSlug) {
      invalidateModuleData(websiteId, moduleSlug);
    }
  }, [websiteId, moduleSlug, invalidateModuleData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    update,
    invalidate: handleInvalidate,
  };
}

// ============================================
// useDashboardData - Combined hook for dashboard
// ============================================

interface UseDashboardDataReturn {
  website: Website | null;
  websites: Website[];
  quota: QuotaUsage | null;
  modules: WebsiteModule[];
  isLoading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { websites, isLoading: websitesLoading, error: websitesError } = useWebsites();
  const { quota, isLoading: quotaLoading, error: quotaError } = useQuota();
  
  // Get first website
  const website = websites.length > 0 ? websites[0] : null;
  
  const { modules, isLoading: modulesLoading, error: modulesError } = useWebsiteModules(
    website?.id ?? null
  );
  
  const fetchWebsites = useCacheStore((state) => state.fetchWebsites);
  const fetchQuota = useCacheStore((state) => state.fetchQuota);
  const fetchWebsiteModules = useCacheStore((state) => state.fetchWebsiteModules);

  const refetchAll = useCallback(async () => {
    const websitesData = await fetchWebsites(true);
    await fetchQuota(true);
    if (websitesData.length > 0) {
      await fetchWebsiteModules(websitesData[0].id, true);
    }
  }, [fetchWebsites, fetchQuota, fetchWebsiteModules]);

  return {
    website,
    websites,
    quota,
    modules,
    isLoading: websitesLoading || quotaLoading || modulesLoading,
    error: websitesError || quotaError || modulesError,
    refetchAll,
  };
}

// ============================================
// Cache Utilities
// ============================================

export function useCacheActions() {
  const invalidate = useCacheStore((state) => state.invalidate);
  const invalidateWebsiteData = useCacheStore((state) => state.invalidateWebsiteData);
  const clearAll = useCacheStore((state) => state.clearAll);
  const updateWebsiteCache = useCacheStore((state) => state.updateWebsiteCache);
  const addWebsiteToCache = useCacheStore((state) => state.addWebsiteToCache);
  const removeWebsiteFromCache = useCacheStore((state) => state.removeWebsiteFromCache);

  return {
    invalidate,
    invalidateWebsiteData,
    clearAll,
    updateWebsiteCache,
    addWebsiteToCache,
    removeWebsiteFromCache,
  };
}
