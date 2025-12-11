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
  label: string;
  type?: 'text' | 'link' | 'badge' | 'date' | 'number';
  linkKey?: string;       // For 'link' type, which field contains the URL
  colorKey?: string;      // For 'badge' type with dynamic colors
}

export interface DataDisplay {
  type: 'list' | 'table' | 'stats' | 'custom';
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

// Complete configuration schema for a module
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
// MODULE TYPES
// ============================================

export interface Module {
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

// Module data returned when fetching config (includes dynamic data)
export interface ModuleData {
  module: Module;
  settings: Record<string, any>;
  enabled?: boolean;             // Whether module is activated for tenant
  data?: Record<string, any>;    // Dynamic data (e.g., projects, stats)
  lastSync?: string;
}

// Tenant module (module linked to tenant, not website)
export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  module_name: string;
  module_slug: string;
  module_icon?: string;
  settings: Record<string, any>;
  enabled: boolean;
  activated_at: string;
  sidebar_label?: string;
  sidebar_order: number;
}

export interface WebsiteModule {
  id: string;
  website_id: string;
  module_id: string;
  module_name: string;
  module_slug: string;
  settings: Record<string, any>;
  enabled: boolean;
  activated_at: string;
}

export interface ActivateModuleRequest {
  module_id: string;
  settings?: Record<string, any>;
}

export interface UpdateModuleSettingsRequest {
  settings: Record<string, any>;
  enabled?: boolean;
}

export const modulesAPI = {
  // List all available modules (catalog)
  async catalog(): Promise<Module[]> {
    return apiClient.get<Module[]>('/modules/catalog');
  },

  // Get a single module by slug (with schema)
  async getBySlug(slug: string): Promise<Module> {
    return apiClient.get<Module>(`/modules/${slug}`);
  },
  
  // List activated modules for a website
  async listForWebsite(websiteId: string): Promise<WebsiteModule[]> {
    return apiClient.get<WebsiteModule[]>(`/websites/${websiteId}/modules`);
  },

  // Get module data for configuration page (includes dynamic data)
  async getModuleData(websiteId: string, moduleSlug: string): Promise<ModuleData> {
    return apiClient.get<ModuleData>(`/websites/${websiteId}/modules/${moduleSlug}/data`);
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

  // Execute a module action (e.g., sync, test)
  async executeAction(websiteId: string, moduleSlug: string, actionKey: string, payload?: Record<string, any>): Promise<any> {
    return apiClient.post<any>(`/websites/${websiteId}/modules/${moduleSlug}/actions/${actionKey}`, payload || {});
  },

  // ==========================================
  // TENANT MODULES API (NEW)
  // ==========================================

  // List activated modules for the current tenant
  async listForTenant(): Promise<TenantModule[]> {
    return apiClient.get<TenantModule[]>('/modules/activated');
  },

  // Get module data for tenant configuration page (includes dynamic data)
  async getTenantModuleData(moduleSlug: string): Promise<ModuleData> {
    return apiClient.get<ModuleData>(`/modules/${moduleSlug}/data`);
  },

  // Activate a module for the tenant
  async activateForTenant(data: ActivateModuleRequest): Promise<TenantModule> {
    return apiClient.post<TenantModule>('/modules/activate', data);
  },

  // Update settings for a tenant module
  async updateTenantModuleSettings(moduleSlug: string, data: UpdateModuleSettingsRequest): Promise<TenantModule> {
    return apiClient.patch<TenantModule>(`/modules/${moduleSlug}/settings`, data);
  },

  // Execute a tenant module action (e.g., sync, test)
  async executeTenantAction(moduleSlug: string, actionKey: string, payload?: Record<string, any>): Promise<any> {
    return apiClient.post<any>(`/modules/${moduleSlug}/actions/${actionKey}`, payload || {});
  },
};
