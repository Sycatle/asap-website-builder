/**
 * Category Navigation Component
 * 
 * Sidebar navigation for browsing extensions by category.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Blocks,
  BarChart3,
  Palette,
  Share2,
  Code,
  Zap,
  FileText,
  Users,
  Shield,
  Sparkles,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

interface Category {
  slug: string;
  name: string;
  description?: string;
  count?: number;
}

interface CategoryNavProps {
  categories: Category[];
  selected?: string;
  onSelect: (slug: string | undefined) => void;
  className?: string;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'analytics': BarChart3,
  'integrations': Blocks,
  'themes': Palette,
  'social': Share2,
  'developer': Code,
  'productivity': Zap,
  'content': FileText,
  'collaboration': Users,
  'security': Shield,
  'ai': Sparkles,
};

function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] || LayoutGrid;
}

export function CategoryNav({
  categories,
  selected,
  onSelect,
  className,
}: CategoryNavProps) {
  return (
    <nav className={cn('space-y-1', className)}>
      <div className="px-3 py-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Categories
        </h3>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-1 p-1">
          {/* All extensions */}
          <Button
            variant={!selected ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => onSelect(undefined)}
          >
            <LayoutGrid className="w-4 h-4" />
            All Extensions
          </Button>

          {/* Category list */}
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            const isSelected = selected === category.slug;

            return (
              <Button
                key={category.slug}
                variant={isSelected ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => onSelect(category.slug)}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{category.name}</span>
                {category.count !== undefined && (
                  <Badge variant="outline" className="ml-auto">
                    {category.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </nav>
  );
}

/**
 * Horizontal variant for mobile/tablet
 */
export function CategoryNavHorizontal({
  categories,
  selected,
  onSelect,
  className,
}: CategoryNavProps) {
  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex gap-2 pb-2">
        {/* All extensions */}
        <Button
          variant={!selected ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(undefined)}
        >
          All
        </Button>

        {/* Categories */}
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          const isSelected = selected === category.slug;

          return (
            <Button
              key={category.slug}
              variant={isSelected ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => onSelect(category.slug)}
            >
              <Icon className="w-3.5 h-3.5" />
              {category.name}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
