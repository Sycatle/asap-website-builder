import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { websitesAPI } from '../api';
import { queryKeys, staleTimes } from './queryKeys';
import type { Website, WebsiteData, UpdateWebsiteRequest } from '../types';

// ============================================
// WEBSITES QUERIES
// ============================================

/**
 * Hook to fetch all websites for the current user
 */
export function useWebsitesQuery(
  options?: Omit<UseQueryOptions<Website[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.websites.lists(),
    queryFn: () => websitesAPI.list(),
    staleTime: staleTimes.websites,
    ...options,
  });
}

/**
 * Hook to fetch a single website by ID
 */
export function useWebsiteQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<Website, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.websites.detail(websiteId!),
    queryFn: () => websitesAPI.get(websiteId!),
    staleTime: staleTimes.websites,
    enabled: !!websiteId,
    ...options,
  });
}

/**
 * Hook to fetch website data (JSON content)
 */
export function useWebsiteDataQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<Record<string, unknown>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.websites.data(websiteId!),
    queryFn: () => websitesAPI.getData(websiteId!),
    staleTime: staleTimes.websites,
    enabled: !!websiteId,
    ...options,
  });
}

// ============================================
// WEBSITES MUTATIONS
// ============================================

/**
 * Hook to update a website
 */
export function useUpdateWebsiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebsiteRequest }) =>
      websitesAPI.update(id, data),
    onSuccess: (updatedWebsite) => {
      // Update the specific website in cache
      queryClient.setQueryData(queryKeys.websites.detail(updatedWebsite.id), updatedWebsite);
      
      // Update the website in the list
      queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) => {
        if (!old) return [updatedWebsite];
        return old.map((w) => (w.id === updatedWebsite.id ? updatedWebsite : w));
      });
    },
  });
}

/**
 * Hook to create a website
 */
export function useCreateWebsiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; slug: string; preset_id?: string }) =>
      websitesAPI.create(data),
    onSuccess: (newWebsite) => {
      // Add to the websites list
      queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) => {
        if (!old) return [newWebsite];
        return [...old, newWebsite];
      });
      
      // Also cache individually
      queryClient.setQueryData(queryKeys.websites.detail(newWebsite.id), newWebsite);
    },
  });
}

/**
 * Hook to delete a website
 */
export function useDeleteWebsiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (websiteId: string) => websitesAPI.delete(websiteId),
    onSuccess: (_, websiteId) => {
      // Remove from list
      queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) => {
        if (!old) return [];
        return old.filter((w) => w.id !== websiteId);
      });
      
      // Remove individual cache
      queryClient.removeQueries({ queryKey: queryKeys.websites.detail(websiteId) });
      
      // Remove related data
      queryClient.removeQueries({ queryKey: queryKeys.extensions.list(websiteId) });
      queryClient.removeQueries({ queryKey: queryKeys.pages.list(websiteId) });
      queryClient.removeQueries({ queryKey: queryKeys.elements.list(websiteId) });
    },
  });
}

/**
 * Hook to publish a website
 */
export function usePublishWebsiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (websiteId: string) => websitesAPI.publish(websiteId),
    onSuccess: (response, websiteId) => {
      // Update cache with new status
      queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) => {
        if (!old) return [];
        return old.map((w) => (w.id === websiteId ? { ...w, status: 'published' as const } : w));
      });
      queryClient.setQueryData<Website>(queryKeys.websites.detail(websiteId), (old) => {
        if (!old) return old;
        return { ...old, status: 'published' as const };
      });
    },
  });
}

/**
 * Hook to update website data (JSON content)
 */
export function useUpdateWebsiteDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WebsiteData }) =>
      websitesAPI.patchData(id, data),
    onSuccess: (updatedData, { id }) => {
      queryClient.setQueryData(queryKeys.websites.data(id), updatedData);
    },
  });
}
