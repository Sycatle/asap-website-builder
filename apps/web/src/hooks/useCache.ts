import { useEffect, useCallback, useRef } from 'react';
import { useCacheStore, useIsLoading, CACHE_TTL } from '../lib/store/cacheStore';
import type { Website, QuotaUsage, WebsiteExtension, Extension, ExtensionData, FileMetadata } from '../lib/api';

// Stable default values to avoid infinite loops with useSyncExternalStore
const EMPTY_ARRAY: readonly any[] = [];
const EMPTY_WEBSITES: Website[] = EMPTY_ARRAY as Website[];
const EMPTY_EXTENSIONS: Extension[] = EMPTY_ARRAY as Extension[];
const EMPTY_WEBSITE_EXTENSIONS: WebsiteExtension[] = EMPTY_ARRAY as WebsiteExtension[];
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
// useExtensionCatalog - Hook for extension catalog
// ============================================

interface UseExtensionCatalogOptions {
  autoFetch?: boolean;
}

interface UseExtensionCatalogReturn {
  extensions: Extension[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<Extension[]>;
}

export function useExtensionCatalog(options: UseExtensionCatalogOptions = {}): UseExtensionCatalogReturn {
  const { autoFetch = true } = options;
  
  const extensions = useCacheStore((state) => state.extensionCatalog?.data ?? EMPTY_EXTENSIONS);
  const extensionCatalogEntry = useCacheStore((state) => state.extensionCatalog);
  const fetchExtensionCatalog = useCacheStore((state) => state.fetchExtensionCatalog);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading('extensionCatalog');
  const error = useCacheStore((state) => state.errors['extensionCatalog'] ?? null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      if (!extensionCatalogEntry || isStale(extensionCatalogEntry, CACHE_TTL.extensions)) {
        fetchExtensionCatalog();
      }
    }
  }, [autoFetch, extensionCatalogEntry, isStale, fetchExtensionCatalog]);

  const refetch = useCallback(async (force = true) => {
    return fetchExtensionCatalog(force);
  }, [fetchExtensionCatalog]);

  return {
    extensions,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useWebsiteExtensions - Hook for website extensions
// ============================================

interface UseWebsiteExtensionsOptions {
  autoFetch?: boolean;
}

interface UseWebsiteExtensionsReturn {
  extensions: WebsiteExtension[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<WebsiteExtension[]>;
  invalidate: () => void;
}

export function useWebsiteExtensions(
  websiteId: string | null, 
  options: UseWebsiteExtensionsOptions = {}
): UseWebsiteExtensionsReturn {
  const { autoFetch = true } = options;
  
  const extensions = useCacheStore((state) => 
    websiteId ? (state.websiteExtensions[websiteId]?.data ?? EMPTY_WEBSITE_EXTENSIONS) : EMPTY_WEBSITE_EXTENSIONS
  );
  const extensionsEntry = useCacheStore((state) => 
    websiteId ? state.websiteExtensions[websiteId] : null
  );
  const fetchWebsiteExtensions = useCacheStore((state) => state.fetchWebsiteExtensions);
  const invalidateWebsiteData = useCacheStore((state) => state.invalidateWebsiteData);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading(websiteId ? `websiteExtensions:${websiteId}` : 'websiteExtensions');
  const error = useCacheStore((state) => 
    websiteId ? state.errors[`websiteExtensions:${websiteId}`] ?? null : null
  );
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      if (!extensionsEntry || isStale(extensionsEntry, CACHE_TTL.websiteExtensions)) {
        fetchWebsiteExtensions(websiteId);
      }
    }
  }, [autoFetch, websiteId, extensionsEntry, isStale, fetchWebsiteExtensions]);

  // Reset hasFetched when websiteId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [websiteId]);

  const refetch = useCallback(async (force = true) => {
    if (!websiteId) return [];
    return fetchWebsiteExtensions(websiteId, force);
  }, [websiteId, fetchWebsiteExtensions]);

  const handleInvalidate = useCallback(() => {
    if (websiteId) {
      invalidateWebsiteData(websiteId);
    }
  }, [websiteId, invalidateWebsiteData]);

  return {
    extensions,
    isLoading,
    error,
    refetch,
    invalidate: handleInvalidate,
  };
}

