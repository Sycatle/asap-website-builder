"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Link } from '@/components/app-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"

interface PageHeaderAction {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  className?: string
  disabled?: boolean
  /** Priority: 'primary' actions always visible, 'secondary' go to overflow on mobile */
  priority?: 'primary' | 'secondary'
}

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Icon or image to display before title */
  icon?: React.ReactNode
  /** Badge to show next to title */
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
    className?: string
    icon?: React.ReactNode
  }
  /** Back button URL - if not provided, no back button shown */
  backHref?: string
  /** Custom back button label */
  backLabel?: string
  /** Actions to show on the right */
  actions?: PageHeaderAction[]
  /** Additional content to show below title (stats, etc.) */
  children?: React.ReactNode
  /** Compact version for sticky mode - custom render */
  stickyContent?: React.ReactNode
  /** Custom class for the main container */
  className?: string
  /** Whether this is the main/root page (hides back button) */
  isMainPage?: boolean
}

export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  backHref,
  backLabel = 'Retour',
  actions = [],
  children,
  stickyContent,
  className,
  isMainPage = false,
}: PageHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)
  const { state } = useSidebar()

  // Use Intersection Observer to detect when header leaves viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      {
        threshold: 0,
        rootMargin: '-56px 0px 0px 0px', // Account for main app header (h-14 = 56px)
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const showBackButton = !isMainPage && backHref
  
  // Split actions by priority for mobile
  const primaryActions = actions.filter(a => a.priority === 'primary' || actions.length <= 2)
  const secondaryActions = actions.filter(a => a.priority === 'secondary' && actions.length > 2)

  const renderAction = (action: PageHeaderAction, index: number, compact = false) => {
    const buttonSize = compact ? 'sm' : 'default'
    const buttonClassName = cn(
      compact ? 'h-8' : 'h-9',
      action.className
    )

    const ActionButton = (
      <Button
        key={index}
        variant={action.variant || 'default'}
        size={buttonSize}
        className={buttonClassName}
        onClick={action.onClick}
        disabled={action.disabled}
      >
        {action.icon}
        {/* Mobile: icon only for compact, Desktop: always show label */}
        <span className={cn(
          compact ? "hidden sm:inline" : "hidden xs:inline",
          action.icon && (compact ? "ml-1.5" : "ml-2")
        )}>
          {action.label}
        </span>
      </Button>
    )

    if (action.href) {
      return (
        <Link key={index} href={action.href}>
          {ActionButton}
        </Link>
      )
    }

    return ActionButton
  }

  return (
    <>
      {/* Sentinel element - triggers sticky mode when scrolled past */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      {/* Main Header - Normal flow */}
      <div ref={headerRef} className={cn("relative", className)}>
        {/* Back button - Mobile: icon only, Desktop: with label */}
        {showBackButton && (
          <div className="mb-2 sm:mb-3">
            <Link 
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          </div>
        )}

        {/* Header content - Mobile first layout */}
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Icon + Title + Badge */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Icon - Smaller on mobile */}
            {icon && (
              <div className="shrink-0 [&>div]:h-9 [&>div]:w-9 sm:[&>div]:h-10 sm:[&>div]:w-10 [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5">
                {icon}
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              {/* Title row with badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {title}
                </h1>
                {badge && (
                  <Badge 
                    variant={badge.variant || 'secondary'} 
                    className={cn("shrink-0 text-[10px] sm:text-xs h-5 sm:h-6", badge.className)}
                  >
                    {badge.icon}
                    {badge.label}
                  </Badge>
                )}
              </div>
              
              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Primary actions - always visible */}
              {primaryActions.map((action, index) => renderAction(action, index))}
              
              {/* Secondary actions - overflow menu on mobile */}
              {secondaryActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 sm:hidden">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {secondaryActions.map((action, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        asChild={!!action.href}
                      >
                        {action.href ? (
                          <Link href={action.href} className="flex items-center gap-2">
                            {action.icon}
                            {action.label}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2">
                            {action.icon}
                            {action.label}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Secondary actions - visible on desktop */}
              <div className="hidden sm:flex items-center gap-2">
                {secondaryActions.map((action, index) => renderAction(action, index + primaryActions.length))}
              </div>
            </div>
          )}
        </div>

        {/* Additional content */}
        {children && (
          <div className="mt-3 sm:mt-4">
            {children}
          </div>
        )}
      </div>

      {/* Fixed Header - Appears when main header scrolls out */}
    <div 
      className={cn(
        "fixed top-14 sm:top-16 left-0 right-0 z-30 transition-all duration-200",
        state === "expanded" ? "md:left-[var(--sidebar-width)]" : "md:left-[var(--sidebar-width-icon)]",
        isSticky 
        ? "bg-background/[0.90] backdrop-blur-xl border-b shadow-sm translate-y-0 opacity-100" 
        : "bg-transparent -translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="px-3 sm:px-4 md:px-6 h-11 sm:h-12 flex items-center w-full">
        {/* Back button - Always visible if enabled */}
        {showBackButton && (
          <div className="mr-2 sm:mr-3 shrink-0">
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {stickyContent ? (
        <div className="flex-1 min-w-0">{stickyContent}</div>
        ) : (
        /* Default sticky content - Mobile optimized */
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            
            {/* Icon - smaller in sticky */}
            {icon && (
            <div className="shrink-0 [&>div]:h-7 [&>div]:w-7 sm:[&>div]:h-8 sm:[&>div]:w-8 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4">
              {icon}
            </div>
            )}
            
            {/* Title + Badge */}
            <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <p className="text-sm font-semibold truncate">{title}</p>
              {badge && (
                <Badge 
                variant={badge.variant || 'secondary'} 
                className={cn("shrink-0 text-[9px] sm:text-[10px] h-4 sm:h-5 hidden xs:flex", badge.className)}
                >
                {badge.icon}
                <span className="hidden sm:inline">{badge.label}</span>
                </Badge>
              )}
            </div>
            </div>
          </div>

          {/* Sticky actions - compact */}
          {actions.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
            {/* Show only primary action on mobile, more on desktop */}
            {primaryActions.slice(0, 1).map((action, index) => renderAction(action, index, true))}
            <div className="hidden sm:flex items-center gap-1.5">
              {primaryActions.slice(1).map((action, index) => renderAction(action, index + 1, true))}
            </div>
            
            {/* Overflow for secondary on mobile */}
            {(secondaryActions.length > 0 || primaryActions.length > 1) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:hidden">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                {primaryActions.slice(1).map((action, index) => (
                  <DropdownMenuItem
                    key={`primary-${index}`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <span className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                    </span>
                  </DropdownMenuItem>
                ))}
                {secondaryActions.map((action, index) => (
                  <DropdownMenuItem
                    key={`secondary-${index}`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <span className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                    </span>
                  </DropdownMenuItem>
                ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Desktop: show secondary actions */}
            <div className="hidden sm:flex items-center gap-1.5">
              {secondaryActions.map((action, index) => renderAction(action, index + primaryActions.length, true))}
            </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
    </>
  )
}
