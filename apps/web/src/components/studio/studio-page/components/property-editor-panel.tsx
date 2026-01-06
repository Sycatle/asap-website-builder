"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyEditor } from "../../property-editors";
import { ExtensionDataPanel } from "../../data-binding";
import { getElementLabel } from "@/lib/constants/elements";
import { Settings, Database } from "lucide-react";
import type { PropertyEditorPanelProps } from "../types";

/**
 * PropertyEditorPanel - Right sidebar panel for editing element properties
 * 
 * Now includes two tabs:
 * - Properties: Element-specific property editor
 * - Data: Extension collections and variables
 */
export function PropertyEditorPanel({
  selectedElement,
  onUpdate,
  isUpdating,
}: PropertyEditorPanelProps) {
  const { t } = useTranslation(['common', 'editor']);
  const [activeTab, setActiveTab] = useState<string>('properties');

  return (
    <div className="flex flex-col h-full overflow-hidden" role="region" aria-label={t('editor:propertyPanel.title')}>
      {/* Tabs Header */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="shrink-0 border-b bg-background">
          <TabsList className="w-full justify-start h-10 rounded-none border-b-0 bg-transparent p-0">
            <TabsTrigger 
              value="properties" 
              className="flex-1 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('editor:properties.title')}
              {selectedElement && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {getElementLabel(selectedElement.element_type)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="flex-1 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
            >
              <Database className="h-4 w-4" />
              Données
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Properties Tab */}
        <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">
            {selectedElement ? (
              <PropertyEditor
                element={selectedElement}
                onUpdate={onUpdate}
                isUpdating={isUpdating}
              />
            ) : (
              <EmptyPropertyState />
            )}
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="flex-1 m-0 overflow-hidden">
          <ExtensionDataPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * EmptyPropertyState - Shown when no element is selected
 */
function EmptyPropertyState() {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="text-center py-12 text-muted-foreground" role="status">
      <Settings className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
      <p className="text-sm font-medium">{t('editor:properties.noSelection')}</p>
      <p className="text-xs mt-1">{t('editor:properties.selectToEdit')}</p>
    </div>
  );
}

export default PropertyEditorPanel;
