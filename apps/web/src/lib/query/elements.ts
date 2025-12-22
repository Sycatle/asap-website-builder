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
      // Add to list cache
      queryClient.setQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId),
        (old) => {
          if (!old) return [newElement];
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
    onSuccess: (updatedElement, { websiteId, elementId }) => {
      // Update in list cache
      queryClient.setQueryData<WebsiteElement[]>(
        queryKeys.elements.list(websiteId),
        (old) => {
          if (!old) return [updatedElement];
          return old.map((el) =>
            el.id === elementId ? updatedElement : el
          );
        }
      );
      
      // Update individual cache
      queryClient.setQueryData(
        queryKeys.elements.detail(websiteId, elementId),
        updatedElement
      );
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
