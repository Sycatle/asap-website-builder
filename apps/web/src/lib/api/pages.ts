import { apiClient } from './client';
import type { 
  Page, 
  CreatePageRequest, 
  UpdatePageRequest, 
  ReorderPagesRequest,
} from '../types';

// Re-export types for backward compatibility
export type { Page, CreatePageRequest, UpdatePageRequest, ReorderPagesRequest };

export const pagesAPI = {
  // List pages for a website
  async list(websiteId: string): Promise<Page[]> {
    return apiClient.get<Page[]>(`/websites/${websiteId}/pages`);
  },

  // Get a page by ID
  async get(websiteId: string, pageId: string): Promise<Page> {
    return apiClient.get<Page>(`/websites/${websiteId}/pages/${pageId}`);
  },

  // Create a new page
  async create(websiteId: string, data: CreatePageRequest): Promise<{ id: string; message: string }> {
    return apiClient.post<{ id: string; message: string }>(`/websites/${websiteId}/pages`, data);
  },

  // Update a page
  async update(websiteId: string, pageId: string, data: UpdatePageRequest): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`/websites/${websiteId}/pages/${pageId}`, data);
  },

  // Delete a page
  async delete(websiteId: string, pageId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/pages/${pageId}`);
  },

  // Reorder pages
  async reorder(websiteId: string, data: ReorderPagesRequest): Promise<void> {
    return apiClient.post<void>(`/websites/${websiteId}/pages/reorder`, data);
  },
};
