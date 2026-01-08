"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ExternalLink,
  FileText,
  Home,
  MoreHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioHeaderProps, DevicePreview, PreviewTheme } from "../types";

/**
 * StudioHeader - Header component for the studio page
 * Includes navigation, page selector, device preview toggles, and actions
 */
export function StudioHeader({
  website,
  currentPage,
  pages,
  selectedPageId,
  setSelectedPageId,
  devicePreview,
  setDevicePreview,
  previewTheme,
  setPreviewTheme,
  isLoadingPages,
  isLoadingElements,
  mobileMenuOpen,
  setMobileMenuOpen,
  refetch,
  onBack,
}: StudioHeaderProps) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <>
      <header className="z-30 h-14 border-b bg-background flex items-center px-3 sm:px-4 md:px-6 shrink-0 gap-2">
        {/* Left section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="shrink-0 h-9 w-9"
              aria-label={t('editor:header.backToDashboard')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{t('common:actions.back')}</span>
            </Button>
          )}
          
          {/* Desktop: Full title + badge */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">{website.title}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {website.status === 'published' ? t('editor:header.online') : t('editor:header.draft')}
            </Badge>
          </div>
          
          {/* Page selector - compact on mobile */}
          <Select
            value={selectedPageId ?? ''}
            onValueChange={setSelectedPageId}
            disabled={isLoadingPages || pages.length === 0}
          >
            <SelectTrigger 
              className="w-auto min-w-[100px] max-w-[160px] md:max-w-[180px] h-8 text-sm"
              aria-label={t('editor:header.selectPage')}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={t('editor:header.page')}>
                {currentPage ? (
                  <span className="truncate">
                    {currentPage.title || (currentPage.slug === '' ? t('editor:pages.home') : currentPage.slug)}
                  </span>
                ) : (
                  t('editor:header.page')
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  <span className="flex items-center gap-2">
                    {page.is_homepage && <Home className="h-3 w-3 text-primary" />}
                    <span>{page.title || (page.slug === '' ? t('editor:pages.home') : `/${page.slug}`)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center - Device toggles (desktop only) */}
        <DeviceToggleGroup 
          devicePreview={devicePreview} 
          setDevicePreview={setDevicePreview} 
        />

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Preview theme toggle (isolated from dashboard theme) */}
          <PreviewThemeToggle previewTheme={previewTheme} setPreviewTheme={setPreviewTheme} />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoadingElements}
            className="h-9 w-9"
            aria-label={isLoadingElements ? t('common:status.loading') : t('editor:header.refresh')}
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingElements && "animate-spin")} aria-hidden="true" />
            <span className="sr-only">{isLoadingElements ? t('common:status.loading') : t('editor:header.refresh')}</span>
          </Button>
          
          {website.slug && (
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 hidden sm:flex">
              <a 
                href={`/${website.slug}${currentPage && !currentPage.is_homepage ? `/${currentPage.slug}` : ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label={t('editor:header.viewSite')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('editor:header.openSite')}</span>
              </a>
            </Button>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 md:hidden"
            aria-label={mobileMenuOpen ? t('editor:header.closeMenu') : t('editor:header.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <MobileMenu 
          website={website}
          currentPage={currentPage}
          devicePreview={devicePreview}
          setDevicePreview={setDevicePreview}
          previewTheme={previewTheme}
          setPreviewTheme={setPreviewTheme}
        />
      )}
    </>
  );
}

/**
 * DeviceToggleGroup - Desktop device preview toggle buttons
 */
function DeviceToggleGroup({
  devicePreview,
  setDevicePreview,
}: {
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
}) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label={t('editor:header.previewSize')}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevicePreview('desktop')}
            className="h-7 w-7 p-0"
            role="radio"
            aria-checked={devicePreview === 'desktop'}
            aria-label={t('editor:canvas.responsive.desktop')}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('editor:canvas.responsive.desktop')}</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={devicePreview === 'tablet' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevicePreview('tablet')}
            className="h-7 w-7 p-0"
            role="radio"
            aria-checked={devicePreview === 'tablet'}
            aria-label={t('editor:canvas.responsive.tablet')}
          >
            <Tablet className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('editor:canvas.responsive.tablet')}</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevicePreview('mobile')}
            className="h-7 w-7 p-0"
            role="radio"
            aria-checked={devicePreview === 'mobile'}
            aria-label={t('editor:canvas.responsive.mobile')}
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('editor:canvas.responsive.mobile')}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * MobileMenu - Dropdown menu for mobile devices
 */
function MobileMenu({
  website,
  currentPage,
  devicePreview,
  setDevicePreview,
  previewTheme,
  setPreviewTheme,
}: {
  website: { slug: string | null };
  currentPage: { slug: string; is_homepage: boolean } | null;
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
  previewTheme: PreviewTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
}) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div 
      id="mobile-menu"
      role="menu"
      aria-label={t('editor:header.displayOptions')}
      className="md:hidden border-b bg-background p-2 flex flex-wrap gap-2 animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label={t('editor:header.previewSize')}>
        <Button
          variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setDevicePreview('desktop')}
          className="h-8 px-3"
          role="radio"
          aria-checked={devicePreview === 'desktop'}
        >
          <Monitor className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t('editor:canvas.responsive.desktop')}
        </Button>
        <Button
          variant={devicePreview === 'tablet' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setDevicePreview('tablet')}
          className="h-8 px-3"
          role="radio"
          aria-checked={devicePreview === 'tablet'}
        >
          <Tablet className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t('editor:canvas.responsive.tablet')}
        </Button>
        <Button
          variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setDevicePreview('mobile')}
          className="h-8 px-3"
          role="radio"
          aria-checked={devicePreview === 'mobile'}
        >
          <Smartphone className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t('editor:canvas.responsive.mobile')}
        </Button>
      </div>
      
      {website.slug && (
        <Button variant="outline" size="sm" asChild className="h-8">
          <a 
            href={`/${website.slug}${currentPage && !currentPage.is_homepage ? `/${currentPage.slug}` : ''}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            {t('editor:publish.viewSite')}
          </a>
        </Button>
      )}
      
      {/* Preview theme toggle for mobile */}
      <MobilePreviewThemeToggle previewTheme={previewTheme} setPreviewTheme={setPreviewTheme} />
    </div>
  );
}

/**
 * PreviewThemeToggle - Toggle button for preview dark/light mode (isolated from dashboard)
 */
function PreviewThemeToggle({
  previewTheme,
  setPreviewTheme,
}: {
  previewTheme: PreviewTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
}) {
  const { t } = useTranslation(['editor']);
  const isDark = previewTheme === 'dark';

  const toggleTheme = () => {
    setPreviewTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          aria-label={isDark ? t('editor:preview.lightMode') : t('editor:preview.darkMode')}
        >
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? t('editor:preview.lightMode') : t('editor:preview.darkMode')}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * MobilePreviewThemeToggle - Preview theme toggle button with label for mobile menu
 */
function MobilePreviewThemeToggle({
  previewTheme,
  setPreviewTheme,
}: {
  previewTheme: PreviewTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
}) {
  const { t } = useTranslation(['editor']);
  const isDark = previewTheme === 'dark';

  const toggleTheme = () => {
    setPreviewTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-8 px-3"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t('editor:preview.lightMode')}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t('editor:preview.darkMode')}
        </>
      )}
    </Button>
  );
}

export default StudioHeader;
