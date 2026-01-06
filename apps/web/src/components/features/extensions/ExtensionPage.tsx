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
import type { WebsiteExtension, ConfigSchema, ConfigAction } from '@/lib/api/extensions';
import type { ExtensionStoreDetail } from '@/lib/api/store';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  User,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Info,
  Tag,
  Clock,
  Package,
  Settings,
  Zap,
  History,
  Power,
  RefreshCw,
  ExternalLink,
  Box,
  Heart,
  Play,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from '@/components/app-router';
import { getExtensionIconConfig } from '@/lib/extension-icons';
import { InstallButton } from './store/InstallButton';
import SchemaRenderer from '@/components/SchemaRenderer';
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

// ============================================================================
// Types
// ============================================================================

interface ExtensionPageProps {
  slug: string;
  initialTab?: string;
}

type TabValue = 'overview' | 'settings' | 'actions' | 'history';

interface ChangelogEntry {
  id: string;
  action: 'sync' | 'settings_updated' | 'enabled' | 'disabled' | 'action_executed';
  description: string;
  timestamp: string;
  user?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const getExtensionConfig = (extension: ExtensionStoreDetail | undefined) => {
  if (!extension?.manifest) return { defaultSettings: {}, configSchema: undefined };
  const manifest = extension.manifest;
  return {
    defaultSettings: (manifest.default_settings as Record<string, unknown>) || {},
    configSchema: manifest.config_schema as ConfigSchema | undefined,
  };
};

const getDefaultSchemaFromSettings = (defaultSettings: Record<string, unknown>): ConfigSchema => {
  const fields = Object.entries(defaultSettings).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: typeof value === 'boolean' ? 'boolean' as const : 
          typeof value === 'number' ? 'number' as const : 'text' as const,
    default: value,
  }));
  return { fields };
};

// ============================================================================
// Overview Tab Content
// ============================================================================

interface OverviewTabProps {
  extension: ExtensionStoreDetail;
}

