import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { extensionsAPI } from '@/lib/api';
import type { Extension, WebsiteExtension, ConfigSchema, ConfigAction } from '@/lib/api/extensions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, Database, History, RefreshCw, Power, ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { toast } from 'sonner';
import SchemaRenderer from '@/components/SchemaRenderer';
import { useWebsitesQuery, useExtensionCatalogQuery, useWebsiteExtensionsQuery, useExtensionDataQuery, useUpdateExtensionSettingsMutation, useDeactivateExtensionMutation } from '@/lib/query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { FormActions } from '@/components/ui/form-actions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatRelativeTimeFr } from '@/lib/utils/formatters';
import { ExtensionIcon } from '@/lib/extension-icons';

interface ExtensionConfigProps {
  slug: string;
}

// Icons using Lucide
const Icons = {
  settings: <Settings className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
  history: <History className="w-4 h-4" />,
  sync: <RefreshCw className="w-4 h-4" />,
  power: <Power className="w-4 h-4" />,
  back: <ChevronLeft className="w-4 h-4" />,
  check: <Check className="w-4 h-4" />,
  spinner: <Loader2 className="animate-spin w-4 h-4" />,
  error: <AlertCircle className="w-5 h-5" />,
};

// Default schema for extensions without config_schema (fallback)
const getDefaultSchema = (extension: Extension): ConfigSchema => {
  const defaultSettings = extension.default_settings || {};
  const fields = Object.entries(defaultSettings).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: typeof value === 'boolean' ? 'boolean' as const : 
          typeof value === 'number' ? 'number' as const : 'text' as const,
    default: value,
  }));

  return { fields };
};

// Category helpers
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'integration': 'bg-zinc-700 dark:bg-zinc-300',
    'content': 'bg-indigo-600',
    'engagement': 'bg-green-600',
    'analytics': 'bg-purple-600',
    'appearance': 'bg-pink-600',
  };
  return colors[category] || 'bg-blue-600';
};

// Category labels will be translated inside the component using the t function

// Changelog entry type (mocked for now, should come from API)
interface ChangelogEntry {
  id: string;
  action: 'sync' | 'settings_updated' | 'enabled' | 'disabled' | 'action_executed';
  description: string;
  timestamp: string;
  user?: string;
  details?: Record<string, any>;
}

