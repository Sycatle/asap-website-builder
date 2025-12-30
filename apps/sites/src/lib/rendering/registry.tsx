import React from 'react';
import type { SectionRendererProps } from '@asap/renderers';
import { CustomRenderer, renderers } from '@asap/renderers';

export type SectionRendererComponent = React.ComponentType<SectionRendererProps>;

const registry = new Map<string, SectionRendererComponent>(Object.entries(renderers));

export function registerSectionRenderer(type: string, renderer: SectionRendererComponent): void {
  registry.set(type, renderer);
}

export function getSectionRenderer(type: string): SectionRendererComponent {
  return registry.get(type) ?? UnknownSectionRenderer;
}

export const UnknownSectionRenderer: SectionRendererComponent = ({ section }) => (
  <section className="border border-dashed border-red-500/70 bg-red-500/10 px-6 py-12 text-center text-red-700">
    <h2 className="text-lg font-semibold">Section inconnue</h2>
    <p className="mt-2 text-sm">
      Le type de section <span className="font-mono">{section.element_type}</span> n&apos;est pas enregistré.
    </p>
  </section>
);

export const defaultSectionRenderer: SectionRendererComponent = CustomRenderer;
