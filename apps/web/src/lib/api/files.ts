import { apiClient } from './client';
import type { 
  FileMetadata, 
  QuotaUsage, 
  FileFolder, 
  CreateFolderRequest,
  UpdateFolderRequest,
  UpdateFileRequest,
  FileUploadOptions,
  FileListParams,
} from '../types';

// Re-export types for backward compatibility
export type { FileMetadata, QuotaUsage, FileFolder };

export const filesAPI = {
  /**
   * List files with optional filters
   */
  async list(params?: FileListParams): Promise<FileMetadata[]> {
    const searchParams = new URLSearchParams();
    if (params?.folder_id) searchParams.set('folder_id', params.folder_id);
    if (params?.website_id) searchParams.set('website_id', params.website_id);
    if (params?.visibility) searchParams.set('visibility', params.visibility);
    if (params?.mime_type) searchParams.set('mime_type', params.mime_type);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return apiClient.get<FileMetadata[]>(`/files${query ? `?${query}` : ''}`);
  },

  /**
   * Upload a file with optional metadata
   */
  async upload(file: File, options?: FileUploadOptions): Promise<FileMetadata> {
    const formData = new FormData();
    
    // Sanitize filename to avoid multipart parsing issues with special characters
    let fileToUpload = file;
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['']/g, '_')
      .replace(/[^\w\s.-]/g, '_')
      .replace(/\s+/g, '_');
    
    if (sanitizedName !== file.name) {
      fileToUpload = new File([file], sanitizedName, { type: file.type });
    }
    
    formData.append('file', fileToUpload);
    
    // Add optional metadata
    if (options?.folder_id) formData.append('folder_id', options.folder_id);
    if (options?.website_id) formData.append('website_id', options.website_id);
    if (options?.visibility) formData.append('visibility', options.visibility);
    if (options?.description) formData.append('description', options.description);
    if (options?.tags?.length) formData.append('tags', JSON.stringify(options.tags));

    // Get CSRF token for the upload
    let csrfToken = apiClient.getCsrfToken();
    if (!csrfToken) {
      csrfToken = await apiClient.fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    };

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data?.code?.startsWith('CSRF_')) {
          apiClient.clearCsrfToken();
          csrfToken = await apiClient.fetchCsrfToken();
          
          if (csrfToken) {
            const retryHeaders: HeadersInit = {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'X-CSRF-Token': csrfToken,
            };
            
            const retryResponse = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files`, {
              method: 'POST',
              headers: retryHeaders,
              body: formData,
            });
            
            if (!retryResponse.ok) {
              throw new Error(`Upload failed: ${retryResponse.statusText}`);
            }
            
            return retryResponse.json();
          }
        }
      }
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Update file metadata
   */
  async update(fileId: string, data: UpdateFileRequest): Promise<FileMetadata> {
    return apiClient.patch<FileMetadata>(`/files/${fileId}`, data);
  },

  /**
   * Delete a file
   */
  async delete(fileId: string): Promise<void> {
    return apiClient.delete<void>(`/files/${fileId}`);
  },

  /**
   * Get quota usage
   */
  async getQuota(): Promise<QuotaUsage> {
    return apiClient.get<QuotaUsage>('/files/quota/usage');
  },
  
  // ============================================
  // FOLDER OPERATIONS
  // ============================================
  
  /**
   * List folders with optional filters
   */
  async listFolders(params?: { parent_id?: string; website_id?: string }): Promise<FileFolder[]> {
    const searchParams = new URLSearchParams();
    if (params?.parent_id) searchParams.set('parent_id', params.parent_id);
    if (params?.website_id) searchParams.set('website_id', params.website_id);
    
    const query = searchParams.toString();
    return apiClient.get<FileFolder[]>(`/folders${query ? `?${query}` : ''}`);
  },
  
  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderRequest): Promise<FileFolder> {
    return apiClient.post<FileFolder>('/folders', data);
  },
  
  /**
   * Update a folder
   */
  async updateFolder(folderId: string, data: UpdateFolderRequest): Promise<FileFolder> {
    return apiClient.patch<FileFolder>(`/folders/${folderId}`, data);
  },
  
  /**
   * Delete a folder (and optionally its contents)
   */
  async deleteFolder(folderId: string, deleteContents = false): Promise<void> {
    return apiClient.delete<void>(`/folders/${folderId}?delete_contents=${deleteContents}`);
  },
};