function OverviewTab({ extension }: OverviewTabProps) {
  const permissions = (extension.manifest?.permissions as string[]) || [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Banner */}
        {extension.banner && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <img src={extension.banner} alt={extension.name} className="w-full h-auto" />
          </Card>
        )}

        {/* Description */}
        {extension.long_description && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {extension.long_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              Fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: 'Installation rapide', desc: 'Activez en un clic' },
                { title: 'Mises à jour auto', desc: 'Toujours à jour' },
                { title: 'Support intégré', desc: 'Assistance directe' },
                { title: 'Configuration simple', desc: 'Interface intuitive' },
              ].map(f => (
                <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-muted/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        {permissions.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                Permissions requises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium">{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{extension.version}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan minimum</span>
              <Badge variant="secondary" className="capitalize">{extension.min_plan}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Catégorie</span>
              <span className="font-medium capitalize">{extension.category}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Dernière MAJ</span>
              <span className="font-medium">
                {format(new Date(extension.updated_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {extension.tags.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="w-4 h-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {extension.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="rounded-full px-3">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Author */}
        {extension.author && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Développeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {extension.author.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{extension.author.name}</span>
                    {extension.author.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground">Développeur vérifié</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center space-y-3">
            <Heart className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium text-sm">Besoin d'aide ?</h3>
              <p className="text-xs text-muted-foreground mt-1">Consultez la documentation</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full w-full">
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Settings Tab Content
// ============================================================================

interface SettingsTabProps {
  schema: ConfigSchema;
  settings: Record<string, unknown>;
  onSettingsChange: (settings: Record<string, unknown>) => void;
}

function SettingsTab({ schema, settings, onSettingsChange }: SettingsTabProps) {
  if (!schema.fields || schema.fields.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucune configuration</h3>
        <p className="text-sm text-muted-foreground">
          Cette extension ne nécessite pas de configuration.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4" />
          Configuration
        </CardTitle>
        <CardDescription>
          Personnalisez le comportement de l'extension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SchemaRenderer
          schema={{ ...schema, actions: [], dataDisplay: [] }}
          settings={settings}
          data={{}}
          onSettingsChange={onSettingsChange}
          onAction={async () => {}}
          isExecutingAction={null}
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Actions Tab Content
// ============================================================================

interface ActionsTabProps {
  actions: ConfigAction[];
  executingAction: string | null;
  onAction: (key: string) => void;
}

function ActionsTab({ actions, executingAction, onAction }: ActionsTabProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucune action</h3>
        <p className="text-sm text-muted-foreground">
          Cette extension n'a pas d'actions disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map(action => (
        <Card key={action.key}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                action.style === 'danger' 
                  ? "bg-red-500/10 text-red-500"
                  : action.key.includes('sync')
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-primary/10 text-primary"
              )}>
                {action.key.includes('sync') ? (
                  <RefreshCw className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="font-medium">{action.label}</h4>
                {action.confirm && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nécessite une confirmation
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={action.style === 'danger' ? 'destructive' : 'default'}
              size="sm"
              className="rounded-full"
              onClick={() => onAction(action.key)}
              disabled={executingAction === action.key}
            >
              {executingAction === action.key ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Exécuter
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// History Tab Content
// ============================================================================

interface HistoryTabProps {
  changelog: ChangelogEntry[];
}

function HistoryTab({ changelog }: HistoryTabProps) {
  const getIcon = (action: ChangelogEntry['action']) => {
    switch (action) {
      case 'sync': return <RefreshCw className="w-4 h-4" />;
      case 'settings_updated': return <Settings className="w-4 h-4" />;
      case 'enabled': return <CheckCircle2 className="w-4 h-4" />;
      case 'disabled': return <Power className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  if (changelog.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucun historique</h3>
        <p className="text-sm text-muted-foreground">
          Les actions sur cette extension apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {changelog.map(entry => (
            <div key={entry.id} className="flex items-start gap-4 p-4">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                {getIcon(entry.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExtensionPage({ slug, initialTab = 'overview' }: ExtensionPageProps) {
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
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab as TabValue);
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

  // Icon config
  const iconConfig = extension ? getExtensionIconConfig(extension.icon, extension.slug) : null;
  const IconComponent = iconConfig?.icon;

  // Settings dirty check
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

  // Header badge
  const headerBadge = isActive
    ? { label: 'Active', variant: 'default' as const, icon: <CheckCircle2 className="w-3 h-3" /> }
    : isInstalled
      ? { label: 'Installée', variant: 'secondary' as const }
      : extension.featured
        ? { label: 'Featured', variant: 'default' as const, className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' }
        : undefined;

  // Header icon
  const headerIcon = IconComponent ? (
    <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
      `bg-gradient-to-br ${iconConfig?.gradient}`,
    )}>
      <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
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
            <div className="flex items-center gap-3">
              {headerIcon}
              <span className="font-semibold hidden sm:block">{extension.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleAction('sync')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
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
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Download className="w-4 h-4" />
          <span>{extension.install_count.toLocaleString()} installs</span>
        </div>
        {extension.rating !== undefined && extension.rating_count > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{extension.rating.toFixed(1)} ({extension.rating_count})</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Box className="w-4 h-4" />
          <span>v{extension.version}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>MAJ {formatDistanceToNow(new Date(extension.updated_at), { locale: fr })}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Aperçu</span>
          </TabsTrigger>
          {isActive && hasConfig && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          )}
          {isActive && hasActions && (
            <TabsTrigger value="actions" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
              <Badge variant="secondary" className="ml-1 h-5 text-[10px]">{actions.length}</Badge>
            </TabsTrigger>
          )}
          {isActive && (
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab extension={extension} />
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
          <CardContent className="py-8 text-center">
            <Power className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Extension inactive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Activez cette extension pour accéder aux paramètres et actions.
            </p>
            <Button onClick={handleToggleExtension} className="rounded-full">
              <Power className="w-4 h-4 mr-2" />
              Activer l'extension
            </Button>
          </CardContent>
        </Card>
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
