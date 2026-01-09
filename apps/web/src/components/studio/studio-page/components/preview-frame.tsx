"use client"

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WebsiteElement } from '@/lib/api';
import { SectionRenderer } from '../../section-renderers';
import { PreviewProvider } from '../../preview-context';
import type { PreviewTheme } from '../types';
import type { DevicePreview } from '../types';

/**
 * CSS Variables for light/dark themes matching the public sites
 */
const THEME_STYLES = {
  light: `
    :root {
      --radius: 0.75rem;
      --background: 0 0% 100%;
      --foreground: 240 10% 3.9%;
      --card: 0 0% 100%;
      --card-foreground: 240 10% 3.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 240 10% 3.9%;
      --primary: 239 84% 67%;
      --primary-foreground: 0 0% 100%;
      --secondary: 240 4.8% 95.9%;
      --secondary-foreground: 240 5.9% 10%;
      --muted: 240 4.8% 95.9%;
      --muted-foreground: 240 3.8% 46.1%;
      --accent: 240 4.8% 95.9%;
      --accent-foreground: 240 5.9% 10%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 5.9% 90%;
      --input: 240 5.9% 90%;
      --ring: 239 84% 67%;
    }
  `,
  dark: `
    :root {
      --radius: 0.75rem;
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --card: 240 10% 6%;
      --card-foreground: 0 0% 98%;
      --popover: 240 10% 6%;
      --popover-foreground: 0 0% 98%;
      --primary: 239 84% 67%;
      --primary-foreground: 0 0% 100%;
      --secondary: 240 3.7% 15.9%;
      --secondary-foreground: 0 0% 98%;
      --muted: 240 5% 12%;
      --muted-foreground: 240 5% 64.9%;
      --accent: 240 3.7% 15.9%;
      --accent-foreground: 0 0% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 3.7% 20%;
      --input: 240 3.7% 15.9%;
      --ring: 239 84% 67%;
    }
  `,
};

/**
 * Base styles that match the public site
 */
const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; overflow: auto; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
  #preview-root { min-height: 100%; }
