/**
 * StudioPage Types
 */

export type DevicePreview = 'desktop' | 'tablet' | 'mobile';
export type PreviewTheme = 'light' | 'dark';

export interface StudioPageProps {
  onBack?: () => void;
}

export interface StudioHeaderProps {
  website: {
    id: string;
    title: string;
    slug: string | null;
    status: string;
  };
  currentPage: {
    id: string;
    slug: string;
    title: string | null;
    is_homepage: boolean;
  } | null;
  pages: Array<{
    id: string;
    slug: string;
    title: string | null;
    is_homepage: boolean;
  }>;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
  previewTheme: PreviewTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
  isLoadingPages: boolean;
  isLoadingElements: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  refetch: () => void;
  onBack?: () => void;
}

export interface ElementListProps {
  elements: Array<import('@/lib/types').WebsiteElement>;
  currentPage: {
    id: string;
    slug: string;
    title: string | null;
    is_homepage: boolean;
  } | null;
  selectedElementId: string | null;
  dragOverIndex: number | null;
  isLoading: boolean;
  isMobile: boolean;
  onElementClick: (element: import('@/lib/types').WebsiteElement) => void;
  onDragStart: (e: React.DragEvent, elementId: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onAddClick: () => void;
}

export interface PropertyEditorPanelProps {
  selectedElement: import('@/lib/types').WebsiteElement | null;
  onUpdate: (elementId: string, data: import('@/lib/types').UpdateElementRequest) => Promise<import('@/lib/types').WebsiteElement>;
  isUpdating: boolean;
}

export interface PreviewCanvasProps {
  elements: Array<import('@/lib/types').WebsiteElement>;
  devicePreview: DevicePreview;
  previewTheme: PreviewTheme;
  selectedElementId: string | null;
  isMobile: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setPreviewTheme: (theme: PreviewTheme) => void;
  onElementClick: (element: import('@/lib/types').WebsiteElement) => void;
  onAddClick: () => void;
  // Browser bar props
  websiteSlug: string | null;
  currentPageSlug: string | null;
  isHomepage: boolean;
  onRefresh: () => void;
}

export interface MobileToolbarProps {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  selectedElement: import('@/lib/types').WebsiteElement | null;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  onAddClick: () => void;
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
