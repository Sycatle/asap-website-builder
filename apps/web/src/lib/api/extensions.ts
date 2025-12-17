import { apiClient } from './client';

// ============================================
// CONFIG SCHEMA TYPES (Schema-driven UI)
// ============================================

// Field types supported by the schema renderer
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'boolean' 
  | 'select' 
  | 'url' 
  | 'email' 
  | 'password'
  | 'color'
  | 'date';

// A single configuration field
export interface ConfigField {
  key: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: any;
  options?: { value: string; label: string }[];  // For 'select' type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// An action button (e.g., "Synchronize", "Test connection")
export interface ConfigAction {
  key: string;
  label: string;
  description?: string;
  endpoint: string;       // Relative to module endpoint, e.g., "/sync"
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  style?: 'primary' | 'secondary' | 'danger';
  confirm?: string;       // Confirmation message before executing
  refreshAfter?: boolean; // Reload data after action
}

// Display configuration for data lists
export interface DataDisplayField {
  key: string;
  label?: string;
  type?: 'text' | 'link' | 'badge' | 'date' | 'number' | 'image' | 'title' | 'subtitle' | 'meta' | 'stat' | 'description';
  linkKey?: string;       // For 'link' type, which field contains the URL
  colorKey?: string;      // For 'badge' type with dynamic colors
  icon?: string;          // Icon for meta fields
  prefix?: string;        // Prefix for display (e.g., "@" for username)
  linkPrefix?: string;    // URL prefix for links
}

export interface DataDisplay {
  type: 'list' | 'table' | 'stats' | 'custom' | 'profile' | 'avatarList';
  source: string;         // Data key in module response (e.g., "projects")
  title?: string;
  emptyMessage?: string;
  fields?: DataDisplayField[];
  stats?: {               // For 'stats' type
    key: string;
    label: string;
    icon?: string;
  }[];
}

// Complete configuration schema for an extension
export interface ConfigSchema {
  fields?: ConfigField[];
  actions?: ConfigAction[];
  dataDisplay?: DataDisplay[];
  sections?: {            // Group fields into sections
    key: string;
    title: string;
    description?: string;
    fields: string[];     // References to field keys
  }[];
}

// ============================================
// EXTENSION TYPES
// ============================================

export interface Extension {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  default_settings: Record<string, any>;
  config_schema?: ConfigSchema;  // Schema for dynamic UI generation
  icon?: string;                 // Icon identifier or SVG
}

// Extension data returned when fetching config (includes dynamic data)
export interface ExtensionData {
  extension: Extension;
  settings: Record<string, any>;
  enabled?: boolean;             // Whether extension is activated for website
  data?: Record<string, any>;    // Dynamic data (e.g., projects, stats)
  lastSync?: string;
}

export interface WebsiteExtension {
  id: string;
  website_id: string;
  extension_id: string;
  extension_name: string;
  extension_slug: string;
  settings: Record<string, any>;
  enabled: boolean;
  activated_at: string;
  category: string;
}

export interface ActivateExtensionRequest {
  extension_id: string;
  settings?: Record<string, any>;
}

export interface UpdateExtensionSettingsRequest {
  settings: Record<string, any>;
  enabled?: boolean;
}

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
