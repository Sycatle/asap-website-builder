import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { pagesAPI } from '../api';
import { queryKeys, staleTimes } from './queryKeys';
import type { Page, CreatePageRequest, UpdatePageRequest } from '../types';

// ============================================
// PAGES QUERIES
// ============================================

/**
 * Hook to fetch all pages for a website
 */
export function usePagesQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<Page[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.pages.list(websiteId!),
    queryFn: () => pagesAPI.list(websiteId!),
    staleTime: staleTimes.pages,
    enabled: !!websiteId,
    ...options,
  });
}

/**
 * Hook to fetch a single page by ID
 */
export function usePageQuery(
  websiteId: string | null | undefined,
  pageId: string | null | undefined,
  options?: Omit<UseQueryOptions<Page, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.pages.detail(websiteId!, pageId!),
    queryFn: () => pagesAPI.get(websiteId!, pageId!),
    staleTime: staleTimes.pages,
    enabled: !!websiteId && !!pageId,
    ...options,
  });
}

// ============================================
// PAGES MUTATIONS
// ============================================

/**
 * Hook to create a new page
 */
export function useCreatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, data }: { websiteId: string; data: CreatePageRequest }) =>
      pagesAPI.create(websiteId, data),
    onSuccess: (result, { websiteId, data }) => {
      // Optimistically add to list cache (avoid duplicates by checking ID)
      queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) => {
        if (!old) return [];
        // Check if page already exists (avoid duplicate from WebSocket)
        const exists = old.some(p => p.id === result.id);
        if (exists) {
          // Update existing page instead of adding duplicate
          return old.map(p => p.id === result.id ? {
            ...p,
            slug: data.slug,
            title: data.title,
            description: data.description || '',
            is_homepage: data.is_homepage || false,
            order: data.order ?? p.order,
            visible: data.visible ?? true,
            metadata: data.metadata || {},
          } : p).sort((a, b) => a.order - b.order);
        }
        const newPage: Page = {
          id: result.id,
          website_id: websiteId,
          slug: data.slug,
          title: data.title,
          description: data.description || '',
          is_homepage: data.is_homepage || false,
          order: data.order ?? old.length,
          visible: data.visible ?? true,
          metadata: data.metadata || {},
        };
        return [...old, newPage].sort((a, b) => a.order - b.order);
      });
    },
  });
}

/**
 * Hook to update a page
 */
export function useUpdatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      websiteId, 
      pageId, 
      data 
    }: { 
      websiteId: string; 
      pageId: string; 
      data: UpdatePageRequest 
    }) => pagesAPI.update(websiteId, pageId, data),
    onSuccess: (_, { websiteId, pageId, data }) => {
      // Update in list cache
      queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) => {
        if (!old) return [];
        return old.map((page) =>
          page.id === pageId ? { ...page, ...data } : page
        ).sort((a, b) => a.order - b.order);
      });
      
      // Update individual cache
      queryClient.setQueryData<Page>(
        queryKeys.pages.detail(websiteId, pageId),
        (old) => old ? { ...old, ...data } : old
      );
    },
  });
}

/**
 * Hook to delete a page
 */
export function useDeletePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, pageId }: { websiteId: string; pageId: string }) =>
      pagesAPI.delete(websiteId, pageId),
    onSuccess: (_, { websiteId, pageId }) => {
      // Remove from list cache
      queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) => {
        if (!old) return [];
        return old.filter((page) => page.id !== pageId);
      });
      
      // Remove individual cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.pages.detail(websiteId, pageId) 
      });
    },
  });
}

/**
 * Hook to reorder pages
 */
export function useReorderPagesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ websiteId, pageIds }: { websiteId: string; pageIds: string[] }) =>
      pagesAPI.reorder(websiteId, { page_ids: pageIds }),
    onMutate: async ({ websiteId, pageIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.list(websiteId) });
      
      // Snapshot previous value
      const previousPages = queryClient.getQueryData<Page[]>(
        queryKeys.pages.list(websiteId)
      );
      
      // Optimistically update
      if (previousPages) {
        const pageMap = new Map(previousPages.map((p) => [p.id, p]));
        const reorderedPages = pageIds
          .map((id, index) => {
            const page = pageMap.get(id);
            return page ? { ...page, order: index } : null;
          })
          .filter((p): p is Page => p !== null);
        
        queryClient.setQueryData<Page[]>(
          queryKeys.pages.list(websiteId),
          reorderedPages
        );
      }
      
      return { previousPages };
    },
    onError: (_, { websiteId }, context) => {
      // Rollback on error
      if (context?.previousPages) {
        queryClient.setQueryData(
          queryKeys.pages.list(websiteId),
          context.previousPages
        );
      }
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to get the homepage from pages
 */
export function useHomepage(websiteId: string | null | undefined) {
  const { data: pages } = usePagesQuery(websiteId);
  return pages?.find((page) => page.is_homepage) ?? null;
}

/**
 * Hook to get a page by slug
 */
export function usePageBySlug(
  websiteId: string | null | undefined,
  slug: string | null | undefined
) {
  const { data: pages } = usePagesQuery(websiteId);
  return pages?.find((page) => page.slug === slug) ?? null;
}
