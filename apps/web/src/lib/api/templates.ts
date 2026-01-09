import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ElementTemplate {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  element_type: string;
  variant: string | null;
  settings: Record<string, unknown>;
  preview_image: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElementTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  element_type: string;
  variant: string | null;
  preview_image: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  element_type: string;
  variant?: string;
  settings: Record<string, unknown>;
  preview_image?: string;
  tags?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  variant?: string;
  settings?: Record<string, unknown>;
  preview_image?: string;
  tags?: string[];
  is_favorite?: boolean;
}

export interface ListTemplatesParams {
  element_type?: string;
  tag?: string;
  favorites_only?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const templatesAPI = {
  /**
   * List element templates for the authenticated user
   */
  async list(params?: ListTemplatesParams): Promise<ElementTemplateSummary[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.element_type) searchParams.set('element_type', params.element_type);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.favorites_only) searchParams.set('favorites_only', 'true');
    if (params?.search) searchParams.set('search', params.search);
    if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());
    if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return apiClient.get<ElementTemplateSummary[]>(`/templates${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single element template by ID
   */
  async get(templateId: string): Promise<ElementTemplate> {
    return apiClient.get<ElementTemplate>(`/templates/${templateId}`);
  },

  /**
   * Create a new element template
   */
  async create(request: CreateTemplateRequest): Promise<ElementTemplate> {
    return apiClient.post<ElementTemplate>('/templates', request);
  },

  /**
   * Update an existing element template
   */
  async update(templateId: string, request: UpdateTemplateRequest): Promise<ElementTemplate> {
    return apiClient.patch<ElementTemplate>(`/templates/${templateId}`, request);
  },

  /**
   * Delete an element template
   */
  async delete(templateId: string): Promise<void> {
    return apiClient.delete(`/templates/${templateId}`);
  },

  /**
   * Toggle favorite status for a template
   */
  async toggleFavorite(templateId: string): Promise<ElementTemplate> {
    return apiClient.post<ElementTemplate>(`/templates/${templateId}/favorite`);
  },

  /**
   * Create a template from an existing section element
   * Helper function that extracts settings from an element and creates a template
   */
  async createFromElement(
    name: string,
    elementType: string,
    settings: Record<string, unknown>,
    options?: {
      description?: string;
      variant?: string;
      tags?: string[];
      preview_image?: string;
    }
  ): Promise<ElementTemplate> {
    return this.create({
      name,
      element_type: elementType,
      settings,
      description: options?.description,
      variant: options?.variant || (settings.variant as string | undefined),
      tags: options?.tags,
      preview_image: options?.preview_image,
    });
  },
};
