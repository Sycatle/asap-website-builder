"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PreviewFrame, type PreviewFrameHandle } from "./preview-frame";
import {
  Globe,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  Moon,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DevicePreview, PreviewTheme } from "../types";
import { DEVICE_CONFIGS } from "../types";
import type { WebsiteElement } from "@/lib/types";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import type { Viewport } from "@/hooks/use-preview-capture";

// Global capture function type
declare global {
  interface Window {
    __capturePreview?: (viewport?: Viewport) => Promise<{ imageId: string } | null>;
  }
}

export interface SimplePreviewCanvasProps {
  elements: WebsiteElement[];
  devicePreview: DevicePreview;
  previewTheme: PreviewTheme;
  setDevicePreview: (device: DevicePreview) => void;
  setPreviewTheme: (theme: PreviewTheme) => void;
  selectedElementId: string | null;
  onElementClick: (element: WebsiteElement) => void;
  websiteSlug: string | null;
  currentPageSlug: string | null;
  currentPageId?: string;
  isHomepage: boolean;
  onRefresh: () => void;
}

/**
 * SimplePreviewCanvas - Simplified browser-like preview for two-column layout
 * 
 * Uses an iframe-based architecture where the preview runs as a separate React app.
 * This ensures proper React hooks support inside the preview.
 */
