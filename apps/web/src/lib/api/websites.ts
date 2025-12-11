import { apiClient } from './client';

export interface Website {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  status: 'draft' | 'published';
  creation_mode: 'from_preset' | 'from_scratch';
  preset_id?: string;
  metadata: Record<string, any>;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWebsiteRequest {
  slug: string;
  title: string;
  tagline?: string;
}

export interface UpdateWebsiteRequest {
  title?: string;
  tagline?: string;
  metadata?: Record<string, any>;
}

export const websitesAPI = {
  // Liste tous les websites du tenant
  async list(): Promise<Website[]> {
    return apiClient.get<Website[]>('/websites');
  },
  
  // Récupère un website par ID
  async get(id: string): Promise<Website> {
    return apiClient.get<Website>(`/websites/${id}`);
  },
  
  // Met à jour un website (title, tagline, metadata)
  async update(id: string, data: UpdateWebsiteRequest): Promise<Website> {
    return apiClient.put<Website>(`/websites/${id}`, data);
  },
  
  // Publie un website (change status draft → published)
  async publish(id: string): Promise<{ status: string; public_url: string }> {
    return apiClient.post<{ status: string; public_url: string }>(`/websites/${id}/publish`);
  },
  
  // Supprime un website
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${id}`);
  },
};
