import { apiClient } from './client';
import type { 
  Website, 
  CreateWebsiteRequest, 
  UpdateWebsiteRequest, 
  WebsiteData,
  JsonObject,
} from '../types';

// Re-export types for backward compatibility
export type { Website, CreateWebsiteRequest, UpdateWebsiteRequest, WebsiteData };

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
  async getData(id: string): Promise<WebsiteData> {
    return apiClient.get<WebsiteData>(`/websites/${id}/data`);
  },
  
  // Patch website data
  async patchData(id: string, data: WebsiteData): Promise<WebsiteData> {
    return apiClient.patch<WebsiteData>(`/websites/${id}/data`, { data });
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
