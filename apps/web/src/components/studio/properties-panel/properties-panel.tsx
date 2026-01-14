"use client";

import { useState } from "react";
import type { WebsiteElement } from "@/lib/types/element";
import type { UpdateElementRequest } from "@/lib/types/element";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
        <div className="text-center text-muted-foreground">
          <div className="mb-2 text-sm font-medium">No element selected</div>
          <div className="text-xs">
            Select an element from the sidebar or preview to edit its properties
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
              <div className="text-center text-muted-foreground text-sm">
                Style customization coming soon
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab (Placeholder for future) */}
          <TabsContent value="settings" className="mt-0">
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center text-muted-foreground text-sm">
                Advanced settings coming soon
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
