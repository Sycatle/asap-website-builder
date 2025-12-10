import { apiClient } from './client';

export interface FileMetadata {
  id: string;
  tenant_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  compressed_size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
}

export interface QuotaUsage {
  total_size_used: number;
  quota_limit: number;
  remaining: number;
  usage_percentage: number;
}

export const filesAPI = {
  async list(): Promise<FileMetadata[]> {
    return apiClient.get<FileMetadata[]>('/files');
  },

  async upload(file: File): Promise<FileMetadata> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
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
