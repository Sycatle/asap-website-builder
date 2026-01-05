import { apiClient } from './client';

export interface FileMetadata {
  id: string;
  account_id: string;
  filename: string;
  mime_type: string;
  original_size: number;
  compressed_size: number;
  visibility: 'public' | 'private' | 'authenticated';
  folder_id: string | null;
  website_id: string | null;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface FileUploadOptions {
  folder_id?: string;
  website_id?: string;
  visibility?: 'public' | 'private' | 'authenticated';
  description?: string;
  tags?: string[];
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export const filesAPI = {
  /**
   * Upload a file with optional metadata
   * Default behavior for avatars: visibility = 'public', no website_id (personal cloud)
   */
  async upload(file: File, options?: FileUploadOptions): Promise<FileMetadata> {
    const formData = new FormData();
    
    // Sanitize filename to avoid multipart parsing issues
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

    // Get auth token
    const authToken = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Get CSRF token - fetch if not available in session storage
    let csrfToken = sessionStorage.getItem('csrf_token');
    if (!csrfToken) {
      csrfToken = await apiClient.fetchCsrfToken();
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/files`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  /**
   * Get file URL for display
   */
  getUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}`;
  },
};
