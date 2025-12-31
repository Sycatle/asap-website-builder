/**
 * SectionsWrapper - React component for rendering all sections
 * 
 * This component uses the SAME renderers as the studio preview.
 * By importing from @asap/renderers, we guarantee 100% visual parity.
 * 
 * Used in Astro with client:only="react" for full client-side hydration.
 * 
 * Performance optimizations:
 * - First 2 sections (above-fold) render immediately
 * - Below-fold sections lazy load with IntersectionObserver
 * - Skeleton placeholder prevents layout shift (CLS)
 */

import { SectionRenderer } from '@asap/renderers';
import type { Element, Website } from '@asap/shared';
import { normalizeSection } from '@/lib/rendering/normalize';
import { memo, useEffect, useRef, useState, useMemo } from 'react';

interface SectionsWrapperProps {
  sections: Element[];
  website?: Website;
}

// Number of sections to render immediately (above-fold)
const EAGER_SECTION_COUNT = 2;

/**
 * Skeleton placeholder for lazy-loaded sections
 * Maintains consistent height to prevent layout shift
 */
function SectionSkeleton() {
  return (
    <div 
      className="min-h-[300px] bg-muted/20 animate-pulse" 
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 300px' }}
      aria-hidden="true"
    />
  );
}

/**
 * Lazy section wrapper - only renders content when visible
 */
const LazySection = memo(function LazySection({ 
  section, 
  website 
}: { 
  section: Element; 
  website?: Website;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      setHasRendered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once rendered, keep it rendered (don't unload)
          setHasRendered(true);
          observer.disconnect();
        }
      },
      {
        // Start loading 400px before visible
        rootMargin: '400px 0px',
        threshold: 0,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep rendered content even when scrolled away
  const shouldRender = isVisible || hasRendered;

  return (
    <div ref={ref}>
      {shouldRender ? (
        <SectionRenderer section={section} website={website} />
      ) : (
        <SectionSkeleton />
      )}
    </div>
  );
});

export default function SectionsWrapper({ sections, website }: SectionsWrapperProps) {
  // Filter visible sections and sort by order_index
  const visibleSections = useMemo(() => 
    sections
      .map(normalizeSection)
      .filter((section) => section.visible !== false)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [sections]
  );

  if (visibleSections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        <p>Aucune section à afficher</p>
      </div>
    );
  }

  // Split sections: eager (above-fold) vs lazy (below-fold)
  const eagerSections = visibleSections.slice(0, EAGER_SECTION_COUNT);
  const lazySections = visibleSections.slice(EAGER_SECTION_COUNT);

  return (
    <>
      {/* Above-fold sections - render immediately for LCP */}
      {eagerSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
      
      {/* Below-fold sections - lazy load for performance */}
      {lazySections.map((section) => (
        <LazySection
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
