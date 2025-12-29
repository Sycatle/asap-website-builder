"use client"

/**
 * Preview Context
 * 
 * Provides preview settings (device, dark mode) to all components
 * rendered within the Studio preview canvas.
 * 
 * Components can use this context to adapt their rendering based on
 * the simulated device size, independent of the actual viewport.
 */

import * as React from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { DevicePreview } from './studio-page/types';

// ============================================
// Types
// ============================================

export interface PreviewContextValue {
  /** Current device preview mode */
  device: DevicePreview;
  /** Whether dark mode is enabled in preview */
  isDarkMode: boolean;
  /** Helper: is mobile device preview */
  isMobile: boolean;
  /** Helper: is tablet device preview */
  isTablet: boolean;
  /** Helper: is desktop device preview */
  isDesktop: boolean;
  /** Responsive class helper - returns appropriate class based on device */
  responsive: <T>(options: { mobile?: T; tablet?: T; desktop: T }) => T;
}

// ============================================
// Context
// ============================================

const PreviewContext = createContext<PreviewContextValue | null>(null);

// ============================================
// Provider
// ============================================

export interface PreviewProviderProps {
  children: React.ReactNode;
  device: DevicePreview;
  isDarkMode?: boolean;
}

export function PreviewProvider({ 
  children, 
  device, 
  isDarkMode = false 
}: PreviewProviderProps) {
  const value = useMemo<PreviewContextValue>(() => ({
    device,
    isDarkMode,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    responsive: <T,>(options: { mobile?: T; tablet?: T; desktop: T }): T => {
      if (device === 'mobile' && options.mobile !== undefined) {
        return options.mobile;
      }
      if (device === 'tablet' && options.tablet !== undefined) {
        return options.tablet;
      }
      return options.desktop;
    },
  }), [device, isDarkMode]);

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Hook to access preview context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, responsive } = usePreviewContext();
 *   
 *   return (
 *     <div className={responsive({
 *       mobile: 'flex-col gap-2',
 *       tablet: 'flex-col gap-4',
 *       desktop: 'flex-row gap-8'
 *     })}>
 *       {isMobile ? <MobileLayout /> : <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreviewContext(): PreviewContextValue {
  const context = useContext(PreviewContext);
  
  // Return default values if used outside provider (for standalone usage)
  if (!context) {
    return {
      device: 'desktop',
      isDarkMode: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      responsive: (options) => options.desktop,
    };
  }
  
  return context;
}

/**
 * Hook to check if we're inside a preview context
 */
export function useIsInPreview(): boolean {
  return useContext(PreviewContext) !== null;
}

// ============================================
// Utility: Responsive CSS Classes
// ============================================

/**
 * Generate responsive class strings based on preview device
 * 
 * @example
 * ```tsx
 * const { device } = usePreviewContext();
 * const gridCols = getResponsiveClass(device, {
 *   mobile: 'grid-cols-1',
 *   tablet: 'grid-cols-2', 
 *   desktop: 'grid-cols-3'
 * });
 * ```
 */
export function getResponsiveClass(
  device: DevicePreview,
  classes: { mobile?: string; tablet?: string; desktop: string }
): string {
  switch (device) {
    case 'mobile':
      return classes.mobile ?? classes.desktop;
    case 'tablet':
      return classes.tablet ?? classes.desktop;
    default:
      return classes.desktop;
  }
}

/**
 * Generate responsive values based on preview device
 */
export function getResponsiveValue<T>(
  device: DevicePreview,
  values: { mobile?: T; tablet?: T; desktop: T }
): T {
  switch (device) {
    case 'mobile':
      return values.mobile ?? values.desktop;
    case 'tablet':
      return values.tablet ?? values.desktop;
    default:
      return values.desktop;
  }
}

export default PreviewContext;
