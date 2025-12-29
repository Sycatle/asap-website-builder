"use client"

import React from 'react';
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
  return (
    <>
      {/* Elements Sheet */}
      <Sheet open={leftPanelOpen && isMobile} onOpenChange={setLeftPanelOpen}>
        <SheetContent 
          side="left" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label="Liste des éléments"
        >
          <SheetTitle className="sr-only">Éléments</SheetTitle>
          <SheetDescription className="sr-only">Gérer les éléments de votre page</SheetDescription>
          <ElementList {...elementListProps} />
        </SheetContent>
      </Sheet>

      {/* Properties Sheet */}
      <Sheet open={rightPanelOpen && isMobile} onOpenChange={setRightPanelOpen}>
        <SheetContent 
          side="right" 
          className="w-[85vw] sm:w-[400px] p-0"
          aria-label="Propriétés de l'élément"
        >
          <SheetTitle className="sr-only">Propriétés</SheetTitle>
          <SheetDescription className="sr-only">Modifier les propriétés de l'élément sélectionné</SheetDescription>
          <PropertyEditorPanel {...propertyEditorProps} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileSheets;
