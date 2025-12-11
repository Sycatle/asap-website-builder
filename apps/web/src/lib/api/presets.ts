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
  list: () => apiClient.get<Preset[]>('/presets'),
  
  // Récupère un preset par ID
  get: (id: string) => apiClient.get<Preset>(`/presets/${id}`),
  
  // Crée un website à partir d'un preset
  createWebsiteFromPreset: (data: CreateWebsiteFromPresetRequest) => 
    apiClient.post<CreateWebsiteFromPresetResponse>('/websites/from-preset', data),
};
