"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ========================================
// Basic Building Blocks
// ========================================

export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  )
}

export function SkeletonTitle({ className }: { className?: string }) {
  return <Skeleton className={cn("h-8 w-48", className)} />
}

export function SkeletonSubtitle({ className }: { className?: string }) {
  return <Skeleton className={cn("h-5 w-64", className)} />
}

export function SkeletonAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }
  return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
}

export function SkeletonButton({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    md: "h-10 w-24",
    lg: "h-12 w-32",
  }
  return <Skeleton className={cn("rounded-md", sizeClasses[size], className)} />
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton className={cn("h-5 w-16 rounded-full", className)} />
}

export function SkeletonIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }
  return <Skeleton className={cn("rounded", sizeClasses[size], className)} />
}

// ========================================
// Composite Components
// ========================================

export function SkeletonCard({ className, hasImage = false }: { className?: string; hasImage?: boolean }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {hasImage && <Skeleton className="h-40 w-full rounded-none" />}
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  )
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function SkeletonModuleCard({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </Card>
  )
}

// ========================================
// List & Table Skeletons
// ========================================

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  )
}

export function SkeletonTableRow({ columns = 5, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-8" : i === 1 ? "flex-1" : "w-24"
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 5, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i === 0 ? "w-8" : i === 1 ? "flex-1" : "w-24"
            )}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  )
}

// ========================================
// User & Navigation Skeletons
// ========================================

export function SkeletonUser({ showSubtitle = true, className }: { showSubtitle?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SkeletonAvatar />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        {showSubtitle && <Skeleton className="h-3 w-32" />}
      </div>
    </div>
  )
}

export function SkeletonNavItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2", className)}>
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function SkeletonSidebarUser({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-2", className)}>
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="grid flex-1 gap-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-4" />
    </div>
  )
}

// ========================================
// Form Skeletons
// ========================================

export function SkeletonInput({ className, hasLabel = true }: { className?: string; hasLabel?: boolean }) {
  return (
    <div className={cn("space-y-2", className)}>
      {hasLabel && <Skeleton className="h-4 w-20" />}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

export function SkeletonTextarea({ className, hasLabel = true }: { className?: string; hasLabel?: boolean }) {
  return (
    <div className={cn("space-y-2", className)}>
      {hasLabel && <Skeleton className="h-4 w-20" />}
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  )
}

export function SkeletonSwitch({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  )
}

// ========================================
// Media Skeletons
// ========================================

export function SkeletonImage({ className, aspectRatio = "square" }: { className?: string; aspectRatio?: "square" | "video" | "portrait" }) {
  const ratioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  }
  return <Skeleton className={cn("w-full rounded-lg", ratioClasses[aspectRatio], className)} />
}

export function SkeletonFileCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border overflow-hidden", className)}>
      <Skeleton className="aspect-square w-full" />
      <div className="p-2 space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// ========================================
// Chart & Analytics Skeletons
// ========================================

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function SkeletonRadialChart({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      <Skeleton className="h-32 w-32 rounded-full" />
      <Skeleton className="h-4 w-24 mt-4" />
      <Skeleton className="h-3 w-16 mt-2" />
    </div>
  )
}

// ========================================
// Page-Level Skeletons
// ========================================

export function SkeletonPageHeader({ className, hasActions = false }: { className?: string; hasActions?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-64" />
      </div>
      {hasActions && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  )
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <SkeletonPageHeader hasActions />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <SkeletonChart className="col-span-4" />
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function SkeletonModulesPage({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonModuleCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonFilesPage({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonFileCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonSettingsPage({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8 max-w-4xl", className)}>
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonInput />
              <SkeletonInput />
            </div>
            <SkeletonSwitch />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ========================================
// Settings Modal Skeletons
// ========================================

export function SkeletonSettingsAccount({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <SkeletonInput />
        <SkeletonInput />
      </div>
    </div>
  )
}

export function SkeletonSettingsCloud({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonFileCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonSettingsPlan({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
