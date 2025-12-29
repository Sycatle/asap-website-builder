"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { 
  useElementsQuery,
  useCreateElementMutation,
  useUpdateElementMutation,
  useReorderElementsMutation,
  usePagesQuery,
  useHomepage,
} from "@/lib/query"
import type { WebsiteElement, UpdateElementRequest } from "@/lib/types"
import { toast } from "sonner"
import { AddElementModal } from "@/components/elements/AddElementModal"
import { cn } from "@/lib/utils"

import type { DevicePreview, StudioPageProps } from "./types"
import { useIsMobile } from "./hooks"
import { StudioHeader } from "./components/studio-header"
import { ElementList } from "./components/element-list"
import { PropertyEditorPanel } from "./components/property-editor-panel"
import { PreviewCanvas } from "./components/preview-canvas"
import { MobileToolbar } from "./components/mobile-toolbar"
import { MobileSheets } from "./components/mobile-sheets"
import { LoadingState, NoWebsiteState } from "./components/studio-states"

/**
 * StudioPage - Visual website editor with live preview
 * 
 * Features:
 * - Three-panel layout (elements, preview, properties)
 * - Responsive design with mobile sheets
 * - Drag and drop element reordering
 * - Device preview (desktop, tablet, mobile)
 * - Real-time element editing
 */
