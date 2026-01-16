"use client";

import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { getSectionSchema } from "@asap/shared";
import { SchemaPropertyEditor } from "./element-properties/schema-property-editor";
import { GenericProperties } from "./element-properties/generic-properties";

interface ContentPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

// Element types that have schema-based editing (SaaS Landing)
const SCHEMA_BASED_TYPES = [
  'navigation',
  'hero',
  'features',
  'how-it-works',
  'pricing',
  'testimonials',
  'cta',
  'footer',
  'content',
  'about',
  'faq',
  'contact',
  'gallery',
  'stats',
  'logos',
  'blog-list',
];

export function ContentProperties({
  element,
  onUpdate,
  isUpdating,
}: ContentPropertiesProps) {
  // Check if this element type has a schema
  const hasSchema = SCHEMA_BASED_TYPES.includes(element.element_type) && 
                    getSectionSchema(element.element_type) !== undefined;

  if (hasSchema) {
    return (
      <SchemaPropertyEditor
        element={element}
        onUpdate={onUpdate}
        isUpdating={isUpdating}
      />
    );
  }

  // Fallback to generic properties for unsupported types
  return (
    <GenericProperties
      element={element}
      onUpdate={onUpdate}
      isUpdating={isUpdating}
    />
  );
}
