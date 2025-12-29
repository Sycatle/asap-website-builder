"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Layers, ArrowLeft } from "lucide-react";

/**
 * LoadingState - Shown while website data is loading
 */
export function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">Chargement...</p>
        <span className="sr-only">Chargement du site en cours</span>
      </div>
    </div>
  );
}

/**
 * NoWebsiteState - Shown when no website is selected
 */
export function NoWebsiteState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-4" role="alert">
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
  );
}

export default { LoadingState, NoWebsiteState };
