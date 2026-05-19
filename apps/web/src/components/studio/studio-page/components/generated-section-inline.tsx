"use client"

/**
 * Inline host for AI-compiled section modules inside the studio preview iframe.
 *
 * The backend serves the compiled JS at `/api/public/sections/:id/module.js`.
 * Each module references `react`, `react/jsx-runtime`, and `@asap/site-runtime`
 * via `globalThis.__asapDeps(name)` (set up by `ensureSiteRuntimeDeps`).
 *
 * The studio preview shares the parent app's React instance — the iframe React
 * root is created from the parent's `react-dom/client`, so generated modules
 * see the same hook dispatcher and `SiteRuntimeProvider` context.
 *
 * v0 data envelope: empty collections + variables. Sites are typically not
 * published while editing, and `useCollection` / `useVariable` already degrade
 * gracefully when keys are missing.
 */

import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as SiteRuntime from '@asap/site-runtime';
import {
  GeneratedSection,
  SiteRuntimeProvider,
  type CompiledSectionModule,
  type SectionRef,
  type SiteData,
} from '@asap/site-runtime';
import { defaultDesignTokens } from '@asap/shared';
import type { WebsiteElement } from '@/lib/api';
import { emitStudioEvent } from '@/lib/events/studio-events';

const DEPS: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
  'react/jsx-dev-runtime': ReactJsxRuntime,
  '@asap/site-runtime': SiteRuntime,
};

/**
 * Idempotently install the `__asapDeps` bridge on the given window (or
 * `globalThis` if none provided). Generated modules are imported in the
 * realm that calls `import()` — currently the parent app — so the parent
 * global is what matters. The iframe window is also patched for safety
 * in case future code paths import from within the iframe context.
 */
export function ensureSiteRuntimeDeps(target?: Window | null): void {
  const installOn = (g: { __asapDeps?: (name: string) => unknown } | undefined | null) => {
    if (!g) return;
    if (g.__asapDeps) return;
    g.__asapDeps = (name: string) => {
      const dep = DEPS[name];
      if (!dep) {
        throw new Error(`__asapDeps: '${name}' is not exposed to AI-generated sections`);
      }
      return dep;
    };
  };
  installOn(globalThis as { __asapDeps?: (name: string) => unknown });
  if (target) {
    installOn(target as unknown as { __asapDeps?: (name: string) => unknown });
  }
}

const EMPTY_DATA: SiteData = { collections: {}, variables: {} };
const TOKENS = defaultDesignTokens();

interface GeneratedSectionInlineProps {
  element: WebsiteElement;
  apiBase: string;
}

export function GeneratedSectionInline({ element, apiBase }: GeneratedSectionInlineProps) {
  if (!element.compiled_js) {
    return <NotGeneratedPlaceholder element={element} />;
  }

  const moduleUrl = buildModuleUrl(apiBase, element);
  const sectionRef: SectionRef = {
    id: element.id,
    knobs: extractKnobDefaults(element),
    load: () => import(/* @vite-ignore */ moduleUrl) as Promise<CompiledSectionModule>,
  };

  return (
    <SiteRuntimeProvider tokens={TOKENS} data={EMPTY_DATA}>
      <GeneratedSection
        section={sectionRef}
        fallback={<SectionFallback element={element} />}
      />
    </SiteRuntimeProvider>
  );
}

function buildModuleUrl(apiBase: string, element: WebsiteElement): string {
  // Cache-bust on updated_at so regenerating a section reloads a fresh module.
  const version = encodeURIComponent(element.updated_at ?? '');
  return `${apiBase}/public/sections/${element.id}/module.js?v=${version}`;
}

function extractKnobDefaults(element: WebsiteElement): Record<string, unknown> | undefined {
  const schema = element.knobs_schema as
    | { knobs?: Array<{ name: string; default?: unknown }> }
    | null
    | undefined;
  const knobs = schema?.knobs;
  if (!knobs || knobs.length === 0) return undefined;
  const out: Record<string, unknown> = {};
  for (const knob of knobs) {
    if (knob.default !== undefined) out[knob.name] = knob.default;
  }
  return out;
}

function NotGeneratedPlaceholder({ element }: { element: WebsiteElement }) {
  const label = element.title || element.element_type;
  return (
    <section
      data-element-id={element.id}
      style={{
        padding: '2.5rem 1.5rem',
        borderTop: '1px dashed hsl(var(--border))',
        borderBottom: '1px dashed hsl(var(--border))',
        background: 'hsl(var(--muted) / 0.3)',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
        {label}
      </p>
      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
        No code generated for this section yet.
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          emitStudioEvent({ kind: 'select-section', sectionId: element.id, tab: 'code' });
        }}
        style={{
          marginTop: 12,
          padding: '0.4rem 0.85rem',
          fontSize: 12,
          fontWeight: 600,
          color: 'hsl(var(--primary-foreground))',
          background: 'hsl(var(--primary))',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Generate with AI
      </button>
    </section>
  );
}

function SectionFallback({ element }: { element: WebsiteElement }) {
  return (
    <div
      data-element-id={element.id}
      style={{
        padding: '1.5rem',
        textAlign: 'center',
        color: 'hsl(var(--muted-foreground))',
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Loading section…
    </div>
  );
}

export default GeneratedSectionInline;
