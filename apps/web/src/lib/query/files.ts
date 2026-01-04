import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { filesAPI, APIError } from '../api';
import { queryKeys, staleTimes } from './queryKeys';
import type { 
  FileMetadata, 
  QuotaUsage, 
  FileFolder, 
  FileListParams,
  FileUploadOptions,
  CreateFolderRequest,
  UpdateFolderRequest,
  UpdateFileRequest,
} from '../types';

// ============================================
// FILES QUERIES
// ============================================

/**
 * Hook to fetch files with optional filters
 * @param params - Optional filters (website_id, folder_id, etc.)
 */
export function useFilesQuery(
  params?: FileListParams,
  options?: Omit<UseQueryOptions<FileMetadata[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.files.list(params),
    queryFn: () => filesAPI.list(params),
    staleTime: staleTimes.files,
    ...options,
  });
}

/**
 * Hook to fetch files for current website
 */
export function useWebsiteFilesQuery(
  websiteId: string | null,
  params?: Omit<FileListParams, 'website_id'>,
  options?: Omit<UseQueryOptions<FileMetadata[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.files.list({ ...params, website_id: websiteId || undefined }),
    queryFn: () => filesAPI.list({ ...params, website_id: websiteId || undefined }),
    staleTime: staleTimes.files,
    enabled: !!websiteId,
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
    queryKey: queryKeys.files.quota(),
    queryFn: () => filesAPI.getQuota(),
    staleTime: staleTimes.quota,
    ...options,
  });
}

// ============================================
// FOLDER QUERIES
// ============================================

/**
 * Hook to fetch folders with optional filters
 */
export function useFoldersQuery(
  params?: { parent_id?: string; website_id?: string },
  options?: Omit<UseQueryOptions<FileFolder[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.files.folders(params),
    queryFn: () => filesAPI.listFolders(params),
    staleTime: staleTimes.files,
    ...options,
  });
}

// ============================================
// FILES MUTATIONS
// ============================================

/**
 * Hook to upload a file with optional metadata
 */
export function useUploadFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }: { file: File; options?: FileUploadOptions }) => 
      filesAPI.upload(file, options),
    onSuccess: (newFile, { options }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      
      // Optimistically add to the current list if matching filters
      const listKey = queryKeys.files.list({ 
        website_id: options?.website_id,
        folder_id: options?.folder_id,
      });
      queryClient.setQueryData<FileMetadata[]>(listKey, (old) => {
        if (!old) return [newFile];
        const exists = old.some(f => f.id === newFile.id);
        if (exists) return old.map(f => f.id === newFile.id ? newFile : f);
        return [newFile, ...old];
      });
      
      // Invalidate quota
      queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
    },
  });
}

/**
 * Hook to update file metadata
 */
export function useUpdateFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: UpdateFileRequest }) =>
      filesAPI.update(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
  });
}

/**
 * Hook to delete a file
 */
export function useDeleteFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      try {
        await filesAPI.delete(fileId);
      } catch (error: unknown) {
        // If file is not found (404 or 400 with "not found"/"failed to delete"), treat it as already deleted
        if (error instanceof APIError) {
          const errorData = typeof error.data === 'string' ? error.data : JSON.stringify(error.data || '');
          const errorLower = errorData.toLowerCase();
          const isNotFound = error.status === 404 || 
            (error.status === 400 && (errorLower.includes('not found') || errorLower.includes('failed to delete')));
          if (isNotFound) {
            console.log(`File ${fileId} was already deleted`);
            return;
          }
        }
        throw error;
      }
    },
    onSuccess: (_, fileId) => {
      // Remove from all cached file lists - use predicate to match all list queries
      queryClient.setQueriesData<FileMetadata[]>(
        { predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'list' },
        (old) => old?.filter((f) => f.id !== fileId) ?? []
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
    },
  });
}

/**
 * Hook to delete multiple files
 */
export function useDeleteFilesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      for (const fileId of fileIds) {
        try {
          await filesAPI.delete(fileId);
        } catch (error: unknown) {
          // If file is not found (404 or 400 with "not found"/"failed to delete"), treat it as already deleted
          if (error instanceof APIError) {
            const errorData = typeof error.data === 'string' ? error.data : JSON.stringify(error.data || '');
            const errorLower = errorData.toLowerCase();
            const isNotFound = error.status === 404 || 
              (error.status === 400 && (errorLower.includes('not found') || errorLower.includes('failed to delete')));
            if (isNotFound) {
              console.log(`File ${fileId} was already deleted`);
              continue;
            }
          }
          throw error;
        }
      }
    },
    onSuccess: (_, fileIds) => {
      // Remove from all cached file lists - use predicate to match all list queries
      queryClient.setQueriesData<FileMetadata[]>(
        { predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'list' },
        (old) => old?.filter((f) => !fileIds.includes(f.id)) ?? []
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
    },
  });
}

// ============================================
// FOLDER MUTATIONS
// ============================================

/**
 * Hook to create a folder
 */
export function useCreateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFolderRequest) => filesAPI.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.folders() });
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: UpdateFolderRequest }) =>
      filesAPI.updateFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.folders() });
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, deleteContents }: { folderId: string; deleteContents?: boolean }) =>
      filesAPI.deleteFolder(folderId, deleteContents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
  });
}
