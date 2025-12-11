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
  list: () => apiClient.get<Website[]>('/websites'),
  
  // Récupère un website par ID
  get: (id: string) => apiClient.get<Website>(`/websites/${id}`),
  
  // Met à jour un website (title, tagline, metadata)
  update: (id: string, data: UpdateWebsiteRequest) => 
    apiClient.put<Website>(`/websites/${id}`, data),
  
  // Publie un website (change status draft → published)
  publish: (id: string) => 
    apiClient.post<{ status: string; public_url: string }>(`/websites/${id}/publish`),
  
  // Supprime un website
  delete: (id: string) => apiClient.delete<void>(`/websites/${id}`),
};
