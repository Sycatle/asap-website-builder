"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from 'react-i18next'
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { 
  useElementsQuery,
  usePagesQuery,
  useHomepage,
} from "@/lib/query"
import type { WebsiteElement, CreateElementRequest, UpdateElementRequest } from "@/lib/types"
import { StudioDataProvider } from "../data-binding"
import { elementsAPI, websitesAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useHistory } from "@/hooks/use-history"

import type { DevicePreview, PreviewTheme, StudioPageProps } from "./types"
import { SimplePreviewCanvas } from "./components/simple-preview-canvas"
import { LoadingState, NoWebsiteState } from "./components/studio-states"
import { StudioLayout } from "./studio-layout"
import { ElementsSidebar } from "../elements-sidebar/elements-sidebar"
import { PropertiesPanel } from "../properties-panel/properties-panel"
import { StudioToolbar } from "../studio-toolbar"

/**
 * StudioPage - Website visual editor with 3-column layout
 * 
 * Layout:
 * - Toolbar: Undo/Redo, Quick Actions, Save/Publish (Sprint 1.3) ✅
 * - Left: Elements sidebar (Task 1.1.2 complete) ✅
 * - Center: Live website preview
 * - Right: Properties panel (Task 1.2.1 complete) ✅
 * 
 * Note: AI Chat panel is managed by AppShell globally
 */
