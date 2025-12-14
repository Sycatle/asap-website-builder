import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { websitesAPI, filesAPI, modulesAPI, authAPI } from '../api';
import type { 
  Website, 
  QuotaUsage, 
  WebsiteModule, 
  Module, 
  ModuleData, 
  MeResponse,
  FileMetadata,
} from '../api';

// ============================================
// CACHE CONFIGURATION
// ============================================

// TTL (Time To Live) en millisecondes pour chaque type de données
export const CACHE_TTL = {
  user: 5 * 60 * 1000,         // 5 minutes - données utilisateur changent rarement
  websites: 2 * 60 * 1000,     // 2 minutes - liste des sites
  website: 2 * 60 * 1000,      // 2 minutes - détail d'un site
  modules: 5 * 60 * 1000,      // 5 minutes - catalogue des modules
  websiteModules: 2 * 60 * 1000, // 2 minutes - modules activés
  moduleData: 1 * 60 * 1000,   // 1 minute - données de module (peut changer fréquemment)
  quota: 30 * 1000,            // 30 secondes - quota peut changer après upload
  files: 1 * 60 * 1000,        // 1 minute - liste des fichiers
} as const;

// ============================================
// CACHE TYPES
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheState {
  // User cache
  user: CacheEntry<MeResponse> | null;
  
  // Websites cache
  websites: CacheEntry<Website[]> | null;
  websiteById: Record<string, CacheEntry<Website>>;
  
  // Modules cache  
  moduleCatalog: CacheEntry<Module[]> | null;
  websiteModules: Record<string, CacheEntry<WebsiteModule[]>>; // keyed by websiteId
  moduleData: Record<string, CacheEntry<ModuleData>>; // keyed by `${websiteId}:${moduleSlug}`
  
  // Quota cache
  quota: CacheEntry<QuotaUsage> | null;
  
  // Files cache
  files: CacheEntry<FileMetadata[]> | null;
  
  // Loading states (separate from cache to avoid persistence issues)
  loadingStates: Record<string, boolean>;
  
  // Error states
  errors: Record<string, string | null>;
}

interface CacheActions {
  // User actions
  fetchUser: (force?: boolean) => Promise<MeResponse | null>;
  
  // Website actions
  fetchWebsites: (force?: boolean) => Promise<Website[]>;
  fetchWebsite: (id: string, force?: boolean) => Promise<Website | null>;
  updateWebsiteCache: (website: Website) => void;
  addWebsiteToCache: (website: Website) => void;
  removeWebsiteFromCache: (websiteId: string) => void;
  
  // Module actions
  fetchModuleCatalog: (force?: boolean) => Promise<Module[]>;
  fetchWebsiteModules: (websiteId: string, force?: boolean) => Promise<WebsiteModule[]>;
  fetchModuleData: (websiteId: string, moduleSlug: string, force?: boolean) => Promise<ModuleData | null>;
  updateModuleDataCache: (websiteId: string, moduleSlug: string, data: Partial<ModuleData>) => void;
  invalidateModuleData: (websiteId: string, moduleSlug: string) => void;
  
  // Quota actions
  fetchQuota: (force?: boolean) => Promise<QuotaUsage | null>;
  
  // Files actions
  fetchFiles: (force?: boolean) => Promise<FileMetadata[]>;
  addFileToCache: (file: FileMetadata) => void;
  removeFileFromCache: (fileId: string) => void;
  invalidateFiles: () => void;
  
  // Cache management
  invalidate: (key: keyof typeof CACHE_TTL | 'all') => void;
  invalidateWebsiteData: (websiteId: string) => void;
  clearAll: () => void;
  
  // Utility
  isStale: (entry: CacheEntry<unknown> | null, ttl: number) => boolean;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  getLoadingState: (key: string) => boolean;
  getError: (key: string) => string | null;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: CacheState = {
  user: null,
  websites: null,
  websiteById: {},
  moduleCatalog: null,
  websiteModules: {},
  moduleData: {},
  quota: null,
  files: null,
  loadingStates: {},
  errors: {},
};

// ============================================
// CACHE STORE
// ============================================

export const useCacheStore = create<CacheState & CacheActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== UTILITY METHODS ==========
      
      isStale: (entry, ttl) => {
        if (!entry) return true;
        return Date.now() - entry.timestamp > ttl;
      },

      setLoading: (key, loading) => {
        set((state) => ({
          loadingStates: { ...state.loadingStates, [key]: loading },
        }));
      },

