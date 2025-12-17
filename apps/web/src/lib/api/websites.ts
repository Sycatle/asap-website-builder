import { apiClient } from './client';

export interface Website {
  id: string;
  account_id: string;  // Backend includes account_id in response
  slug: string;
  title: string;
  tagline: string;
  status: 'draft' | 'published';
  creation_mode: 'from_preset' | 'from_scratch' | 'onboarding';
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
  creation_mode?: 'from_preset' | 'from_scratch' | 'onboarding';
  preset_id?: string;
}

export interface UpdateWebsiteRequest {
  title?: string;
  tagline?: string;
  metadata?: Record<string, any>;
}

export const websitesAPI = {
  // List all websites for the current account
  async list(): Promise<Website[]> {
    return apiClient.get<Website[]>('/websites');
  },
  
  // Get a website by ID
  async get(id: string): Promise<Website> {
    return apiClient.get<Website>(`/websites/${id}`);
  },
  
  // Create a new website
  async create(data: CreateWebsiteRequest): Promise<Website> {
    return apiClient.post<Website>('/websites', data);
  },
  
  // Update a website (title, tagline, metadata)
  async update(id: string, data: UpdateWebsiteRequest): Promise<Website> {
    return apiClient.put<Website>(`/websites/${id}`, data);
  },
  
  // Get website data (profile, projects, etc.)
  async getData(id: string): Promise<Record<string, any>> {
    return apiClient.get<Record<string, any>>(`/websites/${id}/data`);
  },
  
  // Patch website data
  async patchData(id: string, data: Record<string, any>): Promise<Record<string, any>> {
    return apiClient.patch<Record<string, any>>(`/websites/${id}/data`, { data });
  },
  
  // Publish a website (change status from draft to published)
  async publish(id: string): Promise<{ status: string; public_url: string }> {
    return apiClient.post<{ status: string; public_url: string }>(`/websites/${id}/publish`);
  },
  
  // Delete a website
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${id}`);
  },
};
