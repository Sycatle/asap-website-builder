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
  
  /* Studio element selection styles */
  .studio-element-wrapper {
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  
  .studio-element-wrapper:hover {
    outline: 2px solid hsl(var(--primary) / 0.4);
    outline-offset: 2px;
  }
  
  .studio-element-wrapper.selected {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse-ring {
    0%, 100% {
      outline-color: hsl(var(--primary));
    }
    50% {
      outline-color: hsl(var(--primary) / 0.6);
    }
  }
  
  .studio-element-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 0.5rem;
    background: linear-gradient(to bottom, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0));
    backdrop-filter: blur(4px);
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.2s ease-in-out;
    z-index: 10;
    pointer-events: none;
  }
  
  .studio-element-wrapper.selected .studio-element-overlay {
    opacity: 1;
    transform: translateY(0);
  }
  
  .studio-element-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
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
      if (!iframeDoc) {
        console.warn('Iframe document not accessible');
        return;
      }

      // Ensure document is open for writing
      if (iframeDoc.readyState === 'loading') {
        // Wait for document to be ready
        iframe.contentWindow?.addEventListener('DOMContentLoaded', () => {
          setupIframeDocument();
        }, { once: true });
        return;
      }

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
            // Skip external stylesheets (cross-origin) - they can't be accessed
            if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
              if (sheet.cssRules) {
                Array.from(sheet.cssRules).forEach(rule => {
                  combinedCss += rule.cssText + '\n';
                });
              }
            }
          } catch (e) {
            // Cross-origin stylesheets can't be accessed - skip silently
            console.debug('Skipping stylesheet due to CORS:', sheet.href);
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
              sortedElements.map((element) => {
                const isSelected = selectedElementId === element.id;
                const elementTypeLabel = element.element_type
                  .replace(/-/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                return (
                  <div
                    key={element.id}
                    data-element-id={element.id}
                    className={`studio-element-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick?.(element.id);
                    }}
                  >
                    {isSelected && (
                      <div className="studio-element-overlay">
                        <div className="studio-element-label">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                            <line x1="15" y1="3" x2="15" y2="21"></line>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="3" y1="15" x2="21" y2="15"></line>
                          </svg>
                          <span>{element.title || elementTypeLabel}</span>
                        </div>
                      </div>
                    )}
                    <SectionRenderer
                      element={element}
                      isSelected={isSelected}
                      onClick={() => onElementClick?.(element.id)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </PreviewProvider>
      );
    }, [iframeReady, elements, selectedElementId, onElementClick, device]);

    // Scroll to selected element when selection changes
    useEffect(() => {
      if (!iframeReady || !selectedElementId) return;

      const iframe = iframeRef.current;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc) return;

      // Find the selected element wrapper
      const selectedWrapper = iframeDoc.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedWrapper) {
        // Scroll with smooth animation - use 'start' to show top of element
        // Add a small delay to ensure the element is rendered
        setTimeout(() => {
          selectedWrapper.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
          });
        }, 100);
      }
    }, [iframeReady, selectedElementId]);

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