      setError: (key, error) => {
        set((state) => ({
          errors: { ...state.errors, [key]: error },
        }));
      },

      getLoadingState: (key) => {
        return get().loadingStates[key] ?? false;
      },

      getError: (key) => {
        return get().errors[key] ?? null;
      },

      // ========== USER ==========
      
      fetchUser: async (force = false) => {
        const { user, isStale, setLoading, setError } = get();
        
        // Return cached if valid
        if (!force && user && !isStale(user, CACHE_TTL.user)) {
          return user.data;
        }

        // Background revalidation if stale but exists
        const shouldBackgroundFetch = user && isStale(user, CACHE_TTL.user);
        
        if (!shouldBackgroundFetch) {
          setLoading('user', true);
        }

        try {
          const data = await authAPI.me();
          set({
            user: { data, timestamp: Date.now() },
          });
          setError('user', null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch user';
          setError('user', message);
          return user?.data ?? null;
        } finally {
          setLoading('user', false);
        }
      },

      // ========== WEBSITES ==========
      
      fetchWebsites: async (force = false) => {
        const { websites, isStale, setLoading, setError } = get();
        
        if (!force && websites && !isStale(websites, CACHE_TTL.websites)) {
          return websites.data;
        }

        const shouldBackgroundFetch = websites && isStale(websites, CACHE_TTL.websites);
        
        if (!shouldBackgroundFetch) {
          setLoading('websites', true);
        }

        try {
          const data = await websitesAPI.list();
          
          // Also update individual website cache
          const websiteById: Record<string, CacheEntry<Website>> = {};
          data.forEach((w) => {
            websiteById[w.id] = { data: w, timestamp: Date.now() };
          });
          
          set({
            websites: { data, timestamp: Date.now() },
            websiteById,
          });
          setError('websites', null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch websites';
          setError('websites', message);
          return websites?.data ?? [];
        } finally {
          setLoading('websites', false);
        }
      },

      fetchWebsite: async (id, force = false) => {
        const { websiteById, isStale, setLoading, setError, fetchWebsites } = get();
        const cached = websiteById[id];
        
        if (!force && cached && !isStale(cached, CACHE_TTL.website)) {
          return cached.data;
        }

        // Try to get from list first (more efficient)
        const websites = await fetchWebsites(force);
        const found = websites.find((w) => w.id === id);
        
        if (found) {
          return found;
        }

        // Fallback to individual fetch
        setLoading(`website:${id}`, true);
        try {
          const data = await websitesAPI.get(id);
          set((state) => ({
            websiteById: {
              ...state.websiteById,
              [id]: { data, timestamp: Date.now() },
            },
          }));
          setError(`website:${id}`, null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch website';
          setError(`website:${id}`, message);
          return cached?.data ?? null;
        } finally {
          setLoading(`website:${id}`, false);
        }
      },

      updateWebsiteCache: (website) => {
        set((state) => {
          const newWebsiteById = {
            ...state.websiteById,
            [website.id]: { data: website, timestamp: Date.now() },
          };
          
          // Also update list if exists
          let newWebsites = state.websites;
          if (state.websites) {
            const updatedList = state.websites.data.map((w) =>
              w.id === website.id ? website : w
            );
            newWebsites = { data: updatedList, timestamp: Date.now() };
          }
          
          return {
            websiteById: newWebsiteById,
            websites: newWebsites,
          };
        });
      },

      addWebsiteToCache: (website) => {
        set((state) => {
          const newWebsiteById = {
            ...state.websiteById,
            [website.id]: { data: website, timestamp: Date.now() },
          };
          
          let newWebsites = state.websites;
          if (state.websites) {
            newWebsites = { 
              data: [...state.websites.data, website], 
              timestamp: Date.now() 
            };
          }
          
          return {
            websiteById: newWebsiteById,
            websites: newWebsites,
          };
        });
      },

      removeWebsiteFromCache: (websiteId) => {
        set((state) => {
          const newWebsiteById = { ...state.websiteById };
          delete newWebsiteById[websiteId];
          
          let newWebsites = state.websites;
          if (state.websites) {
            newWebsites = { 
              data: state.websites.data.filter((w) => w.id !== websiteId), 
              timestamp: Date.now() 
            };
          }
          
          // Also clean up related data
          const newWebsiteModules = { ...state.websiteModules };
          delete newWebsiteModules[websiteId];
          
          const newModuleData = { ...state.moduleData };
          Object.keys(newModuleData).forEach((key) => {
            if (key.startsWith(`${websiteId}:`)) {
              delete newModuleData[key];
            }
          });
          
          return {
            websiteById: newWebsiteById,
            websites: newWebsites,
            websiteModules: newWebsiteModules,
            moduleData: newModuleData,
          };
        });
      },

      // ========== MODULES ==========
      
      fetchModuleCatalog: async (force = false) => {
        const { moduleCatalog, isStale, setLoading, setError } = get();
        
        if (!force && moduleCatalog && !isStale(moduleCatalog, CACHE_TTL.modules)) {
          return moduleCatalog.data;
        }

        const shouldBackgroundFetch = moduleCatalog && isStale(moduleCatalog, CACHE_TTL.modules);
        
        if (!shouldBackgroundFetch) {
          setLoading('moduleCatalog', true);
        }

        try {
          const data = await modulesAPI.catalog();
          set({
            moduleCatalog: { data, timestamp: Date.now() },
          });
          setError('moduleCatalog', null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch modules';
          setError('moduleCatalog', message);
          return moduleCatalog?.data ?? [];
        } finally {
          setLoading('moduleCatalog', false);
        }
      },

      fetchWebsiteModules: async (websiteId, force = false) => {
        const { websiteModules, isStale, setLoading, setError } = get();
        const cached = websiteModules[websiteId];
        
        if (!force && cached && !isStale(cached, CACHE_TTL.websiteModules)) {
          return cached.data;
        }

        const shouldBackgroundFetch = cached && isStale(cached, CACHE_TTL.websiteModules);
        const loadingKey = `websiteModules:${websiteId}`;
        
        if (!shouldBackgroundFetch) {
          setLoading(loadingKey, true);
        }

        try {
          const data = await modulesAPI.listForWebsite(websiteId);
          set((state) => ({
            websiteModules: {
              ...state.websiteModules,
              [websiteId]: { data, timestamp: Date.now() },
            },
          }));
          setError(loadingKey, null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch website modules';
          setError(loadingKey, message);
          return cached?.data ?? [];
        } finally {
          setLoading(loadingKey, false);
        }
      },

      fetchModuleData: async (websiteId, moduleSlug, force = false) => {
        const { moduleData, isStale, setLoading, setError } = get();
        const cacheKey = `${websiteId}:${moduleSlug}`;
        const cached = moduleData[cacheKey];
        
        if (!force && cached && !isStale(cached, CACHE_TTL.moduleData)) {
          return cached.data;
        }

        const shouldBackgroundFetch = cached && isStale(cached, CACHE_TTL.moduleData);
        const loadingKey = `moduleData:${cacheKey}`;
        
        if (!shouldBackgroundFetch) {
          setLoading(loadingKey, true);
        }

        try {
          const data = await modulesAPI.getModuleData(websiteId, moduleSlug);
          set((state) => ({
            moduleData: {
              ...state.moduleData,
              [cacheKey]: { data, timestamp: Date.now() },
            },
          }));
          setError(loadingKey, null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch module data';
          setError(loadingKey, message);
          return cached?.data ?? null;
        } finally {
          setLoading(loadingKey, false);
        }
      },

      updateModuleDataCache: (websiteId, moduleSlug, data) => {
        const cacheKey = `${websiteId}:${moduleSlug}`;
        set((state) => {
          const existing = state.moduleData[cacheKey];
          if (!existing) return state;
          
          return {
            moduleData: {
              ...state.moduleData,
              [cacheKey]: {
                data: { ...existing.data, ...data },
                timestamp: Date.now(),
              },
            },
          };
        });
      },

      invalidateModuleData: (websiteId, moduleSlug) => {
        const cacheKey = `${websiteId}:${moduleSlug}`;
        set((state) => {
          const newModuleData = { ...state.moduleData };
          delete newModuleData[cacheKey];
          return { moduleData: newModuleData };
        });
      },

      // ========== QUOTA ==========
      
      fetchQuota: async (force = false) => {
        const { quota, isStale, setLoading, setError } = get();
        
        if (!force && quota && !isStale(quota, CACHE_TTL.quota)) {
          return quota.data;
        }

        const shouldBackgroundFetch = quota && isStale(quota, CACHE_TTL.quota);
        
        if (!shouldBackgroundFetch) {
          setLoading('quota', true);
        }

        try {
          const data = await filesAPI.getQuota();
          set({
            quota: { data, timestamp: Date.now() },
          });
          setError('quota', null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch quota';
          setError('quota', message);
          return quota?.data ?? null;
        } finally {
          setLoading('quota', false);
        }
      },

      // ========== FILES ==========
      
      fetchFiles: async (force = false) => {
        const { files, isStale, setLoading, setError } = get();
        
        if (!force && files && !isStale(files, CACHE_TTL.files)) {
          return files.data;
        }

        const shouldBackgroundFetch = files && isStale(files, CACHE_TTL.files);
        
        if (!shouldBackgroundFetch) {
          setLoading('files', true);
        }

        try {
          const data = await filesAPI.list();
          set({
            files: { data, timestamp: Date.now() },
          });
          setError('files', null);
          return data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch files';
          setError('files', message);
          return files?.data ?? [];
        } finally {
          setLoading('files', false);
        }
      },

      addFileToCache: (file) => {
        set((state) => {
          const currentFiles = state.files?.data ?? [];
          return {
            files: {
              data: [file, ...currentFiles],
              timestamp: Date.now(),
            },
          };
        });
      },

      removeFileFromCache: (fileId) => {
        set((state) => {
          const currentFiles = state.files?.data ?? [];
          return {
            files: {
              data: currentFiles.filter((f) => f.id !== fileId),
              timestamp: Date.now(),
            },
          };
        });
      },

      invalidateFiles: () => {
        set({ files: null });
      },

      // ========== CACHE MANAGEMENT ==========
      
      invalidate: (key) => {
        if (key === 'all') {
          set(initialState);
          return;
        }
        
        switch (key) {
          case 'user':
            set({ user: null });
            break;
          case 'websites':
          case 'website':
            set({ websites: null, websiteById: {} });
            break;
          case 'modules':
            set({ moduleCatalog: null });
            break;
          case 'websiteModules':
            set({ websiteModules: {} });
            break;
          case 'moduleData':
            set({ moduleData: {} });
            break;
          case 'quota':
            set({ quota: null });
            break;
          case 'files':
            set({ files: null });
            break;
        }
      },

      invalidateWebsiteData: (websiteId) => {
        set((state) => {
          // Remove all module data for this website
          const newModuleData = { ...state.moduleData };
          Object.keys(newModuleData).forEach((key) => {
            if (key.startsWith(`${websiteId}:`)) {
              delete newModuleData[key];
            }
          });
          
          // Remove website modules
          const newWebsiteModules = { ...state.websiteModules };
          delete newWebsiteModules[websiteId];
          
          // Remove website from cache
          const newWebsiteById = { ...state.websiteById };
          delete newWebsiteById[websiteId];
          
          return {
            moduleData: newModuleData,
            websiteModules: newWebsiteModules,
            websiteById: newWebsiteById,
            websites: null, // Invalidate list too
          };
        });
      },

      clearAll: () => {
        set(initialState);
      },
    }),
    {
      name: 'asap-dashboard-cache',
      version: 1,
      partialize: (state) => ({
        // Only persist data entries, not loading/error states
        user: state.user,
        websites: state.websites,
        websiteById: state.websiteById,
        moduleCatalog: state.moduleCatalog,
        websiteModules: state.websiteModules,
        moduleData: state.moduleData,
        quota: state.quota,
        files: state.files,
      }),
    }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================

// Hook to get loading state
export const useIsLoading = (key: string) => {
  return useCacheStore((state) => state.loadingStates[key] ?? false);
};

// Hook to get error state
export const useError = (key: string) => {
  return useCacheStore((state) => state.errors[key] ?? null);
};

// Hook to get cached websites
export const useCachedWebsites = () => {
  return useCacheStore((state) => state.websites?.data ?? []);
};

// Hook to get cached website by id
export const useCachedWebsite = (id: string) => {
  return useCacheStore((state) => state.websiteById[id]?.data ?? null);
};

// Hook to get cached quota
export const useCachedQuota = () => {
  return useCacheStore((state) => state.quota?.data ?? null);
};

// Hook to get cached module catalog
export const useCachedModuleCatalog = () => {
  return useCacheStore((state) => state.moduleCatalog?.data ?? []);
};

// Hook to get cached website modules
export const useCachedWebsiteModules = (websiteId: string) => {
  return useCacheStore((state) => state.websiteModules[websiteId]?.data ?? []);
};

// Hook to get cached files
export const useCachedFiles = () => {
  return useCacheStore((state) => state.files?.data ?? []);
};
