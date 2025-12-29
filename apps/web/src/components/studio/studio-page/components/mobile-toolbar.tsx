"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Layers,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileToolbarProps } from "../types";

/**
 * MobileToolbar - Bottom navigation toolbar for mobile devices
 */
export function MobileToolbar({
  leftPanelOpen,
  rightPanelOpen,
  selectedElement,
  setLeftPanelOpen,
  setRightPanelOpen,
  onAddClick,
}: MobileToolbarProps) {
  return (
    <nav 
      className="md:hidden sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="navigation"
      aria-label="Actions du studio"
    >
      <div className="flex items-center justify-around gap-2">
        {/* Elements button */}
        <Button
          variant={leftPanelOpen ? "default" : "outline"}
          size="lg"
          onClick={() => {
            setLeftPanelOpen(!leftPanelOpen);
            if (!leftPanelOpen) setRightPanelOpen(false);
          }}
          className={cn(
            "flex-1 h-12 flex-col gap-0.5 focus-visible:ring-2 focus-visible:ring-ring",
            leftPanelOpen && "ring-2 ring-primary"
          )}
          aria-label={leftPanelOpen ? "Fermer les éléments" : "Ouvrir les éléments"}
          aria-pressed={leftPanelOpen}
        >
          <Layers className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Éléments</span>
        </Button>
        
        {/* Add button */}
        <Button
          variant="default"
          size="lg"
          onClick={onAddClick}
          className="h-14 w-14 rounded-full p-0 shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Ajouter un nouvel élément"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Ajouter</span>
        </Button>
        
        {/* Properties button */}
        <Button
          variant={rightPanelOpen ? "default" : "outline"}
          size="lg"
          onClick={() => {
            setRightPanelOpen(!rightPanelOpen);
            if (!rightPanelOpen) setLeftPanelOpen(false);
          }}
          className={cn(
            "flex-1 h-12 flex-col gap-0.5 focus-visible:ring-2 focus-visible:ring-ring",
            rightPanelOpen && "ring-2 ring-primary",
            !selectedElement && "opacity-50"
          )}
          disabled={!selectedElement}
          aria-label={selectedElement ? (rightPanelOpen ? "Fermer les propriétés" : "Ouvrir les propriétés") : "Sélectionnez d'abord un élément"}
          aria-pressed={rightPanelOpen}
        >
          <Settings2 className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Propriétés</span>
        </Button>
      </div>
    </nav>
  );
}

export default MobileToolbar;