export function StudioPage({ onBack }: StudioPageProps) {
  const isMobile = useIsMobile()
  
  // Data hooks
  const { currentWebsite: website, isLoading: isLoadingWebsite } = useWebsiteContext()
  
  // Elements queries and mutations
  const { 
    data: elements = [], 
    isLoading: isLoadingElements, 
    refetch,
  } = useElementsQuery(website?.id)
  
  const createElementMutation = useCreateElementMutation()
  const updateElementMutation = useUpdateElementMutation()
  const reorderElementsMutation = useReorderElementsMutation()
  
  // Pages queries
  const { 
    data: pages = [], 
    isLoading: isLoadingPages,
  } = usePagesQuery(website?.id)
  
  const homepage = useHomepage(website?.id)

  // Wrapper functions for mutations (to maintain API compatibility)
  const updateElement = useCallback(async (elementId: string, data: UpdateElementRequest) => {
    if (!website?.id) throw new Error('No website selected')
    return updateElementMutation.mutateAsync({ websiteId: website.id, elementId, data })
  }, [website?.id, updateElementMutation])
  
  const createElement = useCallback(async (data: Parameters<typeof createElementMutation.mutateAsync>[0]['data']) => {
    if (!website?.id) throw new Error('No website selected')
    return createElementMutation.mutateAsync({ websiteId: website.id, data })
  }, [website?.id, createElementMutation])
  
  const reorderElements = useCallback(async (elementIds: string[]) => {
    if (!website?.id) throw new Error('No website selected')
    return reorderElementsMutation.mutateAsync({ websiteId: website.id, elementIds })
  }, [website?.id, reorderElementsMutation])
  
  const isUpdating = updateElementMutation.isPending || createElementMutation.isPending
  
  const getHomepage = useCallback(() => homepage, [homepage])

  // UI state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-select homepage on first load
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      const homePage = getHomepage()
      setSelectedPageId(homePage?.id ?? pages[0]?.id ?? null)
    }
  }, [pages, selectedPageId, getHomepage])

  // Auto-set mobile preview on mobile devices
  useEffect(() => {
    if (isMobile) {
      setDevicePreview('mobile')
      setLeftPanelOpen(false)
      setRightPanelOpen(false)
    } else {
      // Open both panels on desktop
      setLeftPanelOpen(true)
      setRightPanelOpen(true)
    }
  }, [isMobile])

  // Get current page
  const currentPage = useMemo(() => {
    return pages.find(p => p.id === selectedPageId) ?? null
  }, [pages, selectedPageId])

  // Get selected element
  const selectedElement = elements.find(e => e.id === selectedElementId) || null

  // Open right panel when element is selected (only on mobile)
  useEffect(() => {
    if (selectedElementId && isMobile && !rightPanelOpen) {
      setRightPanelOpen(true)
    }
  }, [selectedElementId, isMobile, rightPanelOpen])

  // Handle element selection
  const handleElementClick = useCallback((element: WebsiteElement) => {
    setSelectedElementId(element.id)
    if (isMobile) {
      setLeftPanelOpen(false)
      setRightPanelOpen(true)
    }
  }, [isMobile])

  // Handle element update
  const handleUpdateElement = useCallback(async (elementId: string, data: UpdateElementRequest): Promise<WebsiteElement> => {
    return updateElement(elementId, data) as Promise<WebsiteElement>
  }, [updateElement])

  // Handle add element
  const handleAddElement = useCallback(async (data: import("@/lib/api").CreateElementRequest) => {
    try {
      await createElement(data)
      setShowAddModal(false)
      toast.success('Élément ajouté')
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de l\'élément')
      throw error
    }
  }, [createElement])

  // Handle drag and drop (desktop only)
  const handleDragStart = useCallback((e: React.DragEvent, elementId: string) => {
    if (isMobile) return
    e.dataTransfer.setData('elementId', elementId)
    e.dataTransfer.effectAllowed = 'move'
  }, [isMobile])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (isMobile) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [isMobile])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetIndex: number) => {
    if (isMobile) return
    e.preventDefault()
    setDragOverIndex(null)
    
    const elementId = e.dataTransfer.getData('elementId')
    const sourceIndex = elements.findIndex(el => el.id === elementId)
    
    if (sourceIndex === -1 || sourceIndex === targetIndex) return
    
    const newOrder = [...elements]
    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    
    try {
      await reorderElements(newOrder.map(el => el.id))
      toast.success('Éléments réorganisés')
    } catch {
      toast.error('Erreur lors de la réorganisation')
    }
  }, [isMobile, elements, reorderElements])

  // Loading state
  if (isLoadingWebsite) {
    return <LoadingState />
  }

  // No website state
  if (!website) {
    return <NoWebsiteState onBack={onBack} />
  }

  // Props for child components
  const elementListProps = {
    elements,
    currentPage,
    selectedElementId,
    dragOverIndex,
    isLoading: isLoadingElements,
    isMobile,
    onElementClick: handleElementClick,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onAddClick: () => setShowAddModal(true),
  }

  const propertyEditorProps = {
    selectedElement,
    onUpdate: handleUpdateElement,
    isUpdating,
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <StudioHeader
        website={website}
        currentPage={currentPage}
        pages={pages}
        selectedPageId={selectedPageId}
        setSelectedPageId={setSelectedPageId}
        devicePreview={devicePreview}
        setDevicePreview={setDevicePreview}
        isLoadingPages={isLoadingPages}
        isLoadingElements={isLoadingElements}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        refetch={refetch}
        onBack={onBack}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop left panel */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-r bg-background transition-all duration-200 relative",
            leftPanelOpen ? "w-72" : "w-0 border-r-0 overflow-hidden"
          )}
          aria-label="Panneau des éléments"
          aria-hidden={!leftPanelOpen}
        >
          {leftPanelOpen && <ElementList {...elementListProps} />}
        </aside>

        {/* Center - Preview */}
        <PreviewCanvas
          elements={elements}
          devicePreview={devicePreview}
          selectedElementId={selectedElementId}
          isMobile={isMobile}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          setRightPanelOpen={setRightPanelOpen}
          onElementClick={handleElementClick}
          onAddClick={() => setShowAddModal(true)}
        />

        {/* Desktop right panel */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-l bg-background transition-all duration-200 relative",
            rightPanelOpen ? "w-80" : "w-0 border-l-0 overflow-hidden"
          )}
          aria-label="Panneau des propriétés"
          aria-hidden={!rightPanelOpen}
        >
          {rightPanelOpen && <PropertyEditorPanel {...propertyEditorProps} />}
        </aside>
      </div>

      {/* Mobile bottom toolbar */}
      <MobileToolbar
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        selectedElement={selectedElement}
        setLeftPanelOpen={setLeftPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        onAddClick={() => setShowAddModal(true)}
      />

      {/* Mobile Sheets */}
      <MobileSheets
        isMobile={isMobile}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        elementListProps={elementListProps}
        propertyEditorProps={propertyEditorProps}
      />

      {/* Add Element Modal */}
      <AddElementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddElement}
        existingElementsCount={elements.length}
      />
    </div>
  )
}

export default StudioPage