export default function ExtensionConfig({ slug }: ExtensionConfigProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Context hook for websiteId
  const { currentWebsiteId: websiteId } = useWebsiteContext();
  // React Query hooks
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesQuery();
  const { data: catalogExtensions = [], isLoading: catalogLoading } = useExtensionCatalogQuery();
  const { data: websiteExtensions = [], isLoading: extensionsLoading, refetch: refetchExtensions } = useWebsiteExtensionsQuery(websiteId);
  const { data: extensionDataResponse, isLoading: extensionDataLoading, refetch: refetchExtensionData } = useExtensionDataQuery(websiteId, slug);
  
  // Mutations
  const updateSettingsMutation = useUpdateExtensionSettingsMutation();
  const deactivateExtensionMutation = useDeactivateExtensionMutation();
  
  // Category label helper (inside component to access t function)
  const getCategoryLabel = (category: string) => {
    const translationKey = `dashboard:extensions.categories.${category}`;
    const translated = t(translationKey);
    // Return category if translation key doesn't exist
    return translated === translationKey ? category : translated;
  };
  
  // Derive extension from catalog
  const extension = useMemo(() => {
    if (!catalogExtensions.length) return null;
    return catalogExtensions.find((e: Extension) => e.slug === slug) || null;
  }, [catalogExtensions, slug]);

  // Derive websiteExtension from cached extensions
  const websiteExtension = useMemo(() => {
    if (!websiteExtensions.length) return null;
    return websiteExtensions.find((e: WebsiteExtension) => e.extension_slug === slug) || null;
  }, [websiteExtensions, slug]);

  // Local state for settings and UI
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [initialSettings, setInitialSettings] = useState<Record<string, any>>({});
  const [extensionData, setExtensionData] = useState<Record<string, any>>({});
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Combined loading state
  const isLoading = websitesLoading || catalogLoading || extensionsLoading || extensionDataLoading;
  
  // Track if settings have changed
  const isSettingsDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  // Update local state when cached data changes
  useEffect(() => {
    if (websiteExtension) {
      setIsExtensionEnabled(websiteExtension.enabled);
      const newSettings = websiteExtension.settings || extension?.default_settings || {};
      setSettings(newSettings);
      setInitialSettings(newSettings);
    } else if (extension) {
      const newSettings = extension.default_settings || {};
      setSettings(newSettings);
      setInitialSettings(newSettings);
      setIsExtensionEnabled(false);
    }
  }, [websiteExtension, extension]);

  // Update extension data from cache
  useEffect(() => {
    if (extensionDataResponse) {
      setExtensionData(extensionDataResponse.data || {});
      if (extensionDataResponse.enabled !== undefined) {
        setIsExtensionEnabled(extensionDataResponse.enabled);
      }
    }
  }, [extensionDataResponse]);

  // Initialize changelog (mock data)
  useEffect(() => {
    setChangelog([
      {
        id: '1',
        action: 'sync',
        description: t('dashboard:extensions.config.changelog.sync'),
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '2',
        action: 'settings_updated',
        description: t('dashboard:extensions.config.changelog.settingsUpdated'),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '3',
        action: 'enabled',
        description: t('dashboard:extensions.config.changelog.enabled'),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ]);
  }, [t]);

  // Cancel changes handler
  const handleCancelChanges = () => {
    setSettings(initialSettings);
    toast.info(t('dashboard:extensions.config.toast.cancelled'));
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 's',
      ctrl: true,
      action: () => {
        if (isSettingsDirty && !isSaving) {
          handleSaveSettings();
        }
      },
      description: t('dashboard:extensions.config.shortcuts.save'),
      enabled: isSettingsDirty,
    },
    {
      key: 'Escape',
      action: () => {
        if (isSettingsDirty) {
          handleCancelChanges();
        }
      },
      description: t('dashboard:extensions.config.shortcuts.cancel'),
      enabled: isSettingsDirty,
    },
    {
      key: 'r',
      ctrl: true,
      shift: true,
      action: () => {
        refreshData();
        toast.info(t('dashboard:extensions.config.toast.refreshing'));
      },
      description: t('dashboard:extensions.config.shortcuts.refresh'),
    },
  ], [isSettingsDirty, isSaving, initialSettings, t]);

  useKeyboardShortcuts(shortcuts);

  const handleSaveSettings = async () => {
    if (!extension || !websiteId) return;

    setIsSaving(true);

    const savePromise = async () => {
      await updateSettingsMutation.mutateAsync({
        websiteId,
        extensionId: websiteExtension?.extension_id || extension.id,
        settings,
        isNewActivation: !websiteExtension,
      });
      // Update initial settings after save
      setInitialSettings(settings);
    };

    try {
      await toast.promise(savePromise(), {
        loading: t('dashboard:extensions.config.toast.saving'),
        success: t('dashboard:extensions.config.toast.saved'),
        error: t('dashboard:extensions.config.toast.saveError'),
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Refresh data from cache (only extension-related data)
  const refreshData = async () => {
    if (!websiteId) return;
    await Promise.all([refetchExtensions(), refetchExtensionData()]);
  };

  const handleAction = async (actionKey: string) => {
    if (!websiteId) return;
    
    const action = extension?.config_schema?.actions?.find((a: ConfigAction) => a.key === actionKey);
    
    // Handle confirmation
    if (action?.confirm && pendingConfirm !== actionKey) {
      setPendingConfirm(actionKey);
      return;
    }
    setPendingConfirm(null);
    
    setExecutingAction(actionKey);

    const actionPromise = async () => {
      await extensionsAPI.executeAction(websiteId, slug, actionKey, settings);
      if (action?.refreshAfter !== false) {
        setTimeout(refreshData, 2000);
      }
    };

    try {
      await toast.promise(actionPromise(), {
        loading: t('dashboard:extensions.config.toast.actionExecuting', { action: action?.label || actionKey }),
        success: t('dashboard:extensions.config.toast.actionExecuted', { action: action?.label || actionKey }),
        error: t('dashboard:extensions.config.toast.actionError'),
      });
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleToggleExtension = async () => {
    if (!extension || !websiteId) return;
    
    if (isExtensionEnabled) {
      // Show confirmation dialog instead of native confirm
      setShowDeactivateConfirm(true);
    } else {
      const activatePromise = async () => {
        await extensionsAPI.activate(websiteId, {
          extension_id: extension.id,
          settings: extension.default_settings || {},
        });
        await refreshData();
      };

      try {
        await toast.promise(activatePromise(), {
          loading: t('dashboard:extensions.config.toast.activating'),
          success: t('dashboard:extensions.config.toast.activated'),
          error: t('dashboard:extensions.config.toast.activateError'),
        });
      } catch (err) {
        console.error('Failed to activate extension:', err);
      }
    }
  };

  const confirmDeactivateExtension = async () => {
    if (!websiteId || !websiteExtension) {
      toast.error(t('dashboard:extensions.config.toast.missingData'));
      return;
    }
    
    setIsDeactivating(true);
    
    try {
      await deactivateExtensionMutation.mutateAsync({
        websiteId,
        extensionId: websiteExtension.id,
      });
      toast.success(t('dashboard:extensions.toast.deactivated'));
    } catch (err) {
      console.error('Failed to deactivate extension:', err);
      toast.error(t('dashboard:extensions.toast.deactivateError'));
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  // Find sync action from schema
  const getSyncAction = (): ConfigAction | undefined => {
    return extension?.config_schema?.actions?.find(
      (a: ConfigAction) => a.key === 'sync' || a.key.includes('sync')
    );
  };

  // Get other actions (non-sync)
  const getOtherActions = (): ConfigAction[] => {
    return extension?.config_schema?.actions?.filter(
      (a: ConfigAction) => a.key !== 'sync' && !a.key.includes('sync')
    ) || [];
  };

  // Get action icon based on type
  const getActionIcon = (action: ChangelogEntry['action']) => {
    switch (action) {
      case 'sync':
        return Icons.sync;
      case 'settings_updated':
        return Icons.settings;
      case 'enabled':
        return Icons.check;
      case 'disabled':
        return Icons.power;
      default:
        return Icons.history;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Back link skeleton */}
        <Skeleton className="h-4 w-20 mb-6" />
        
        {/* Header Card Skeleton */}
        <Card className="mb-6">
          <CardHeader className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-10 rounded" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs Skeleton */}
        <Card>
          <CardHeader className="border-b p-0">
            <div className="flex gap-2 px-6 py-3">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Form fields skeleton */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
            {/* Action buttons skeleton */}
            <div className="flex gap-3 pt-4 border-t">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extension not found
  if (!extension) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          {Icons.error}
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{t('dashboard:extensions.config.notFound')}</h3>
        <p className="text-muted-foreground mb-6">{t('dashboard:extensions.config.notFoundDescription', { slug })}</p>
        <Link 
          href={`/${websiteId}/extensions`} 
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          {Icons.back}
          {t('dashboard:extensions.config.backToExtensions')}
        </Link>
      </div>
    );
  }

  const schema = extension.config_schema || getDefaultSchema(extension);
  const syncAction = getSyncAction();
  const hasData = schema.dataDisplay && schema.dataDisplay.length > 0;
  const hasConfig = schema.fields && schema.fields.length > 0;

  // Determine default tab
  const defaultTab = hasConfig ? 'config' : hasData ? 'data' : 'changelog';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link 
        href={`/${websiteId}/extensions`} 
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors"
      >
        {Icons.back}
        {t('dashboard:extensions.title')}
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Extension info */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <ExtensionIcon icon={extension.icon} slug={extension.slug} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">{extension.name}</h1>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    isExtensionEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isExtensionEnabled ? t('dashboard:extensions.status.active') : t('dashboard:extensions.status.inactive')}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{extension.description}</p>
                <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {getCategoryLabel(extension.category)}
                  </span>
                  <span>•</span>
                  <span>v{extension.version}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              {/* Sync button */}
              {syncAction && isExtensionEnabled && (
                <button
                  onClick={() => handleAction(syncAction.key)}
                  disabled={executingAction === syncAction.key}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executingAction === syncAction.key ? Icons.spinner : Icons.sync}
                  <span className="hidden xs:inline">{t('dashboard:extensions.config.sync')}</span>
                  <span className="xs:hidden">{t('dashboard:extensions.config.syncShort')}</span>
                </button>
              )}
              
              {/* Enable/Disable toggle */}
              <button
                onClick={handleToggleExtension}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  isExtensionEnabled
                    ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100'
                    : 'text-white bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {Icons.power}
                {isExtensionEnabled ? t('dashboard:extensions.actions.deactivate') : t('dashboard:extensions.actions.activate')}
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation dialog */}
        {pendingConfirm && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-amber-50 border-amber-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs sm:text-sm text-amber-700">
                {extension.config_schema?.actions?.find((a: ConfigAction) => a.key === pendingConfirm)?.confirm || 'Confirmer cette action ?'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground bg-card border border-input rounded-lg hover:bg-muted"
                >
                  {t('common:actions.cancel')}
                </button>
                <button
                  onClick={() => handleAction(pendingConfirm)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  {t('common:actions.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Content */}
      {isExtensionEnabled && (
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-4 sm:p-6">
            <Tabs defaultValue={defaultTab}>
              <TabsList className="mb-4 flex flex-wrap gap-1">
                {hasConfig && (
                  <TabsTrigger value="config" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    {Icons.settings}
                    <span className="hidden xs:inline">{t('dashboard:extensions.config.tabs.config')}</span>
                    <span className="xs:hidden">Config</span>
                  </TabsTrigger>
                )}
                {hasData && (
                  <TabsTrigger value="data" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    {Icons.data}
                    {t('dashboard:extensions.config.tabs.data')}
                    {Object.keys(extensionData).length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs h-4 sm:h-5">
                        {Object.values(extensionData).flat().length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger value="changelog" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  {Icons.history}
                  <span className="hidden xs:inline">{t('dashboard:extensions.config.tabs.changelog')}</span>
                  <span className="xs:hidden">Hist.</span>
                  {changelog.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs h-4 sm:h-5">
                      {changelog.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Configuration Tab */}
              {hasConfig && (
                <TabsContent value="config">
                  <div className="space-y-6">
                    {/* Schema-driven fields */}
                    <SchemaRenderer
                      schema={{ ...schema, actions: [], dataDisplay: [] }}
                      settings={settings}
                      data={extensionData}
                      onSettingsChange={setSettings}
                      onAction={handleAction}
                      isExecutingAction={executingAction}
                    />
                    
                    {/* Other actions */}
                      {getOtherActions().length > 0 && (
                        <div className="border-t border-border pt-4 sm:pt-6">
                          <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">{t('dashboard:extensions.config.actions')}</h3>
                          <div className="flex flex-wrap gap-2">
                            {getOtherActions().map((action) => (
                              <button
                                key={action.key}
                                onClick={() => handleAction(action.key)}
                                disabled={executingAction === action.key}
                                className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  action.style === 'danger'
                                    ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100'
                                    : action.style === 'secondary'
                                    ? 'text-foreground bg-card border border-input hover:bg-muted'
                                    : 'text-white bg-primary-600 hover:bg-primary-700'
                                }`}
                              >
                                {executingAction === action.key && Icons.spinner}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

              {/* Data Tab */}
              {hasData && (
                <TabsContent value="data">
                  <SchemaRenderer
                    schema={{ dataDisplay: schema.dataDisplay }}
                    settings={settings}
                    data={extensionData}
                    onSettingsChange={setSettings}
                    onAction={handleAction}
                    isExecutingAction={executingAction}
                  />
                </TabsContent>
              )}

              {/* Changelog Tab */}
              <TabsContent value="changelog">
                <div>
                  {changelog.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                        {Icons.history}
                      </div>
                      <p className="text-muted-foreground">{t('dashboard:extensions.config.noHistory')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {changelog.map((entry, index) => (
                        <div 
                          key={entry.id}
                          className={`flex items-start gap-3 py-3 ${
                            index !== changelog.length - 1 ? 'border-b border-border' : ''
                          }`}
                        >
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground">
                            {getActionIcon(entry.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{entry.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatRelativeTimeFr(entry.timestamp)}
                              {entry.user && ` • ${entry.user}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Not enabled state */}
      {!isExtensionEnabled && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4 text-muted-foreground">
            {Icons.power}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">{t('dashboard:extensions.config.disabled')}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            {t('dashboard:extensions.config.disabledDescription')}
          </p>
          <button
            onClick={handleToggleExtension}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            {Icons.check}
            {t('dashboard:extensions.actions.activateExtension')}
          </button>
        </div>
      )}
      
      {/* Sticky form actions */}
      <FormActions
        isDirty={isSettingsDirty}
        isSaving={isSaving}
        onSave={handleSaveSettings}
        onCancel={handleCancelChanges}
      />

      {/* Deactivate Extension Confirmation Dialog */}
      <Dialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('dashboard:extensions.config.confirm.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('dashboard:extensions.config.confirm.description')} <span className="font-medium text-foreground">{extension?.name}</span> ?
              <br />
              <span className="text-muted-foreground">{t('dashboard:extensions.config.confirm.note')}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateConfirm(false)}
              disabled={isDeactivating}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateExtension}
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('dashboard:extensions.actions.deactivating')}
                </>
              ) : (
                t('dashboard:extensions.actions.deactivate')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
