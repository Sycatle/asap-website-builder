/**
 * Extension Grid Component
 * 
 * Displays a grid of extension cards with loading and empty states.
 */

import React from 'react';
import { ExtensionCard } from './extension-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import type { ExtensionStoreSummary } from '@/lib/api/store';
import { cn } from '@/lib/utils';

interface ExtensionGridProps {
  extensions: ExtensionStoreSummary[];
  installedSlugs?: Set<string>;
  onSelect?: (slug: string) => void;
  onInstall?: (extension: ExtensionStoreSummary) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
  compact?: boolean;
}

export function ExtensionGrid({
  extensions,
  installedSlugs = new Set(),
  onSelect,
  onInstall,
  isLoading = false,
  emptyMessage = "No extensions found",
  columns = 3,
  compact = false,
}: ExtensionGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", gridCols[columns])}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ExtensionCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (extensions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {extensions.map((extension) => {
        // Mark as installed if in installedSlugs set
        const extWithInstalled = installedSlugs.has(extension.slug)
          ? { ...extension, installed: true }
          : extension;
        
        return (
          <ExtensionCard
            key={extension.slug}
            extension={extWithInstalled}
            onSelect={onSelect}
            onInstall={onInstall ? () => onInstall(extension) : undefined}
            compact={compact}
          />
        );
      })}
    </div>
  );
}

/**
 * Skeleton loader for ExtensionGrid
 */
export function ExtensionGridSkeleton({ 
  count = 6, 
  columns = 3, 
  compact = false 
}: { 
  count?: number; 
  columns?: 2 | 3 | 4; 
  compact?: boolean; 
}) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <ExtensionCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

function ExtensionCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      {!compact && (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </>
      )}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}
