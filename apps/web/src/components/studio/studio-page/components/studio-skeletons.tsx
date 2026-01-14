"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the elements panel in the left sidebar
 */
export function ElementsPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Element list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg border"
          >
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for the properties panel in the right sidebar
 */
export function PropertiesPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 pb-2 border-b">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Property groups */}
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-3 border rounded-lg p-3">
          {/* Group header */}
          <Skeleton className="h-5 w-24" />
          
          {/* Properties */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, propIndex) => (
              <div key={propIndex} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for the preview frame
 */
export function PreviewFrameSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a website section in the elements panel
 */
export function SectionItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border animate-pulse">
      <Skeleton className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-5 shrink-0" />
    </div>
  );
}

/**
 * Full-page studio loading skeleton with all panels
 */
export function StudioLoadingSkeleton() {
  return (
    <div className="h-full flex">
      {/* Left Panel */}
      <div className="w-64 border-r shrink-0">
        <ElementsPanelSkeleton />
      </div>
      
      {/* Center Preview */}
      <div className="flex-1 p-4">
        <PreviewFrameSkeleton />
      </div>
      
      {/* Right Panel */}
      <div className="w-80 border-l shrink-0">
        <PropertiesPanelSkeleton />
      </div>
    </div>
  );
}

export default {
  ElementsPanelSkeleton,
  PropertiesPanelSkeleton,
  PreviewFrameSkeleton,
  SectionItemSkeleton,
  StudioLoadingSkeleton,
};
