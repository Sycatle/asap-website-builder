import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { websitesAPI, type Website, type UpdateWebsiteRequest } from '../api';
import { queryKeys, staleTimes } from './queryClient';
import type { WebsiteData } from '../types';

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
    queryKey: queryKeys.websites,
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
    queryKey: queryKeys.website(websiteId!),
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
    queryKey: queryKeys.websiteData(websiteId!),
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
      queryClient.setQueryData(queryKeys.website(updatedWebsite.id), updatedWebsite);
      
      // Update the website in the list
      queryClient.setQueryData<Website[]>(queryKeys.websites, (old) => {
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
      queryClient.setQueryData<Website[]>(queryKeys.websites, (old) => {
        if (!old) return [newWebsite];
        return [...old, newWebsite];
      });
      
      // Also cache individually
      queryClient.setQueryData(queryKeys.website(newWebsite.id), newWebsite);
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
      queryClient.setQueryData<Website[]>(queryKeys.websites, (old) => {
        if (!old) return [];
        return old.filter((w) => w.id !== websiteId);
      });
      
      // Remove individual cache
      queryClient.removeQueries({ queryKey: queryKeys.website(websiteId) });
      
      // Remove related data
      queryClient.removeQueries({ queryKey: queryKeys.websiteExtensions(websiteId) });
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
      queryClient.setQueryData<Website[]>(queryKeys.websites, (old) => {
        if (!old) return [];
        return old.map((w) => (w.id === websiteId ? { ...w, status: 'published' as const } : w));
      });
      queryClient.setQueryData<Website>(queryKeys.website(websiteId), (old) => {
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
      queryClient.setQueryData(queryKeys.websiteData(id), updatedData);
    },
  });
}