export function SimplePreviewCanvas({
  elements,
  devicePreview,
  previewTheme,
  setDevicePreview,
  setPreviewTheme,
  selectedElementId,
  onElementClick,
  websiteSlug,
  currentPageSlug,
  currentPageId,
  isHomepage,
  onRefresh,
}: SimplePreviewCanvasProps) {
  const { currentWebsite } = useWebsiteContext();
  const deviceConfig = DEVICE_CONFIGS[devicePreview];
  const previewFrameRef = useRef<PreviewFrameHandle>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  
  // Use refs for values that change but shouldn't cause listener re-registration
  const devicePreviewRef = useRef(devicePreview);
  const websiteIdRef = useRef(currentWebsite?.id);
  
  // Keep refs in sync
  useEffect(() => {
    devicePreviewRef.current = devicePreview;
  }, [devicePreview]);
  
  useEffect(() => {
    websiteIdRef.current = currentWebsite?.id;
  }, [currentWebsite?.id]);
  
  // Handle element click from iframe
  const handleElementClick = useCallback((elementId: string) => {
    const element = elements.find(e => e.id === elementId);
    if (element) {
      onElementClick(element);
    }
  }, [elements, onElementClick]);
  
  // Handle preview ready
  const handlePreviewReady = useCallback(() => {
    console.log('[Preview Canvas] Preview is now ready');
    setPreviewReady(true);
  }, []);
  
  // Expose global capture function for AI chat to call directly
  useEffect(() => {
    console.log('[Preview Canvas] Exposing global capture function');
    
    window.__capturePreview = async (viewport: Viewport = 'desktop'): Promise<{ imageId: string } | null> => {
      console.log('[Preview Canvas] __capturePreview called with viewport:', viewport);
      
      // Map viewport to device
      const viewportToDevice: Record<Viewport, DevicePreview> = {
        desktop: 'desktop',
        tablet: 'tablet',
        mobile: 'mobile',
      };
      
      const currentDevice = devicePreviewRef.current;
      
      // If we need to switch device, do it first
      if (viewportToDevice[viewport] !== currentDevice) {
        setDevicePreview(viewportToDevice[viewport]);
        // Wait for re-render
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setIsCapturing(true);
      
      try {
        // Wait a bit for the preview to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const frameRef = previewFrameRef.current;
        if (!frameRef) {
          console.error('[Preview Canvas] previewFrameRef is null');
          throw new Error('Preview frame not available');
        }
        
        console.log('[Preview Canvas] Starting screenshot capture...');
        const dataUrl = await frameRef.captureScreenshot();
        
        if (!dataUrl) {
          throw new Error('Failed to capture preview - no data returned');
        }
        
        console.log('[Preview Canvas] Screenshot captured, uploading...');
        
        // Convert data URL to blob for upload
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        // Upload the capture
        const { uploadPreviewCapture } = await import('@/hooks/use-preview-capture');
        const uploadResult = await uploadPreviewCapture(
          blob,
          websiteIdRef.current || '',
          viewport
        );
        
        console.log('[Preview Canvas] Upload successful:', uploadResult.imageId);
        return { imageId: uploadResult.imageId };
        
      } catch (error) {
        console.error('[Preview Canvas] Capture failed:', error);
        return null;
      } finally {
        setIsCapturing(false);
      }
    };
    
    return () => {
      console.log('[Preview Canvas] Removing global capture function');
      delete window.__capturePreview;
    };
  }, [setDevicePreview]);
  
  // Get visible elements sorted by order
  const visibleElements = elements
    .filter(e => e && e.id && e.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isDeviceFrame = devicePreview !== 'desktop';
  const isDarkPreview = previewTheme === 'dark';

  // Build preview URL
  const previewUrl = websiteSlug 
    ? `${websiteSlug}.asap.cool${!isHomepage && currentPageSlug ? `/${currentPageSlug}` : ''}`
    : 'preview.asap.cool';

  return (
    <div className="h-full flex flex-col bg-muted/30 min-w-0">
      {/* Capture loading indicator */}
      {isCapturing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg shadow-lg border">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Capture en cours...</span>
          </div>
        </div>
      )}
      
      {/* Browser Chrome */}
      <BrowserToolbar
        previewUrl={previewUrl}
        websiteSlug={websiteSlug}
        currentPageSlug={currentPageSlug}
        isHomepage={isHomepage}
        devicePreview={devicePreview}
        setDevicePreview={setDevicePreview}
        previewTheme={previewTheme}
        setPreviewTheme={setPreviewTheme}
        onRefresh={onRefresh}
      />
      
      {/* Preview canvas container */}
      <div className={cn(
        "flex-1 min-h-0 flex items-center justify-center relative",
        isDeviceFrame ? "p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden" : "p-0 overflow-hidden"
      )}>
        {/* Device frame wrapper */}
        <div 
          className={cn(
            "relative transition-all duration-500 ease-out flex flex-col",
            deviceConfig.width,
            deviceConfig.maxWidth,
            isDeviceFrame ? "h-full max-h-full" : "h-full",
            isDeviceFrame && [
              deviceConfig.borderRadius,
              "border-[8px] sm:border-[12px] border-slate-800 dark:border-slate-700",
              "shadow-2xl shadow-black/30 dark:shadow-black/50",
              "ring-1 ring-slate-700/50 dark:ring-slate-600/50",
            ],
            !isDeviceFrame && "rounded-none border-0",
            devicePreview === 'tablet' && "max-w-full",
          )}
        >
          {/* Device notch for mobile */}
          {devicePreview === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="w-28 h-7 bg-slate-800 dark:bg-slate-700 rounded-b-3xl flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-slate-700 dark:bg-slate-600 rounded-full" />
                <div className="w-14 h-1 bg-slate-900 dark:bg-slate-600 rounded-full" />
              </div>
            </div>
          )}
          
          {/* Device camera for tablet */}
          {devicePreview === 'tablet' && (
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20">
              <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-slate-600 rounded-full ring-2 ring-slate-700" />
            </div>
          )}

          {/* Main preview content */}
          <PreviewFrame 
            ref={previewFrameRef}
            websiteId={currentWebsite?.id || ''}
            elements={visibleElements}
            pageId={currentPageId}
            previewTheme={previewTheme}
            selectedElementId={selectedElementId}
            onElementClick={handleElementClick}
            onReady={handlePreviewReady}
            device={devicePreview}
            className={cn(
              "flex-1 min-h-0",
              devicePreview === 'mobile' && "rounded-[1.75rem]",
              devicePreview === 'tablet' && "rounded-xl",
            )}
          />

          {/* Device home indicator for mobile */}
          {devicePreview === 'mobile' && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20">
              <div className="w-28 h-1 bg-slate-500 dark:bg-slate-400 rounded-full" />
            </div>
          )}
        </div>

        {/* Device label */}
        {isDeviceFrame && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border shadow-sm text-xs text-muted-foreground">
            {devicePreview === 'mobile' ? (
              <Smartphone className="h-3.5 w-3.5" />
            ) : (
              <Tablet className="h-3.5 w-3.5" />
            )}
            <span className="font-medium">
              {devicePreview === 'mobile' ? 'iPhone 14' : 'iPad'}
            </span>
            <span className="text-muted-foreground/60">
              {devicePreview === 'mobile' ? '390×844' : '820×1180'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * BrowserToolbar - Simplified browser chrome
 */
function BrowserToolbar({
  previewUrl,
  websiteSlug,
  currentPageSlug,
  isHomepage,
  devicePreview,
  setDevicePreview,
  previewTheme,
  setPreviewTheme,
  onRefresh,
}: {
  previewUrl: string;
  websiteSlug: string | null;
  currentPageSlug: string | null;
  isHomepage: boolean;
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
  previewTheme: PreviewTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation(['common', 'editor']);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(`https://${previewUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenExternal = () => {
    if (websiteSlug) {
      const path = !isHomepage && currentPageSlug ? `/${currentPageSlug}` : '';
      window.open(`/${websiteSlug}${path}`, '_blank');
    }
  };

  return (
    <div className="shrink-0 bg-background border-b">
      {/* Tab bar */}
      <div className="flex items-center h-10 px-3 gap-2 bg-muted/50 border-b">
        {/* Window controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>

        {/* Tab */}
        <div className="flex items-center h-8 px-3 bg-background rounded-t-lg border-t border-x gap-2 ml-1">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate max-w-[120px]">
            {websiteSlug || 'Preview'}
          </span>
        </div>

        {/* Device toggles - right aligned */}
        <div className="ml-auto flex items-center gap-1 bg-background/80 rounded-lg p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDevicePreview('desktop')}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editor:canvas.responsive.desktop')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDevicePreview('tablet')}
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editor:canvas.responsive.tablet')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDevicePreview('mobile')}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editor:canvas.responsive.mobile')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center h-11 px-3 gap-2">
        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        {/* URL */}
        <div 
          className="flex-1 flex items-center h-8 px-3 bg-muted/50 hover:bg-muted rounded-full border text-sm cursor-pointer group"
          onClick={handleCopyUrl}
        >
          <Lock className="h-3 w-3 text-green-600 mr-2" />
          <span className="truncate font-mono text-xs">
            <span className="text-muted-foreground">https://</span>
            {previewUrl}
          </span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
              >
                {previewTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {previewTheme === 'dark' ? t('editor:preview.lightMode') : t('editor:preview.darkMode')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={handleOpenExternal}
                disabled={!websiteSlug}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editor:browser.openExternal')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/**
 * EmptyPreviewState - Shown when no elements exist
 */
function EmptyPreviewState({ isDarkPreview }: { isDarkPreview: boolean }) {
  const { t } = useTranslation(['editor']);
  return (
    <div 
      className={cn(
        "min-h-[60vh] flex items-center justify-center p-6",
        isDarkPreview ? "text-slate-400" : "text-muted-foreground"
      )}
    >
      <div className="text-center">
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
          isDarkPreview ? "bg-slate-800" : "bg-slate-100"
        )}>
          <Layers className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-semibold text-lg">{t('editor:canvas.emptyState.noElements')}</p>
        <p className="text-sm mt-1 opacity-70">{t('editor:ai.welcome.description')}</p>
      </div>
    </div>
  );
}

export default SimplePreviewCanvas;
