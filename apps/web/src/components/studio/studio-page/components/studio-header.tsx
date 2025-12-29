"use client"

import React from 'react';
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioHeaderProps, DevicePreview } from "../types";

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
  isLoadingPages,
  isLoadingElements,
  mobileMenuOpen,
  setMobileMenuOpen,
  refetch,
  onBack,
}: StudioHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-3 sm:px-4 md:px-6 shrink-0 gap-2">
        {/* Left section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="shrink-0 h-9 w-9"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Retour</span>
            </Button>
          )}
          
          {/* Desktop: Full title + badge */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">{website.title}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {website.status === 'published' ? 'En ligne' : 'Brouillon'}
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
              aria-label="Sélectionner une page à modifier"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Page">
                {currentPage ? (
                  <span className="truncate">
                    {currentPage.title || (currentPage.slug === '' ? 'Accueil' : currentPage.slug)}
                  </span>
                ) : (
                  'Page'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  <span className="flex items-center gap-2">
                    {page.is_homepage && <Home className="h-3 w-3 text-primary" />}
                    <span>{page.title || (page.slug === '' ? 'Accueil' : `/${page.slug}`)}</span>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoadingElements}
            className="h-9 w-9"
            aria-label={isLoadingElements ? "Chargement en cours" : "Actualiser les éléments"}
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingElements && "animate-spin")} aria-hidden="true" />
            <span className="sr-only">{isLoadingElements ? "Chargement..." : "Actualiser"}</span>
          </Button>
          
          {website.slug && (
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 hidden sm:flex">
              <a 
                href={`/${website.slug}${currentPage && !currentPage.is_homepage ? `/${currentPage.slug}` : ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Voir le site dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Ouvrir le site</span>
              </a>
            </Button>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 md:hidden"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
  return (
    <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label="Taille d'aperçu">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevicePreview('desktop')}
            className="h-7 w-7 p-0"
            role="radio"
            aria-checked={devicePreview === 'desktop'}
            aria-label="Aperçu bureau"
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bureau</TooltipContent>
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
            aria-label="Aperçu tablette"
          >
            <Tablet className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tablette</TooltipContent>
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
            aria-label="Aperçu mobile"
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mobile</TooltipContent>
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
}: {
  website: { slug: string | null };
  currentPage: { slug: string; is_homepage: boolean } | null;
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
}) {
  return (
    <div 
      id="mobile-menu"
      role="menu"
      aria-label="Options d'affichage"
      className="md:hidden border-b bg-background p-2 flex flex-wrap gap-2 animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="radiogroup" aria-label="Taille d'aperçu">
        <Button
          variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setDevicePreview('desktop')}
          className="h-8 px-3"
          role="radio"
          aria-checked={devicePreview === 'desktop'}
        >
          <Monitor className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Bureau
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
          Tablette
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
          Mobile
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
            Voir le site
          </a>
        </Button>
      )}
    </div>
  );
}

export default StudioHeader;
