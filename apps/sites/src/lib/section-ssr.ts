/**
 * Server-side renderer for AI-generated sections.
 *
 * The codegen pipeline emits ESM that calls `globalThis.__asapDeps(name)` for
 * every external (React, jsx-runtime, @asap/site-runtime). We expose that
 * resolver on the Node global, then dynamic-`import()` the compiled JS via a
 * data URL — Node's loader picks it up as a real ES module so `export default`
 * works natively. ReactDOMServer renders the component to an HTML string that
 * Astro injects with `set:html`, giving us a pre-rendered DOM for SEO and
 * faster first paint. No hydration: v0 sections are pure content.
 *
 * The fetched compiled JS and the imported module are both cached by a hash
 * of the JS payload so re-renders within a worker stay cheap, and a re-publish
 * (which changes the JS) cleanly invalidates the cache.
 */

import { createHash } from 'node:crypto';
import { LRUCache } from 'lru-cache';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactJsxDevRuntime from 'react/jsx-dev-runtime';
import { renderToString } from 'react-dom/server';
import * as SiteRuntime from '@asap/site-runtime';
import { SiteRuntimeProvider, type SiteData } from '@asap/site-runtime';
import type { DesignTokens } from '@asap/shared/types';
import type { SiteRenderSection } from '@asap/shared';

const INTERNAL_API_URL =
  import.meta.env.INTERNAL_API_URL ||
  import.meta.env.PUBLIC_API_URL ||
  'http://localhost:3000/api';

// Inject the dependency resolver once per process. Generated modules look up
// React et al. through this global, so it must be set before any data-URL
// import resolves.
const DEPS: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
  'react/jsx-dev-runtime': ReactJsxDevRuntime,
  '@asap/site-runtime': SiteRuntime,
};
{
  const g = globalThis as { __asapDeps?: (name: string) => unknown };
  if (!g.__asapDeps) {
    g.__asapDeps = (name: string) => {
      const dep = DEPS[name];
      if (!dep) {
        throw new Error(`__asapDeps: '${name}' is not exposed to AI-generated sections`);
      }
      return dep;
    };
  }
}

interface CompiledModule {
  default: React.ComponentType<Record<string, unknown>>;
}

// Cache imported modules by content hash — the data URL itself encodes the
// content, so Node's loader would already dedupe, but we still want to skip
// the fetch + base64 work on hot paths.
const moduleCache = new LRUCache<string, Promise<CompiledModule>>({
  max: 256,
  ttl: 1000 * 60 * 60,
});

// Cache the rendered HTML keyed by (content hash + props hash + data hash).
// Same section + same data + same knobs → identical HTML, no re-render.
const htmlCache = new LRUCache<string, string>({
  max: 256,
  ttl: 1000 * 60 * 60,
});

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

async function fetchCompiledJs(moduleUrl: string): Promise<string | null> {
  // Public module URLs come back from the API as origin-relative paths like
  // `/api/public/sections/<id>/module.js`; turn them into an absolute URL
  // pointing at the internal API endpoint so SSR works inside Docker too.
  const absolute = moduleUrl.startsWith('http')
    ? moduleUrl
    : `${stripApiSuffix(INTERNAL_API_URL)}${moduleUrl}`;
  try {
    const res = await fetch(absolute);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error('section-ssr: failed to fetch compiled JS', moduleUrl, err);
    return null;
  }
}

function stripApiSuffix(base: string): string {
  // Module URLs already include `/api/...`. If the configured base ends with
  // `/api`, drop it to avoid `/api/api/...`.
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

function loadModule(hash: string, compiledJs: string): Promise<CompiledModule> {
  const cached = moduleCache.get(hash);
  if (cached) return cached;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(compiledJs).toString('base64')}`;
  // Disable Vite static-analysis: this is a Node-side dynamic import of a
  // data URL, not a build-time module specifier.
  const promise = import(/* @vite-ignore */ dataUrl) as Promise<CompiledModule>;
  moduleCache.set(hash, promise);
  // Evict on rejection so a transient error doesn't poison the cache.
  promise.catch(() => moduleCache.delete(hash));
  return promise;
}

export interface RenderSectionArgs {
  section: SiteRenderSection;
  tokens: DesignTokens;
  data: SiteData;
}

/**
 * Renders a section to an HTML string. Returns `null` when the section has no
 * compiled JS yet (caller should fall back to a placeholder) or when something
 * fails — the page must keep loading even if one section blows up.
 */
export async function renderSection(args: RenderSectionArgs): Promise<string | null> {
  const { section, tokens, data } = args;
  if (!section.module_url) return null;

  const compiledJs = await fetchCompiledJs(section.module_url);
  if (!compiledJs) return null;

  const codeHash = sha1(compiledJs);
  // Knobs + data shape both affect output. We hash data lazily once per call;
  // typical pages have few sections so this isn't worth memoizing further.
  const propsKey = sha1(
    JSON.stringify({
      knobs: section.settings ?? {},
      data,
      tokens,
    }),
  );
  const cacheKey = `${codeHash}:${propsKey}`;
  const cachedHtml = htmlCache.get(cacheKey);
  if (cachedHtml !== undefined) return cachedHtml;

  try {
    const mod = await loadModule(codeHash, compiledJs);
    const Section = mod.default;
    const knobs = (section.settings ?? {}) as Record<string, unknown>;
    const tree = React.createElement(
      SiteRuntimeProvider,
      // children is passed positionally so the typed props don't require it.
      { tokens, data, children: React.createElement(Section, knobs) },
    );
    const html = renderToString(tree);
    htmlCache.set(cacheKey, html);
    return html;
  } catch (err) {
    console.error(`section-ssr: render failed for ${section.id}`, err);
    return null;
  }
}
