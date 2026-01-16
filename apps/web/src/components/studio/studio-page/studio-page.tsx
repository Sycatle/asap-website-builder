"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { 
  useElementsQuery,
  usePagesQuery,
  useHomepage,
} from "@/lib/query"
import type { WebsiteElement, CreateElementRequest, UpdateElementRequest } from "@/lib/types"
import { StudioDataProvider } from "../data-binding"
import { elementsAPI, websitesAPI } from "@/lib/api"
import { toast } from "sonner"
import { useHistory } from "@/hooks/use-history"

import type { DevicePreview, PreviewTheme, StudioPageProps } from "./types"
import { SimplePreviewCanvas } from "./components/simple-preview-canvas"
import { LoadingState, NoWebsiteState } from "./components/studio-states"
import { StudioLayout } from "./studio-layout"
import { ElementsSidebar } from "../elements-sidebar/elements-sidebar"
import { PropertiesPanel } from "../properties-panel/properties-panel"
import { StudioToolbar } from "../studio-toolbar"
import { CommandPalette } from "../command-palette"

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
  const { resolvedTheme } = useTheme()
  
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
    state: _historyElements,
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

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

  const handleToggleVisibility = useCallback(async (elementId: string, visible: boolean) => {
    if (!website?.id) return
    await elementsAPI.update(website.id, elementId, { visible })
    await refetch()
    toast.success(visible ? t("Element visible") : t("Element hidden"))
  }, [website?.id, refetch, t])

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
      toast.success(t("Undone"))
    }
  }, [website?.id, canUndo, undo, refetch, t])

  const handleRedo = useCallback(async () => {
    if (!website?.id || !canRedo) return
    const nextState = redo()
    if (nextState) {
      await refetch()
      toast.success(t("Redone"))
    }
  }, [website?.id, canRedo, redo, refetch, t])

  // Save & Publish
  const handleSave = useCallback(async () => {
    if (!website?.id) return
    setIsSaving(true)
    try {
      // Elements are already auto-saved via property panel
      toast.success(t("Saved successfully"))
    } catch (error) {
      toast.error(t("Save failed"))
    } finally {
      setIsSaving(false)
    }
  }, [website?.id, t])

  const handlePublish = useCallback(async () => {
    if (!website?.id) return
    setIsPublishing(true)
    try {
      await websitesAPI.update(website.id, { status: 'published' })
      toast.success(t("Published successfully"))
    } catch (error) {
      toast.error(t("Publish failed"))
    } finally {
      setIsPublishing(false)
    }
  }, [website?.id, t])

  // Quick Actions (Task 1.3.2)
  const handleDuplicate = useCallback(async () => {
    if (!website?.id || !selectedElementId) return
    const element = elements.find(e => e.id === selectedElementId)
    if (!element) return

    const duplicateData: CreateElementRequest = {
      element_type: element.element_type,
      slug: `${element.slug}-copy-${Date.now()}`,
      title: `${element.title} (Copy)`,
      order: elements.length,
      layout: element.layout,
      settings: element.settings,
      visible: element.visible,
    }

    await elementsAPI.create(website.id, duplicateData)
    await refetch()
    
    toast.success(t("Element duplicated"))
  }, [website?.id, selectedElementId, elements, refetch, t])

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
    toast.success(t("Moved up"))
  }, [selectedElementIndex, elements, handleReorderElements, t])

  const handleMoveDown = useCallback(async () => {
    if (selectedElementIndex < 0 || selectedElementIndex >= elements.length - 1) return
    const newOrder = [...elements]
    const [moved] = newOrder.splice(selectedElementIndex, 1)
    newOrder.splice(selectedElementIndex + 1, 0, moved)
    await handleReorderElements(newOrder.map(e => e.id))
    toast.success(t("Moved down"))
  }, [selectedElementIndex, elements, handleReorderElements, t])

  // Actions by ID (for preview quick actions)
  const handleDuplicateById = useCallback(async (elementId: string) => {
    if (!website?.id) return
    const element = elements.find(e => e.id === elementId)
    if (!element) return

    const duplicateData: CreateElementRequest = {
      element_type: element.element_type,
      slug: `${element.slug}-copy-${Date.now()}`,
      title: `${element.title} (Copy)`,
      order: elements.length,
      layout: element.layout,
      settings: element.settings,
      visible: element.visible,
    }

    await elementsAPI.create(website.id, duplicateData)
    await refetch()
    toast.success(t("Element duplicated"))
  }, [website?.id, elements, refetch, t])

  const handleDeleteById = useCallback(async (elementId: string) => {
    if (!website?.id) return
    await handleDeleteElement(elementId)
  }, [website?.id, handleDeleteElement])

  const handleMoveUpById = useCallback(async (elementId: string) => {
    const index = elements.findIndex(e => e.id === elementId)
    if (index <= 0) return
    const newOrder = [...elements]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(index - 1, 0, moved)
    await handleReorderElements(newOrder.map(e => e.id))
    toast.success(t("Moved up"))
  }, [elements, handleReorderElements, t])

  const handleMoveDownById = useCallback(async (elementId: string) => {
    const index = elements.findIndex(e => e.id === elementId)
    if (index < 0 || index >= elements.length - 1) return
    const newOrder = [...elements]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(index + 1, 0, moved)
    await handleReorderElements(newOrder.map(e => e.id))
    toast.success(t("Moved down"))
  }, [elements, handleReorderElements, t])

  // Keyboard Shortcuts (Task 1.3.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is in an input/textarea
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable
      
      // Escape: Deselect element
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedElementId(null)
        return
      }
      
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
      // Delete/Backspace: Delete selected element (only if not in input)
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && !isInput) {
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
      // Ctrl+H: Toggle visibility (if element selected)
      else if (e.ctrlKey && e.key === 'h' && selectedElementId) {
        e.preventDefault()
        const element = elements.find(el => el.id === selectedElementId)
        if (element) {
          handleToggleVisibility(selectedElementId, !element.visible)
        }
      }
      // Ctrl+K or Cmd+K: Open command palette
      else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleSave, handleDuplicate, handleDeleteSelected, handleMoveUp, handleMoveDown, selectedElementId, elements, handleToggleVisibility])

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
              appTheme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              setDevicePreview={setDevicePreview}
              setPreviewTheme={setPreviewTheme}
              selectedElementId={selectedElementId}
              onElementClick={handleElementClick}
              onElementDuplicate={handleDuplicateById}
              onElementDelete={handleDeleteById}
              onElementMoveUp={handleMoveUpById}
              onElementMoveDown={handleMoveDownById}
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
          showProperties={!!selectedElement}
        />
      </div>

      {/* Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        selectedElement={selectedElement}
        onAddElement={(type) => handleAddElement({
          element_type: type,
          slug: `${type}-${Date.now()}`,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          order: elements.length,
          layout: 'default',
        })}
        onDeleteElement={handleDeleteSelected}
        onDuplicateElement={handleDuplicate}
        onToggleVisibility={() => {
          if (selectedElement) {
            handleToggleVisibility(selectedElement.id, !selectedElement.visible)
          }
        }}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onPublish={handlePublish}
        onDeviceChange={setDevicePreview}
        onThemeChange={setPreviewTheme}
        pages={pages}
        onPageSelect={setSelectedPageId}
        websiteSlug={website.slug}
      />
    </StudioDataProvider>
  )
}

export default StudioPage
