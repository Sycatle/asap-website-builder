import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Link } from '@/components/app-router';
import {
  Sparkles,
  Star,
  ArrowRight,
} from 'lucide-react';
import { getExtensionIconConfig } from '@/lib/extension-icons';
import { useStoreExtensionsQuery } from '@/lib/query/store';
import type { SuggestedExtensionsProps } from './types';

export function SuggestedExtensions({ currentSlug, category, tags: _tags, websiteId }: SuggestedExtensionsProps) {
  const TARGET_COUNT = 4;
  
  const { data: categoryExtensions } = useStoreExtensionsQuery({ 
    category,
    per_page: 8,
  });

  const { data: allExtensions } = useStoreExtensionsQuery({ 
    per_page: 12,
    sort: 'popular',
  });

  const suggestions = useMemo(() => {
    const sameCategoryExts = (categoryExtensions?.extensions || [])
      .filter(ext => ext.slug !== currentSlug);
    
    if (sameCategoryExts.length >= TARGET_COUNT) {
      return sameCategoryExts.slice(0, TARGET_COUNT);
    }
    
    const usedSlugs = new Set([currentSlug, ...sameCategoryExts.map(e => e.slug)]);
    const otherExts = (allExtensions?.extensions || [])
      .filter(ext => !usedSlugs.has(ext.slug));
    
    const remaining = TARGET_COUNT - sameCategoryExts.length;
    return [...sameCategoryExts, ...otherExts.slice(0, remaining)];
  }, [categoryExtensions, allExtensions, currentSlug]);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-10 pt-6 border-t">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-violet-500/10">
          <Sparkles className="w-4 h-4 text-violet-500" />
        </div>
        <h2 className="font-medium">Extensions similaires</h2>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {suggestions.map(ext => {
          const iconConfig = getExtensionIconConfig(ext.icon, ext.slug);
          const IconComponent = iconConfig.icon;
          
          return (
            <Link
              key={ext.slug}
              href={`/${websiteId}/extensions/${ext.slug}`}
              className={cn(
                "group flex flex-col p-5 rounded-xl border bg-card/50 backdrop-blur-sm",
                "transition-all duration-300 hover:bg-card hover:border-primary/20",
              )}
            >
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  `bg-gradient-to-br ${iconConfig.gradient}`,
                )}
              >
                <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">{ext.name}</h3>
                {ext.featured && (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                {ext.description}
              </p>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <span className="text-xs text-muted-foreground">{ext.install_count} installs</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
