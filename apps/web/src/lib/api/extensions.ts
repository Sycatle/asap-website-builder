import { apiClient } from './client';
import type {
  FieldType,
  ConfigField,
  ConfigAction,
  DataDisplayField,
  DataDisplay,
  ConfigSchema,
  Extension,
  ExtensionData,
  WebsiteExtension,
  ActivateExtensionRequest,
  UpdateExtensionSettingsRequest,
} from '../types';

// Re-export types for backward compatibility
export type {
  FieldType,
  ConfigField,
  ConfigAction,
  DataDisplayField,
  DataDisplay,
  ConfigSchema,
  Extension,
  ExtensionData,
  WebsiteExtension,
  ActivateExtensionRequest,
  UpdateExtensionSettingsRequest,
};

export const extensionsAPI = {
  // List all available extensions (catalog)
  async catalog(): Promise<Extension[]> {
    return apiClient.get<Extension[]>('/extensions/catalog');
  },

  // Get a single extension by slug (with schema)
  async getBySlug(slug: string): Promise<Extension> {
    return apiClient.get<Extension>(`/extensions/${slug}`);
  },
  
  // List activated extensions for a website
  async listForWebsite(websiteId: string): Promise<WebsiteExtension[]> {
    return apiClient.get<WebsiteExtension[]>(`/websites/${websiteId}/extensions`);
  },

  // Get extension data for configuration page (includes dynamic data)
  async getExtensionData(websiteId: string, extensionSlug: string): Promise<ExtensionData> {
    return apiClient.get<ExtensionData>(`/websites/${websiteId}/extensions/${extensionSlug}/data`);
  },
  
  // Activate an extension for a website
  async activate(websiteId: string, data: ActivateExtensionRequest): Promise<WebsiteExtension> {
    return apiClient.post<WebsiteExtension>(`/websites/${websiteId}/extensions`, data);
  },
  
  // Update settings for an activated extension
  async updateSettings(websiteId: string, extensionId: string, data: UpdateExtensionSettingsRequest): Promise<WebsiteExtension> {
    return apiClient.patch<WebsiteExtension>(`/websites/${websiteId}/extensions/${extensionId}`, data);
  },
  
  // Deactivate an extension for a website
  async deactivate(websiteId: string, extensionId: string): Promise<void> {
    return apiClient.delete<void>(`/websites/${websiteId}/extensions/${extensionId}`);
  },

  // Execute an extension action (e.g., sync, test)
  async executeAction(websiteId: string, extensionSlug: string, actionKey: string, payload?: Record<string, any>): Promise<any> {
    return apiClient.post<any>(`/websites/${websiteId}/extensions/${extensionSlug}/actions/${actionKey}`, payload || {});
  },
};
