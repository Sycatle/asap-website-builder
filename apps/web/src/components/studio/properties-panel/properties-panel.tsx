"use client";

import { useState } from "react";
import type { WebsiteElement } from "@/lib/types/element";
import type { UpdateElementRequest } from "@/lib/types/element";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, MousePointerClick, Palette, Settings2 } from "lucide-react";
import { GeneralProperties } from "./general-properties";
import { ContentProperties } from "./content-properties";

interface PropertiesPanelProps {
  element: WebsiteElement | null;
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<void>;
  onClose?: () => void;
}

export function PropertiesPanel({
  element,
  onUpdate,
  onClose,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("content");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!element) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MousePointerClick className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Aucun élément sélectionné</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez sur un élément dans la preview ou la sidebar pour modifier ses propriétés
            </p>
          </div>
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-2">
            <p className="font-medium">Raccourcis utiles :</p>
            <div className="flex items-center justify-center gap-4">
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Z</kbd> Annuler</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Del</kbd> Supprimer</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdate = async (updates: Partial<UpdateElementRequest>) => {
    setIsUpdating(true);
    try {
      await onUpdate(element.id, updates as UpdateElementRequest);
    } catch (error) {
      console.error("Failed to update element:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Element Properties</h3>
          <p className="text-xs text-muted-foreground">
            {element.element_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex-none border-b px-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="content" className="flex-1">
              Content
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1" disabled>
              Style
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Content Tab */}
          <TabsContent value="content" className="mt-0 data-[state=inactive]:hidden">
            <div className="p-4 space-y-4 pb-8">
              {/* General Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Général</h4>
                <GeneralProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </div>

              {/* Content Section - Dynamic based on element type */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contenu</h4>
                <ContentProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </div>
            </div>
          </TabsContent>

          {/* Style Tab (Placeholder for future) */}
          <TabsContent value="style" className="mt-0">
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Personnalisation du style</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Couleurs, espacements et typographie — bientôt disponible
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab (Placeholder for future) */}
          <TabsContent value="settings" className="mt-0">
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paramètres avancés</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Animations, visibilité conditionnelle — bientôt disponible
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
