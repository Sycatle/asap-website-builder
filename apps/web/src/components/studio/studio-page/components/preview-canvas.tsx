"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SectionRenderer } from "../../section-renderers";
import { PreviewProvider } from "../../PreviewContext";
import { PreviewFrame } from "./preview-frame";
import {
  Globe,
  Layers,
  Plus,
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
  MoreVertical,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewCanvasProps } from "../types";
import { DEVICE_CONFIGS } from "../types";

/**
 * PreviewCanvas - Browser-like preview area showing the website
 * Features a modern browser chrome with URL bar and controls
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
  setPreviewTheme,
  onElementClick,
  onAddClick,
  websiteSlug,
  currentPageSlug,
  isHomepage,
  onRefresh,
}: PreviewCanvasProps) {
  const { t } = useTranslation(['common', 'editor']);
  const deviceConfig = DEVICE_CONFIGS[devicePreview];
  
  // Get visible elements sorted by order
  const visibleElements = elements
    .filter(e => e && e.id && e.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isDeviceFrame = devicePreview !== 'desktop';
  const isDarkPreview = previewTheme === 'dark';

  // Build preview URL
  const previewUrl = websiteSlug 
    ? `${websiteSlug}.asap.cool${!isHomepage && currentPageSlug ? `/${currentPageSlug}` : ''}`
    : 'preview.asap.cool';

  return (
    <main 
      className="h-full flex flex-col bg-muted/30 min-w-0"
      role="region"
      aria-label={t('editor:canvas.sitePreview')}
    >
      {/* Browser Chrome */}
      <BrowserChrome
        previewUrl={previewUrl}
        websiteSlug={websiteSlug}
        currentPageSlug={currentPageSlug}
        isHomepage={isHomepage}
        devicePreview={devicePreview}
        previewTheme={previewTheme}
        setPreviewTheme={setPreviewTheme}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        onRefresh={onRefresh}
      />
      
      {/* Preview canvas container */}
      <div className={cn(
        "flex-1 min-h-0 flex items-center justify-center relative overflow-hidden",
        isDeviceFrame ? "p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" : "p-0"
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
              "border-[8px] sm:border-[12px] border-slate-800 dark:border-slate-700",
              "shadow-2xl shadow-black/30 dark:shadow-black/50",
              "ring-1 ring-slate-700/50 dark:ring-slate-600/50",
            ],
            // Desktop: full width, no frame
            !isDeviceFrame && "rounded-none border-0",
            // Responsive scaling for very small containers
            devicePreview === 'tablet' && "max-w-full",
          )}
          style={{
            willChange: 'width, height, border-radius',
          }}
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
    </main>
  );
}

/**
 * BrowserChrome - Modern browser-like toolbar
 */
function BrowserChrome({
  previewUrl,
  websiteSlug,
  currentPageSlug,
  isHomepage,
  devicePreview,
  previewTheme,
  setPreviewTheme,
  leftPanelOpen,
  rightPanelOpen,
  setLeftPanelOpen,
  setRightPanelOpen,
  onRefresh,
}: {
  previewUrl: string;
  websiteSlug: string | null;
  currentPageSlug: string | null;
  isHomepage: boolean;
  devicePreview: PreviewCanvasProps['devicePreview'];
  previewTheme: PreviewCanvasProps['previewTheme'];
  setPreviewTheme: (theme: PreviewCanvasProps['previewTheme']) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
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
      {/* Browser tabs area */}
      <div className="flex items-center h-10 px-2 gap-1 bg-muted/50 border-b">
        {/* Window controls (macOS style) */}
        <div className="hidden sm:flex items-center gap-1.5 px-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
        </div>

        {/* Active tab */}
        <div className="flex items-center h-8 px-3 bg-background rounded-t-lg border-t border-x min-w-[120px] max-w-[200px] gap-2 ml-2">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">
            {websiteSlug || 'Preview'}
          </span>
        </div>

        {/* Panel toggles - right side */}
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              >
                <PanelLeft className={cn("h-4 w-4", leftPanelOpen && "text-primary")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {leftPanelOpen ? t('editor:canvas.hideElements') : t('editor:canvas.showElements')}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
              >
                <PanelRight className={cn("h-4 w-4", rightPanelOpen && "text-primary")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {rightPanelOpen ? t('editor:canvas.hideProperties') : t('editor:canvas.showProperties')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* URL bar area */}
      <div className="flex items-center h-12 px-2 gap-2">
        {/* Navigation controls */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor:browser.back')}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor:browser.forward')}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleRefresh}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor:browser.refresh')}</TooltipContent>
          </Tooltip>
        </div>

        {/* URL Bar */}
        <div 
          className="flex-1 flex items-center h-9 px-3 bg-muted/50 hover:bg-muted rounded-full border transition-colors group cursor-pointer" 
          onClick={handleCopyUrl}
        >
          <Lock className="h-3.5 w-3.5 text-green-600 dark:text-green-500 mr-2 shrink-0" />
          <span className="text-sm text-muted-foreground truncate flex-1 font-mono">
            <span className="text-foreground/60">https://</span>
            <span className="text-foreground">{previewUrl}</span>
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl();
                }}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {copied ? t('common:status.copied') : t('editor:browser.copyUrl')}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Device selector */}
          <DeviceSelector devicePreview={devicePreview} />

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
              >
                {previewTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {previewTheme === 'dark' ? t('editor:preview.lightMode') : t('editor:preview.darkMode')}
            </TooltipContent>
          </Tooltip>

          {/* Open external */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleOpenExternal}
                disabled={!websiteSlug}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor:browser.openExternal')}</TooltipContent>
          </Tooltip>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                {t('editor:browser.copyUrl')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenExternal} disabled={!websiteSlug}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('editor:browser.openExternal')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('editor:browser.refresh')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

/**
 * DeviceSelector - Display current device preview mode
 */
function DeviceSelector({ 
  devicePreview 
}: { 
  devicePreview: PreviewCanvasProps['devicePreview'] 
}) {
  const { t } = useTranslation(['editor']);
  
  // Get current device icon and label
  const deviceInfo = {
    desktop: { icon: Monitor, label: t('editor:canvas.responsive.desktop') },
    tablet: { icon: Tablet, label: t('editor:canvas.responsive.tablet') },
    mobile: { icon: Smartphone, label: t('editor:canvas.responsive.mobile') },
  }[devicePreview];

  const DeviceIcon = deviceInfo.icon;

  return (
    <div className="flex items-center h-8 px-2 bg-muted/50 rounded-md border text-xs gap-1.5">
      <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="hidden sm:inline font-medium">{deviceInfo.label}</span>
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
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
          isDarkPreview ? "bg-slate-800" : "bg-slate-100"
        )}>
          <Layers className="h-8 w-8 opacity-50" aria-hidden="true" />
        </div>
        <p className="font-semibold text-lg">{t('editor:canvas.emptyState.noElements')}</p>
        <p className="text-sm mt-1 opacity-70">{t('editor:canvas.emptyState.addToStart')}</p>
        <Button
          variant={isDarkPreview ? "secondary" : "default"}
          size="sm"
          onClick={() => isMobile ? setLeftPanelOpen(true) : onAddClick()}
          className="mt-6"
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
