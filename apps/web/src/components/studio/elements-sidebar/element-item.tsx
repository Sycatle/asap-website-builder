"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, Copy, Trash2, ArrowUp, ArrowDown, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { getElementIcon, getElementLabel } from "@/lib/constants/elements"
import type { WebsiteElement } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export interface ElementItemProps {
  element: WebsiteElement
  isSelected: boolean
  isFirst?: boolean
  isLast?: boolean
  onSelect: (elementId: string) => void
  onDuplicate: (elementId: string) => void
  onDelete: (elementId: string) => void
  onToggleVisible: (elementId: string, visible: boolean) => void
  onMoveUp?: (elementId: string) => void
  onMoveDown?: (elementId: string) => void
}

export function ElementItem({
  element,
  isSelected,
  isFirst = false,
  isLast = false,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
}: ElementItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = getElementIcon(element.element_type)
  const label = getElementLabel(element.element_type)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "group relative flex items-center gap-2 rounded-md border bg-background p-2 transition-colors",
            isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
            isDragging && "opacity-50 shadow-lg",
            !isSelected && "hover:bg-accent/50"
          )}
        >
          {/* Drag Handle */}
          <button
            className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Element Info */}
          <button
            className="flex flex-1 items-center gap-2 overflow-hidden text-left"
            onClick={() => onSelect(element.id)}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-sm font-medium">
                {element.title || label}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {label}
              </div>
            </div>
          </button>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onToggleVisible(element.id, !element.visible)}
                >
                  {element.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {element.visible ? "Hide" : "Show"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDuplicate(element.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(element.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </ContextMenuTrigger>

      {/* Context Menu */}
      <ContextMenuContent className="w-56">
        {/* Element info header */}
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
          <div className="flex items-center gap-2">
            <Layers className="h-3 w-3" />
            <span className="font-medium">
              {element.title || label}
            </span>
          </div>
        </div>

        <ContextMenuItem onClick={() => onDuplicate(element.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
          <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem 
          onClick={() => onDelete(element.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
          <ContextMenuShortcut>Suppr</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Layers className="mr-2 h-4 w-4" />
            Réorganiser
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem 
              onClick={() => onMoveUp?.(element.id)}
              disabled={isFirst}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Déplacer vers le haut
              <ContextMenuShortcut>↑</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onMoveDown?.(element.id)}
              disabled={isLast}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Déplacer vers le bas
              <ContextMenuShortcut>↓</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => onToggleVisible(element.id, !element.visible)}>
          {element.visible ? (
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
      </ContextMenuContent>
    </ContextMenu>
  )
}
