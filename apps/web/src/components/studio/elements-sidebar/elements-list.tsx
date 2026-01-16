"use client"

import React from "react"
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ElementItem } from "./element-item"
import type { WebsiteElement } from "@/lib/types"

export interface ElementsListProps {
  elements: WebsiteElement[]
  selectedElementId: string | null
  onSelect: (elementId: string) => void
  onReorder: (reorderedElements: WebsiteElement[]) => void
  onDuplicate: (elementId: string) => void
  onDelete: (elementId: string) => void
  onToggleVisible: (elementId: string, visible: boolean) => void
  onMoveUp?: (elementId: string) => void
  onMoveDown?: (elementId: string) => void
}

export function ElementsList({
  elements,
  selectedElementId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
}: ElementsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id)
      const newIndex = elements.findIndex((el) => el.id === over.id)

      const reordered = arrayMove(elements, oldIndex, newIndex)
      onReorder(reordered)
    }
  }

  if (elements.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>No elements yet</p>
          <p className="mt-1 text-xs">Add your first element below</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={elements.map((el) => el.id)}
            strategy={verticalListSortingStrategy}
          >
            {elements.map((element, index) => (
              <ElementItem
                key={element.id}
                element={element}
                isSelected={element.id === selectedElementId}
                isFirst={index === 0}
                isLast={index === elements.length - 1}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleVisible={onToggleVisible}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </ScrollArea>
  )
}
