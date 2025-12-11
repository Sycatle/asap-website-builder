import { apiClient } from './client';

export interface Preset {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string; // 'professional', 'creative', 'business', 'blog', etc.
  preview_image?: string;
  config: Record<string, any>;
  created_at?: string;
}

export interface CreateWebsiteFromPresetRequest {
  preset_id: string;
  slug: string;
  title: string;
}

export interface CreateWebsiteFromPresetResponse {
  website: {
    id: string;
    slug: string;
    title: string;
    status: string;
    preset_id: string;
  };
}

export const presetsAPI = {
  // Liste tous les presets disponibles
  async list(): Promise<Preset[]> {
    return apiClient.get<Preset[]>('/presets');
  },
  
  // Récupère un preset par ID
  async get(id: string): Promise<Preset> {
    return apiClient.get<Preset>(`/presets/${id}`);
  },
  
  // Crée un website à partir d'un preset
  async createWebsiteFromPreset(data: CreateWebsiteFromPresetRequest): Promise<CreateWebsiteFromPresetResponse> {
    return apiClient.post<CreateWebsiteFromPresetResponse>('/websites/from-preset', data);
  },
};
