"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SectionRenderer } from "../../section-renderers";
import {
  Eye,
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewCanvasProps } from "../types";
import { DEVICE_SIZES } from "../types";

/**
 * PreviewCanvas - Central preview area showing the website
 */
export function PreviewCanvas({
  elements,
  devicePreview,
  selectedElementId,
  isMobile,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
  onElementClick,
  onAddClick,
}: PreviewCanvasProps) {
  // Get visible elements sorted by order
  const visibleElements = elements
    .filter(e => e && e.id && e.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <main 
      className="flex-1 flex flex-col bg-muted/30 min-w-0"
      role="region"
      aria-label="Aperçu du site"
    >
      {/* Preview indicator with panel toggles */}
      <PreviewToolbar
        devicePreview={devicePreview}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
      />
      
      {/* Preview canvas */}
      <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
        <div 
          className={cn(
            "mx-auto bg-card dark:bg-slate-950 shadow-2xl rounded-lg overflow-hidden transition-all duration-300 min-h-[50vh]",
            DEVICE_SIZES[devicePreview],
            isMobile && "rounded-none shadow-none"
          )}
        >
          {visibleElements.length === 0 ? (
            <EmptyPreviewState 
              isMobile={isMobile} 
              onAddClick={onAddClick}
              setLeftPanelOpen={setLeftPanelOpen}
            />
          ) : (
            <div>
              {visibleElements.map((element) => (
                <SectionRenderer
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onClick={() => onElementClick(element)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}

/**
 * PreviewToolbar - Toolbar above the preview canvas
 */
function PreviewToolbar({
  devicePreview,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
}: {
  devicePreview: PreviewCanvasProps['devicePreview'];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-10 p-2 sm:p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center justify-between gap-2">
      {/* Left toggle - Elements */}
      <Button
        variant={leftPanelOpen ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="hidden md:flex h-8 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={leftPanelOpen ? "Masquer les éléments" : "Afficher les éléments"}
        aria-pressed={leftPanelOpen}
      >
        {leftPanelOpen ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <Layers className="h-4 w-4" aria-hidden="true" />}
        <span className="text-xs">Éléments</span>
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
  );
}

/**
 * EmptyPreviewState - Shown when no visible elements exist
 */
function EmptyPreviewState({
  isMobile,
  onAddClick,
  setLeftPanelOpen,
}: {
  isMobile: boolean;
  onAddClick: () => void;
  setLeftPanelOpen: (open: boolean) => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground p-6" role="status">
      <div className="text-center">
        <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
        <p className="font-medium">Aucun élément visible</p>
        <p className="text-sm mt-1">Ajoutez des éléments pour commencer</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => isMobile ? setLeftPanelOpen(true) : onAddClick()}
          className="mt-4"
          aria-label="Ajouter votre premier élément"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Ajouter un élément
        </Button>
      </div>
    </div>
  );
}

export default PreviewCanvas;
