import { apiClient } from './client';
import type { Section as BaseSection, SectionType } from '@asap/shared';

// Re-export SectionType from @asap/shared
export type { SectionType } from '@asap/shared';

// Extend Section with API-specific fields
export interface Section extends BaseSection {
  slug: string;
  order: number;
}

export interface CreateSectionRequest {
  section_type: string;
  slug: string;
  title: string;
  order: number;
  layout: string;
  settings?: Record<string, any>;
  visible?: boolean;
}

export interface UpdateSectionRequest {
  title?: string;
  layout?: string;
  settings?: Record<string, any>;
  data?: Record<string, any>;
  visible?: boolean;
}

export interface ReorderSectionsRequest {
  section_ids: string[];
}

// Helper to normalize section data (adds order_index from order for renderers compatibility)
function normalizeSection(section: Omit<Section, 'order_index'> & { order: number }): Section {
  return { ...section, order_index: section.order };
}

export const sectionsAPI = {
  // List sections for a website
  async list(websiteId: string): Promise<Section[]> {
    const sections = await apiClient.get<Array<Omit<Section, 'order_index'> & { order: number }>>(`/websites/${websiteId}/sections`);
    return sections.map(normalizeSection);
  },
  
  // Get a section by ID
  async get(websiteId: string, sectionId: string): Promise<Section> {
    const section = await apiClient.get<Omit<Section, 'order_index'> & { order: number }>(`/websites/${websiteId}/sections/${sectionId}`);
    return normalizeSection(section);
  },
  
  // Create a new section
  async create(websiteId: string, data: CreateSectionRequest): Promise<Section> {
    const section = await apiClient.post<Omit<Section, 'order_index'> & { order: number }>(`/websites/${websiteId}/sections`, data);
    return normalizeSection(section);
  },
  
  // Update a section
  async update(websiteId: string, sectionId: string, data: UpdateSectionRequest): Promise<Section> {
    const section = await apiClient.patch<Omit<Section, 'order_index'> & { order: number }>(`/websites/${websiteId}/sections/${sectionId}`, data);
    return normalizeSection(section);
  },
  
  // Delete a section
  async delete(websiteId: string, sectionId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/sections/${sectionId}`);
  },
  
  // Reorder sections (drag & drop)
  async reorder(websiteId: string, data: ReorderSectionsRequest): Promise<void> {
    return apiClient.post<void>(`/websites/${websiteId}/sections/reorder`, data);
  },
};
