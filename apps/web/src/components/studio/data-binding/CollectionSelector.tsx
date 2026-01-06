/**
 * Collection Selector Component
 * 
 * A select-based component for choosing a collection as a data source.
 * Shows collection metadata, sync status, and item count.
 */

'use client';

import * as React from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CollectionSummary, SyncStatus } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface CollectionSelectorProps {
  /** Available collections */
  collections: CollectionSummary[];
  /** Currently selected collection slug */
  value?: string;
  /** Callback when selection changes */
  onChange: (slug: string | undefined) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Custom class name */
  className?: string;
}

// ============================================
// Sync Status Badge
// ============================================

interface SyncStatusBadgeProps {
  status: SyncStatus;
  syncedAt?: string;
}

function SyncStatusBadge({ status, syncedAt }: SyncStatusBadgeProps) {
  switch (status) {
    case 'syncing':
      return (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Sync en cours
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Erreur
        </Badge>
      );
    case 'idle':
    default:
      return syncedAt ? (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {formatSyncTime(syncedAt)}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Non synchronisé
        </Badge>
      );
  }
}

// ============================================
// Collection Item
// ============================================

interface CollectionItemDisplayProps {
  collection: CollectionSummary;
}

function CollectionItemDisplay({ collection }: CollectionItemDisplayProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {formatCollectionName(collection.collection_slug)}
          </span>
          <Badge variant="secondary" className="text-xs">
            {collection.total_count} éléments
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatExtensionName(collection.source_extension)}
        </div>
      </div>
      <SyncStatusBadge 
        status={collection.sync_status} 
        syncedAt={collection.synced_at} 
      />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function CollectionSelector({
  collections,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  placeholder = 'Sélectionner une collection',
  className,
}: CollectionSelectorProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const selectedCollection = collections.find(c => c.collection_slug === value);

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={value}
        onValueChange={(v) => onChange(v || undefined)}
        disabled={disabled || collections.length === 0}
      >
        <SelectTrigger className="w-full h-auto min-h-10 py-2">
          {selectedCollection ? (
            <CollectionItemDisplay collection={selectedCollection} />
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {collections.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucune collection disponible.
              <br />
              Activez une extension pour créer des collections.
            </div>
          ) : (
            collections.map((collection) => (
              <SelectItem
                key={collection.collection_slug}
                value={collection.collection_slug}
                className="py-2"
              >
                <CollectionItemDisplay collection={collection} />
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================
// Collection Card (alternative display)
// ============================================

export interface CollectionCardProps {
  collection: CollectionSummary;
  selected?: boolean;
  onClick?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function CollectionCard({
  collection,
  selected = false,
  onClick,
  onSync,
  isSyncing = false,
}: CollectionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        'hover:border-primary/50 hover:bg-accent/50',
        selected && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-md',
            selected ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Database className={cn(
              'h-5 w-5',
              selected ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h4 className="font-medium">
              {formatCollectionName(collection.collection_slug)}
            </h4>
            <p className="text-sm text-muted-foreground">
              {formatExtensionName(collection.source_extension)}
            </p>
          </div>
        </div>
        <SyncStatusBadge 
          status={collection.sync_status} 
          syncedAt={collection.synced_at} 
        />
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="secondary">
          {collection.total_count} éléments
        </Badge>
        
        {onSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSync();
            }}
            disabled={isSyncing}
          >
            <RefreshCw className={cn(
              'h-4 w-4 mr-1',
              isSyncing && 'animate-spin'
            )} />
            Synchroniser
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatCollectionName(slug: string): string {
  const names: Record<string, string> = {
    github_repos: 'Projets GitHub',
    blog_posts: 'Articles de blog',
    contact_submissions: 'Messages de contact',
  };
  return names[slug] || slug.replace(/_/g, ' ');
}

function formatExtensionName(slug: string): string {
  const names: Record<string, string> = {
    'github-sync': 'GitHub Sync',
    'blog-engine': 'Blog',
    'contact-form': 'Formulaire de contact',
  };
  return names[slug] || slug;
}

function formatSyncTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR');
}

export default CollectionSelector;
