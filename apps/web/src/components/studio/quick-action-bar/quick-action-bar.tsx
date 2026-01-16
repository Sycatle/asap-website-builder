"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WebsiteElement } from "@/lib/types"

export interface QuickActionBarProps {
  element: WebsiteElement | null
  isFirst?: boolean
  isLast?: boolean
  onDuplicate?: () => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * QuickActionBar - Floating toolbar that appears near selected elements
 * 
 * Provides quick access to common element actions without going to sidebar.
 * Positioned at the top-right of the selected element.
 */
export function QuickActionBar({
  element,
  isFirst = false,
  isLast = false,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOpenSettings,
  className,
}: QuickActionBarProps) {
  if (!element) return null

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-1 py-0.5",
        "bg-background/95 backdrop-blur-sm",
        "rounded-lg border shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className
      )}
    >
      {/* Drag handle indicator */}
      <div className="px-1 text-muted-foreground/50">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Move up */}
      {onMoveUp && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Déplacer vers le haut</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Move down */}
      {onMoveDown && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Déplacer vers le bas</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Duplicate */}
      {onDuplicate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDuplicate}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Dupliquer</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Settings */}
      {onOpenSettings && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onOpenSettings}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Paramètres</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Delete */}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Supprimer</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export default QuickActionBar
