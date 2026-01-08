/**
 * StudioPage Types
 */

export type DevicePreview = 'desktop' | 'tablet' | 'mobile';
export type PreviewTheme = 'light' | 'dark';

export interface StudioPageProps {
  onBack?: () => void;
}

export interface SimplePreviewCanvasProps {
  elements: Array<import('@/lib/types').WebsiteElement>;
  devicePreview: DevicePreview;
  previewTheme: PreviewTheme;
  setDevicePreview: (device: DevicePreview) => void;
  setPreviewTheme: (theme: PreviewTheme) => void;
  selectedElementId: string | null;
  onElementClick: (element: import('@/lib/types').WebsiteElement) => void;
  websiteSlug: string | null;
  currentPageSlug: string | null;
  isHomepage: boolean;
  onRefresh: () => void;
}

// Device frame configurations for realistic preview
export const DEVICE_CONFIGS = {
  desktop: {
    width: 'w-full',
    maxWidth: 'max-w-full',
    height: 'h-full',
    frame: false,
    borderRadius: 'rounded-none',
  },
  tablet: {
    width: 'w-[768px]',
    maxWidth: 'max-w-[768px]',
    height: 'h-[calc(100%-2rem)]',
    frame: true,
    borderRadius: 'rounded-2xl',
  },
  mobile: {
    width: 'w-[375px]',
    maxWidth: 'max-w-[375px]',
    height: 'h-[calc(100%-2rem)]',
    frame: true,
    borderRadius: 'rounded-[2.5rem]',
  },
} as const;

// Backward compatibility
export const DEVICE_SIZES = {
  desktop: 'w-full',
  tablet: 'max-w-[768px]',
  mobile: 'max-w-[375px]',
} as const;
