"use client";

import { useState } from "react";
import { WebsiteElement, UpdateElementRequest } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { PropertySection } from "./property-section";
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
        <div className="border-b px-4">
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

        {/* Content Tab */}
        <TabsContent value="content" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-4">
              {/* General Section */}
              <PropertySection title="General" defaultOpen>
                <GeneralProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </PropertySection>

              {/* Content Section - Dynamic based on element type */}
              <PropertySection title="Content" defaultOpen>
                <ContentProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </PropertySection>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Style Tab (Placeholder for future) */}
        <TabsContent value="style" className="mt-0 flex-1">
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center text-muted-foreground text-sm">
              Style customization coming soon
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab (Placeholder for future) */}
        <TabsContent value="settings" className="mt-0 flex-1">
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center text-muted-foreground text-sm">
              Advanced settings coming soon
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
