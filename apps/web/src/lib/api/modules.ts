import { apiClient } from './client';

export interface Module {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;  // Backend includes category field
  default_settings: Record<string, any>;  // Backend includes default_settings
}

export interface WebsiteModule {
  id: string;
  website_id: string;
  module_id: string;
  module_name: string;
  module_slug: string;  // Backend includes module_slug
  settings: Record<string, any>;
  enabled: boolean;
  activated_at: string;  // Backend uses 'activated_at' not 'created_at'
}

export interface ActivateModuleRequest {
  module_id: string;
  settings?: Record<string, any>;
}

export interface UpdateModuleSettingsRequest {
  settings: Record<string, any>;
}

export const modulesAPI = {
  // List all available modules (catalog)
  async catalog(): Promise<Module[]> {
    return apiClient.get<Module[]>('/modules/catalog');
  },
  
  // List activated modules for a website
  async listForWebsite(websiteId: string): Promise<WebsiteModule[]> {
    return apiClient.get<WebsiteModule[]>(`/websites/${websiteId}/modules`);
  },
  
  // Activate a module for a website
  async activate(websiteId: string, data: ActivateModuleRequest): Promise<WebsiteModule> {
    return apiClient.post<WebsiteModule>(`/websites/${websiteId}/modules`, data);
  },
  
  // Update settings for an activated module
  async updateSettings(websiteId: string, moduleId: string, data: UpdateModuleSettingsRequest): Promise<WebsiteModule> {
    return apiClient.patch<WebsiteModule>(`/websites/${websiteId}/modules/${moduleId}`, data);
  },
  
  // Deactivate a module for a website
  async deactivate(websiteId: string, moduleId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/modules/${moduleId}`);
  },
};
