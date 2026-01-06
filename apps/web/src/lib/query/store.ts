/**
 * Extension Store React Query Hooks
 * 
 * Provides hooks for fetching and mutating Extension Store data.
 * Uses React Query for caching, optimistic updates, and error handling.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { 
  storeAPI, 
  accountExtensionsAPI, 
  websiteExtensionsV2API,
  extensionActionsAPI,
  type ExtensionListResponse,
  type ExtensionStoreDetail,
  type ExtensionStoreSummary,
  type StoreCategory,
  type InstalledExtensionSummary,
  type InstalledExtensionDetail,
  type WebsiteExtensionV2,
  type StoreListParams,
  type ActionResult,
} from '../api/store';
import { queryKeys, staleTimes } from './queryKeys';

// ============================================================================
// Store Queries (Public)
// ============================================================================

/**
 * Hook to fetch paginated list of extensions from the store
 */
export function useStoreExtensionsQuery(
  params: StoreListParams = {},
  options?: Omit<UseQueryOptions<ExtensionListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.extensions(params as Record<string, unknown>),
    queryFn: () => storeAPI.list(params),
    staleTime: staleTimes.store,
    ...options,
  });
}

/**
 * Hook to fetch featured extensions
 */
export function useFeaturedExtensionsQuery(
  options?: Omit<UseQueryOptions<{ extensions: ExtensionStoreSummary[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.featured(),
    queryFn: () => storeAPI.featured(),
    staleTime: staleTimes.store,
    ...options,
  });
}

/**
 * Hook to fetch extension detail
 */
export function useStoreExtensionQuery(
  slug: string | null | undefined,
  options?: Omit<UseQueryOptions<ExtensionStoreDetail, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.detail(slug!),
    queryFn: () => storeAPI.get(slug!),
    staleTime: staleTimes.storeDetail,
    enabled: !!slug,
    ...options,
  });
}

/**
 * Hook to fetch extension manifest
 */
export function useExtensionManifestQuery(
  slug: string | null | undefined,
  options?: Omit<UseQueryOptions<Record<string, unknown>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.manifest(slug!),
    queryFn: () => storeAPI.manifest(slug!),
    staleTime: staleTimes.storeDetail,
    enabled: !!slug,
    ...options,
  });
}

/**
 * Hook to fetch store categories
 */
export function useStoreCategoriesQuery(
  options?: Omit<UseQueryOptions<{ categories: StoreCategory[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.categories(),
    queryFn: () => storeAPI.categories(),
    staleTime: staleTimes.store,
    ...options,
  });
}

// ============================================================================
// Account Extensions Queries (Authenticated)
// ============================================================================

/**
 * Hook to fetch installed extensions for account
 */
export function useInstalledExtensionsQuery(
  options?: Omit<UseQueryOptions<{ extensions: InstalledExtensionSummary[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.installed(),
    queryFn: () => accountExtensionsAPI.list(),
    staleTime: staleTimes.installed,
    ...options,
  });
}

/**
 * Hook to fetch installed extension detail
 */
export function useInstalledExtensionQuery(
  slug: string | null | undefined,
  options?: Omit<UseQueryOptions<InstalledExtensionDetail, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.installedDetail(slug!),
    queryFn: () => accountExtensionsAPI.get(slug!),
    staleTime: staleTimes.installed,
    enabled: !!slug,
    ...options,
  });
}

// ============================================================================
// Website Extensions v2 Queries
// ============================================================================

/**
 * Hook to fetch activated extensions for a website (v2)
 */
export function useWebsiteExtensionsV2Query(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<{ extensions: WebsiteExtensionV2[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.store.websiteExtensions(websiteId!),
    queryFn: () => websiteExtensionsV2API.list(websiteId!),
    staleTime: staleTimes.installed,
    enabled: !!websiteId,
    ...options,
  });
}

// ============================================================================
// Install/Uninstall Mutations
// ============================================================================

/**
 * Hook to install an extension
 */
export function useInstallExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, permissions }: { slug: string; permissions?: string[] }) =>
      accountExtensionsAPI.install(slug, permissions || []),
    onSuccess: (data, { slug }) => {
      // Invalidate installed list
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installed() });
      
      // Invalidate the store detail to refresh installed status
      queryClient.invalidateQueries({ queryKey: queryKeys.store.detail(slug) });
      
      // Invalidate store list to update installed flags
      queryClient.invalidateQueries({ queryKey: queryKeys.store.extensions() });
    },
  });
}

/**
 * Hook to uninstall an extension
 */
export function useUninstallExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => accountExtensionsAPI.uninstall(slug),
    onSuccess: (_, slug) => {
      // Invalidate installed list
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installed() });
      
      // Invalidate the store detail
      queryClient.invalidateQueries({ queryKey: queryKeys.store.detail(slug) });
      
      // Invalidate store list
      queryClient.invalidateQueries({ queryKey: queryKeys.store.extensions() });
    },
  });
}

/**
 * Hook to update account extension settings
 */
export function useUpdateAccountExtensionSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, settings }: { slug: string; settings: Record<string, unknown> }) =>
      accountExtensionsAPI.updateSettings(slug, settings),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installedDetail(slug) });
    },
  });
}

/**
 * Hook to toggle account extension enabled state
 */
export function useToggleAccountExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      accountExtensionsAPI.toggle(slug, enabled),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installedDetail(slug) });
    },
  });
}

