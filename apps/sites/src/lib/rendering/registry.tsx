/**
 * Section Renderer Registry
 * 
 * This file provides the interface to @asap/renderers package.
 * The actual renderers are defined in the shared package to ensure
 * 100% parity between studio preview and public sites.
 */

import React from 'react';
import type { SectionRendererProps } from '@asap/renderers';
import { renderers, getRenderer, hasRenderer, SectionRenderer } from '@asap/renderers';

export type SectionRendererComponent = React.ComponentType<SectionRendererProps>;

/**
 * Get the renderer for a specific section type.
 * Falls back to UnknownSectionRenderer if not found.
 */
export function getSectionRenderer(type: string): SectionRendererComponent {
  if (hasRenderer(type)) {
    return getRenderer(type);
  }
  return UnknownSectionRenderer;
}

/**
 * Renderer shown when a section type is not recognized.
 * Helps debugging during development.
 */
export const UnknownSectionRenderer: SectionRendererComponent = ({ section }) => (
  <section className="border border-dashed border-destructive/70 bg-destructive/10 px-6 py-12 text-center text-destructive">
    <h2 className="text-lg font-semibold">Section type not found</h2>
    <p className="mt-2 text-sm">
      The section type <code className="font-mono bg-destructive/20 px-1 rounded">{section.element_type}</code> is not registered.
    </p>
    <p className="mt-1 text-xs text-muted-foreground">
      Add it to <code className="font-mono">packages/renderers/src/renderers.tsx</code>
    </p>
  </section>
);

export const defaultSectionRenderer: SectionRendererComponent = SectionRenderer;

// Re-export for convenience
export { renderers, hasRenderer, SectionRenderer };
