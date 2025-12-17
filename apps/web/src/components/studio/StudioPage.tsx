"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { useSections } from "@/hooks/useSections"
import { usePages } from "@/hooks/usePages"
import type { Section, UpdateSectionRequest } from "@/lib/api"
import { SectionRenderer } from "./section-renderers"
import { PropertyEditor } from "./property-editors"
import { getSectionIcon, getSectionLabel } from "@/lib/constants/sections"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
  ExternalLink,
  FileText,
  Home,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react"
import { toast } from "sonner"
import { AddSectionModal } from "@/components/sections/AddSectionModal"
import { cn } from "@/lib/utils"

type DevicePreview = 'desktop' | 'tablet' | 'mobile'

interface StudioPageProps {
  onBack?: () => void
}

// Hook for responsive design
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}

export default function StudioPage({ onBack }: StudioPageProps) {
  const isMobile = useIsMobile()
  
  // Data hooks
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
  
  const { 
    pages, 
    isLoading: isLoadingPages,
    getHomepage,
  } = usePages(website?.id ?? null)

  // UI state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-select homepage on first load
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      const homepage = getHomepage()
      setSelectedPageId(homepage?.id ?? pages[0]?.id ?? null)
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

  // Get selected section
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null

  // Open right panel when section is selected (only on mobile)
  useEffect(() => {
    if (selectedSectionId && isMobile && !rightPanelOpen) {
      setRightPanelOpen(true)
    }
  }, [selectedSectionId, isMobile, rightPanelOpen])

  // Handle section selection
  const handleSectionClick = useCallback((section: Section) => {
    setSelectedSectionId(section.id)
    if (isMobile) {
      setLeftPanelOpen(false)
      setRightPanelOpen(true)
    }
  }, [isMobile])

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

  // Handle drag and drop (desktop only)
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
    if (isMobile) return
    e.dataTransfer.setData('sectionId', sectionId)
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
    
    const sectionId = e.dataTransfer.getData('sectionId')
    const sourceIndex = sections.findIndex(s => s.id === sectionId)
    
    if (sourceIndex === -1 || sourceIndex === targetIndex) return
    
    const newOrder = [...sections]
    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    
    try {
      await reorderSections(newOrder.map(s => s.id))
      toast.success('Sections réorganisées')
    } catch {
      toast.error('Erreur lors de la réorganisation')
    }
  }, [isMobile, sections, reorderSections])

  // Device preview sizes
  const deviceSizes = {
    desktop: 'w-full',
    tablet: 'max-w-[768px]',
    mobile: 'max-w-[375px]',
  }

  // Sort sections
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const visibleSections = sortedSections.filter(s => s.visible)

  // Loading state
  if (isLoadingWebsite) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">Chargement...</p>
          <span className="sr-only">Chargement du site en cours</span>
        </div>
      </div>
    )
  }

  // No website state
  if (!website) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4" role="alert">
        <div className="text-center space-y-4">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Aucun site sélectionné</h2>
          <p className="text-muted-foreground text-sm">Sélectionnez un site pour voir l'aperçu</p>
          {onBack && (
            <Button onClick={onBack} variant="outline" aria-label="Retourner au tableau de bord">
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Retour au dashboard
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Section list content (shared between desktop panel and mobile sheet)
  const SectionListContent = () => (
    <div className="flex flex-col h-full" role="region" aria-label="Liste des sections">
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b bg-background flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2" id="sections-title">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Sections
          </h3>
          {currentPage && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {currentPage.is_homepage && <Home className="h-3 w-3" aria-hidden="true" />}
              {currentPage.title || (currentPage.slug === '' ? 'Accueil' : `/${currentPage.slug}`)}
            </p>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="h-8"
          aria-label="Ajouter une nouvelle section"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {isLoadingSections ? (
          <div className="space-y-2" role="status" aria-label="Chargement des sections">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
            <span className="sr-only">Chargement des sections...</span>
          </div>
        ) : sortedSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" role="status">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium">Aucune section</p>
            <p className="text-xs mt-1 mb-4">Commencez par ajouter votre première section</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              aria-label="Ajouter votre première section"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Ajouter une section
            </Button>
          </div>
        ) : (
          <div className="space-y-1" role="listbox" aria-labelledby="sections-title" aria-activedescendant={selectedSectionId || undefined}>
            {sortedSections.map((section, index) => {
              const Icon = getSectionIcon(section.section_type)
              const isSelected = selectedSectionId === section.id
              const isDragOver = dragOverIndex === index
              const sectionLabel = section.title || getSectionLabel(section.section_type)
              
              return (
                <button
                  key={section.id}
                  id={section.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${sectionLabel}${!section.visible ? ' (masquée)' : ''}, ${getSectionLabel(section.section_type)}`}
                  draggable={!isMobile}
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => handleSectionClick(section)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    "hover:bg-accent/50 active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isSelected && "bg-accent ring-2 ring-primary shadow-sm",
                    isDragOver && "border-t-2 border-primary",
                    !section.visible && "opacity-50"
                  )}
                >
                  {!isMobile && (
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" aria-hidden="true" />
                  )}
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sectionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {getSectionLabel(section.section_type)}
                    </p>
                  </div>
                  {!section.visible && (
                    <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Section masquée" />
                  )}
                </button>
              )
            })}
            {/* Desktop drag hint */}
            {!isMobile && sortedSections.length > 1 && (
              <p className="text-[10px] text-muted-foreground text-center mt-3 px-2">
                <GripVertical className="h-3 w-3 inline mr-1" aria-hidden="true" />
                Glissez pour réorganiser
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Property editor content (shared between desktop panel and mobile sheet)
  const PropertyEditorContent = () => (
    <div className="flex flex-col h-full" role="region" aria-label="Éditeur de propriétés">
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b bg-background flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2" id="properties-title">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Propriétés
        </h3>
        {selectedSection && (
          <Badge variant="secondary" className="text-xs">
            {getSectionLabel(selectedSection.section_type)}
          </Badge>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {selectedSection ? (
          <PropertyEditor
            section={selectedSection}
            onUpdate={handleUpdateSection}
            isUpdating={isUpdating}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground" role="status">
            <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium">Sélectionnez une section</p>
            <p className="text-xs mt-1">pour modifier ses propriétés</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Responsive & Sticky */}
      <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-3 sm:px-4 md:px-6 shrink-0 gap-2\">
        {/* Left section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="shrink-0 h-9 w-9"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Retour</span>
            </Button>
          )}
          
          {/* Desktop: Full title + badge */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">{website.title}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {website.status === 'published' ? 'En ligne' : 'Brouillon'}
            </Badge>
          </div>
          
          {/* Page selector - compact on mobile */}
          <Select
            value={selectedPageId ?? undefined}
            onValueChange={setSelectedPageId}
            disabled={isLoadingPages || pages.length === 0}
          >
            <SelectTrigger 
              className="w-auto min-w-[100px] max-w-[160px] md:max-w-[180px] h-8 text-sm"
              aria-label="Sélectionner une page à modifier"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Page">
                {currentPage ? (
                  <span className="truncate">
                    {currentPage.title || (currentPage.slug === '' ? 'Accueil' : currentPage.slug)}
                  </span>
                ) : (
                  'Page'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  <span className="flex items-center gap-2">
                    {page.is_homepage && <Home className="h-3 w-3 text-primary" />}
                    <span>{page.title || (page.slug === '' ? 'Accueil' : `/${page.slug}`)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center - Device toggles (desktop only) */}
        <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label="Taille d'aperçu">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('desktop')}
                className="h-7 w-7 p-0"
                role="radio"
                aria-checked={devicePreview === 'desktop'}
                aria-label="Aperçu bureau"
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
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
                className="h-7 w-7 p-0"
                role="radio"
                aria-checked={devicePreview === 'tablet'}
                aria-label="Aperçu tablette"
              >
                <Tablet className="h-3.5 w-3.5" aria-hidden="true" />
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
                className="h-7 w-7 p-0"
                role="radio"
                aria-checked={devicePreview === 'mobile'}
                aria-label="Aperçu mobile"
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mobile</TooltipContent>
          </Tooltip>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoadingSections}
            className="h-9 w-9"
            aria-label={isLoadingSections ? "Chargement en cours" : "Actualiser les sections"}
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingSections && "animate-spin")} aria-hidden="true" />
            <span className="sr-only">{isLoadingSections ? "Chargement..." : "Actualiser"}</span>
          </Button>
          
          {website.slug && (
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 hidden sm:flex">
              <a 
                href={`/${website.slug}${currentPage && !currentPage.is_homepage ? `/${currentPage.slug}` : ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Voir le site dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Ouvrir le site</span>
              </a>
            </Button>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 md:hidden"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div 
          id="mobile-menu"
          role="menu"
          aria-label="Options d'affichage"
          className="md:hidden border-b bg-background p-2 flex flex-wrap gap-2 animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label="Taille d'aperçu">
            <Button
              variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevicePreview('desktop')}
              className="h-8 px-3"
              role="radio"
              aria-checked={devicePreview === 'desktop'}
            >
              <Monitor className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Bureau
            </Button>
            <Button
              variant={devicePreview === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevicePreview('tablet')}
              className="h-8 px-3"
              role="radio"
              aria-checked={devicePreview === 'tablet'}
            >
              <Tablet className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Tablette
            </Button>
            <Button
              variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevicePreview('mobile')}
              className="h-8 px-3"
              role="radio"
              aria-checked={devicePreview === 'mobile'}
            >
              <Smartphone className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Mobile
            </Button>
          </div>
          
          {website.slug && (
            <Button variant="outline" size="sm" asChild className="h-8">
              <a 
                href={`/${website.slug}${currentPage && !currentPage.is_homepage ? `/${currentPage.slug}` : ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Voir le site
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop left panel */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-r bg-background transition-all duration-200 relative",
            leftPanelOpen ? "w-72" : "w-0 border-r-0 overflow-hidden"
          )}
          aria-label="Panneau des sections"
          aria-hidden={!leftPanelOpen}
        >
          {leftPanelOpen && <SectionListContent />}
        </aside>


        {/* Center - Preview */}
        <main 
          className="flex-1 flex flex-col bg-muted/30 min-w-0"
          role="region"
          aria-label="Aperçu du site"
        >
          {/* Preview indicator with panel toggles - Sticky */}
          <div className="sticky top-0 z-10 p-2 sm:p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center justify-between gap-2">
            {/* Left toggle - Sections */}
            <Button
              variant={leftPanelOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="hidden md:flex h-8 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={leftPanelOpen ? "Masquer les sections" : "Afficher les sections"}
              aria-pressed={leftPanelOpen}
            >
              {leftPanelOpen ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <Layers className="h-4 w-4" aria-hidden="true" />}
              <span className="text-xs">Sections</span>
            </Button>
            <div className="md:hidden w-8" /> {/* Spacer for mobile */}
            
            {/* Center - Preview status */}
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground" role="status">
              <Eye className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Aperçu en direct</span>
              <span className="sm:hidden">Aperçu</span>
              {devicePreview !== 'desktop' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {devicePreview === 'tablet' ? 'Tablette' : 'Mobile'}
                </Badge>
              )}
            </div>
            
            {/* Right toggle - Properties */}
            <Button
              variant={rightPanelOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="hidden md:flex h-8 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={rightPanelOpen ? "Masquer les propriétés" : "Afficher les propriétés"}
              aria-pressed={rightPanelOpen}
            >
              <span className="text-xs">Propriétés</span>
              {rightPanelOpen ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <Settings2 className="h-4 w-4" aria-hidden="true" />}
            </Button>
            <div className="md:hidden w-8" /> {/* Spacer for mobile */}
          </div>
          
          {/* Preview canvas */}
          <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
            <div 
              className={cn(
                "mx-auto bg-white dark:bg-slate-950 shadow-2xl rounded-lg overflow-hidden transition-all duration-300 min-h-[50vh]",
                deviceSizes[devicePreview],
                isMobile && "rounded-none shadow-none"
              )}
            >
              {visibleSections.length === 0 ? (
                <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground p-6" role="status">
                  <div className="text-center">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    <p className="font-medium">Aucune section visible</p>
                    <p className="text-sm mt-1">Ajoutez des sections pour commencer</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => isMobile ? setLeftPanelOpen(true) : setShowAddModal(true)}
                      className="mt-4"
                      aria-label="Ajouter votre première section"
                    >
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Ajouter une section
                    </Button>
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
        </main>


        {/* Desktop right panel */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-l bg-background transition-all duration-200 relative",
            rightPanelOpen ? "w-80" : "w-0 border-l-0 overflow-hidden"
          )}
          aria-label="Panneau des propriétés"
          aria-hidden={!rightPanelOpen}
        >
          {rightPanelOpen && <PropertyEditorContent />}
        </aside>
      </div>

      {/* Mobile bottom toolbar - Sticky */}
      <nav 
        className="md:hidden sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        role="navigation"
        aria-label="Actions du studio"
      >
        <div className="flex items-center justify-around gap-2">
          <Button
            variant={leftPanelOpen ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setLeftPanelOpen(!leftPanelOpen)
              if (!leftPanelOpen) setRightPanelOpen(false)
            }}
            className={cn(
              "flex-1 h-12 flex-col gap-0.5 focus-visible:ring-2 focus-visible:ring-ring",
              leftPanelOpen && "ring-2 ring-primary"
            )}
            aria-label={leftPanelOpen ? "Fermer les sections" : "Ouvrir les sections"}
            aria-pressed={leftPanelOpen}
          >
            <Layers className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">Sections</span>
          </Button>
          
          <Button
            variant="default"
            size="lg"
            onClick={() => setShowAddModal(true)}
            className="h-14 w-14 rounded-full p-0 shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Ajouter une nouvelle section"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">Ajouter</span>
          </Button>
          
          <Button
            variant={rightPanelOpen ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setRightPanelOpen(!rightPanelOpen)
              if (!rightPanelOpen) setLeftPanelOpen(false)
            }}
            className={cn(
              "flex-1 h-12 flex-col gap-0.5 focus-visible:ring-2 focus-visible:ring-ring",
              rightPanelOpen && "ring-2 ring-primary",
              !selectedSection && "opacity-50"
            )}
            disabled={!selectedSection}
            aria-label={selectedSection ? (rightPanelOpen ? "Fermer les propriétés" : "Ouvrir les propriétés") : "Sélectionnez d'abord une section"}
            aria-pressed={rightPanelOpen}
          >
            <Settings2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">Propriétés</span>
          </Button>
        </div>
      </nav>

      {/* Mobile Sheets */}
      <Sheet open={leftPanelOpen && isMobile} onOpenChange={setLeftPanelOpen}>
        <SheetContent 
          side="left" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label="Liste des sections"
        >
          <SheetTitle className="sr-only">Sections</SheetTitle>
          <SheetDescription className="sr-only">Gérer les sections de votre page</SheetDescription>
          <SectionListContent />
        </SheetContent>
      </Sheet>

      <Sheet open={rightPanelOpen && isMobile} onOpenChange={setRightPanelOpen}>
        <SheetContent 
          side="right" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label="Propriétés de la section"
        >
          <SheetTitle className="sr-only">Propriétés</SheetTitle>
          <SheetDescription className="sr-only">Modifier les propriétés de la section sélectionnée</SheetDescription>
          <PropertyEditorContent />
        </SheetContent>
      </Sheet>

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
