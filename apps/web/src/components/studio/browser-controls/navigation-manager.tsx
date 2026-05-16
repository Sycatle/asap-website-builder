"use client"

import React, { useCallback, useEffect, useRef } from 'react';

export interface NavigationState {
  url: string;
  title?: string;
  timestamp: number;
}

interface UseNavigationOptions {
  initialUrl?: string;
  baseUrl: string; // Base URL of the website being edited
  onNavigate?: (url: string) => void;
}

export function useNavigation({
  initialUrl = '/',
  baseUrl,
  onNavigate,
}: UseNavigationOptions) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [history, setHistory] = React.useState<NavigationState[]>([
    { url: initialUrl, timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = React.useState(false);

  const currentUrl = history[currentIndex]?.url || initialUrl;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  // Normalize URL to always be relative to the site
  const normalizeUrl = useCallback((url: string): string => {
    // Remove any protocol and domain
    let normalized = url.replace(/^https?:\/\/[^/]+/, '');
    
    // Ensure it starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    
    // Remove trailing slash unless it's just "/"
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  }, []);

  // Check if URL is internal (belongs to the website being edited)
  const isInternalUrl = useCallback((url: string): boolean => {
    const normalized = normalizeUrl(url);
    
    // Always allow root and relative paths
    if (normalized.startsWith('/')) {
      return true;
    }
    
    // Check if it matches the base URL
    if (url.includes(baseUrl)) {
      return true;
    }
    
    // Block external URLs
    if (url.match(/^https?:\/\//)) {
      return false;
    }
    
    return true;
  }, [baseUrl, normalizeUrl]);

  // Navigate to a URL
  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    
    // Prevent navigation to external URLs
    if (!isInternalUrl(url)) {
      return;
    }

    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setHistory(prev => {
        // Remove any forward history when navigating to new page
        const newHistory = prev.slice(0, currentIndex + 1);
        return [...newHistory, { url: normalized, timestamp: Date.now() }];
      });
      
      setCurrentIndex(prev => prev + 1);
      onNavigate?.(normalized);
      setIsLoading(false);
    }, 200);
  }, [currentIndex, isInternalUrl, normalizeUrl, onNavigate]);

  // Go back in history
  const goBack = useCallback(() => {
    if (canGoBack) {
      setIsLoading(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        const newUrl = history[currentIndex - 1].url;
        onNavigate?.(newUrl);
        setIsLoading(false);
      }, 100);
    }
  }, [canGoBack, currentIndex, history, onNavigate]);

  // Go forward in history
  const goForward = useCallback(() => {
    if (canGoForward) {
      setIsLoading(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        const newUrl = history[currentIndex + 1].url;
        onNavigate?.(newUrl);
        setIsLoading(false);
      }, 100);
    }
  }, [canGoForward, currentIndex, history, onNavigate]);

  // Refresh current page
  const refresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      onNavigate?.(currentUrl);
      setIsLoading(false);
    }, 300);
  }, [currentUrl, onNavigate]);

  // Go to home page
  const goHome = useCallback(() => {
    if (currentUrl !== '/') {
      navigate('/');
    }
  }, [currentUrl, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Alt + Left Arrow: Go back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      
      // Alt + Right Arrow: Go forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
      
      // Ctrl/Cmd + R: Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refresh();
      }
      
      // Alt + Home: Go home
      if (e.altKey && e.key === 'Home') {
        e.preventDefault();
        goHome();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [goBack, goForward, refresh, goHome]);

  return {
    currentUrl,
    canGoBack,
    canGoForward,
    isLoading,
    navigate,
    goBack,
    goForward,
    refresh,
    goHome,
    history,
  };
}

/**
 * Hook to intercept link clicks in the preview iframe and handle internal navigation
 */
export function usePreviewLinkInterceptor(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  onNavigate: (url: string) => void,
  baseUrl: string
) {
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      // Intercept all link clicks
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Check if it's an internal link
        if (href.startsWith('/') || href.startsWith('#') || href.startsWith(baseUrl)) {
          e.preventDefault();
          
          // Handle anchor links (scroll to element)
          if (href.startsWith('#')) {
            const element = iframeDoc.getElementById(href.slice(1));
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
            return;
          }
          
          // Navigate to internal page
          onNavigate(href);
        } else {
          // External link - prevent navigation in preview
          e.preventDefault();
        }
      };

      iframeDoc.addEventListener('click', handleClick);

      return () => {
        iframeDoc.removeEventListener('click', handleClick);
      };
    };

    iframe.addEventListener('load', handleLoad);
    
    // Also set up for the current document if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [iframeRef, onNavigate, baseUrl]);
}
