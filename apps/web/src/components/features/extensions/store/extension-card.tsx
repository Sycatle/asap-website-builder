/**
 * Extension Card Component
 * 
 * Modern, polished card design for the extension store.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Download, CheckCircle2, Sparkles } from 'lucide-react';
import type { ExtensionStoreSummary } from '@/lib/api/store';
import { cn } from '@/lib/utils';
import { getExtensionIconConfig } from '@/lib/extension-icons';

export interface ExtensionCardProps {
  extension: ExtensionStoreSummary;
  onSelect?: (slug: string) => void;
  onInstall?: () => void;
  compact?: boolean;
}

export function ExtensionCard({ 
  extension, 
  onSelect, 
  onInstall,
  compact = false,
}: ExtensionCardProps) {
  const {
    slug,
    name,
    description,
    icon,
    category,
    tags,
    author_name,
    author_verified,
    version,
    featured,
    beta,
    deprecated,
    install_count,
    rating,
    rating_count,
    installed,
  } = extension;

  // Get the icon configuration (Lucide icon + gradient)
  const iconConfig = getExtensionIconConfig(icon, slug);
  const IconComponent = iconConfig.icon;

  const handleCardClick = () => {
    onSelect?.(slug);
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstall?.();
  };

  return (
    <div 
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card overflow-hidden cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20",
        "hover:border-primary/20 hover:-translate-y-1",
        featured && "ring-1 ring-amber-400/30 dark:ring-amber-500/20",
        deprecated && "opacity-50 grayscale pointer-events-none",
        installed && "ring-1 ring-emerald-500/30",
      )}
      onClick={handleCardClick}
    >
      {/* Featured ribbon */}
      {featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md text-[10px] font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      {/* Header with icon */}
      <div className={cn("p-5 pb-4", compact && "p-4 pb-3")}>
        <div className="flex items-start gap-4">
          {/* Icon container with gradient */}
          <div 
            className={cn(
              "relative shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center",
              "transition-transform duration-300 group-hover:scale-105",
              "shadow-lg",
              `bg-gradient-to-br ${iconConfig.gradient}`,
            )}
          >
            <IconComponent className="w-7 h-7 text-white" strokeWidth={1.5} />
            
            {/* Shine effect on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Title & meta */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[15px] text-foreground truncate leading-tight">
                {name}
              </h3>
              {beta && (
                <Badge 
                  variant="outline" 
                  className="text-[9px] h-4 px-1.5 font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                >
                  Beta
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{author_name || 'ASAP'}</span>
              {author_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground/70">v{version}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & tags */}
      {!compact && (
        <div className="px-5 pb-4 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
            {description}
          </p>
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer with stats and action */}
      <div className={cn(
        "px-5 py-3 flex items-center justify-between",
        "bg-muted/30 border-t border-border/50",
        compact && "px-4 py-2.5"
      )}>
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {rating !== undefined && rating_count > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground/60">({rating_count})</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <span>{formatInstallCount(install_count)}</span>
          </span>
        </div>

        {/* Action button */}
        {installed ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Installed</span>
          </div>
        ) : (
          <Button 
            size="sm" 
            onClick={handleInstallClick}
            disabled={deprecated}
            className={cn(
              "h-8 px-4 text-xs font-medium rounded-lg",
              "transition-all duration-200",
              featured 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md" 
                : "bg-primary hover:bg-primary/90"
            )}
          >
            Install
          </Button>
        )}
      </div>
    </div>
  );
}

function formatInstallCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
