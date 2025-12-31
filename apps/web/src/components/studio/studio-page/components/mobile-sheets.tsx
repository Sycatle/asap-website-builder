"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ElementList } from "./element-list";
import { PropertyEditorPanel } from "./property-editor-panel";
import type { ElementListProps, PropertyEditorPanelProps } from "../types";

/**
 * MobileSheets - Mobile side panel sheets for elements and properties
 */
export function MobileSheets({
  isMobile,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
  elementListProps,
  propertyEditorProps,
}: {
  isMobile: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  elementListProps: ElementListProps;
  propertyEditorProps: PropertyEditorPanelProps;
}) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <>
      {/* Elements Sheet */}
      <Sheet open={leftPanelOpen && isMobile} onOpenChange={setLeftPanelOpen}>
        <SheetContent 
          side="left" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label={t('editor:elementList.title')}
        >
          <SheetTitle className="sr-only">{t('editor:sidebar.elements')}</SheetTitle>
          <SheetDescription className="sr-only">{t('editor:mobileSheets.manageElements')}</SheetDescription>
          <ElementList {...elementListProps} />
        </SheetContent>
      </Sheet>

      {/* Properties Sheet */}
      <Sheet open={rightPanelOpen && isMobile} onOpenChange={setRightPanelOpen}>
        <SheetContent 
          side="right" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label={t('editor:propertyPanel.elementProperties')}
        >
          <SheetTitle className="sr-only">{t('editor:properties.title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('editor:mobileSheets.editProperties')}</SheetDescription>
          <PropertyEditorPanel {...propertyEditorProps} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileSheets;
