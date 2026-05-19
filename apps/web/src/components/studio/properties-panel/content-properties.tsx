"use client";

import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { GenericProperties } from "./element-properties/generic-properties";

interface ContentPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

// Schema-based editors ont disparu avec la refonte AI-codegen ;
// cette panel se concentre sur les champs courants.
export function ContentProperties({
  element,
  onUpdate,
  isUpdating,
}: ContentPropertiesProps) {
  return (
    <GenericProperties
      element={element}
      onUpdate={onUpdate}
      isUpdating={isUpdating}
    />
  );
}
