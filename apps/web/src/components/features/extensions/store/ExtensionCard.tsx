/**
 * Extension Card Component
 * 
 * Displays an extension summary in the store grid.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Download, CheckCircle2, Sparkles } from 'lucide-react';
import type { ExtensionStoreSummary } from '@/lib/api/store';
import { cn } from '@/lib/utils';

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
    // category - available but not displayed in card
    tags,
    // min_plan - used for install button logic elsewhere
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

  const handleCardClick = () => {
    onSelect?.(slug);
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstall?.();
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        featured && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10",
        deprecated && "opacity-60",
        compact && "p-3"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className={cn("pb-2", compact && "p-0 pb-2")}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl",
            featured && "bg-amber-100 dark:bg-amber-900/30"
          )}>
            {icon ? (
              <span>{icon}</span>
            ) : (
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Title & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{name}</h3>
              {featured && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Featured
                </Badge>
              )}
              {beta && (
                <Badge variant="outline" className="text-xs">Beta</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {author_name && (
                <span className="flex items-center gap-1">
                  {author_name}
                  {author_verified && (
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  )}
                </span>
              )}
              <span className="text-xs">v{version}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className={cn("pt-2 flex items-center justify-between", compact && "p-0 pt-2")}>
        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {rating !== undefined && rating_count > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              <span className="text-xs">({rating_count})</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {formatInstallCount(install_count)}
          </span>
        </div>

        {/* Action */}
        {installed ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Installed
          </Badge>
        ) : (
          <Button 
            size="sm" 
            variant={featured ? "default" : "outline"}
            onClick={handleInstallClick}
            disabled={deprecated}
          >
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
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
