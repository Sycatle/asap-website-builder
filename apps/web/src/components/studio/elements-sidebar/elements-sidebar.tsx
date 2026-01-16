"use client"

import React, { useState } from "react"
import { Layers, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ElementsList } from "./elements-list"
import { AddElementModal } from "@/components/elements/add-element-modal"
import type { WebsiteElement, CreateElementRequest, UpdateElementRequest } from "@/lib/types"
import { toast } from "sonner"

export interface ElementsSidebarProps {
  elements: WebsiteElement[]
  selectedElementId: string | null
  onSelect: (elementId: string) => void
  onReorder: (elementIds: string[]) => Promise<void>
  onAdd: (data: CreateElementRequest) => Promise<void>
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<void>
  onDelete: (elementId: string) => Promise<void>
}

export function ElementsSidebar({
  elements,
  selectedElementId,
  onSelect,
  onReorder,
  onAdd,
  onUpdate,
  onDelete,
}: ElementsSidebarProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Handle element reordering (drag & drop)
  const handleReorder = async (reorderedElements: WebsiteElement[]) => {
    const elementIds = reorderedElements.map((el) => el.id)
    try {
      await onReorder(elementIds)
      toast.success("Elements reordered")
    } catch (error) {
      toast.error("Failed to reorder elements")
    }
  }

  // Handle element duplication
  const handleDuplicate = async (elementId: string) => {
    const element = elements.find((el) => el.id === elementId)
    if (!element) return

    try {
      const duplicateData: CreateElementRequest = {
        element_type: element.element_type,
        slug: `${element.slug}-copy`,
        title: `${element.title} (Copy)`,
        order: elements.length,
        layout: element.layout,
        settings: element.settings,
        visible: element.visible,
      }
      await onAdd(duplicateData)
      toast.success("Element duplicated")
    } catch (error) {
      toast.error("Failed to duplicate element")
    }
  }

  // Handle element deletion with confirmation
  const handleDelete = async (elementId: string) => {
    setDeleteConfirm(elementId)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await onDelete(deleteConfirm)
      toast.success("Element deleted")
      setDeleteConfirm(null)
    } catch (error) {
      toast.error("Failed to delete element")
    }
  }

  // Handle visibility toggle
  const handleToggleVisible = async (elementId: string, visible: boolean) => {
    try {
      await onUpdate(elementId, { visible })
      toast.success(visible ? "Element shown" : "Element hidden")
    } catch (error) {
      toast.error("Failed to update element visibility")
    }
  }

  // Handle move up
  const handleMoveUp = async (elementId: string) => {
    const currentIndex = elements.findIndex((el) => el.id === elementId)
    if (currentIndex <= 0) return

    const reorderedElements = [...elements]
    const [movedElement] = reorderedElements.splice(currentIndex, 1)
    reorderedElements.splice(currentIndex - 1, 0, movedElement)
    
    const elementIds = reorderedElements.map((el) => el.id)
    try {
      await onReorder(elementIds)
      toast.success("Élément déplacé vers le haut")
    } catch (error) {
      toast.error("Échec du déplacement")
    }
  }

  // Handle move down
  const handleMoveDown = async (elementId: string) => {
    const currentIndex = elements.findIndex((el) => el.id === elementId)
    if (currentIndex < 0 || currentIndex >= elements.length - 1) return

    const reorderedElements = [...elements]
    const [movedElement] = reorderedElements.splice(currentIndex, 1)
    reorderedElements.splice(currentIndex + 1, 0, movedElement)
    
    const elementIds = reorderedElements.map((el) => el.id)
    try {
      await onReorder(elementIds)
      toast.success("Élément déplacé vers le bas")
    } catch (error) {
      toast.error("Échec du déplacement")
    }
  }

  const elementToDelete = elements.find((el) => el.id === deleteConfirm)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h2 className="font-semibold">Elements</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {elements.length}
        </span>
      </div>

      {/* Elements List */}
      <div className="flex-1 overflow-hidden">
        <ElementsList
          elements={elements}
          selectedElementId={selectedElementId}
          onSelect={onSelect}
          onReorder={handleReorder}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleVisible={handleToggleVisible}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />
      </div>

      {/* Add Button */}
      <div className="border-t p-4">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Element
        </Button>
      </div>

      {/* Add Element Modal */}
      <AddElementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={onAdd}
        existingElementsCount={elements.length}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Element?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{elementToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