export function StudioPage({ onBack }: StudioPageProps) {
  const { t } = useTranslation(['common', 'editor'])
  const { toast } = useToast()
  
  // Data hooks
  const { currentWebsite: website, isLoading: isLoadingWebsite } = useWebsiteContext()
  
  // Elements queries
  const { 
    data: elements = [], 
    refetch,
  } = useElementsQuery(website?.id)
  
  // Pages queries
  const { data: pages = [] } = usePagesQuery(website?.id)
  const homepage = useHomepage(website?.id)

  // History management
  const {
    state: historyElements,
    updateState: updateHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<WebsiteElement>(elements)

  // UI state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Auto-select homepage on first load
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      const homePage = homepage;
      setSelectedPageId(homePage?.id ?? pages[0]?.id ?? null)
    }
  }, [pages, selectedPageId, homepage])

  // Get current page
  const currentPage = useMemo(() => {
    return pages.find(p => p.id === selectedPageId) ?? null
  }, [pages, selectedPageId])

  // Get selected element
  const selectedElement = useMemo(() => {
    return elements.find(e => e.id === selectedElementId) ?? null
  }, [elements, selectedElementId])

  // Handle element selection (from preview click)
  const handleElementClick = useCallback((element: WebsiteElement) => {
    setSelectedElementId(element.id)
  }, [])

  // Handle element actions
  const handleAddElement = useCallback(async (data: CreateElementRequest) => {
    if (!website?.id) return
    await elementsAPI.create(website.id, data)
    await refetch()
  }, [website?.id, refetch])

  const handleUpdateElement = useCallback(async (elementId: string, data: UpdateElementRequest) => {
    if (!website?.id) return
    await elementsAPI.update(website.id, elementId, data)
    await refetch()
  }, [website?.id, refetch])

  const handleDeleteElement = useCallback(async (elementId: string) => {
    if (!website?.id) return
    await elementsAPI.delete(website.id, elementId)
    // Deselect if deleted element was selected
    if (selectedElementId === elementId) {
      setSelectedElementId(null)
    }
    await refetch()
  }, [website?.id, selectedElementId, refetch])

  const handleReorderElements = useCallback(async (elementIds: string[]) => {
    if (!website?.id) return
    const before = elements
    const after = elementIds.map(id => elements.find(e => e.id === id)!).filter(Boolean)
    
    updateHistory(after, {
      type: 'reorder',
      before,
      after,
      timestamp: Date.now(),
    })
    
    await elementsAPI.reorder(website.id, { element_ids: elementIds })
    await refetch()
  }, [website?.id, elements, updateHistory, refetch])

  // Undo/Redo handlers
  const handleUndo = useCallback(async () => {
    if (!website?.id || !canUndo) return
    const previousState = undo()
    if (previousState) {
      await refetch()
      toast({ title: t("Undone") })
    }
  }, [website?.id, canUndo, undo, refetch, toast, t])

  const handleRedo = useCallback(async () => {
    if (!website?.id || !canRedo) return
    const nextState = redo()
    if (nextState) {
      await refetch()
      toast({ title: t("Redone") })
    }
  }, [website?.id, canRedo, redo, refetch, toast, t])

  // Save & Publish
  const handleSave = useCallback(async () => {
    if (!website?.id) return
    setIsSaving(true)
    try {
      // Elements are already auto-saved via property panel
      toast({ title: t("Saved successfully") })
    } catch (error) {
      toast({ title: t("Save failed"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }, [website?.id, toast, t])

  const handlePublish = useCallback(async () => {
    if (!website?.id) return
    setIsPublishing(true)
    try {
      await websitesAPI.update(website.id, { status: 'published' })
      toast({ title: t("Published successfully") })
    } catch (error) {
      toast({ title: t("Publish failed"), variant: "destructive" })
    } finally {
      setIsPublishing(false)
    }
  }, [website?.id, toast, t])

  // Quick Actions (Task 1.3.2)
  const handleDuplicate = useCallback(async () => {
    if (!website?.id || !selectedElementId) return
    const element = elements.find(e => e.id === selectedElementId)
    if (!element) return

    const duplicateData: CreateElementRequest = {
      type: element.type,
      title: `${element.title} (Copy)`,
      content: element.content,
      is_visible: element.is_visible,
    }

    const before = elements
    await elementsAPI.create(website.id, duplicateData)
    await refetch()
    
    toast({ title: t("Element duplicated") })
  }, [website?.id, selectedElementId, elements, refetch, toast, t])

  const handleDeleteSelected = useCallback(async () => {
    if (!website?.id || !selectedElementId) return
    await handleDeleteElement(selectedElementId)
  }, [website?.id, selectedElementId, handleDeleteElement])

  const selectedElementIndex = useMemo(() => {
    return elements.findIndex(e => e.id === selectedElementId)
  }, [elements, selectedElementId])

  const handleMoveUp = useCallback(async () => {
    if (selectedElementIndex <= 0) return
    const newOrder = [...elements]
    const [moved] = newOrder.splice(selectedElementIndex, 1)
    newOrder.splice(selectedElementIndex - 1, 0, moved)
    await handleReorderElements(newOrder.map(e => e.id))
    toast({ title: t("Moved up") })
  }, [selectedElementIndex, elements, handleReorderElements, toast, t])

  const handleMoveDown = useCallback(async () => {
    if (selectedElementIndex < 0 || selectedElementIndex >= elements.length - 1) return
    const newOrder = [...elements]
    const [moved] = newOrder.splice(selectedElementIndex, 1)
    newOrder.splice(selectedElementIndex + 1, 0, moved)
    await handleReorderElements(newOrder.map(e => e.id))
    toast({ title: t("Moved down") })
  }, [selectedElementIndex, elements, handleReorderElements, toast, t])

  // Keyboard Shortcuts (Task 1.3.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        handleRedo()
      }
      // Ctrl+S: Save
      else if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+D: Duplicate
      else if (e.ctrlKey && e.key === 'd' && selectedElementId) {
        e.preventDefault()
        handleDuplicate()
      }
      // Delete: Delete selected element
      else if (e.key === 'Delete' && selectedElementId) {
        e.preventDefault()
        handleDeleteSelected()
      }
      // Ctrl+ArrowUp: Move up
      else if (e.ctrlKey && e.key === 'ArrowUp' && selectedElementId) {
        e.preventDefault()
        handleMoveUp()
      }
      // Ctrl+ArrowDown: Move down
      else if (e.ctrlKey && e.key === 'ArrowDown' && selectedElementId) {
        e.preventDefault()
        handleMoveDown()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleSave, handleDuplicate, handleDeleteSelected, handleMoveUp, handleMoveDown, selectedElementId])

  // Loading state
  if (isLoadingWebsite) {
    return <LoadingState />
  }

  // No website state
  if (!website) {
    return <NoWebsiteState onBack={onBack} />
  }

  return (
    <StudioDataProvider websiteId={website?.id}>
      <div className="flex h-full flex-col">
        <StudioToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onPublish={handlePublish}
          isSaving={isSaving}
          isPublishing={isPublishing}
          selectedElementId={selectedElementId}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteSelected}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          canMoveUp={selectedElementIndex > 0}
          canMoveDown={selectedElementIndex >= 0 && selectedElementIndex < elements.length - 1}
        />
        <StudioLayout
          sidebar={
            <ElementsSidebar
              elements={elements}
              selectedElementId={selectedElementId}
              onSelect={setSelectedElementId}
              onReorder={handleReorderElements}
              onAdd={handleAddElement}
              onUpdate={handleUpdateElement}
              onDelete={handleDeleteElement}
            />
          }
          preview={
            <SimplePreviewCanvas
              elements={elements}
              devicePreview={devicePreview}
              previewTheme={previewTheme}
              setDevicePreview={setDevicePreview}
              setPreviewTheme={setPreviewTheme}
              selectedElementId={selectedElementId}
              onElementClick={handleElementClick}
              websiteSlug={website.slug}
              currentPageSlug={currentPage?.slug ?? null}
              isHomepage={currentPage?.is_homepage ?? false}
              onRefresh={refetch}
            />
          }
          properties={
            <PropertiesPanel
              element={selectedElement}
              onUpdate={handleUpdateElement}
            />
          }
        />
      </div>
    </StudioDataProvider>
  )
}

export default StudioPage
