/**
 * Extension Data Panel
 * 
 * Panel for viewing and managing extension data (collections & variables)
 * in the Studio sidebar.
 */

'use client';

import * as React from 'react';
import { 
  Database, 
  Variable, 
  RefreshCw, 
  ChevronRight,
  Layers,
  AlertCircle,
  CheckCircle2,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStudioData } from './StudioDataContext';
import type { CollectionSummary, WebsiteVariable, SyncStatus } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface ExtensionDataPanelProps {
  className?: string;
}

// ============================================
// Sync Status Badge
// ============================================

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'syncing':
      return <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    case 'idle':
    default:
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
  }
}

// ============================================
// Collection Item
// ============================================

interface CollectionItemProps {
  collection: CollectionSummary;
  onSync: () => void;
  isSyncing: boolean;
}

function CollectionItem({ collection, onSync, isSyncing }: CollectionItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 group">
      <Database className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {formatCollectionName(collection.collection_slug)}
          </span>
          <Badge variant="secondary" className="text-xs shrink-0">
            {collection.total_count}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {collection.source_extension}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <SyncStatusIcon status={collection.sync_status} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Synchroniser</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================
// Variable Item
// ============================================

interface VariableItemProps {
  variable: WebsiteVariable;
  value: unknown;
}

function VariableItem({ variable, value }: VariableItemProps) {
  const formattedValue = React.useMemo(() => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('fr-FR').format(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    const str = String(value);
    return str.length > 30 ? str.slice(0, 30) + '...' : str;
  }, [value]);

  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50">
      <Variable className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-muted px-1 rounded">
            {`{{${variable.key}}}`}
          </code>
          {variable.source === 'computed' && (
            <Badge variant="outline" className="text-xs">
              calculé
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {variable.source_ref || 'manuel'}
        </span>
      </div>
      <span className="text-sm text-muted-foreground font-mono shrink-0">
        {formattedValue}
      </span>
    </div>
  );
}

// ============================================
// Section Header
// ============================================

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}

function SectionHeader({ 
  icon: Icon, 
  title, 
  count, 
  isOpen, 
  onToggle,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors"
      >
        <ChevronRight 
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-90"
          )} 
        />
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </button>
      {action}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ExtensionDataPanel({ className }: ExtensionDataPanelProps) {
  const {
    collections,
    isLoadingCollections,
    collectionsError,
    variables,
    variableValues,
    isLoadingVariables,
    variablesError,
    syncCollection,
    recomputeVariables,
    refetch,
  } = useStudioData();

  const [collectionsOpen, setCollectionsOpen] = React.useState(true);
  const [variablesOpen, setVariablesOpen] = React.useState(true);
  const [syncingSlug, setSyncingSlug] = React.useState<string | null>(null);
  const [isRecomputing, setIsRecomputing] = React.useState(false);

  const handleSyncCollection = async (slug: string) => {
    setSyncingSlug(slug);
    try {
      await syncCollection(slug);
    } finally {
      setSyncingSlug(null);
    }
  };

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      await recomputeVariables();
    } finally {
      setIsRecomputing(false);
    }
  };

  const isLoading = isLoadingCollections || isLoadingVariables;
  const hasError = collectionsError || variablesError;
  const isEmpty = collections.length === 0 && variables.length === 0;

  if (isLoading) {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">
            Erreur lors du chargement des données
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Box className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Aucune donnée disponible</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activez une extension pour ajouter des collections et variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="shrink-0 p-3 border-b bg-background flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Données
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualiser</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Collections Section */}
          {collections.length > 0 && (
            <Collapsible open={collectionsOpen} onOpenChange={setCollectionsOpen}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  icon={Database}
                  title="Collections"
                  count={collections.length}
                  isOpen={collectionsOpen}
                  onToggle={() => setCollectionsOpen(!collectionsOpen)}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mt-1">
                  {collections.map((collection) => (
                    <CollectionItem
                      key={collection.collection_slug}
                      collection={collection}
                      onSync={() => handleSyncCollection(collection.collection_slug)}
                      isSyncing={syncingSlug === collection.collection_slug}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Variables Section */}
          {variables.length > 0 && (
            <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  icon={Variable}
                  title="Variables"
                  count={variables.length}
                  isOpen={variablesOpen}
                  onToggle={() => setVariablesOpen(!variablesOpen)}
                  action={
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleRecompute}
                            disabled={isRecomputing}
                          >
                            <RefreshCw className={cn(
                              "h-3 w-3",
                              isRecomputing && "animate-spin"
                            )} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Recalculer les variables</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  }
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mt-1">
                  {variables.map((variable) => (
                    <VariableItem
                      key={variable.id}
                      variable={variable}
                      value={variableValues[variable.key]}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatCollectionName(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default ExtensionDataPanel;
