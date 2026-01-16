"use client"

import React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
} from "lucide-react"
import type { WebsiteElement } from "@/lib/types"

export interface ElementContextMenuProps {
  children: React.ReactNode
  element: WebsiteElement | null
  elements?: WebsiteElement[]
  onDuplicate?: () => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onToggleVisibility?: () => void
  onSelect?: () => void
  disabled?: boolean
}

/**
 * ElementContextMenu - Context menu for studio elements
 * 
 * Provides quick actions when right-clicking on elements:
 * - Duplicate element
 * - Delete element
 * - Move up/down in order
 * - Toggle visibility
 */
export function ElementContextMenu({
  children,
  element,
  elements = [],
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onSelect,
  disabled = false,
}: ElementContextMenuProps) {
  if (!element || disabled) {
    return <>{children}</>
  }

  // Determine position in list
  const currentIndex = elements.findIndex(e => e.id === element.id)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === elements.length - 1
  const isVisible = element.visible !== false

  const handleAction = (action: (() => void) | undefined) => {
    if (action) {
      // Ensure element is selected first
      onSelect?.()
      // Small delay to ensure selection is processed
      setTimeout(() => action(), 10)
    }
  }

  return (
    <ContextMenu>
      {children}
      <ContextMenuContent className="w-56">
        {/* Element info header */}
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
          <div className="flex items-center gap-2">
            <Layers className="h-3 w-3" />
            <span className="font-medium">
              {element.title || formatElementType(element.element_type)}
            </span>
          </div>
        </div>

        {/* Main actions */}
        {onDuplicate && (
          <ContextMenuItem onClick={() => handleAction(onDuplicate)}>
            <Copy className="mr-2 h-4 w-4" />
            Dupliquer
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {onDelete && (
          <ContextMenuItem 
            onClick={() => handleAction(onDelete)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
            <ContextMenuShortcut>Suppr</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {(onMoveUp || onMoveDown) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Layers className="mr-2 h-4 w-4" />
                Réorganiser
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {onMoveUp && (
                  <ContextMenuItem 
                    onClick={() => handleAction(onMoveUp)}
                    disabled={isFirst}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Déplacer vers le haut
                    <ContextMenuShortcut>↑</ContextMenuShortcut>
                  </ContextMenuItem>
                )}
                {onMoveDown && (
                  <ContextMenuItem 
                    onClick={() => handleAction(onMoveDown)}
                    disabled={isLast}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Déplacer vers le bas
                    <ContextMenuShortcut>↓</ContextMenuShortcut>
                  </ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {onToggleVisibility && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleAction(onToggleVisibility)}>
              {isVisible ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Masquer
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Afficher
                </>
              )}
            </ContextMenuItem>
          </>
        )}

        {/* View element on site */}
        {element.slug && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem asChild>
              <a
                href={`#${element.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir sur le site
              </a>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * Format element type for display
 */
function formatElementType(type: string): string {
  return type
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default ElementContextMenu
