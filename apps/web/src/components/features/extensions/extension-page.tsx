/**
 * Unified Extension Page
 * 
 * Single page for viewing and configuring an extension.
 * Combines detail view with settings/actions in a tabbed interface.
 * Route: /extensions/{slug} or /extensions/{slug}/{tab}
 */

import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { extensionsAPI } from '@/lib/api';
import type { WebsiteExtension, ConfigAction } from '@/lib/api/extensions';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Star,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Package,
  Settings,
  Zap,
  History,
  Power,
  RefreshCw,
  Box,
  Eye,
  Database,
} from 'lucide-react';

import { getExtensionManager } from './extension-manager-registry';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from '@/components/app-router';
import { getExtensionIconConfig } from '@/lib/extension-icons';
import { InstallButton } from './store/install-button';
import { FormActions } from '@/components/ui/form-actions';
import { Spinner } from '@/components/ui/spinner';
import {
  useStoreExtensionQuery,
  useInstallExtensionMutation,
} from '@/lib/query/store';
import {
  useWebsiteExtensionsQuery,
  useExtensionDataQuery,
  useUpdateExtensionSettingsMutation,
  useDeactivateExtensionMutation,
} from '@/lib/query';

import type { ExtensionPageProps, TabValue, ChangelogEntry } from './extension-page/types';
import { getExtensionConfig, getDefaultSchemaFromSettings } from './extension-page/types';
import { InfoTab } from './extension-page/info-tab';
import { DataTab } from './extension-page/data-tab';
import { SettingsTab, ActionsTab } from './extension-page/settings-actions-tabs';
import { HistoryTab } from './extension-page/history-tab';
import { SuggestedExtensions } from './extension-page/suggested-extensions';

