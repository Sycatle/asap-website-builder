"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSitesBaseUrl } from "@/lib/api/base-url";
import type { WebsiteElement } from "@/lib/types/element";

interface Props {
  element: WebsiteElement;
  /** Slug of the website the element belongs to, used to build the preview URL. */
  websiteSlug: string;
  /** Bumped by the parent after a successful `compileCode` so the iframe reloads. */
  refreshNonce?: number;
}

/**
 * Iframe pointing at the multi-tenant `apps/sites` runtime, scrolled to the
 * section being edited. The runtime fetches the freshly persisted
 * `compiled_js` on each load, so saving the editor + clicking refresh is
 * enough to see the new render.
 *
 * We deliberately don't try to do a hot-reload through postMessage yet —
 * `<GeneratedSection>` dynamic-imports a per-section URL, and a full reload
 * is the simplest way to defeat the browser's module cache.
 */
export function SectionLivePreview({ element, websiteSlug, refreshNonce = 0 }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [autoReloadKey, setAutoReloadKey] = useState(0);

  const baseUrl = useMemo(() => {
    const sites = getSitesBaseUrl();
    // `#element-<id>` is honored by the runtime: each section is mounted
    // with `data-element-id`, and Astro's BaseLayout includes a tiny
    // scroll-into-view script in dev that responds to the hash.
    return `${sites}/${websiteSlug.toLowerCase()}#element-${element.id}`;
  }, [websiteSlug, element.id]);

  // Bump the iframe key whenever the parent signals a recompile.
  useEffect(() => {
    setAutoReloadKey((k) => k + 1);
  }, [refreshNonce, element.id]);

  const handleReload = () => setAutoReloadKey((k) => k + 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Aperçu en direct
          </p>
          <p className="text-xs text-muted-foreground">
            Servi par <code className="font-mono">{getSitesBaseUrl()}</code>.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleReload}
            title="Recharger l'aperçu"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1 inline-flex"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="rounded-md border bg-background overflow-hidden">
        <iframe
          key={autoReloadKey}
          ref={iframeRef}
          src={baseUrl}
          className="w-full h-[420px] block"
          // sandbox is intentionally permissive here: the iframe origin is
          // our own `apps/sites`, not user-controlled content. We still
          // forbid top-navigation to keep clicks contained inside the
          // preview.
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
          title={`Aperçu — ${element.title || element.element_type}`}
        />
      </div>
    </div>
  );
}
