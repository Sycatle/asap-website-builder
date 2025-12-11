import { apiClient } from './client';

export interface Section {
  id: string;
  website_id: string;
  section_type: string; // 'hero', 'about', 'projects', 'skills', 'contact', etc.
  slug: string;
  title: string;
  order: number;
  layout: string; // 'full', 'split', 'grid', 'cards', 'timeline', 'list'
  settings: Record<string, any>;
  data: Record<string, any>;
  visible: boolean;
  created_at?: string;
  updated_at?: string;
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

export const sectionsAPI = {
  // Liste les sections d'un website
  async list(websiteId: string): Promise<Section[]> {
    return apiClient.get<Section[]>(`/websites/${websiteId}/sections`);
  },
  
  // Récupère une section par ID
  async get(websiteId: string, sectionId: string): Promise<Section> {
    return apiClient.get<Section>(`/websites/${websiteId}/sections/${sectionId}`);
  },
  
  // Crée une nouvelle section
  async create(websiteId: string, data: CreateSectionRequest): Promise<Section> {
    return apiClient.post<Section>(`/websites/${websiteId}/sections`, data);
  },
  
  // Met à jour une section
  async update(websiteId: string, sectionId: string, data: UpdateSectionRequest): Promise<Section> {
    return apiClient.patch<Section>(`/websites/${websiteId}/sections/${sectionId}`, data);
  },
  
  // Supprime une section
  async delete(websiteId: string, sectionId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/sections/${sectionId}`);
  },
  
  // Réordonne les sections (drag & drop)
  async reorder(websiteId: string, data: ReorderSectionsRequest): Promise<void> {
    return apiClient.post<void>(`/websites/${websiteId}/sections/reorder`, data);
  },
};