export default function ExtensionPage({ slug, initialTab }: ExtensionPageProps) {
  const { currentWebsiteId: websiteId } = useWebsiteContext();

  // Queries
  const { data: extension, isLoading: extensionLoading } = useStoreExtensionQuery(slug);
  const { data: websiteExtensions = [], isLoading: extensionsLoading, refetch: refetchExtensions } = useWebsiteExtensionsQuery(websiteId);
  const { refetch: refetchExtensionData } = useExtensionDataQuery(websiteId, slug);

  // Mutations
  const installMutation = useInstallExtensionMutation();
  const updateSettingsMutation = useUpdateExtensionSettingsMutation();
  const deactivateMutation = useDeactivateExtensionMutation();

  // Local state
  const [activeTab, setActiveTab] = useState<TabValue>('info');
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [initialSettings, setInitialSettings] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  // Derived data
  const websiteExtension = useMemo(() => 
    websiteExtensions.find((e: WebsiteExtension) => e.extension_slug === slug),
    [websiteExtensions, slug]
  );
  const isInstalled = !!websiteExtension;
  const isActive = websiteExtension?.enabled ?? false;
  const extensionConfig = useMemo(() => getExtensionConfig(extension), [extension]);
  const schema = extensionConfig.configSchema || getDefaultSchemaFromSettings(extensionConfig.defaultSettings);
  const actions = (schema.actions || []) as ConfigAction[];
  const hasConfig = schema.fields && schema.fields.length > 0;
  const hasActions = actions.length > 0;
  
  const managerConfig = useMemo(() => getExtensionManager(slug), [slug]);
  const hasManager = !!managerConfig;
  
  // Set default tab based on extension state
  useEffect(() => {
    if (initialTab && ['preview', 'config', 'data', 'info', 'settings', 'actions', 'history'].includes(initialTab)) {
      setActiveTab(initialTab as TabValue);
      return;
    }
    
    if (isActive && hasManager) {
      setActiveTab('preview');
    } else {
      setActiveTab('info');
    }
  }, [isActive, hasManager, initialTab]);

  const iconConfig = extension ? getExtensionIconConfig(extension.icon, extension.slug) : null;
  const IconComponent = iconConfig?.icon;

  const isSettingsDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
  const isLoading = extensionLoading || extensionsLoading;

  // Sync settings from API
  useEffect(() => {
    if (websiteExtension) {
      const newSettings = websiteExtension.settings || extensionConfig.defaultSettings || {};
      setSettings(newSettings);
      setInitialSettings(newSettings);
    } else if (extension) {
      const newSettings = extensionConfig.defaultSettings || {};
      setSettings(newSettings);
      setInitialSettings(newSettings);
    }
  }, [websiteExtension, extension, extensionConfig.defaultSettings]);

  // Mock changelog
  useEffect(() => {
    setChangelog([
      { id: '1', action: 'sync', description: 'Synchronisation effectuée', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: '2', action: 'settings_updated', description: 'Paramètres mis à jour', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
      { id: '3', action: 'enabled', description: 'Extension activée', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    ]);
  }, []);

  // Handlers
  const refreshData = async () => {
    await Promise.all([refetchExtensions(), refetchExtensionData()]);
  };

  const handleSaveSettings = async () => {
    if (!extension || !websiteId) return;
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        websiteId,
        extensionId: websiteExtension?.extension_id || extension.slug,
        settings,
        isNewActivation: !websiteExtension,
      });
      setInitialSettings(settings);
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setSettings(initialSettings);
    toast.info('Modifications annulées');
  };

  const handleToggleExtension = async () => {
    if (!extension || !websiteId) return;
    
    if (isActive) {
      setShowDeactivateConfirm(true);
    } else {
      try {
        await extensionsAPI.activate(websiteId, {
          extension_id: extension.slug,
          settings: extensionConfig.defaultSettings || {},
        });
        await refreshData();
        toast.success('Extension activée !');
      } catch {
        toast.error("Erreur lors de l'activation");
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!websiteId || !websiteExtension) return;
    setIsDeactivating(true);
    try {
      await deactivateMutation.mutateAsync({
        websiteId,
        extensionId: websiteExtension.id,
      });
      toast.success('Extension désactivée');
    } catch {
      toast.error('Erreur lors de la désactivation');
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleAction = async (actionKey: string) => {
    if (!websiteId) return;
    setExecutingAction(actionKey);
    try {
      await extensionsAPI.executeAction(websiteId, slug, actionKey, settings);
      toast.success('Action exécutée');
      setTimeout(refreshData, 2000);
    } catch {
      toast.error("Erreur lors de l'exécution");
    } finally {
      setExecutingAction(null);
    }
  };

  const handleInstall = () => {
    if (!extension) return;
    installMutation.mutate({ slug: extension.slug, permissions: [] }, {
      onSuccess: () => {
        toast.success(`${extension.name} installée !`);
        refreshData();
      },
      onError: () => toast.error("Erreur lors de l'installation"),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!extension) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Extension introuvable</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          L'extension "{slug}" n'existe pas ou n'est plus disponible.
        </p>
        <Button asChild className="rounded-full">
          <Link href={`/${websiteId}/extensions`}>
            Retour au marketplace
          </Link>
        </Button>
      </div>
    );
  }

  // Header elements
  const headerBadge = isActive
    ? { label: 'Active', variant: 'default' as const, icon: <CheckCircle2 className="w-3 h-3" /> }
    : isInstalled
      ? { label: 'Installée', variant: 'secondary' as const }
      : extension.featured
        ? { label: 'Featured', variant: 'default' as const, className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' }
        : undefined;

  const headerIcon = IconComponent ? (
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center",
      `bg-gradient-to-br ${iconConfig?.gradient}`,
    )}>
      <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title={extension.name}
        subtitle={extension.description}
        icon={headerIcon}
        badge={headerBadge}
        backHref={`/${websiteId}/extensions`}
        backLabel="Extensions"
        actions={[
          ...(isActive ? [{
            label: 'Synchroniser',
            variant: 'outline' as const,
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: () => handleAction('sync'),
            priority: 'secondary' as const,
          }] : []),
          {
            label: isActive ? 'Désactiver' : isInstalled ? 'Activer' : 'Installer',
            variant: isActive ? 'outline' : 'default',
            icon: isActive ? <Power className="w-4 h-4" /> : <Download className="w-4 h-4" />,
            onClick: isInstalled ? handleToggleExtension : handleInstall,
            disabled: installMutation.isPending,
            priority: 'primary',
          },
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {headerIcon}
              <span className="font-medium text-sm hidden sm:block">{extension.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('sync')}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Sync
                </Button>
              )}
              <InstallButton
                isInstalled={isInstalled}
                isInstalling={installMutation.isPending}
                requiredPlan={extension.min_plan}
                onInstall={handleInstall}
                onUninstall={() => setShowDeactivateConfirm(true)}
                size="sm"
              />
            </div>
          </div>
        }
      />

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          <span>{extension.install_count.toLocaleString()} installs</span>
        </div>
        {extension.rating !== undefined && extension.rating_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{extension.rating.toFixed(1)} ({extension.rating_count})</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5" />
          <span>v{extension.version}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>MAJ {formatDistanceToNow(new Date(extension.updated_at), { locale: fr })}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="bg-muted/50 h-9">
          {isActive && hasManager && managerConfig && (
            <TabsTrigger value="preview" className="gap-1.5 text-xs h-7">
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aperçu</span>
            </TabsTrigger>
          )}
          {isActive && hasManager && hasConfig && (
            <TabsTrigger value="config" className="gap-1.5 text-xs h-7">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
          )}
          {isActive && hasManager && (
            <TabsTrigger value="data" className="gap-1.5 text-xs h-7">
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Données</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="info" className="gap-1.5 text-xs h-7">
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>
          {isActive && hasConfig && !hasManager && (
            <TabsTrigger value="settings" className="gap-1.5 text-xs h-7">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          )}
          {isActive && hasActions && !hasManager && (
            <TabsTrigger value="actions" className="gap-1.5 text-xs h-7">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actions</span>
              <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{actions.length}</Badge>
            </TabsTrigger>
          )}
          {isActive && (
            <TabsTrigger value="history" className="gap-1.5 text-xs h-7">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-4">
          {isActive && hasManager && managerConfig && websiteId && (
            <TabsContent value="preview" className="mt-0">
              <React.Suspense fallback={
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                  </div>
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              }>
                <managerConfig.component
                  websiteId={websiteId}
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={handleSaveSettings}
                  isSaving={isSaving}
                  isDirty={isSettingsDirty}
                />
              </React.Suspense>
            </TabsContent>
          )}

          {isActive && hasManager && hasConfig && (
            <TabsContent value="config" className="mt-0">
              <SettingsTab
                schema={schema}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </TabsContent>
          )}

          {isActive && hasManager && websiteId && (
            <TabsContent value="data" className="mt-0">
              <DataTab websiteId={websiteId} extensionSlug={slug} />
            </TabsContent>
          )}

          <TabsContent value="info" className="mt-0">
            <InfoTab extension={extension} />
          </TabsContent>

          {isActive && hasConfig && (
            <TabsContent value="settings" className="mt-0">
              <SettingsTab
                schema={schema}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </TabsContent>
          )}

          {isActive && hasActions && (
            <TabsContent value="actions" className="mt-0">
              <ActionsTab
                actions={actions}
                executingAction={executingAction}
                onAction={handleAction}
              />
            </TabsContent>
          )}

          {isActive && (
            <TabsContent value="history" className="mt-0">
              <HistoryTab changelog={changelog} />
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* Not active state */}
      {!isActive && isInstalled && (
        <Card className="bg-muted/30">
          <CardContent className="py-6 text-center">
            <Power className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium text-sm mb-1">Extension inactive</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Activez cette extension pour accéder aux paramètres et actions.
            </p>
            <Button size="sm" onClick={handleToggleExtension}>
              <Power className="w-4 h-4 mr-1.5" />
              Activer l'extension
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggested Extensions */}
      {websiteId && extension.category && (
        <SuggestedExtensions
          currentSlug={slug}
          category={extension.category}
          tags={extension.tags || []}
          websiteId={websiteId}
        />
      )}

      {/* Form Actions (sticky) */}
      <FormActions
        isDirty={isSettingsDirty}
        isSaving={isSaving}
        onSave={handleSaveSettings}
        onCancel={handleCancelChanges}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Désactiver l'extension
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver <strong>{extension.name}</strong> ?
              Vos paramètres seront conservés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)} disabled={isDeactivating}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDeactivate} disabled={isDeactivating}>
              {isDeactivating && <Spinner className="w-4 h-4 mr-2" />}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
