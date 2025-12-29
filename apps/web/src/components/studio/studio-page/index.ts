/**
 * StudioPage Module
 * 
 * Visual website editor with live preview and element management.
 */

export { StudioPage, default } from './studio-page';

// Types
export type { 
  DevicePreview,
  StudioPageProps,
  StudioHeaderProps,
  ElementListProps,
  PropertyEditorPanelProps,
  PreviewCanvasProps,
  MobileToolbarProps,
} from './types';
export { DEVICE_SIZES } from './types';

// Hooks
export { useIsMobile } from './hooks';

// Components
export { StudioHeader } from './components/studio-header';
export { ElementList } from './components/element-list';
export { PropertyEditorPanel } from './components/property-editor-panel';
export { PreviewCanvas } from './components/preview-canvas';
export { MobileToolbar } from './components/mobile-toolbar';
export { MobileSheets } from './components/mobile-sheets';
export { LoadingState, NoWebsiteState } from './components/studio-states';
