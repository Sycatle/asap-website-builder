/**
 * Installed Extension Card Component
 * 
 * Card variant for displaying an installed extension with quick actions.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Settings,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import type { InstalledExtensionSummary } from '@/lib/api/store';

interface InstalledExtensionCardProps {
  extension: InstalledExtensionSummary;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  onOpenSettings?: () => void;
  onOpenDetails?: () => void;
  isToggling?: boolean;
}

export function InstalledExtensionCard({
  extension,
  onToggle,
  onUninstall,
  onOpenSettings,
  onOpenDetails,
  isToggling,
}: InstalledExtensionCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          {extension.icon ? (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
              {extension.icon}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {extension.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Title & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  onClick={onOpenDetails}
                  className="font-semibold hover:underline text-left"
                >
                  {extension.name}
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    v{extension.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {extension.category}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onOpenDetails}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {onOpenSettings && (
                    <DropdownMenuItem onClick={onOpenSettings}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onUninstall}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Uninstall
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Websites count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Globe className="w-4 h-4" />
          Active on {extension.websites_count} website{extension.websites_count !== 1 ? 's' : ''}
        </div>

        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm font-medium">
            {extension.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={extension.enabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of installed extension cards
 */
interface InstalledExtensionsGridProps {
  extensions: InstalledExtensionSummary[];
  onToggle: (slug: string, enabled: boolean) => void;
  onUninstall: (slug: string) => void;
  onOpenSettings?: (slug: string) => void;
  onOpenDetails?: (slug: string) => void;
  togglingIds?: Set<string>;
}

export function InstalledExtensionsGrid({
  extensions,
  onToggle,
  onUninstall,
  onOpenSettings,
  onOpenDetails,
  togglingIds = new Set(),
}: InstalledExtensionsGridProps) {
  if (extensions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No extensions installed</h3>
        <p className="text-sm text-muted-foreground">
          Visit the store to discover and install extensions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {extensions.map((ext) => (
        <InstalledExtensionCard
          key={ext.slug}
          extension={ext}
          onToggle={(enabled) => onToggle(ext.slug, enabled)}
          onUninstall={() => onUninstall(ext.slug)}
          onOpenSettings={onOpenSettings ? () => onOpenSettings(ext.slug) : undefined}
          onOpenDetails={onOpenDetails ? () => onOpenDetails(ext.slug) : undefined}
          isToggling={togglingIds.has(ext.slug)}
        />
      ))}
    </div>
  );
}
