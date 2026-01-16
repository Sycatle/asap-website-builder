"use client"

import React, { useEffect, useState } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
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
        // Silent fail for invalid JSON
      }
    }
  }, [])

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
          defaultSize={showProperties ? sizes[1] : sizes[1] + sizes[2]}
          minSize={40}
          className="relative"
        >
          <div className="h-full overflow-hidden bg-muted/30">
            {preview}
          </div>
        </Panel>

        {/* Resize Handle - Only show when properties panel is visible */}
        {showProperties && (
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
        )}

        {/* Right Sidebar - Properties Panel - Only render when element selected */}
        {showProperties && (
          <Panel
            defaultSize={sizes[2]}
            minSize={15}
            maxSize={35}
            className="relative animate-in slide-in-from-right-4 duration-300"
          >
            <div className="h-full overflow-hidden border-l bg-background">
              {properties}
            </div>
          </Panel>
        )}
      </PanelGroup>
    </div>
  )
}

export default StudioLayout