// ============================================================================
// Activate/Deactivate Website Mutations
// ============================================================================

/**
 * Hook to activate an extension on a website
 */
export function useActivateWebsiteExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, slug, settings }: { 
      websiteId: string; 
      slug: string; 
      settings?: Record<string, unknown>;
    }) => websiteExtensionsV2API.activate(websiteId, slug, settings),
    onSuccess: (_, { websiteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.websiteExtensions(websiteId) });
      // Also invalidate installed to update websites_count
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installed() });
    },
  });
}

/**
 * Hook to deactivate an extension from a website
 */
export function useDeactivateWebsiteExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, slug }: { websiteId: string; slug: string }) =>
      websiteExtensionsV2API.deactivate(websiteId, slug),
    onSuccess: (_, { websiteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.websiteExtensions(websiteId) });
      // Also invalidate installed to update websites_count
      queryClient.invalidateQueries({ queryKey: queryKeys.store.installed() });
    },
  });
}

/**
 * Hook to update website extension settings
 */
export function useUpdateWebsiteExtensionSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, slug, settings }: { 
      websiteId: string; 
      slug: string; 
      settings: Record<string, unknown>;
    }) => websiteExtensionsV2API.updateSettings(websiteId, slug, settings),
    onSuccess: (_, { websiteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.websiteExtensions(websiteId) });
    },
  });
}

/**
 * Hook to toggle website extension enabled state
 */
export function useToggleWebsiteExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, slug, enabled }: { 
      websiteId: string; 
      slug: string; 
      enabled: boolean;
    }) => websiteExtensionsV2API.toggle(websiteId, slug, enabled),
    onSuccess: (_, { websiteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.websiteExtensions(websiteId) });
    },
  });
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Combined hook for extension installation flow
 * Provides all data needed to display install dialog with permissions
 */
export function useExtensionInstallFlow(slug: string | null | undefined) {
  const extensionQuery = useStoreExtensionQuery(slug);
  const installedQuery = useInstalledExtensionsQuery();
  const installMutation = useInstallExtensionMutation();
  
  const isInstalled = installedQuery.data?.extensions.some(e => e.slug === slug) ?? false;
  const requiredPermissions = (extensionQuery.data?.manifest?.permissions as string[]) ?? [];
  
  return {
    extension: extensionQuery.data,
    isLoading: extensionQuery.isLoading,
    isInstalled,
    requiredPermissions,
    install: (permissions: string[]) => {
      if (slug) {
        return installMutation.mutateAsync({ slug, permissions });
      }
    },
    isInstalling: installMutation.isPending,
    installError: installMutation.error,
  };
}

/**
 * Combined hook for extension store browsing
 * Provides data + filters state
 */
export function useExtensionStore(initialParams: StoreListParams = {}) {
  const categoriesQuery = useStoreCategoriesQuery();
  const extensionsQuery = useStoreExtensionsQuery(initialParams);
  
  return {
    extensions: extensionsQuery.data?.extensions ?? [],
    total: extensionsQuery.data?.total ?? 0,
    hasMore: extensionsQuery.data?.has_more ?? false,
    categories: categoriesQuery.data?.categories ?? [],
    isLoading: extensionsQuery.isLoading,
    isFetching: extensionsQuery.isFetching,
    error: extensionsQuery.error,
    refetch: extensionsQuery.refetch,
  };
}

// ============================================================================
// Extension Actions
// ============================================================================

/**
 * Hook to execute extension actions
 * 
 * @example
 * ```tsx
 * const { executeAction, isExecuting, lastResult } = useExtensionActions(websiteId, 'github-sync');
 * 
 * // Execute action
 * const result = await executeAction('sync', { github_username: 'user' });
 * ```
 */
export function useExtensionActions(
  websiteId: string | null | undefined,
  extensionSlug: string | null | undefined
) {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: ({ actionKey, payload }: { 
      actionKey: string; 
      payload?: Record<string, unknown>;
    }) => {
      if (!websiteId || !extensionSlug) {
        throw new Error('Website ID and extension slug are required');
      }
      return extensionActionsAPI.execute(websiteId, extensionSlug, actionKey, payload);
    },
    onSuccess: (result, { actionKey }) => {
      // If action indicates refresh needed, invalidate extension data
      if (result.refresh && websiteId && extensionSlug) {
        queryClient.invalidateQueries({ 
          queryKey: ['extensions', websiteId, extensionSlug, 'data'] 
        });
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.store.websiteExtensions(websiteId) 
        });
      }
      
      // Log success
      console.log(`Action "${actionKey}" completed:`, result);
    },
  });

  return {
    /**
     * Execute an extension action
     */
    executeAction: (actionKey: string, payload?: Record<string, unknown>) => 
      mutation.mutateAsync({ actionKey, payload }),
    
    /**
     * Whether any action is currently executing
     */
    isExecuting: mutation.isPending,
    
    /**
     * The action key currently being executed
     */
    executingAction: mutation.isPending ? (mutation.variables?.actionKey ?? null) : null,
    
    /**
     * Check if a specific action is executing
     */
    isActionExecuting: (actionKey: string) => 
      mutation.isPending && mutation.variables?.actionKey === actionKey,
    
    /**
     * Last action result
     */
    lastResult: mutation.data as ActionResult | undefined,
    
    /**
     * Last action error
     */
    error: mutation.error,
    
    /**
     * Reset mutation state
     */
    reset: mutation.reset,
  };
}