`;

interface PreviewFrameProps {
  websiteId: string;
  elements: WebsiteElement[];
  pageId?: string;
  previewTheme: PreviewTheme;
  selectedElementId?: string | null;
  onElementClick?: (elementId: string) => void;
  onReady?: () => void;
  className?: string;
  device?: DevicePreview;
}

export interface PreviewFrameHandle {
  getIframeRef: () => HTMLIFrameElement | null;
  captureScreenshot: () => Promise<string>;
}

/**
 * PreviewFrame - Renders React content inside an iframe with its own React root
 * 
 * Instead of createPortal (which doesn't work with hooks across iframe boundaries),
 * we create a new React root inside the iframe. This gives the iframe its own
 * React context, allowing hooks to work correctly.
 */
export const PreviewFrame = forwardRef<PreviewFrameHandle, PreviewFrameProps>(
  function PreviewFrame({ 
    websiteId,
    elements,
    pageId,
    previewTheme, 
    selectedElementId,
    onElementClick,
    onReady,
    className,
    device = 'desktop',
  }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const rootRef = useRef<Root | null>(null);
    const [iframeReady, setIframeReady] = useState(false);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getIframeRef: () => iframeRef.current,
      captureScreenshot: async () => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument || !iframe?.contentWindow) {
          throw new Error('Iframe not ready');
        }
        
        const root = iframe.contentDocument.getElementById('preview-root');
        if (!root) throw new Error('Preview root not found');
        
        // Import html2canvas dynamically
        const html2canvas = (await import('html2canvas')).default;
        
        // Capture with the iframe's window context
        const canvas = await html2canvas(root, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: previewTheme === 'dark' ? '#0a0a0b' : '#ffffff',
          scale: 1,
          logging: false,
          // Use the iframe's window for proper rendering context
          windowWidth: iframe.contentWindow.innerWidth,
          windowHeight: iframe.contentWindow.innerHeight,
          // Ignore cross-origin images that might fail
          onclone: (clonedDoc) => {
            // Ensure styles are applied to cloned document
            const clonedRoot = clonedDoc.getElementById('preview-root');
            if (clonedRoot) {
              clonedRoot.style.backgroundColor = previewTheme === 'dark' ? '#0a0a0b' : '#ffffff';
            }
          },
        });
        
        return canvas.toDataURL('image/png');
      },
    }), [previewTheme]);

    // Setup iframe document
    const setupIframeDocument = useCallback(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Setup document structure
      const html = iframeDoc.documentElement;
      html.setAttribute('lang', 'fr');
      html.className = previewTheme === 'dark' ? 'dark' : '';

      // Create head content
      iframeDoc.head.innerHTML = `
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style id="theme-vars">${THEME_STYLES[previewTheme]}</style>
        <style id="base-styles">${BASE_STYLES}</style>
        <style id="tailwind-styles"></style>
      `;

      // Copy Tailwind styles from parent
      const tailwindStyle = iframeDoc.getElementById('tailwind-styles');
      if (tailwindStyle) {
        let combinedCss = '';
        Array.from(document.styleSheets).forEach(sheet => {
          try {
            if (sheet.cssRules) {
              Array.from(sheet.cssRules).forEach(rule => {
                combinedCss += rule.cssText + '\n';
              });
            }
          } catch {
            // Cross-origin stylesheets can't be accessed
          }
        });
        tailwindStyle.textContent = combinedCss;
      }

      // Create body content
      iframeDoc.body.innerHTML = '<div id="preview-root"></div>';
      iframeDoc.body.style.cssText = 'margin: 0; padding: 0; min-height: 100%; overflow-y: auto; overflow-x: hidden;';

      setIframeReady(true);
      onReady?.();
    }, [previewTheme, onReady]);

    // Handle iframe load
    const handleIframeLoad = useCallback(() => {
      setupIframeDocument();
    }, [setupIframeDocument]);

    // Create/Update React root inside iframe
    useEffect(() => {
      if (!iframeReady) return;

      const iframe = iframeRef.current;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc) return;

      const mountNode = iframeDoc.getElementById('preview-root');
      if (!mountNode) return;

      // Create root if not exists
      if (!rootRef.current) {
        rootRef.current = createRoot(mountNode);
      }

      // Sort elements by position
      const sortedElements = [...elements]
        .filter(e => e && e.id && e.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // Render content
      rootRef.current.render(
        <PreviewProvider device={device}>
          <div className="min-h-screen">
            {sortedElements.length === 0 ? (
              <div className="flex items-center justify-center h-screen text-muted-foreground">
                <p>Aucun élément à afficher</p>
              </div>
            ) : (
              sortedElements.map((element) => (
                <div
                  key={element.id}
                  data-element-id={element.id}
                  className={selectedElementId === element.id ? 'ring-2 ring-primary ring-offset-2' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    onElementClick?.(element.id);
                  }}
                >
                  <SectionRenderer
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onClick={() => onElementClick?.(element.id)}
                  />
                </div>
              ))
            )}
          </div>
        </PreviewProvider>
      );
    }, [iframeReady, elements, selectedElementId, onElementClick, device]);

    // Update theme when it changes
    useEffect(() => {
      if (!iframeReady) return;

      const iframe = iframeRef.current;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc) return;

      const html = iframeDoc.documentElement;
      html.className = previewTheme === 'dark' ? 'dark' : '';

      const themeVars = iframeDoc.getElementById('theme-vars');
      if (themeVars) {
        themeVars.textContent = THEME_STYLES[previewTheme];
      }
    }, [iframeReady, previewTheme]);

    // Cleanup
    useEffect(() => {
      return () => {
        rootRef.current?.unmount();
        rootRef.current = null;
      };
    }, []);

    return (
      <iframe
        ref={iframeRef}
        className={className}
        onLoad={handleIframeLoad}
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          display: 'block',
          background: previewTheme === 'dark' ? 'hsl(240 10% 3.9%)' : 'white',
        }}
        title="Preview"
      />
    );
  }
);

export default PreviewFrame;
