import { useEffect, useState, useMemo, useRef } from 'react';
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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SchemaRenderer from '@/components/SchemaRenderer';
import { useWebsitesQuery, useExtensionCatalogQuery, useWebsiteExtensionsQuery, useExtensionDataQuery, useUpdateExtensionSettingsMutation, useDeactivateExtensionMutation } from '@/lib/query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { FormActions } from '@/components/ui/form-actions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatRelativeTimeFr } from '@/lib/utils/formatters';

interface ExtensionConfigProps {
  slug: string;
}

// Icons
const Icons = {
  settings: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  data: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  history: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sync: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  power: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072 0l2.829-2.829m2.829 2.829L9 9m0 0L6.172 6.172" />
    </svg>
  ),
  back: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  spinner: (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
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
    'integration': 'bg-gray-900',
    'content': 'bg-indigo-600',
    'engagement': 'bg-green-600',
    'analytics': 'bg-purple-600',
    'appearance': 'bg-pink-600',
  };
  return colors[category] || 'bg-blue-600';
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    'integration': 'Intégration',
    'content': 'Contenu',
    'engagement': 'Engagement',
    'analytics': 'Analytics',
    'appearance': 'Apparence',
  };
  return labels[category] || category;
};

const getExtensionIcon = (category: string) => {
  const iconClass = "w-6 h-6";
  const icons: Record<string, React.ReactNode> = {
    'integration': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
      </svg>
    ),
    'content': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    ),
    'engagement': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
    'analytics': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
    'appearance': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
      </svg>
    ),
  };
  return icons[category] || (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
    </svg>
  );
};

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
        description: 'Synchronisation des données',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '2',
        action: 'settings_updated',
        description: 'Configuration mise à jour',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '3',
        action: 'enabled',
        description: 'Extension activée',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ]);
  }, []);

  // Cancel changes handler
  const handleCancelChanges = () => {
    setSettings(initialSettings);
    toast.info('Modifications annulées');
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
      description: 'Sauvegarder',
      enabled: isSettingsDirty,
    },
    {
      key: 'Escape',
      action: () => {
        if (isSettingsDirty) {
          handleCancelChanges();
        }
      },
      description: 'Annuler les modifications',
      enabled: isSettingsDirty,
    },
    {
      key: 'r',
      ctrl: true,
      shift: true,
      action: () => {
        refreshData();
        toast.info('Actualisation des données...');
      },
      description: 'Actualiser',
    },
  ], [isSettingsDirty, isSaving, initialSettings]);

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
        loading: 'Enregistrement en cours...',
        success: 'Configuration enregistrée',
        error: 'Erreur lors de l\'enregistrement',
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
        loading: `Exécution de "${action?.label || actionKey}"...`,
        success: `Action "${action?.label || actionKey}" exécutée`,
        error: `Erreur lors de l'exécution de l'action`,
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
          loading: 'Activation en cours...',
          success: 'Extension activée',
          error: 'Erreur lors de l\'activation',
        });
      } catch (err) {
        console.error('Failed to activate extension:', err);
      }
    }
  };

  const confirmDeactivateExtension = async () => {
    if (!websiteId || !websiteExtension) {
      toast.error('Données manquantes pour la désactivation');
      return;
    }
    
    setIsDeactivating(true);
    
    try {
      await deactivateExtensionMutation.mutateAsync({
        websiteId,
        extensionId: websiteExtension.id,
      });
      toast.success('Extension désactivée');
    } catch (err) {
      console.error('Failed to deactivate extension:', err);
      toast.error('Erreur lors de la désactivation');
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Extension non trouvée</h3>
        <p className="text-gray-500 mb-6">L'extension "{slug}" n'existe pas ou n'est pas disponible.</p>
        <Link 
          href={`/app/${websiteId}/extensions`} 
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          {Icons.back}
          Retour aux extensions
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
        href={`/app/${websiteId}/extensions`} 
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 mb-4 sm:mb-6 transition-colors"
      >
        {Icons.back}
        Extensions
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Extension info */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getCategoryColor(extension.category)} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {getExtensionIcon(extension.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">{extension.name}</h1>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    isExtensionEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isExtensionEnabled ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">{extension.description}</p>
                <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
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
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executingAction === syncAction.key ? Icons.spinner : Icons.sync}
                  <span className="hidden xs:inline">Synchroniser</span>
                  <span className="xs:hidden">Sync</span>
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
                {isExtensionEnabled ? 'Désactiver' : 'Activer'}
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
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAction(pendingConfirm)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Content */}
      {isExtensionEnabled && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            <Tabs defaultValue={defaultTab}>
              <TabsList className="mb-4 flex flex-wrap gap-1">
                {hasConfig && (
                  <TabsTrigger value="config" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    {Icons.settings}
                    <span className="hidden xs:inline">Configuration</span>
                    <span className="xs:hidden">Config</span>
                  </TabsTrigger>
                )}
                {hasData && (
                  <TabsTrigger value="data" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    {Icons.data}
                    Données
                    {Object.keys(extensionData).length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs h-4 sm:h-5">
                        {Object.values(extensionData).flat().length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger value="changelog" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  {Icons.history}
                  <span className="hidden xs:inline">Historique</span>
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
                        <div className="border-t border-gray-200 pt-4 sm:pt-6">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Actions</h3>
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
                                    ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
                      <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        {Icons.history}
                      </div>
                      <p className="text-gray-500">Aucun historique disponible</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {changelog.map((entry, index) => (
                        <div 
                          key={entry.id}
                          className={`flex items-start gap-3 py-3 ${
                            index !== changelog.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-gray-500">
                            {getActionIcon(entry.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{entry.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-gray-400">
            {Icons.power}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">Extension désactivée</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
            Activez cette extension pour accéder à sa configuration.
          </p>
          <button
            onClick={handleToggleExtension}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            {Icons.check}
            Activer l'extension
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
              Désactiver l'extension
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir désactiver l'extension <span className="font-medium text-foreground">{extension?.name}</span> ?
              <br />
              <span className="text-muted-foreground">Vous pourrez la réactiver à tout moment.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateConfirm(false)}
              disabled={isDeactivating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateExtension}
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Désactivation...
                </>
              ) : (
                'Désactiver'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
