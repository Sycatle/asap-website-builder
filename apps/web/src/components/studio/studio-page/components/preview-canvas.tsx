"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionRenderer } from "../../section-renderers";
import { PreviewProvider } from "../../PreviewContext";
import { PreviewFrame } from "./preview-frame";
import {
  Eye,
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  Smartphone,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewCanvasProps } from "../types";
import { DEVICE_CONFIGS } from "../types";

/**
 * PreviewCanvas - Central preview area showing the website
 * Supports realistic device frame simulation for tablet and mobile views
 * The previewTheme is isolated from the dashboard theme
 */
export function PreviewCanvas({
  elements,
  devicePreview,
  previewTheme,
  selectedElementId,
  isMobile,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
  onElementClick,
  onAddClick,
}: PreviewCanvasProps) {
  const { t } = useTranslation(['common', 'editor']);
  const deviceConfig = DEVICE_CONFIGS[devicePreview];
  
  // Get visible elements sorted by order
  const visibleElements = elements
    .filter(e => e && e.id && e.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isDeviceFrame = devicePreview !== 'desktop';
  const isDarkPreview = previewTheme === 'dark';

  return (
    <main 
      className="h-full flex flex-col bg-muted/30 min-w-0"
      role="region"
      aria-label={t('editor:canvas.sitePreview')}
    >
      {/* Preview indicator with panel toggles */}
      <PreviewToolbar
        devicePreview={devicePreview}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
      />
      
      {/* Preview canvas container */}
      <div className={cn(
        "flex-1 min-h-0 flex items-center justify-center relative overflow-hidden",
        isDeviceFrame ? "p-4 sm:p-6 md:p-8 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50" : "p-0"
      )}>
        {/* Device frame wrapper */}
        <div 
          className={cn(
            "relative transition-all duration-500 ease-out flex flex-col",
            deviceConfig.width,
            deviceConfig.maxWidth,
            isDeviceFrame ? "h-full max-h-full" : "h-full",
            // Frame styling for tablet/mobile
            isDeviceFrame && [
              deviceConfig.borderRadius,
              "border-[8px] sm:border-[12px] border-gray-800 dark:border-gray-700",
              "shadow-2xl shadow-black/20 dark:shadow-black/40",
              "ring-1 ring-gray-700 dark:ring-gray-600",
            ],
            // Desktop: full width, no frame
            !isDeviceFrame && "rounded-none border-0",
            // Responsive scaling for very small containers
            devicePreview === 'tablet' && "max-w-full",
          )}
          style={{
            // Ensure smooth width transition
            willChange: 'width, height, border-radius',
          }}
        >
          {/* Device notch for mobile */}
          {devicePreview === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="w-24 h-6 bg-gray-800 dark:bg-gray-700 rounded-b-2xl flex items-center justify-center">
                <div className="w-12 h-1 bg-gray-900 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          )}
          
          {/* Device camera for tablet */}
          {devicePreview === 'tablet' && (
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20">
              <div className="w-2 h-2 bg-gray-900 dark:bg-gray-600 rounded-full ring-1 ring-gray-700" />
            </div>
          )}

          {/* Main preview content - Isolated iframe for exact WYSIWYG rendering */}
          <PreviewFrame 
            previewTheme={previewTheme}
            className={cn(
              "flex-1",
              // Inner border radius for device frames
              devicePreview === 'mobile' && "rounded-[1.75rem]",
              devicePreview === 'tablet' && "rounded-xl",
            )}
          >
            {/* Preview Provider gives components access to device context */}
            <PreviewProvider device={devicePreview}>
              {visibleElements.length === 0 ? (
                <EmptyPreviewState 
                  isMobile={isMobile} 
                  onAddClick={onAddClick}
                  setLeftPanelOpen={setLeftPanelOpen}
                  isDarkPreview={isDarkPreview}
                />
              ) : (
                <div id="preview-scroll-container">
                  {visibleElements.map((element) => (
                    <SectionRenderer
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      onClick={() => onElementClick(element)}
                    />
                  ))}
                </div>
              )}
            </PreviewProvider>
          </PreviewFrame>

          {/* Device home indicator for mobile */}
          {devicePreview === 'mobile' && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
              <div className="w-24 h-1 bg-gray-600 dark:bg-gray-500 rounded-full" />
            </div>
          )}
        </div>

        {/* Device label */}
        {isDeviceFrame && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            {devicePreview === 'mobile' ? (
              <Smartphone className="h-3 w-3" />
            ) : (
              <Tablet className="h-3 w-3" />
            )}
            <span>
              {devicePreview === 'mobile' ? '375×812' : '768×1024'}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * PreviewToolbar - Toolbar above the preview canvas
 */
function PreviewToolbar({
  devicePreview,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
}: {
  devicePreview: PreviewCanvasProps['devicePreview'];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="shrink-0 p-2 sm:p-3 border-b bg-background flex items-center justify-between gap-2">
      {/* Left toggle - Elements */}
      <Button
        variant={leftPanelOpen ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="hidden md:flex h-8 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={leftPanelOpen ? t('editor:canvas.hideElements') : t('editor:canvas.showElements')}
        aria-pressed={leftPanelOpen}
      >
        {leftPanelOpen ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <Layers className="h-4 w-4" aria-hidden="true" />}
        <span className="text-xs">{t('editor:sidebar.elements')}</span>
      </Button>
      <div className="md:hidden w-8" /> {/* Spacer for mobile */}
      
      {/* Center - Preview status */}
      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground" role="status">
        <Eye className="h-3 w-3" aria-hidden="true" />
        <span className="hidden sm:inline">{t('editor:canvas.livePreview')}</span>
        <span className="sm:hidden">{t('editor:toolbar.preview')}</span>
        {devicePreview !== 'desktop' && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
            {devicePreview === 'tablet' ? t('editor:canvas.responsive.tablet') : t('editor:canvas.responsive.mobile')}
          </Badge>
        )}
      </div>
      
      {/* Right toggle - Properties */}
      <Button
        variant={rightPanelOpen ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="hidden md:flex h-8 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={rightPanelOpen ? t('editor:canvas.hideProperties') : t('editor:canvas.showProperties')}
        aria-pressed={rightPanelOpen}
      >
        <span className="text-xs">{t('editor:properties.title')}</span>
        {rightPanelOpen ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <Settings className="h-4 w-4" aria-hidden="true" />}
      </Button>
      <div className="md:hidden w-8" /> {/* Spacer for mobile */}
    </div>
  );
}

/**
 * EmptyPreviewState - Shown when no visible elements exist
 */
function EmptyPreviewState({
  isMobile,
  onAddClick,
  setLeftPanelOpen,
  isDarkPreview,
}: {
  isMobile: boolean;
  onAddClick: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  isDarkPreview: boolean;
}) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div 
      className={cn(
        "min-h-[60vh] flex items-center justify-center p-6",
        isDarkPreview ? "text-slate-400" : "text-muted-foreground"
      )} 
      role="status"
    >
      <div className="text-center">
        <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
        <p className="font-medium">{t('editor:canvas.emptyState.noElements')}</p>
        <p className="text-sm mt-1">{t('editor:canvas.emptyState.addToStart')}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => isMobile ? setLeftPanelOpen(true) : onAddClick()}
          className="mt-4"
          aria-label={t('editor:elementList.addFirst')}
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('editor:elementList.addElement')}
        </Button>
      </div>
    </div>
  );
}

export default PreviewCanvas;
