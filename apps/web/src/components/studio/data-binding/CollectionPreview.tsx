/**
 * Collection Preview Component
 * 
 * Shows a preview of collection items in the Studio editor.
 * Useful for debugging and verifying data bindings.
 */

'use client';

import * as React from 'react';
import { 
  Eye, 
  Database, 
  RefreshCw, 
  ChevronRight,
  ExternalLink,
  Star,
  GitFork,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { 
  CollectionItem, 
  CollectionSchema,
  WebsiteCollection,
} from '@asap/shared';

// ============================================
// Types
// ============================================

export interface CollectionPreviewProps {
  /** Collection data */
  collection: WebsiteCollection | null;
  /** Collection schema (for display hints) */
  schema?: CollectionSchema;
  /** Maximum items to show */
  maxItems?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when sync is requested */
  onSync?: () => void;
  /** Whether sync is in progress */
  isSyncing?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Collection Item Preview
// ============================================

interface ItemPreviewProps {
  item: CollectionItem;
  schema?: CollectionSchema;
  expanded?: boolean;
}

function ItemPreview({ item, schema, expanded = false }: ItemPreviewProps) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  
  const displayField = schema?.display_field || 'name';
  const previewFields = schema?.preview_fields || ['description'];
  
  const title = item.data[displayField] as string || item.id;
  const previewData = previewFields
    .map(field => ({ field, value: item.data[field] }))
    .filter(({ value }) => value !== undefined && value !== null);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-3 p-3 text-left rounded-md',
            'hover:bg-accent transition-colors',
            isExpanded && 'bg-accent'
          )}
        >
          <ChevronRight 
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              isExpanded && 'rotate-90'
            )} 
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{title}</div>
            {!isExpanded && previewData.length > 0 && (
              <div className="text-sm text-muted-foreground truncate">
                {previewData[0].value as string}
              </div>
            )}
          </div>
          {item.data.language && (
            <Badge variant="outline" className="shrink-0">
              {item.data.language as string}
            </Badge>
          )}
          {typeof item.data.stars === 'number' && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3 w-3" />
              {item.data.stars}
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-10 pr-3 pb-3 space-y-2">
          {Object.entries(item.data).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <span className="text-muted-foreground shrink-0 w-24">
                {formatFieldName(key)}:
              </span>
              <span className="truncate">
                {formatValue(value)}
              </span>
            </div>
          ))}
          <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t">
            <span>ID: {item.id}</span>
            {item._source_id && (
              <span>• Source: {item._source_id}</span>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// Main Component
// ============================================

export function CollectionPreview({
  collection,
  schema,
  maxItems = 5,
  isLoading = false,
  onSync,
  isSyncing = false,
  className,
}: CollectionPreviewProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucune collection sélectionnée
        </p>
      </div>
    );
  }

  const items = collection.items.slice(0, maxItems);
  const hasMore = collection.items.length > maxItems;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Aperçu</span>
          <Badge variant="secondary" className="text-xs">
            {collection.total_count} éléments
          </Badge>
        </div>
        {onSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn(
              'h-4 w-4 mr-1',
              isSyncing && 'animate-spin'
            )} />
            Sync
          </Button>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-sm text-muted-foreground">
            Cette collection est vide.
          </p>
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="mt-2"
            >
              Synchroniser maintenant
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="divide-y">
            {items.map((item) => (
              <ItemPreview 
                key={item.id} 
                item={item} 
                schema={schema}
              />
            ))}
          </div>
          {hasMore && (
            <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
              +{collection.items.length - maxItems} autres éléments
            </div>
          )}
        </ScrollArea>
      )}

      {/* Sync info */}
      {collection.synced_at && (
        <p className="text-xs text-muted-foreground mt-2">
          Dernière synchronisation: {formatDate(collection.synced_at)}
        </p>
      )}
    </div>
  );
}

// ============================================
// Compact Preview (for sidebar)
// ============================================

export interface CompactPreviewProps {
  items: CollectionItem[];
  schema?: CollectionSchema;
  className?: string;
}

export function CompactPreview({ items, schema, className }: CompactPreviewProps) {
  const displayField = schema?.display_field || 'name';

  return (
    <div className={cn('space-y-1', className)}>
      {items.slice(0, 3).map((item, index) => (
        <div 
          key={item.id}
          className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
        >
          <span className="text-muted-foreground w-4">{index + 1}.</span>
          <span className="truncate flex-1">
            {item.data[displayField] as string || item.id}
          </span>
          {typeof item.data.stars === 'number' && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              {item.data.stars}
            </span>
          )}
        </div>
      ))}
      {items.length > 3 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          +{items.length - 3} autres
        </div>
      )}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default CollectionPreview;
