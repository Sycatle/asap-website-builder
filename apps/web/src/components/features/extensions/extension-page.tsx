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
import type { WebsiteExtension, ConfigSchema, ConfigAction, ConfigField } from '@/lib/api/extensions';
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
  Sparkles,
  ArrowRight,
  Database,
  Variable,
  FolderOpen,
  Eye,
} from 'lucide-react';

// Extension manager registry for modular management UIs
import { getExtensionManager } from './extension-manager-registry';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from '@/components/app-router';
import { getExtensionIconConfig } from '@/lib/extension-icons';
import { InstallButton } from './store/install-button';
import SchemaRenderer from '@/components/schema-renderer';
import { FormActions } from '@/components/ui/form-actions';
import { Spinner } from '@/components/ui/spinner';
import {
  useStoreExtensionQuery,
  useInstallExtensionMutation,
  useStoreExtensionsQuery,
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

type TabValue = 'preview' | 'config' | 'data' | 'info' | 'settings' | 'actions' | 'history';

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
  
  // Build config schema from manifest fields (TOML [[fields]] sections)
  // The fields can be at manifest.fields or manifest.config_schema.fields
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
// Info Tab Content (Extension details, permissions, author)
// ============================================================================

interface InfoTabProps {
  extension: ExtensionStoreDetail;
}

function InfoTab({ extension }: InfoTabProps) {
  const permissions = (extension.manifest?.permissions as string[]) || [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Main Content */}
      <div className="md:col-span-2 space-y-4">
        {/* Banner */}
        {extension.banner && (
          <Card className="overflow-hidden">
            <img src={extension.banner} alt={extension.name} className="w-full h-auto" />
          </Card>
        )}

        {/* Description */}
        {extension.long_description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-primary/10">
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              Fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { title: 'Installation rapide', desc: 'Activez en un clic' },
                { title: 'Mises à jour auto', desc: 'Toujours à jour' },
                { title: 'Support intégré', desc: 'Assistance directe' },
                { title: 'Configuration simple', desc: 'Interface intuitive' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                Permissions requises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm">{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{extension.version}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan minimum</span>
              <Badge variant="secondary" className="capitalize text-xs">{extension.min_plan}</Badge>
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {extension.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Author */}
        {extension.author && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                Développeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {extension.author.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{extension.author.name}</span>
                    {extension.author.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Développeur vérifié</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card className="bg-muted/30">
          <CardContent className="pt-5 text-center space-y-2">
            <Heart className="w-6 h-6 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium text-sm">Besoin d'aide ?</h3>
              <p className="text-xs text-muted-foreground">Consultez la documentation</p>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Data Tab Content (Variables & Collections)
// ============================================================================

interface DataTabProps {
  websiteId: string;
  extensionSlug: string;
}

interface VariableItem {
  key: string;
  value: unknown;
  updated_at?: string;
}

interface CollectionSummaryItem {
  slug: string;
  name: string;
  total_count: number;
  sync_status?: string;
  synced_at?: string;
}

function DataTab({ websiteId, extensionSlug }: DataTabProps) {
  const [variables, setVariables] = React.useState<VariableItem[]>([]);
  const [collections, setCollections] = React.useState<CollectionSummaryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load data
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Import APIs dynamically to avoid circular deps
        const { collectionsAPI, variablesAPI } = await import('@/lib/api/collections');
        
        // Build prefixes for filtering - handle common naming patterns
        // e.g., "github-sync" -> ["github_sync", "github"]
        const basePrefixes = extensionSlug.replace('-', '_').split('_');
        const primaryPrefix = basePrefixes[0]; // "github" from "github_sync"
        
        // Load variables
        try {
          const varsResponse = await variablesAPI.list(websiteId);
          const allVars = varsResponse?.variables || [];
          // Filter variables that start with the extension prefix
          // Exclude arrays and complex objects (they should be in collections)
          const filtered = allVars
            .filter(v => {
              if (!v.key.startsWith(`${primaryPrefix}_`)) return false;
              // Exclude complex types that belong in collections
              const val = v.value;
              if (Array.isArray(val)) return false;
              // Exclude large JSON objects (like contribution_calendar)
              if (typeof val === 'object' && val !== null) {
                const str = JSON.stringify(val);
                if (str.length > 500) return false; // Large objects go to collections
              }
              return true;
            })
            .map(v => ({
              key: v.key,
              value: v.value,
              updated_at: v.updated_at,
            }));
          setVariables(filtered);
        } catch {
          setVariables([]);
        }

        // Load collections  
        try {
          const collectionsResponse = await collectionsAPI.list(websiteId);
          // Handle different response formats
          const allCollections = Array.isArray(collectionsResponse) 
            ? collectionsResponse 
            : (collectionsResponse?.collections || []);
          
          // Filter collections related to this extension
          const filtered = allCollections
            .filter((c: any) => {
              // Handle both snake_case and camelCase property names
              const slug = c.collection_slug || c.collectionSlug || c.slug || '';
              const source = c.source_extension || c.sourceExtension || '';
              const matches = source === extensionSlug || 
                     slug.startsWith(`${primaryPrefix}_`) ||
                     slug.startsWith(extensionSlug.replace('-', '_'));
              return matches;
            })
            .map((c: any) => ({
              slug: c.collection_slug || c.collectionSlug || c.slug,
              name: formatCollectionName(c.collection_slug || c.collectionSlug || c.slug),
              total_count: c.total_count ?? c.totalCount ?? 0,
              sync_status: c.sync_status || c.syncStatus,
              synced_at: c.synced_at || c.syncedAt,
            }));
          setCollections(filtered);
        } catch (err) {
          setCollections([]);
        }
      } catch (error) {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [websiteId, extensionSlug]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const hasData = variables.length > 0 || collections.length > 0;

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-medium text-lg mb-1">Aucune donnée</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Cette extension n'a pas encore généré de données. Lancez une synchronisation depuis l'onglet Aperçu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Variables Section */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Variable className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-sm font-medium">Variables</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">{variables.length}</Badge>
          </div>
          <CardDescription className="text-xs">
            Valeurs dynamiques utilisables dans vos sections
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {variables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune variable
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {variables.map((variable) => {
                const typeInfo = getVariableTypeLabel(variable.value);
                return (
                  <div
                    key={variable.key}
                    className="group p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-background border text-muted-foreground group-hover:text-foreground transition-colors truncate">
                        {variable.key}
                      </code>
                      <span className={cn("text-[9px] font-medium uppercase", typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 break-all line-clamp-2" title={String(variable.value)}>
                      {formatVariableValue(variable.value, 80)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collections Section */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <FolderOpen className="w-4 h-4 text-purple-500" />
              </div>
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">{collections.length}</Badge>
          </div>
          <CardDescription className="text-xs">
            Listes de données synchronisées
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {collections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune collection
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.slug}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background border">
                      <Database className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{collection.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] text-muted-foreground font-mono">{collection.slug}</code>
                        {collection.synced_at && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(collection.synced_at), { locale: fr })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {collection.total_count}
                    </Badge>
                    {collection.sync_status === 'synced' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500" title="Synchronisé" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tip - Full width */}
      <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Comment utiliser ces données ?</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Variable className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                  <span>
                    <strong className="text-foreground">Variables :</strong> Utilisez{' '}
                    <code className="px-1 py-0.5 rounded bg-muted border text-[10px]">{'{{nom}}'}</code>{' '}
                    dans vos sections
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FolderOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                  <span>
                    <strong className="text-foreground">Collections :</strong> Liez-les aux composants de liste dans le Studio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to format collection names
function formatCollectionName(slug: string): string {
  const names: Record<string, string> = {
    'github_repos': 'Repositories GitHub',
    'github_languages': 'Langages',
    'github_gists': 'Gists GitHub',
    'github_starred': 'Repos étoilés',
    'github_organizations': 'Organisations',
  };
  return names[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to format variable values for display
function formatVariableValue(value: unknown, maxLength = 50): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (typeof value === 'object') {
    // Check if it's an array
    if (Array.isArray(value)) {
      return `[${value.length} éléments]`;
    }
    const str = JSON.stringify(value);
    if (str.length > maxLength) return `{...} (${str.length} chars)`;
    return str;
  }
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

// Helper to get a nice display for variable type
function getVariableTypeLabel(value: unknown): { label: string; color: string } {
  if (value === null || value === undefined) return { label: 'null', color: 'text-muted-foreground' };
  if (typeof value === 'boolean') return { label: 'bool', color: 'text-amber-500' };
  if (typeof value === 'number') return { label: 'num', color: 'text-blue-500' };
  if (typeof value === 'object') {
    if (Array.isArray(value)) return { label: 'array', color: 'text-purple-500' };
    return { label: 'json', color: 'text-emerald-500' };
  }
  if (typeof value === 'string') {
    // Check if it looks like a URL
    if (value.startsWith('http')) return { label: 'url', color: 'text-cyan-500' };
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return { label: 'date', color: 'text-orange-500' };
    return { label: 'str', color: 'text-rose-500' };
  }
  return { label: 'any', color: 'text-muted-foreground' };
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
      <div className="text-center py-10">
        <Settings className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucune configuration</h3>
        <p className="text-xs text-muted-foreground">
          Cette extension ne nécessite pas de configuration.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Settings className="w-4 h-4 text-muted-foreground" />
          Configuration
        </CardTitle>
        <CardDescription className="text-xs">
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
      <div className="text-center py-10">
        <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucune action</h3>
        <p className="text-xs text-muted-foreground">
          Cette extension n'a pas d'actions disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map(action => (
        <Card key={action.key}>
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                action.style === 'danger' 
                  ? "bg-red-500/10 text-red-500"
                  : action.key.includes('sync')
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-primary/10 text-primary"
              )}>
                {action.key.includes('sync') ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-sm">{action.label}</h4>
                {action.confirm && (
                  <p className="text-[11px] text-muted-foreground">
                    Nécessite une confirmation
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={action.style === 'danger' ? 'destructive' : 'default'}
              size="sm"
              onClick={() => onAction(action.key)}
              disabled={executingAction === action.key}
            >
              {executingAction === action.key ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
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
      case 'sync': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'settings_updated': return <Settings className="w-3.5 h-3.5" />;
      case 'enabled': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'disabled': return <Power className="w-3.5 h-3.5" />;
      default: return <History className="w-3.5 h-3.5" />;
    }
  };

  if (changelog.length === 0) {
    return (
      <div className="text-center py-10">
        <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucun historique</h3>
        <p className="text-xs text-muted-foreground">
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
            <div key={entry.id} className="flex items-start gap-3 p-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                {getIcon(entry.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.description}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
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
// Suggested Extensions Component
// ============================================================================

interface SuggestedExtensionsProps {
  currentSlug: string;
  category: string;
  tags: string[];
  websiteId: string;
}

function SuggestedExtensions({ currentSlug, category, tags: _tags, websiteId }: SuggestedExtensionsProps) {
  const TARGET_COUNT = 4;
  
  // Fetch extensions from the same category
  const { data: categoryExtensions } = useStoreExtensionsQuery({ 
    category,
    per_page: 8,
  });

  // Fetch all extensions as fallback (only if needed)
  const { data: allExtensions } = useStoreExtensionsQuery({ 
    per_page: 12,
    sort: 'popular',
  });

  // Build suggestions: prioritize same category, then fill with others
  const suggestions = useMemo(() => {
    // First: get extensions from same category (excluding current)
    const sameCategoryExts = (categoryExtensions?.extensions || [])
      .filter(ext => ext.slug !== currentSlug);
    
    // If we have enough from same category, return them
    if (sameCategoryExts.length >= TARGET_COUNT) {
      return sameCategoryExts.slice(0, TARGET_COUNT);
    }
    
    // Otherwise, fill with extensions from other categories
    const usedSlugs = new Set([currentSlug, ...sameCategoryExts.map(e => e.slug)]);
    const otherExts = (allExtensions?.extensions || [])
      .filter(ext => !usedSlugs.has(ext.slug));
    
    const remaining = TARGET_COUNT - sameCategoryExts.length;
    return [...sameCategoryExts, ...otherExts.slice(0, remaining)];
  }, [categoryExtensions, allExtensions, currentSlug]);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-10 pt-6 border-t">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-violet-500/10">
          <Sparkles className="w-4 h-4 text-violet-500" />
        </div>
        <h2 className="font-medium">Extensions similaires</h2>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {suggestions.map(ext => {
          const iconConfig = getExtensionIconConfig(ext.icon, ext.slug);
          const IconComponent = iconConfig.icon;
          
          return (
            <Link
              key={ext.slug}
              href={`/${websiteId}/extensions/${ext.slug}`}
              className={cn(
                "group flex flex-col p-5 rounded-xl border bg-card/50 backdrop-blur-sm",
                "transition-all duration-300 hover:bg-card hover:border-primary/20",
              )}
            >
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  `bg-gradient-to-br ${iconConfig.gradient}`,
                )}
              >
                <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">{ext.name}</h3>
                {ext.featured && (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                {ext.description}
              </p>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <span className="text-xs text-muted-foreground">{ext.install_count} installs</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

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

  // Local state - default to 'preview' if we have a manager, otherwise 'info'
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
  
  // Check if extension has a custom manager UI (from registry)
  const managerConfig = useMemo(() => getExtensionManager(slug), [slug]);
  const hasManager = !!managerConfig;
  
  // Set default tab based on extension state
  // - If user explicitly provided a tab, use it
  // - If active with manager: show "preview" by default (Aperçu)
  // - Otherwise: show "info"
  useEffect(() => {
    // If user explicitly provided a valid tab via URL, use it
    if (initialTab && ['preview', 'config', 'data', 'info', 'settings', 'actions', 'history'].includes(initialTab)) {
      setActiveTab(initialTab as TabValue);
      return;
    }
    
    // Otherwise, auto-select the best default
    if (isActive && hasManager) {
      setActiveTab('preview');
    } else {
      setActiveTab('info');
    }
  }, [isActive, hasManager, initialTab]);

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
          {/* Aperçu tab - shows manager component for data preview */}
          {isActive && hasManager && managerConfig && (
            <TabsTrigger value="preview" className="gap-1.5 text-xs h-7">
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aperçu</span>
            </TabsTrigger>
          )}
          {/* Configuration tab - settings for extensions with manager */}
          {isActive && hasManager && hasConfig && (
            <TabsTrigger value="config" className="gap-1.5 text-xs h-7">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
          )}
          {/* Données tab - shows variables and collections */}
          {isActive && hasManager && (
            <TabsTrigger value="data" className="gap-1.5 text-xs h-7">
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Données</span>
            </TabsTrigger>
          )}
          {/* Informations tab - extension details */}
          <TabsTrigger value="info" className="gap-1.5 text-xs h-7">
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>
          {/* Settings tab - only for extensions without custom manager */}
          {isActive && hasConfig && !hasManager && (
            <TabsTrigger value="settings" className="gap-1.5 text-xs h-7">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          )}
          {/* Actions tab - only for extensions without custom manager */}
          {isActive && hasActions && !hasManager && (
            <TabsTrigger value="actions" className="gap-1.5 text-xs h-7">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actions</span>
              <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{actions.length}</Badge>
            </TabsTrigger>
          )}
          {/* History tab */}
          {isActive && (
            <TabsTrigger value="history" className="gap-1.5 text-xs h-7">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-4">
          {/* Preview Tab - Custom manager UI */}
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

          {/* Config Tab - Settings for extensions with manager */}
          {isActive && hasManager && hasConfig && (
            <TabsContent value="config" className="mt-0">
              <SettingsTab
                schema={schema}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </TabsContent>
          )}

          {/* Data Tab - Variables & Collections */}
          {isActive && hasManager && websiteId && (
            <TabsContent value="data" className="mt-0">
              <DataTab websiteId={websiteId} extensionSlug={slug} />
            </TabsContent>
          )}

          {/* Info Tab - Extension details */}
          <TabsContent value="info" className="mt-0">
            <InfoTab extension={extension} />
          </TabsContent>

          {/* Settings Tab */}
          {isActive && hasConfig && (
            <TabsContent value="settings" className="mt-0">
              <SettingsTab
                schema={schema}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </TabsContent>
          )}

          {/* Actions Tab */}
          {isActive && hasActions && (
            <TabsContent value="actions" className="mt-0">
              <ActionsTab
                actions={actions}
                executingAction={executingAction}
                onAction={handleAction}
              />
            </TabsContent>
          )}

          {/* History Tab */}
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
