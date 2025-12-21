import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { 
  extensionsAPI, 
  type Extension, 
  type WebsiteExtension, 
  type ExtensionData,
  type ActivateExtensionRequest,
  type UpdateExtensionSettingsRequest,
} from '../api';
import { queryKeys, staleTimes } from './queryClient';

// ============================================
// EXTENSION CATALOG QUERIES
// ============================================

/**
 * Hook to fetch the extension catalog (all available extensions)
 */
export function useExtensionCatalogQuery(
  options?: Omit<UseQueryOptions<Extension[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.extensionCatalog,
    queryFn: () => extensionsAPI.catalog(),
    staleTime: staleTimes.extensions,
    ...options,
  });
}

// ============================================
// WEBSITE EXTENSIONS QUERIES
// ============================================

/**
 * Hook to fetch extensions activated for a specific website
 */
export function useWebsiteExtensionsQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<WebsiteExtension[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.websiteExtensions(websiteId!),
    queryFn: () => extensionsAPI.listForWebsite(websiteId!),
    staleTime: staleTimes.extensions,
    enabled: !!websiteId,
    ...options,
  });
}

/**
 * Hook to fetch extension data (dynamic data like projects, stats)
 */
export function useExtensionDataQuery(
  websiteId: string | null | undefined,
  extensionSlug: string | null | undefined,
  options?: Omit<UseQueryOptions<ExtensionData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.extensionData(websiteId!, extensionSlug!),
    queryFn: () => extensionsAPI.getExtensionData(websiteId!, extensionSlug!),
    staleTime: staleTimes.extensionData,
    enabled: !!websiteId && !!extensionSlug,
    ...options,
  });
}

// ============================================
// EXTENSION MUTATIONS
// ============================================

/**
 * Hook to activate an extension for a website
 */
export function useActivateExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, extensionId, settings }: { 
      websiteId: string; 
      extensionId: string;
      settings?: Record<string, unknown>;
    }) =>
      extensionsAPI.activate(websiteId, { extension_id: extensionId, settings: settings || {} }),
    onSuccess: (newExtension, { websiteId }) => {
      // Add to the website extensions list
      queryClient.setQueryData<WebsiteExtension[]>(
        queryKeys.websiteExtensions(websiteId),
        (old) => {
          if (!old) return [newExtension];
          // Replace if exists, otherwise add
          const exists = old.some((e) => e.id === newExtension.id);
          if (exists) {
            return old.map((e) => (e.id === newExtension.id ? newExtension : e));
          }
          return [...old, newExtension];
        }
      );
    },
  });
}

/**
 * Hook to deactivate an extension for a website
 */
export function useDeactivateExtensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, extensionId }: { websiteId: string; extensionId: string }) =>
      extensionsAPI.deactivate(websiteId, extensionId),
    onSuccess: (_, { websiteId, extensionId }) => {
      // Remove from the website extensions list
      queryClient.setQueryData<WebsiteExtension[]>(
        queryKeys.websiteExtensions(websiteId),
        (old) => {
          if (!old) return [];
          return old.filter((e) => e.id !== extensionId);
        }
      );
    },
  });
}

/**
 * Hook to update extension settings (also handles initial activation)
 */
export function useUpdateExtensionSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      websiteId,
      extensionId,
      settings,
      isNewActivation = false,
    }: {
      websiteId: string;
      extensionId: string;
      settings: Record<string, unknown>;
      isNewActivation?: boolean;
    }) => {
      if (isNewActivation) {
        // Activate the extension with settings
        return extensionsAPI.activate(websiteId, {
          extension_id: extensionId,
          settings,
        });
      }
      // Update existing extension settings
      return extensionsAPI.updateSettings(websiteId, extensionId, { settings });
    },
    onSuccess: (updatedExtension, { websiteId }) => {
      // Update in the website extensions list
      queryClient.setQueryData<WebsiteExtension[]>(
        queryKeys.websiteExtensions(websiteId),
        (old) => {
          if (!old) return [updatedExtension];
          const exists = old.some((e) => e.id === updatedExtension.id);
          if (exists) {
            return old.map((e) => (e.id === updatedExtension.id ? updatedExtension : e));
          }
          return [...old, updatedExtension];
        }
      );
    },
  });
}

/**
 * Hook to trigger an extension action
 */
export function useTriggerExtensionActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      websiteId,
      extensionSlug,
      action,
      payload,
    }: {
      websiteId: string;
      extensionSlug: string;
      action: string;
      payload?: Record<string, unknown>;
    }) => extensionsAPI.executeAction(websiteId, extensionSlug, action, payload),
    onSuccess: (result, { websiteId, extensionSlug }) => {
      // Invalidate extension data to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.extensionData(websiteId, extensionSlug),
      });
      return result;
    },
  });
}
