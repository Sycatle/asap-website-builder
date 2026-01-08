"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from 'react-i18next'
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
import { cn } from "@/lib/utils"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StudioDataProvider } from "../data-binding"

import type { DevicePreview, PreviewTheme, StudioPageProps } from "./types"
import { AIChatPanel } from "./components/ai-chat-panel"
import { SimplePreviewCanvas } from "./components/simple-preview-canvas"
import { LoadingState, NoWebsiteState } from "./components/studio-states"

/**
 * StudioPage - Simplified AI-first website editor
 * 
 * Two-column layout:
 * - Left: AI Chat interface for natural language editing
 * - Right: Live website preview with browser chrome
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
      {/* 
        Use CSS calc to fill the remaining viewport height.
        The header is 56px (h-14) on mobile, 64px (h-16) on desktop.
        We use 56px as base since mobile is more constrained.
      */}
      <div className="h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] bg-background overflow-hidden -mt-[1px]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - AI Chat */}
          <ResizablePanel 
            defaultSize={35} 
            minSize={25} 
            maxSize={50}
            className="bg-background relative"
          >
            <AIChatPanel 
              websiteName={website.title}
              websiteSlug={website.slug}
              onBack={onBack ?? (() => window.history.back())}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Preview */}
          <ResizablePanel defaultSize={65} minSize={40}>
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </StudioDataProvider>
  )
}

export default StudioPage
