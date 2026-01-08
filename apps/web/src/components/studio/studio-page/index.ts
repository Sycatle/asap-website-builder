/**
 * StudioPage Module
 * 
 * AI-first website editor with live preview.
 */

export { StudioPage, default } from './studio-page';

// Types
export type { 
  DevicePreview,
  StudioPageProps,
} from './types';
export { DEVICE_SIZES, DEVICE_CONFIGS } from './types';

// Hooks
export { useIsMobile } from './hooks';

// Components
export { SimplePreviewCanvas } from './components/simple-preview-canvas';
export { AIChatPanel } from './components/ai-chat-panel';
export { LoadingState, NoWebsiteState } from './components/studio-states';
