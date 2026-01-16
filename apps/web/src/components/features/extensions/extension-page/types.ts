import type { ConfigSchema, ConfigAction, ConfigField } from '@/lib/api/extensions';
import type { ExtensionStoreDetail } from '@/lib/api/store';

export interface ExtensionPageProps {
  slug: string;
  initialTab?: string;
}

export type TabValue = 'preview' | 'config' | 'data' | 'info' | 'settings' | 'actions' | 'history';

export interface ChangelogEntry {
  id: string;
  action: 'sync' | 'settings_updated' | 'enabled' | 'disabled' | 'action_executed';
  description: string;
  timestamp: string;
  user?: string;
}

export interface InfoTabProps {
  extension: ExtensionStoreDetail;
}

export interface DataTabProps {
  websiteId: string;
  extensionSlug: string;
}

export interface VariableItem {
  key: string;
  value: unknown;
  updated_at?: string;
}

export interface CollectionSummaryItem {
  slug: string;
  name: string;
  total_count: number;
  sync_status?: string;
  synced_at?: string;
}

export interface SettingsTabProps {
  schema: ConfigSchema;
  settings: Record<string, unknown>;
  onSettingsChange: (settings: Record<string, unknown>) => void;
}

export interface ActionsTabProps {
  actions: ConfigAction[];
  executingAction: string | null;
  onAction: (key: string) => void;
}

export interface HistoryTabProps {
  changelog: ChangelogEntry[];
}

export interface SuggestedExtensionsProps {
  currentSlug: string;
  category: string;
  tags: string[];
  websiteId: string;
}

// Helpers
export const getExtensionConfig = (extension: ExtensionStoreDetail | undefined) => {
  if (!extension?.manifest) return { defaultSettings: {}, configSchema: undefined };
  const manifest = extension.manifest;
  
  const fields = (manifest.fields as ConfigField[]) || 
                 (manifest.config_schema as ConfigSchema)?.fields || 
                 [];
  const actions = (manifest.actions as ConfigAction[]) || 
                  (manifest.config_schema as ConfigSchema)?.actions || 
                  [];
  
  const configSchema: ConfigSchema = {
    fields,
    actions,
  };
  
  return {
    defaultSettings: (manifest.default_settings as Record<string, unknown>) || {},
    configSchema: fields.length > 0 || actions.length > 0 ? configSchema : undefined,
  };
};

export const getDefaultSchemaFromSettings = (defaultSettings: Record<string, unknown>): ConfigSchema => {
  const fields = Object.entries(defaultSettings).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: typeof value === 'boolean' ? 'boolean' as const : 
          typeof value === 'number' ? 'number' as const : 'text' as const,
    default: value,
  }));
  return { fields };
};
