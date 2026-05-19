import {
  Suspense,
  lazy,
  useMemo,
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import type { CompiledSectionModule, SectionRef } from './types';

/**
 * Renders one AI-generated section. The compiled module is lazy-loaded so a
 * heavy / failing section doesn't block the rest of the page.
 *
 * Generated sections read data through hooks (useCollection / useVariable);
 * the only props passed in are the AST-extracted "knobs" (literal scalars
 * the studio can tweak without an LLM round-trip).
 */
export function GeneratedSection({
  section,
  fallback,
}: {
  section: SectionRef;
  fallback?: ReactNode;
}) {
  // Re-create the lazy component when the section identity changes, so an
  // edit + re-publish reloads a fresh module rather than a cached one.
  const LazyComponent = useMemo(
    () => lazy(() => section.load().then((mod) => ({ default: mod.default }))),
    [section.id]
  );

  return (
    <SectionErrorBoundary sectionId={section.id} fallback={fallback}>
      <Suspense fallback={fallback ?? null}>
        <LazyComponent {...(section.knobs ?? {})} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

class SectionErrorBoundary extends Component<
  { sectionId: string; fallback?: ReactNode; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to the host's error reporter without crashing the page.
    // Hosts (apps/sites, apps/web) can wire a global handler via window.
    if (typeof window !== 'undefined') {
      const w = window as Window & {
        __asap_section_error__?: (id: string, e: Error, i: ErrorInfo) => void;
      };
      w.__asap_section_error__?.(this.props.sectionId, error, info);
    }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            data-asap-section-error={this.props.sectionId}
            style={{
              padding: '2rem',
              border: '1px dashed rgb(var(--color-border) / 1)',
              background: 'rgb(var(--color-muted) / 0.4)',
              color: 'rgb(var(--color-foreground) / 0.7)',
              fontFamily: 'var(--font-body, system-ui)',
              borderRadius: 'var(--radius-md, 8px)',
              textAlign: 'center',
            }}
          >
            This section failed to render.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Re-export the module type so generated code authors can typecheck.
export type { CompiledSectionModule };
