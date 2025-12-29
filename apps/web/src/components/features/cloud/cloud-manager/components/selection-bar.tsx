"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  Download,
  Trash2,
  X,
} from "lucide-react";
import type { SelectionBarProps } from "../types";

/**
 * Floating selection action bar
 */
export function SelectionBar({
  selectedCount,
  onSelectAll,
  onDownloadSelected,
  onDeleteSelected,
  onClearSelection,
}: SelectionBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <Card className="shadow-2xl border-primary bg-background/95 backdrop-blur-sm">
        <CardContent className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3">
          {/* Selection count */}
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-primary/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium">
              {selectedCount} <span className="hidden sm:inline">fichier{selectedCount > 1 ? 's' : ''}</span>
            </span>
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={onSelectAll}
              title="Tout sélectionner"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tout</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={onDownloadSelected}
              title="Télécharger la sélection"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={onDeleteSelected}
              title="Supprimer la sélection"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClearSelection}
            title="Annuler la sélection"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
