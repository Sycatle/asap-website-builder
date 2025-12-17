import { apiClient } from './client';
import type { Element as BaseElement, ElementType } from '@asap/shared';

// Re-export ElementType from @asap/shared
export type { ElementType } from '@asap/shared';

// Extend Element with API-specific fields - use WebsiteElement to avoid DOM Element conflict
export interface WebsiteElement extends BaseElement {
  slug: string;
  order: number;
}

export interface CreateElementRequest {
  element_type: string;
  slug: string;
  title: string;
  order: number;
  layout: string;
  settings?: Record<string, any>;
  visible?: boolean;
}

export interface UpdateElementRequest {
  title?: string;
  layout?: string;
  settings?: Record<string, any>;
  data?: Record<string, any>;
  visible?: boolean;
}

export interface ReorderElementsRequest {
  element_ids: string[];
}

// Helper to normalize element data (adds order_index from order for renderers compatibility)
function normalizeElement(element: Omit<WebsiteElement, 'order_index'> & { order: number }): WebsiteElement {
  return { ...element, order_index: element.order };
}

export const elementsAPI = {
  // List elements for a website
  async list(websiteId: string): Promise<WebsiteElement[]> {
    const elements = await apiClient.get<Array<Omit<WebsiteElement, 'order_index'> & { order: number }>>(`/websites/${websiteId}/elements`);
    return elements.map(normalizeElement);
  },
  
  // Get an element by ID
  async get(websiteId: string, elementId: string): Promise<WebsiteElement> {
    const element = await apiClient.get<Omit<WebsiteElement, 'order_index'> & { order: number }>(`/websites/${websiteId}/elements/${elementId}`);
    return normalizeElement(element);
  },
  
  // Create a new element
  async create(websiteId: string, data: CreateElementRequest): Promise<WebsiteElement> {
    const element = await apiClient.post<Omit<WebsiteElement, 'order_index'> & { order: number }>(`/websites/${websiteId}/elements`, data);
    return normalizeElement(element);
  },
  
  // Update an element
  async update(websiteId: string, elementId: string, data: UpdateElementRequest): Promise<WebsiteElement> {
    const element = await apiClient.patch<Omit<WebsiteElement, 'order_index'> & { order: number }>(`/websites/${websiteId}/elements/${elementId}`, data);
    return normalizeElement(element);
  },
  
  // Delete an element
  async delete(websiteId: string, elementId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/elements/${elementId}`);
  },
  
  // Reorder elements (drag & drop)
  async reorder(websiteId: string, data: ReorderElementsRequest): Promise<void> {
    return apiClient.post<void>(`/websites/${websiteId}/elements/reorder`, data);
  },
};
