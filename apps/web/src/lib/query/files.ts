import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { filesAPI, type FileMetadata, type QuotaUsage } from '../api';
import { queryKeys, staleTimes } from './queryClient';

// ============================================
// FILES QUERIES
// ============================================

/**
 * Hook to fetch all files
 */
export function useFilesQuery(
  options?: Omit<UseQueryOptions<FileMetadata[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.files,
    queryFn: () => filesAPI.list(),
    staleTime: staleTimes.files,
    ...options,
  });
}

/**
 * Hook to fetch quota usage
 */
export function useQuotaQuery(
  options?: Omit<UseQueryOptions<QuotaUsage, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.quota,
    queryFn: () => filesAPI.getQuota(),
    staleTime: staleTimes.quota,
    ...options,
  });
}

// ============================================
// FILES MUTATIONS
// ============================================

/**
 * Hook to upload a file
 */
export function useUploadFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => filesAPI.upload(file),
    onSuccess: (newFile) => {
      // Add to files list
      queryClient.setQueryData<FileMetadata[]>(queryKeys.files, (old) => {
        if (!old) return [newFile];
        return [newFile, ...old];
      });
      
      // Invalidate quota since it changed
      queryClient.invalidateQueries({ queryKey: queryKeys.quota });
    },
  });
}

/**
 * Hook to delete a file
 */
export function useDeleteFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => filesAPI.delete(fileId),
    onSuccess: (_, fileId) => {
      // Remove from files list
      queryClient.setQueryData<FileMetadata[]>(queryKeys.files, (old) => {
        if (!old) return [];
        return old.filter((f) => f.id !== fileId);
      });
      
      // Invalidate quota since it changed
      queryClient.invalidateQueries({ queryKey: queryKeys.quota });
    },
  });
}

/**
 * Hook to delete multiple files (sequentially)
 */
export function useDeleteFilesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      // Delete files sequentially since API doesn't have bulk delete
      for (const fileId of fileIds) {
        await filesAPI.delete(fileId);
      }
    },
    onSuccess: (_, fileIds) => {
      // Remove from files list
      queryClient.setQueryData<FileMetadata[]>(queryKeys.files, (old) => {
        if (!old) return [];
        return old.filter((f) => !fileIds.includes(f.id));
      });
      
      // Invalidate quota since it changed
      queryClient.invalidateQueries({ queryKey: queryKeys.quota });
    },
  });
}
