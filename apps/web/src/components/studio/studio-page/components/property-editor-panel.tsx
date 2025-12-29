"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PropertyEditor } from "../../property-editors";
import { getElementLabel } from "@/lib/constants/elements";
import { Settings2 } from "lucide-react";
import type { PropertyEditorPanelProps } from "../types";

/**
 * PropertyEditorPanel - Right sidebar panel for editing element properties
 */
export function PropertyEditorPanel({
  selectedElement,
  onUpdate,
  isUpdating,
}: PropertyEditorPanelProps) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="flex flex-col h-full" role="region" aria-label={t('editor:propertyPanel.title')}>
      {/* Header */}
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b bg-background flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2" id="properties-title">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {t('editor:properties.title')}
        </h3>
        {selectedElement && (
          <Badge variant="secondary" className="text-xs">
            {getElementLabel(selectedElement.element_type)}
          </Badge>
        )}
      </div>
      
      {/* Property editor content */}
      <ScrollArea className="flex-1 p-4">
        {selectedElement ? (
          <PropertyEditor
            element={selectedElement}
            onUpdate={onUpdate}
            isUpdating={isUpdating}
          />
        ) : (
          <EmptyPropertyState />
        )}
      </ScrollArea>
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
      <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
      <p className="text-sm font-medium">{t('editor:properties.noSelection')}</p>
      <p className="text-xs mt-1">{t('editor:properties.selectToEdit')}</p>
    </div>
  );
}

export default PropertyEditorPanel;
