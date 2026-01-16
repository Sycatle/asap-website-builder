"use client"

import React, { useEffect, useState, useRef } from "react"
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels"
import { cn } from "@/lib/utils"

/**
 * StudioLayout - 3-column resizable layout for the studio editor
 * 
 * Layout Structure:
 * +-------------------+------------------------+-------------------+
 * | Sidebar Elements  |   Preview Canvas       | Properties Panel  |
 * | (250-400px)       |   (flexible)           | (320-500px)       |
 * +-------------------+------------------------+-------------------+
 * 
 * Features:
 * - Resizable panels with min/max constraints
 * - Persists panel sizes to localStorage
 * - Responsive: < 1024px stacks vertically
 * - Keyboard accessible
 */

const STORAGE_KEY = "studio-layout-sizes"
const DEFAULT_SIZES = {
  sidebar: 20,    // 20% of width
  preview: 60,    // 60% of width
  properties: 20, // 20% of width
}

export interface StudioLayoutProps {
  sidebar: React.ReactNode
  preview: React.ReactNode
  properties: React.ReactNode
  showProperties?: boolean
  className?: string
}

export function StudioLayout({
  sidebar,
  preview,
  properties,
  showProperties = true,
  className,
}: StudioLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [sizes, setSizes] = useState<number[]>([
    DEFAULT_SIZES.sidebar,
    DEFAULT_SIZES.preview,
    DEFAULT_SIZES.properties,
  ])
  const propertiesPanelRef = useRef<ImperativePanelHandle>(null)
  const prevShowProperties = useRef(showProperties)

  // Load saved sizes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 3) {
          setSizes(parsed)
        }
      } catch (e) {
        console.error("Failed to parse saved studio layout sizes:", e)
      }
    }
  }, [])

  // Animate panel expand/collapse
  useEffect(() => {
    if (prevShowProperties.current !== showProperties) {
      const panel = propertiesPanelRef.current
      if (panel) {
        if (showProperties) {
          // Expand panel
          panel.expand()
        } else {
          // Collapse panel
          panel.collapse()
        }
      }
      prevShowProperties.current = showProperties
    }
  }, [showProperties])

  // Handle responsive breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Persist sizes to localStorage
  const handleSizeChange = (newSizes: number[]) => {
    setSizes(newSizes)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSizes))
  }

  // Mobile: Stack vertically
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-full overflow-hidden", className)}>
        {/* Preview takes most space on mobile */}
        <div className="flex-1 overflow-auto">
          {preview}
        </div>
        
        {/* Sidebar and Properties in bottom tabs/drawer (placeholder for now) */}
        <div className="h-16 border-t bg-background p-2 text-center text-sm text-muted-foreground">
          Mobile view - Sidebar & Properties (to be implemented)
        </div>
      </div>
    )
  }

  // Desktop: 3-column resizable layout
  return (
    <div className={cn("h-full", className)}>
      <PanelGroup
        direction="horizontal"
        onLayout={handleSizeChange}
        className="h-full"
      >
        {/* Left Sidebar - Elements List */}
        <Panel
          defaultSize={sizes[0]}
          minSize={15}
          maxSize={30}
          className="relative"
        >
          <div className="h-full overflow-hidden border-r bg-background">
            {sidebar}
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />

        {/* Center - Preview Canvas */}
        <Panel
          defaultSize={sizes[1]}
          minSize={40}
          className="relative transition-all duration-300 ease-out"
        >
          <div className="h-full overflow-hidden bg-muted/30">
            {preview}
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle 
          className={cn(
            "w-1 bg-border hover:bg-primary/20 transition-all duration-300",
            !showProperties && "opacity-0"
          )} 
        />

        {/* Right Sidebar - Properties Panel */}
        <Panel
          ref={propertiesPanelRef}
          defaultSize={showProperties ? sizes[2] : 0}
          minSize={0}
          maxSize={35}
          collapsible
          collapsedSize={0}
          className="relative transition-all duration-300 ease-out"
        >
          <div 
            className={cn(
              "h-full overflow-hidden border-l bg-background transition-opacity duration-200",
              !showProperties && "opacity-0"
            )}
          >
            {properties}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}

export default StudioLayout
