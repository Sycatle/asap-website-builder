"use client"

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WebsiteElement } from '@/lib/api';
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
  }
  
  .studio-element-wrapper::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid transparent;
    pointer-events: none;
    z-index: 99999;
    transition: border-color 0.15s ease;
  }
  
  .studio-element-wrapper:hover::after {
    border-color: hsl(var(--primary) / 0.4);
  }
  
  .studio-element-wrapper.selected::after {
    border-color: hsl(var(--primary));
  }
  
  /* Sticky toolbar container - positioned at top of viewport within element bounds */
  .studio-element-sticky-container {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    pointer-events: none;
    height: 0;
    overflow: visible;
  }
  
  .studio-element-sticky-inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.5rem;
    pointer-events: none;
  }
  
  .studio-element-overlay {
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }
  
  .studio-element-wrapper.selected .studio-element-overlay {
    opacity: 1;
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
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
  }

  /* Quick action bar - follows main app theme via data-app-theme attribute */
  .studio-quick-actions {
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }
  
  .studio-element-wrapper.selected .studio-quick-actions {
    opacity: 1;
    pointer-events: auto;
  }
  
  /* Light mode (default) */
  .studio-quick-actions-bar {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
    border: 1px solid hsl(240 5.9% 90%);
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
  
  .studio-quick-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
    color: hsl(240 10% 3.9%);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  
  .studio-quick-action-btn:hover {
    background: hsl(240 4.8% 95.9%);
  }
  
  .studio-quick-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .studio-quick-action-btn.delete:hover {
    background: hsl(0 84.2% 60.2% / 0.1);
    color: hsl(0 84.2% 60.2%);
  }
  
  .studio-quick-action-separator {
    width: 1px;
    height: 1rem;
    background: hsl(240 5.9% 90%);
    margin: 0 0.125rem;
  }
  
  /* Dark mode - when app is in dark mode */
  [data-app-theme="dark"] .studio-quick-actions-bar {
    background: rgba(30, 30, 35, 0.95);
    border-color: hsl(240 3.7% 20%);
  }
  
  [data-app-theme="dark"] .studio-quick-action-btn {
    color: hsl(0 0% 98%);
  }
  
  [data-app-theme="dark"] .studio-quick-action-btn:hover {
    background: hsl(240 3.7% 15.9%);
  }
  
  [data-app-theme="dark"] .studio-quick-action-btn.delete:hover {
    background: hsl(0 62.8% 30.6% / 0.2);
    color: hsl(0 84.2% 60.2%);
  }
  
  [data-app-theme="dark"] .studio-quick-action-separator {
    background: hsl(240 3.7% 20%);
  }
`;

interface PreviewFrameProps {
  websiteId: string;
  elements: WebsiteElement[];
  pageId?: string;
  previewTheme: PreviewTheme;
  appTheme?: 'light' | 'dark';
  selectedElementId?: string | null;
  onElementClick?: (elementId: string) => void;
  onElementDuplicate?: (elementId: string) => void;
  onElementDelete?: (elementId: string) => void;
  onElementMoveUp?: (elementId: string) => void;
  onElementMoveDown?: (elementId: string) => void;
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
    websiteId: _websiteId,
    elements,
    pageId: _pageId,
    previewTheme,
    appTheme = 'light',
    selectedElementId,
    onElementClick,
    onElementDuplicate,
    onElementDelete,
    onElementMoveUp,
    onElementMoveDown,
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
          <div className="min-h-screen" data-app-theme={appTheme}>
            {sortedElements.length === 0 ? (
              <div className="flex items-center justify-center h-screen text-muted-foreground">
                <p>Aucun élément à afficher</p>
              </div>
            ) : (
              sortedElements.map((element, index) => {
                const isSelected = selectedElementId === element.id;
                const isFirst = index === 0;
                const isLast = index === sortedElements.length - 1;
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
                    {/* Sticky toolbar container */}
                    {isSelected && (
                      <div className="studio-element-sticky-container">
                        <div className="studio-element-sticky-inner">
                          {/* Element label */}
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
                          
                          {/* Quick action bar */}
                          <div className="studio-quick-actions">
                            <div className="studio-quick-actions-bar">
                              {/* Move up */}
                              <button
                                className="studio-quick-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onElementMoveUp?.(element.id);
                                }}
                                disabled={isFirst}
                                title="Déplacer vers le haut"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m18 15-6-6-6 6"/>
                                </svg>
                              </button>
                              
                              {/* Move down */}
                              <button
                                className="studio-quick-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onElementMoveDown?.(element.id);
                                }}
                                disabled={isLast}
                                title="Déplacer vers le bas"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m6 9 6 6 6-6"/>
                                </svg>
                              </button>
                              
                              <div className="studio-quick-action-separator" />
                              
                              {/* Duplicate */}
                              <button
                                className="studio-quick-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onElementDuplicate?.(element.id);
                                }}
                                title="Dupliquer"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                </svg>
                              </button>
                              
                              <div className="studio-quick-action-separator" />
                              
                              {/* Delete */}
                              <button
                                className="studio-quick-action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onElementDelete?.(element.id);
                                }}
                                title="Supprimer"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"/>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div
                      data-element-id={element.id}
                      title={element.title || element.element_type}
                      style={{
                        padding: '32px',
                        border: '1px dashed var(--border, #ccc)',
                        background: 'var(--muted, #f5f5f5)',
                        color: 'var(--muted-foreground, #666)',
                        borderRadius: 8,
                        textAlign: 'center',
                        margin: '12px 0',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {element.title || element.element_type}
                      </div>
                      <div style={{ opacity: 0.7 }}>
                        (preview indisponible — sera branchée au commit 2)
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PreviewProvider>
      );
    }, [iframeReady, elements, selectedElementId, onElementClick, onElementDuplicate, onElementDelete, onElementMoveUp, onElementMoveDown, device, appTheme]);

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
