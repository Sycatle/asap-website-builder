/**
 * SectionsWrapper - React component for rendering all sections
 * 
 * This component uses the SAME renderers as the studio preview.
 * By importing from @asap/renderers, we guarantee 100% visual parity.
 * 
 * Used in Astro with client:only="react" for full client-side hydration.
 */

import { SectionRenderer } from '@asap/renderers';
import type { Element, Website } from '@asap/shared';
import { normalizeSection } from '@/lib/rendering/normalize';

interface SectionsWrapperProps {
  sections: Element[];
  website?: Website;
}

export default function SectionsWrapper({ sections, website }: SectionsWrapperProps) {
  // Filter visible sections and sort by order_index
  const visibleSections = sections
    .map(normalizeSection)
    .filter((section) => section.visible !== false)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  if (visibleSections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        <p>Aucune section à afficher</p>
      </div>
    );
  }

  return (
    <>
      {visibleSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
