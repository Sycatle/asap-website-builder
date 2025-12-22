import { apiClient } from './client';
import type { FileMetadata, QuotaUsage } from '../types';

// Re-export types for backward compatibility
export type { FileMetadata, QuotaUsage };

export const filesAPI = {
  async list(): Promise<FileMetadata[]> {
    return apiClient.get<FileMetadata[]>('/files');
  },

  async upload(file: File): Promise<FileMetadata> {
    const formData = new FormData();
    
    // Sanitize filename to avoid multipart parsing issues with special characters
    // Create a new File object with a sanitized name if needed
    let fileToUpload = file;
    const sanitizedName = file.name
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/['']/g, '_') // Replace curly quotes
      .replace(/[^\w\s.-]/g, '_') // Replace other special chars
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    if (sanitizedName !== file.name) {
      fileToUpload = new File([file], sanitizedName, { type: file.type });
    }
    
    formData.append('file', fileToUpload);

    // Get CSRF token for the upload
    let csrfToken = apiClient.getCsrfToken();
    if (!csrfToken) {
      csrfToken = await apiClient.fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    };

    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      // Handle CSRF errors
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data?.code?.startsWith('CSRF_')) {
          // Clear invalid token and retry once
          apiClient.clearCsrfToken();
          csrfToken = await apiClient.fetchCsrfToken();
          
          if (csrfToken) {
            const retryHeaders: HeadersInit = {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'X-CSRF-Token': csrfToken,
            };
            
            const retryFormData = new FormData();
            retryFormData.append('file', file);
            
            const retryResponse = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files`, {
              method: 'POST',
              headers: retryHeaders,
              body: retryFormData,
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

  async delete(fileId: string): Promise<void> {
    return apiClient.delete<void>(`/files/${fileId}`);
  },

  async getQuota(): Promise<QuotaUsage> {
    return apiClient.get<QuotaUsage>('/files/quota/usage');
  },
};
