"use client"

import React, { useState } from "react"
import { Grid, MoreVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface GridOverlayProps {
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  className?: string
}

export interface GridSettings {
  columns: number
  gutter: number
  showBaseline: boolean
  baselineHeight: number
  showMargins: boolean
  marginSize: number
  color: string
  opacity: number
}

const DEFAULT_SETTINGS: GridSettings = {
  columns: 12,
  gutter: 24,
  showBaseline: false,
  baselineHeight: 8,
  showMargins: true,
  marginSize: 16,
  color: "99, 102, 241", // Indigo (primary)
  opacity: 0.15,
}

/**
 * GridOverlay - Visual grid system for design alignment
 * 
 * Features:
 * - Configurable column count
 * - Adjustable gutter spacing
 * - Baseline grid for typography
 * - Margin guides
 * - Toggle visibility
 */
export function GridOverlay({
  enabled = false,
  onToggle,
  className,
}: GridOverlayProps) {
  const [settings, setSettings] = useState<GridSettings>(DEFAULT_SETTINGS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (!enabled) return null

  const gridColor = `rgba(${settings.color}, ${settings.opacity})`

  return (
    <>
      {/* Grid Overlay */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-[99998]",
          className
        )}
        style={{
          paddingLeft: settings.showMargins ? settings.marginSize : 0,
          paddingRight: settings.showMargins ? settings.marginSize : 0,
        }}
      >
        {/* Column guides */}
        <div
          className="h-full flex"
          style={{ gap: settings.gutter }}
        >
          {Array.from({ length: settings.columns }).map((_, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                flex: 1,
                backgroundColor: gridColor,
              }}
            />
          ))}
        </div>

        {/* Baseline grid */}
        {settings.showBaseline && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, transparent ${settings.baselineHeight - 1}px, rgba(${settings.color}, ${settings.opacity * 0.5}) ${settings.baselineHeight}px)`,
              backgroundSize: `100% ${settings.baselineHeight}px`,
            }}
          />
        )}

        {/* Margin guides */}
        {settings.showMargins && (
          <>
            <div
              className="absolute top-0 bottom-0 left-0"
              style={{
                width: settings.marginSize,
                borderRight: `1px dashed rgba(${settings.color}, ${settings.opacity * 2})`,
                backgroundColor: `rgba(${settings.color}, ${settings.opacity * 0.5})`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 right-0"
              style={{
                width: settings.marginSize,
                borderLeft: `1px dashed rgba(${settings.color}, ${settings.opacity * 2})`,
                backgroundColor: `rgba(${settings.color}, ${settings.opacity * 0.5})`,
              }}
            />
          </>
        )}
      </div>

      {/* Grid Controls */}
      <div className="absolute top-2 right-2 z-[99999] flex items-center gap-1 pointer-events-auto">
        {/* Settings */}
        <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Paramètres de grille</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Columns */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Colonnes</Label>
                  <span className="text-xs text-muted-foreground">{settings.columns}</span>
                </div>
                <input
                  type="range"
                  value={settings.columns}
                  min={2}
                  max={24}
                  step={1}
                  onChange={(e) => setSettings(s => ({ ...s, columns: Number(e.target.value) }))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Gutter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Gouttière</Label>
                  <span className="text-xs text-muted-foreground">{settings.gutter}px</span>
                </div>
                <input
                  type="range"
                  value={settings.gutter}
                  min={0}
                  max={48}
                  step={4}
                  onChange={(e) => setSettings(s => ({ ...s, gutter: Number(e.target.value) }))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opacité</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(settings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={settings.opacity * 100}
                  min={5}
                  max={50}
                  step={5}
                  onChange={(e) => setSettings(s => ({ ...s, opacity: Number(e.target.value) / 100 }))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Baseline grid */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs">Grille de base</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Pour aligner la typographie
                  </p>
                </div>
                <Switch
                  checked={settings.showBaseline}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, showBaseline: checked }))}
                />
              </div>

              {settings.showBaseline && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Hauteur de ligne</Label>
                    <span className="text-xs text-muted-foreground">{settings.baselineHeight}px</span>
                  </div>
                  <input
                    type="range"
                    value={settings.baselineHeight}
                    min={4}
                    max={32}
                    step={2}
                    onChange={(e) => setSettings(s => ({ ...s, baselineHeight: Number(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}

              {/* Margins */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs">Marges</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Guides de marge latérale
                  </p>
                </div>
                <Switch
                  checked={settings.showMargins}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, showMargins: checked }))}
                />
              </div>

              {settings.showMargins && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Taille des marges</Label>
                    <span className="text-xs text-muted-foreground">{settings.marginSize}px</span>
                  </div>
                  <input
                    type="range"
                    value={settings.marginSize}
                    min={8}
                    max={64}
                    step={8}
                    onChange={(e) => setSettings(s => ({ ...s, marginSize: Number(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Close button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm"
              onClick={() => onToggle?.(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Masquer la grille</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}

/**
 * GridToggleButton - Button to toggle grid overlay visibility
 */
export function GridToggleButton({
  enabled,
  onToggle,
  className,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={enabled ? "secondary" : "ghost"}
          size="icon"
          className={cn("h-8 w-8", className)}
          onClick={() => onToggle(!enabled)}
        >
          <Grid className={cn("h-4 w-4", enabled && "text-primary")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {enabled ? "Masquer la grille" : "Afficher la grille"}
      </TooltipContent>
    </Tooltip>
  )
}

export default GridOverlay
