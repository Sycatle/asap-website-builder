/**
 * React wrapper for rendering all sections
 * Uses SectionRenderer from @asap/renderers package
 */
import React from 'react';
import { SectionRenderer } from '@asap/renderers';
import type { Element, Website } from '@asap/shared';

interface SectionsWrapperProps {
  sections: Element[];
  website?: Website;
}

export default function SectionsWrapper({ sections, website }: SectionsWrapperProps) {
  return (
    <>
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
