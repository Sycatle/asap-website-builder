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
import { elementsAPI } from "@/lib/api"

import type { DevicePreview, PreviewTheme, StudioPageProps } from "./types"
import { SimplePreviewCanvas } from "./components/simple-preview-canvas"
import { LoadingState, NoWebsiteState } from "./components/studio-states"
import { StudioLayout } from "./studio-layout"
import { ElementsSidebar } from "../elements-sidebar/elements-sidebar"
import { PropertiesPanel } from "../properties-panel/properties-panel"

/**
 * StudioPage - Website visual editor with 3-column layout
 * 
 * Layout:
 * - Left: Elements sidebar (Task 1.1.2 complete) ✅
 * - Center: Live website preview
 * - Right: Properties panel (Task 1.2.1 complete) ✅
 * 
 * Note: AI Chat panel is managed by AppShell globally
 */
export function StudioPage({ onBack }: StudioPageProps) {
  const { t } = useTranslation(['common', 'editor'])
  
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

  // UI state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light')

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
    await elementsAPI.reorder(website.id, { element_ids: elementIds })
    await refetch()
  }, [website?.id, refetch])

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
    </StudioDataProvider>
  )
}

export default StudioPage
