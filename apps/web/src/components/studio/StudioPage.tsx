"use client"

import { useState, useCallback, useEffect } from "react"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { useSections } from "@/hooks/useSections"
import type { Section, UpdateSectionRequest } from "@/lib/api"
import { SectionRenderer } from "./section-renderers"
import { PropertyEditor } from "./property-editors"
import { getSectionIcon, getSectionLabel } from "@/lib/constants/sections"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Monitor,
  Smartphone,
  Tablet,
  Plus,
  RefreshCw,
  Settings2,
  PanelLeftClose,
  PanelRightClose,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { AddSectionModal } from "@/components/sections/AddSectionModal"
import { cn } from "@/lib/utils"

type DevicePreview = 'desktop' | 'tablet' | 'mobile'

interface StudioPageProps {
  onBack?: () => void
}

export default function StudioPage({ onBack }: StudioPageProps) {
  // Data hooks - use context for website
  const { currentWebsite: website, isLoading: isLoadingWebsite } = useWebsiteContext()
  const { 
    sections, 
    isLoading: isLoadingSections, 
    updateSection,
    createSection,
    reorderSections,
    isUpdating,
    refetch,
  } = useSections(website?.id ?? null)

  // UI state
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Get selected section
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null

  // Auto-open right panel when section is selected
  useEffect(() => {
    if (selectedSectionId && rightPanelCollapsed) {
      setRightPanelCollapsed(false)
    }
  }, [selectedSectionId, rightPanelCollapsed])

  // Handle section selection
  const handleSectionClick = useCallback((section: Section) => {
    setSelectedSectionId(section.id)
  }, [])

  // Handle section update
  const handleUpdateSection = useCallback(async (sectionId: string, data: UpdateSectionRequest) => {
    return updateSection(sectionId, data)
  }, [updateSection])

  // Handle add section
  const handleAddSection = useCallback(async (data: import("@/lib/api").CreateSectionRequest) => {
    try {
      await createSection(data)
      setShowAddModal(false)
      toast.success('Section ajoutée')
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la section')
      throw error
    }
  }, [createSection])

  // Handle drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
    e.dataTransfer.setData('sectionId', sectionId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    const sectionId = e.dataTransfer.getData('sectionId')
    const sourceIndex = sections.findIndex(s => s.id === sectionId)
    
    if (sourceIndex === -1 || sourceIndex === targetIndex) return
    
    // Reorder sections
    const newOrder = [...sections]
    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    
    try {
      await reorderSections(newOrder.map(s => s.id))
      toast.success('Sections réorganisées')
    } catch {
      toast.error('Erreur lors de la réorganisation')
    }
  }, [sections, reorderSections])

  // Device preview sizes
  const deviceSizes = {
    desktop: 'w-full',
    tablet: 'max-w-[768px]',
    mobile: 'max-w-[375px]',
  }

  // Loading state
  if (isLoadingWebsite) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // No website state
  if (!website) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Aucun site sélectionné</h2>
          <p className="text-muted-foreground">Sélectionnez un site pour voir l'aperçu</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Sort sections by order and filter visible ones for preview
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const visibleSections = sortedSections.filter(s => s.visible)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top toolbar */}
      <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-2">
            <span className="font-semibold">{website.title}</span>
            <Badge variant="secondary" className="text-xs">
              {website.status === 'published' ? 'En ligne' : 'Brouillon'}
            </Badge>
          </div>
        </div>

        {/* Device preview toggles */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('desktop')}
                className="h-8 w-8 p-0"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bureau</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('tablet')}
                className="h-8 w-8 p-0"
              >
                <Tablet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tablette</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('mobile')}
                className="h-8 w-8 p-0"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mobile</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoadingSections}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingSections && "animate-spin")} />
            Actualiser
          </Button>
          
          {website.slug && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le site
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Section list */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            collapsedSize={0}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            className={leftPanelCollapsed ? 'hidden' : ''}
          >
            <div className="h-full flex flex-col border-r">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Sections
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeftPanelCollapsed(true)}
                    className="h-7 w-7 p-0"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1 p-2">
                {isLoadingSections ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : sortedSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune section</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter une section
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sortedSections.map((section, index) => {
                      const Icon = getSectionIcon(section.section_type)
                      const isSelected = selectedSectionId === section.id
                      const isDragOver = dragOverIndex === index
                      
                      return (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, section.id)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onClick={() => handleSectionClick(section)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                            "hover:bg-accent/50",
                            isSelected && "bg-accent ring-1 ring-primary",
                            isDragOver && "border-t-2 border-primary",
                            !section.visible && "opacity-50"
                          )}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm truncate">
                            {section.title || getSectionLabel(section.section_type)}
                          </span>
                          {!section.visible && (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          {leftPanelCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftPanelCollapsed(false)}
              className="absolute left-2 top-20 z-10 h-8 w-8 p-0 bg-background border shadow-sm"
            >
              <Layers className="h-4 w-4" />
            </Button>
          )}

          <ResizableHandle withHandle />

          {/* Center Panel - Preview */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col bg-muted/30">
              {/* Preview header */}
              <div className="p-2 border-b bg-background flex items-center justify-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  Aperçu en direct
                </div>
              </div>
              
              {/* Preview canvas */}
              <ScrollArea className="flex-1 p-4">
                <div 
                  className={cn(
                    "mx-auto bg-white dark:bg-slate-950 shadow-2xl rounded-lg overflow-hidden transition-all duration-300",
                    deviceSizes[devicePreview]
                  )}
                >
                  {visibleSections.length === 0 ? (
                    <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune section visible</p>
                        <p className="text-sm mt-1">Ajoutez ou rendez visible des sections pour voir l'aperçu</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {visibleSections.map((section) => (
                        <SectionRenderer
                          key={section.id}
                          section={section}
                          isSelected={selectedSectionId === section.id}
                          onClick={() => handleSectionClick(section)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Property Editor */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={35}
            collapsible
            collapsedSize={0}
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
            className={rightPanelCollapsed ? 'hidden' : ''}
          >
            <div className="h-full flex flex-col border-l">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Propriétés
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRightPanelCollapsed(true)}
                  className="h-7 w-7 p-0"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                {selectedSection ? (
                  <PropertyEditor
                    section={selectedSection}
                    onUpdate={handleUpdateSection}
                    isUpdating={isUpdating}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sélectionnez une section</p>
                    <p className="text-xs mt-1">pour modifier ses propriétés</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          {rightPanelCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelCollapsed(false)}
              className="absolute right-2 top-20 z-10 h-8 w-8 p-0 bg-background border shadow-sm"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        existingSectionsCount={sections.length}
      />
    </div>
  )
}
