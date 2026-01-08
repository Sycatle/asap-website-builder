"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PreviewTheme } from '../types';

/**
 * CSS Variables for light/dark themes matching the public sites
 * These are copied from apps/sites/src/styles/global.css
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
 * Base styles that match the public site (from apps/sites global.css)
 */
const BASE_STYLES = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  html {
    scroll-behavior: smooth;
  }
  
  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    min-height: 100%;
  }
  
  ::selection {
    background-color: hsl(var(--primary) / 0.3);
    color: hsl(var(--foreground));
  }
  
  /* Utility classes for HSL colors */
  .bg-background { background-color: hsl(var(--background)); }
  .bg-foreground { background-color: hsl(var(--foreground)); }
  .bg-card { background-color: hsl(var(--card)); }
  .bg-primary { background-color: hsl(var(--primary)); }
  .bg-secondary { background-color: hsl(var(--secondary)); }
  .bg-muted { background-color: hsl(var(--muted)); }
  .bg-accent { background-color: hsl(var(--accent)); }
  .bg-destructive { background-color: hsl(var(--destructive)); }
  
  .text-foreground { color: hsl(var(--foreground)); }
  .text-card-foreground { color: hsl(var(--card-foreground)); }
  .text-primary { color: hsl(var(--primary)); }
  .text-primary-foreground { color: hsl(var(--primary-foreground)); }
  .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
  .text-muted-foreground { color: hsl(var(--muted-foreground)); }
  .text-accent-foreground { color: hsl(var(--accent-foreground)); }
  
  .border-border { border-color: hsl(var(--border)); }
  .border-input { border-color: hsl(var(--input)); }
  
  .ring-ring { --tw-ring-color: hsl(var(--ring)); }
`;

interface PreviewFrameProps {
  children: React.ReactNode;
  previewTheme: PreviewTheme;
  className?: string;
}

/**
 * PreviewFrame - Isolated iframe for WYSIWYG preview
 * 
 * Uses an iframe to completely isolate the preview styles from the dashboard.
 * This ensures Tailwind's dark mode works correctly (class on html element)
 * and the preview matches the public site exactly.
 */
export function PreviewFrame({ children, previewTheme, className }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Setup the document structure
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
    iframeDoc.body.style.margin = '0';
    iframeDoc.body.style.padding = '0';

    // Set mount node for portal
    const root = iframeDoc.getElementById('preview-root');
    setMountNode(root);
  }, [previewTheme]);

  // Update theme when previewTheme changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !mountNode) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Update html class using classList to avoid React tracking issues
    const html = iframeDoc.documentElement;
    if (previewTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Update theme variables
    const themeVars = iframeDoc.getElementById('theme-vars');
    if (themeVars) {
      themeVars.textContent = THEME_STYLES[previewTheme];
    }
  }, [previewTheme, mountNode]);

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
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}

export default PreviewFrame;