// ============================================
// useExtensionData - Hook for extension data
// ============================================

interface UseExtensionDataOptions {
  autoFetch?: boolean;
}

interface UseExtensionDataReturn {
  data: ExtensionData | null;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<ExtensionData | null>;
  update: (data: Partial<ExtensionData>) => void;
  invalidate: () => void;
}

export function useExtensionData(
  websiteId: string | null,
  extensionSlug: string | null,
  options: UseExtensionDataOptions = {}
): UseExtensionDataReturn {
  const { autoFetch = true } = options;
  
  const cacheKey = websiteId && extensionSlug ? `${websiteId}:${extensionSlug}` : null;
  
  const data = useCacheStore((state) => 
    cacheKey ? state.extensionData[cacheKey]?.data ?? null : null
  );
  const dataEntry = useCacheStore((state) => 
    cacheKey ? state.extensionData[cacheKey] : null
  );
  const fetchExtensionData = useCacheStore((state) => state.fetchExtensionData);
  const updateExtensionDataCache = useCacheStore((state) => state.updateExtensionDataCache);
  const invalidateExtensionData = useCacheStore((state) => state.invalidateExtensionData);
  const isStale = useCacheStore((state) => state.isStale);
  const isLoading = useIsLoading(cacheKey ? `extensionData:${cacheKey}` : 'extensionData');
  const error = useCacheStore((state) => 
    cacheKey ? state.errors[`extensionData:${cacheKey}`] ?? null : null
  );
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (autoFetch && websiteId && extensionSlug && !hasFetched.current) {
      hasFetched.current = true;
      if (!dataEntry || isStale(dataEntry, CACHE_TTL.extensionData)) {
        fetchExtensionData(websiteId, extensionSlug);
      }
    }
  }, [autoFetch, websiteId, extensionSlug, dataEntry, isStale, fetchExtensionData]);

  // Reset hasFetched when params change
  useEffect(() => {
    hasFetched.current = false;
  }, [websiteId, extensionSlug]);

  const refetch = useCallback(async (force = true) => {
    if (!websiteId || !extensionSlug) return null;
    return fetchExtensionData(websiteId, extensionSlug, force);
  }, [websiteId, extensionSlug, fetchExtensionData]);

  const update = useCallback((newData: Partial<ExtensionData>) => {
    if (websiteId && extensionSlug) {
      updateExtensionDataCache(websiteId, extensionSlug, newData);
    }
  }, [websiteId, extensionSlug, updateExtensionDataCache]);

  const handleInvalidate = useCallback(() => {
    if (websiteId && extensionSlug) {
      invalidateExtensionData(websiteId, extensionSlug);
    }
  }, [websiteId, extensionSlug, invalidateExtensionData]);

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
  extensions: WebsiteExtension[];
  isLoading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { websites, isLoading: websitesLoading, error: websitesError } = useWebsites();
  const { quota, isLoading: quotaLoading, error: quotaError } = useQuota();
  
  // Get first website
  const website = websites.length > 0 ? websites[0] : null;
  
  const { extensions, isLoading: extensionsLoading, error: extensionsError } = useWebsiteExtensions(
    website?.id ?? null
  );
  
  const fetchWebsites = useCacheStore((state) => state.fetchWebsites);
  const fetchQuota = useCacheStore((state) => state.fetchQuota);
  const fetchWebsiteExtensions = useCacheStore((state) => state.fetchWebsiteExtensions);

  const refetchAll = useCallback(async () => {
    const websitesData = await fetchWebsites(true);
    await fetchQuota(true);
    if (websitesData.length > 0) {
      await fetchWebsiteExtensions(websitesData[0].id, true);
    }
  }, [fetchWebsites, fetchQuota, fetchWebsiteExtensions]);

  return {
    website,
    websites,
    quota,
    extensions,
    isLoading: websitesLoading || quotaLoading || extensionsLoading,
    error: websitesError || quotaError || extensionsError,
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
