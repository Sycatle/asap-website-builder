"use client"

import React, { useState, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Layers,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getElementIcon, getElementLabel } from "@/lib/constants/elements"
import type { WebsiteElement } from "@/lib/types"

export interface LayerPanelProps {
  elements: WebsiteElement[]
  selectedElementId: string | null
  onSelect: (elementId: string) => void
  onReorder: (elementIds: string[]) => Promise<void>
  onToggleVisibility: (elementId: string, visible: boolean) => Promise<void>
  onDuplicate?: (elementId: string) => Promise<void>
  onDelete?: (elementId: string) => Promise<void>
  className?: string
}

interface LayerItemProps {
  element: WebsiteElement
  isSelected: boolean
  isLocked: boolean
  depth?: number
  onSelect: (elementId: string) => void
  onToggleVisibility: (elementId: string, visible: boolean) => void
  onToggleLock: (elementId: string, locked: boolean) => void
  onDuplicate?: (elementId: string) => void
  onDelete?: (elementId: string) => void
}

/**
 * Individual layer item with drag-and-drop support
 */
function LayerItem({
  element,
  isSelected,
  isLocked,
  depth = 0,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
}: LayerItemProps) {
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

  const label = getElementLabel(element.element_type)
  const isVisible = element.visible !== false
  
  // Get icon component reference (not creating during render)
  const IconComponent = getElementIcon(element.element_type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 py-1 px-2 rounded-md text-sm",
        "transition-colors duration-150",
        isSelected && "bg-primary/10 ring-1 ring-primary/30",
        !isSelected && "hover:bg-accent/50",
        isDragging && "opacity-50 shadow-lg",
        !isVisible && "opacity-60",
        depth > 0 && `ml-${depth * 4}`
      )}
    >
      {/* Drag handle */}
      <button
        className={cn(
          "cursor-grab touch-none p-0.5 text-muted-foreground/50",
          "hover:text-muted-foreground active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Element icon and name */}
      <button
        className="flex flex-1 items-center gap-2 min-w-0"
        onClick={() => onSelect(element.id)}
      >
        {/* Render icon directly using createElement to avoid lint error */}
        {React.createElement(IconComponent, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })}
        <span className="truncate font-medium">
          {element.title || label}
        </span>
      </button>

      {/* Quick actions - always visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Visibility toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(element.id, !isVisible)
              }}
            >
              {isVisible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isVisible ? "Masquer" : "Afficher"}
          </TooltipContent>
        </Tooltip>

        {/* Lock toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock(element.id, !isLocked)
              }}
            >
              {isLocked ? (
                <Lock className="h-3 w-3 text-orange-500" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLocked ? "Déverrouiller" : "Verrouiller"}
          </TooltipContent>
        </Tooltip>

        {/* More actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(element.id)}>
                Dupliquer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(element.id)}
                className="text-destructive focus:text-destructive"
              >
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * LayerPanel - Visual layer tree for managing element hierarchy
 * 
 * Features:
 * - Drag & drop reordering
 * - Visibility toggle
 * - Lock/unlock elements
 * - Quick actions menu
 */
export function LayerPanel({
  elements,
  selectedElementId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  className,
}: LayerPanelProps) {
  // Track locked elements locally (could be persisted to element settings)
  const [lockedElements, setLockedElements] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id)
      const newIndex = elements.findIndex((el) => el.id === over.id)

      const reordered = arrayMove(elements, oldIndex, newIndex)
      await onReorder(reordered.map((el) => el.id))
    }
  }, [elements, onReorder])

  const handleToggleLock = useCallback((elementId: string, locked: boolean) => {
    setLockedElements(prev => {
      const next = new Set(prev)
      if (locked) {
        next.add(elementId)
      } else {
        next.delete(elementId)
      }
      return next
    })
  }, [])

  // Sort elements by order
  const sortedElements = [...elements].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  if (elements.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Layers className="h-4 w-4" />
          <span className="font-medium text-sm">Calques</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Aucun élément
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="font-medium text-sm">Calques</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {elements.length}
        </span>
      </div>

      {/* Layer list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedElements.map((el) => el.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedElements.map((element) => (
                <LayerItem
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  isLocked={lockedElements.has(element.id)}
                  onSelect={onSelect}
                  onToggleVisibility={(id, visible) => onToggleVisibility(id, visible)}
                  onToggleLock={handleToggleLock}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      {/* Footer with keyboard hints */}
      <div className="px-3 py-2 border-t">
        <p className="text-[10px] text-muted-foreground">
          Glisser pour réorganiser • Clic pour sélectionner
        </p>
      </div>
    </div>
  )
}

export default LayerPanel
