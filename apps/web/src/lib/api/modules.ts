import { apiClient } from './client';

export interface Module {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  enabled: boolean;
  configured?: boolean; // True si le module est configuré pour ce website
}

export interface WebsiteModule {
  id: string;
  website_id: string;
  module_id: string;
  module_name: string;
  settings: Record<string, any>;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivateModuleRequest {
  module_id: string;
  settings?: Record<string, any>;
}

export interface UpdateModuleSettingsRequest {
  settings: Record<string, any>;
}

export const modulesAPI = {
  // Liste tous les modules disponibles (catalogue)
  catalog: () => apiClient.get<Module[]>('/modules/catalog'),
  
  // Liste les modules activés pour un website
  listForWebsite: (websiteId: string) => 
    apiClient.get<WebsiteModule[]>(`/websites/${websiteId}/modules`),
  
  // Active un module pour un website
  activate: (websiteId: string, data: ActivateModuleRequest) => 
    apiClient.post<WebsiteModule>(`/websites/${websiteId}/modules`, data),
  
  // Met à jour les settings d'un module activé
  updateSettings: (websiteId: string, moduleId: string, data: UpdateModuleSettingsRequest) => 
    apiClient.patch<WebsiteModule>(`/websites/${websiteId}/modules/${moduleId}`, data),
  
  // Désactive un module pour un website
  deactivate: (websiteId: string, moduleId: string) => 
    apiClient.delete<void>(`/websites/${websiteId}/modules/${moduleId}`),
};
