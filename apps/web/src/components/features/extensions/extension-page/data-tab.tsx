import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Database,
  Variable,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DataTabProps, VariableItem, CollectionSummaryItem } from './types';
import { formatCollectionName, formatVariableValue, getVariableTypeLabel } from './utils';

export function DataTab({ websiteId, extensionSlug }: DataTabProps) {
  const [variables, setVariables] = React.useState<VariableItem[]>([]);
  const [collections, setCollections] = React.useState<CollectionSummaryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [togglingKey, setTogglingKey] = React.useState<string | null>(null);

  const handleTogglePublic = React.useCallback(
    async (variable: VariableItem, next: boolean) => {
      setTogglingKey(variable.key);
      // Optimistic update — revert on failure.
      const previous = variable.is_public;
      setVariables(prev =>
        prev.map(v => (v.key === variable.key ? { ...v, is_public: next } : v))
      );
      try {
        const { variablesAPI } = await import('@/lib/api/collections');
        await variablesAPI.set(websiteId, variable.key, variable.value, {
          is_public: next,
        });
      } catch (err) {
        console.error('Failed to update variable visibility:', err);
        setVariables(prev =>
          prev.map(v =>
            v.key === variable.key ? { ...v, is_public: previous } : v
          )
        );
      } finally {
        setTogglingKey(null);
      }
    },
    [websiteId]
  );

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { collectionsAPI, variablesAPI } = await import('@/lib/api/collections');
        
        const basePrefixes = extensionSlug.replace('-', '_').split('_');
        const primaryPrefix = basePrefixes[0];
        
        // Load variables
        try {
          const varsResponse = await variablesAPI.list(websiteId);
          const allVars = varsResponse?.variables || [];
          const filtered = allVars
            .filter(v => {
              if (!v.key.startsWith(`${primaryPrefix}_`)) return false;
              const val = v.value;
              if (Array.isArray(val)) return false;
              if (typeof val === 'object' && val !== null) {
                const str = JSON.stringify(val);
                if (str.length > 500) return false;
              }
              return true;
            })
            .map(v => ({
              key: v.key,
              value: v.value,
              updated_at: v.updated_at,
              is_public: v.is_public,
            }));
          setVariables(filtered);
        } catch {
          setVariables([]);
        }

        // Load collections  
        try {
          const collectionsResponse = await collectionsAPI.list(websiteId);
          const allCollections = Array.isArray(collectionsResponse) 
            ? collectionsResponse 
            : (collectionsResponse?.collections || []);
          
          const filtered = allCollections
            .filter((c: any) => {
              const slug = c.collection_slug || c.collectionSlug || c.slug || '';
              const source = c.source_extension || c.sourceExtension || '';
              return source === extensionSlug || 
                     slug.startsWith(`${primaryPrefix}_`) ||
                     slug.startsWith(extensionSlug.replace('-', '_'));
            })
            .map((c: any) => ({
              slug: c.collection_slug || c.collectionSlug || c.slug,
              name: formatCollectionName(c.collection_slug || c.collectionSlug || c.slug),
              total_count: c.total_count ?? c.totalCount ?? 0,
              sync_status: c.sync_status || c.syncStatus,
              synced_at: c.synced_at || c.syncedAt,
            }));
          setCollections(filtered);
        } catch {
          setCollections([]);
        }
      } catch {
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
              <TooltipProvider delayDuration={200}>
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
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-[9px] font-medium uppercase", typeInfo.color)}>
                            {typeInfo.label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                <span className="text-[9px] font-medium uppercase text-muted-foreground">
                                  {variable.is_public ? 'Public' : 'Privé'}
                                </span>
                                <Switch
                                  checked={variable.is_public}
                                  disabled={togglingKey === variable.key}
                                  onCheckedChange={(checked) => handleTogglePublic(variable, checked)}
                                  aria-label={`Visibilité publique de ${variable.key}`}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-xs">
                              Si désactivé, cette variable n'est PAS exposée au site publié.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/80 break-all line-clamp-2" title={String(variable.value)}>
                        {formatVariableValue(variable.value, 80)}
                      </p>
                    </div>
                  );
                })}
              </TooltipProvider>
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

      {/* Usage Tip */}
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
