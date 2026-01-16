"use client"

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================
// Common Skeleton Patterns
// ============================================

/**
 * TextSkeleton - For text content
 */
export function TextSkeleton({ 
  width = 'w-full', 
  className 
}: { 
  width?: string
  className?: string 
}) {
  return <Skeleton className={cn("h-4", width, className)} />
}

/**
 * HeadingSkeleton - For titles/headings
 */
export function HeadingSkeleton({ 
  width = 'w-48',
  size = 'md',
  className 
}: { 
  width?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClass = {
    sm: 'h-5',
    md: 'h-6',
    lg: 'h-8',
  }[size]
  
  return <Skeleton className={cn(sizeClass, width, className)} />
}

/**
 * AvatarSkeleton - For user avatars
 */
export function AvatarSkeleton({ 
  size = 'md',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string 
}) {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  }[size]
  
  return <Skeleton className={cn(sizeClass, "rounded-full", className)} />
}

/**
 * ButtonSkeleton - For buttons
 */
export function ButtonSkeleton({ 
  size = 'default',
  width = 'w-24',
  className 
}: { 
  size?: 'sm' | 'default' | 'lg'
  width?: string
  className?: string 
}) {
  const sizeClass = {
    sm: 'h-8',
    default: 'h-10',
    lg: 'h-12',
  }[size]
  
  return <Skeleton className={cn(sizeClass, width, "rounded-md", className)} />
}

/**
 * InputSkeleton - For form inputs
 */
export function InputSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full rounded-md", className)} />
}

/**
 * CardSkeleton - For card content
 */
export function CardSkeleton({ 
  height = 'h-32',
  className 
}: { 
  height?: string
  className?: string 
}) {
  return <Skeleton className={cn(height, "w-full rounded-xl", className)} />
}

/**
 * IconSkeleton - For icons
 */
export function IconSkeleton({ 
  size = 'md',
  rounded = 'rounded-lg',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'rounded' | 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-full'
  className?: string 
}) {
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }[size]
  
  return <Skeleton className={cn(sizeClass, rounded, className)} />
}

// ============================================
// Composite Skeleton Patterns
// ============================================

/**
 * ListItemSkeleton - User/item with avatar, name, description
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AvatarSkeleton size="md" />
      <div className="flex-1 space-y-1.5">
        <TextSkeleton width="w-3/4" />
        <TextSkeleton width="w-1/2" className="h-3" />
      </div>
    </div>
  )
}

/**
 * CardWithHeaderSkeleton - Card with title and content
 */
export function CardWithHeaderSkeleton({ 
  lines = 3,
  className 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-4 p-4 rounded-xl border bg-card", className)}>
      <div className="space-y-2">
        <HeadingSkeleton width="w-32" />
        <TextSkeleton width="w-48" className="h-3" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <TextSkeleton key={i} width={i === lines - 1 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  )
}

/**
 * StatCardSkeleton - For stat cards
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 rounded-xl border bg-card space-y-3", className)}>
      <div className="flex items-center justify-between">
        <IconSkeleton size="sm" />
        <TextSkeleton width="w-12" className="h-3" />
      </div>
      <HeadingSkeleton size="lg" width="w-16" />
      <TextSkeleton width="w-24" className="h-3" />
    </div>
  )
}

/**
 * FormFieldSkeleton - Label + Input
 */
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <TextSkeleton width="w-24" className="h-3" />
      <InputSkeleton />
    </div>
  )
}

/**
 * TableRowSkeleton - For table rows
 */
export function TableRowSkeleton({ 
  columns = 4,
  className 
}: { 
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <TextSkeleton 
          key={i} 
          width={i === 0 ? "w-1/4" : "flex-1"} 
        />
      ))}
    </div>
  )
}

// ============================================
// Page-level Skeleton Patterns
// ============================================

interface PageSkeletonProps {
  /** Show header skeleton */
  header?: boolean
  /** Number of content rows */
  rows?: number
  /** Show sidebar skeleton */
  sidebar?: boolean
  className?: string
}

/**
 * PageSkeleton - Full page loading state
 */
export function PageSkeleton({ 
  header = true, 
  rows = 3,
  sidebar = false,
  className 
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {header && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <HeadingSkeleton size="lg" width="w-48" />
            <TextSkeleton width="w-64" className="h-3" />
          </div>
          <ButtonSkeleton />
        </div>
      )}
      
      <div className={cn("grid gap-6", sidebar && "lg:grid-cols-[1fr,300px]")}>
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <CardWithHeaderSkeleton key={i} />
          ))}
        </div>
        
        {sidebar && (
          <div className="space-y-4">
            <CardSkeleton height="h-48" />
            <CardSkeleton height="h-32" />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * GridSkeleton - Grid of cards
 */
export function GridSkeleton({ 
  items = 6,
  columns = 3,
  className 
}: { 
  items?: number
  columns?: 2 | 3 | 4
  className?: string 
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn(`grid ${colClass} gap-4`, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} height="h-40" />
      ))}
    </div>
  )
}
