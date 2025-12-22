import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elementsAPI } from '../api';
import { queryKeys, staleTimes } from './queryKeys';
import type { WebsiteElement, CreateElementRequest, UpdateElementRequest } from '../types';

// ============================================
// ELEMENTS QUERIES
// ============================================

/**
 * Hook to fetch all elements for a website
 */
export function useElementsQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<WebsiteElement[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.elements.list(websiteId!),
    queryFn: () => elementsAPI.list(websiteId!),
    staleTime: staleTimes.elements,
    enabled: !!websiteId,
    ...options,
  });
}

/**
 * Hook to fetch a single element by ID
 */
export function useElementQuery(
  websiteId: string | null | undefined,
  elementId: string | null | undefined,
  options?: Omit<UseQueryOptions<WebsiteElement, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.elements.detail(websiteId!, elementId!),
    queryFn: () => elementsAPI.get(websiteId!, elementId!),
    staleTime: staleTimes.elements,
    enabled: !!websiteId && !!elementId,
    ...options,
  });
}

// ============================================
// ELEMENTS MUTATIONS
// ============================================

/**
 * Hook to create a new element
 */
export function useCreateElementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, data }: { websiteId: string; data: CreateElementRequest }) =>
      elementsAPI.create(websiteId, data),
    onSuccess: (newElement, { websiteId }) => {
      // Add to list cache (avoid duplicates by checking ID)
      queryClient.setQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId),
        (old) => {
          if (!old) return [newElement];
          // Check if element already exists (avoid duplicate from WebSocket)
          const exists = old.some(el => el.id === newElement.id);
          if (exists) {
            // Update existing element instead of adding duplicate
            return old.map(el => el.id === newElement.id ? newElement : el)
              .sort((a, b) => a.order - b.order);
          }
          return [...old, newElement].sort((a, b) => a.order - b.order);
        }
      );
      
      // Cache individually
      queryClient.setQueryData(
        queryKeys.elements.detail(websiteId, newElement.id),
        newElement
      );
    },
  });
}

/**
 * Hook to update an element
 */
export function useUpdateElementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      websiteId,
      elementId,
      data,
    }: {
      websiteId: string;
      elementId: string;
      data: UpdateElementRequest;
    }) => elementsAPI.update(websiteId, elementId, data),
    onMutate: async ({ websiteId, elementId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.elements.list(websiteId) });
      
      // Snapshot the previous value
      const previousElements = queryClient.getQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId)
      );
      
      // Optimistically update the cache
      queryClient.setQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId),
        (old) => {
          if (!old) return [];
          return old.map((el) => {
            if (el.id === elementId) {
              // Merge only non-null/undefined values from data
              const updates: Partial<WebsiteElement> = {};
              for (const [key, value] of Object.entries(data)) {
                if (value !== null && value !== undefined) {
                  (updates as Record<string, unknown>)[key] = value;
                }
              }
              return { ...el, ...updates };
            }
            return el;
          });
        }
      );
      
      // Also update individual cache
      const previousElement = queryClient.getQueryData<WebsiteElement>(
        queryKeys.elements.detail(websiteId, elementId)
      );
      
      if (previousElement) {
        const updates: Partial<WebsiteElement> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            (updates as Record<string, unknown>)[key] = value;
          }
        }
        queryClient.setQueryData(
          queryKeys.elements.detail(websiteId, elementId),
          { ...previousElement, ...updates }
        );
      }
      
      return { previousElements, previousElement };
    },
    onError: (err, { websiteId, elementId }, context) => {
      // Rollback on error
      if (context?.previousElements) {
        queryClient.setQueryData(
          queryKeys.elements.list(websiteId),
          context.previousElements
        );
      }
      if (context?.previousElement) {
        queryClient.setQueryData(
          queryKeys.elements.detail(websiteId, elementId),
          context.previousElement
        );
      }
    },
    onSettled: (_, __, { websiteId }) => {
      // Don't refetch - trust the optimistic update and WebSocket sync
    },
  });
}

/**
 * Hook to delete an element
 */
export function useDeleteElementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, elementId }: { websiteId: string; elementId: string }) =>
      elementsAPI.delete(websiteId, elementId),
    onSuccess: (_, { websiteId, elementId }) => {
      // Remove from list cache
      queryClient.setQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId),
        (old) => {
          if (!old) return [];
          return old.filter((el) => el.id !== elementId);
        }
      );
      
      // Remove individual cache
      queryClient.removeQueries({
        queryKey: queryKeys.elements.detail(websiteId, elementId),
      });
    },
  });
}

/**
 * Hook to reorder elements
 */
export function useReorderElementsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, elementIds }: { websiteId: string; elementIds: string[] }) =>
      elementsAPI.reorder(websiteId, { element_ids: elementIds }),
    onMutate: async ({ websiteId, elementIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.elements.list(websiteId) });
      
      // Snapshot previous value
      const previousElements = queryClient.getQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId)
      );
      
      // Optimistically update
      if (previousElements) {
        const elementMap = new Map(previousElements.map((e) => [e.id, e]));
        const reorderedElements = elementIds
          .map((id, index) => {
            const element = elementMap.get(id);
            return element ? { ...element, order: index } : null;
          })
          .filter((e): e is WebsiteElement => e !== null);
        
        queryClient.setQueryData<WebsiteElement[]>(
          queryKeys.elements.list(websiteId),
          reorderedElements
        );
      }
      
      return { previousElements };
    },
    onError: (_, { websiteId }, context) => {
      // Rollback on error
      if (context?.previousElements) {
        queryClient.setQueryData(
          queryKeys.elements.list(websiteId),
          context.previousElements
        );
      }
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to get elements by type
 */
export function useElementsByType(
  websiteId: string | null | undefined,
  elementType: string
) {
  const { data: elements } = useElementsQuery(websiteId);
  return elements?.filter((el) => el.element_type === elementType) ?? [];
}

/**
 * Hook to get visible elements only
 */
export function useVisibleElements(websiteId: string | null | undefined) {
  const { data: elements } = useElementsQuery(websiteId);
  return elements?.filter((el) => el.visible) ?? [];
}
