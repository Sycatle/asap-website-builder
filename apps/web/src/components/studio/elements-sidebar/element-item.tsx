"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getElementIcon, getElementLabel } from "@/lib/constants/elements"
import type { WebsiteElement } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ElementItemProps {
  element: WebsiteElement
  isSelected: boolean
  onSelect: (elementId: string) => void
  onDuplicate: (elementId: string) => void
  onDelete: (elementId: string) => void
  onToggleVisible: (elementId: string, visible: boolean) => void
}

export function ElementItem({
  element,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisible,
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
  )
}
