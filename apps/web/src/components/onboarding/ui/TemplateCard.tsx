/**
 * Template Card Component
 * 
 * Card for displaying a template preset in the onboarding flow.
 * Mobile-first, accessible, with hover/focus states.
 */

"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2,
  Clock,
  Star,
  Globe,
  Briefcase,
  Code,
  Palette,
  BarChart3,
  Rocket,
  Layout,
  BookOpen,
  ShoppingBag,
  Camera,
} from 'lucide-react';

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  professional: Briefcase,
  freelance: Code,
  creative: Palette,
  business: BarChart3,
  marketing: Rocket,
  portfolio: Layout,
  blog: BookOpen,
  ecommerce: ShoppingBag,
  photography: Camera,
  general: Globe,
};

export function getCategoryIcon(category: string): React.ElementType {
  return categoryIcons[category] || Globe;
}

interface TemplateCardProps {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: string;
  /** Category label (translated) */
  categoryLabel?: string;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Estimated setup time */
  estimatedTime?: string;
  /** Difficulty level */
  difficulty?: string;
  /** Difficulty label (translated) */
  difficultyLabel?: string;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: () => void;
  /** Additional className */
  className?: string;
}

export function TemplateCard({
  name,
  description,
  category,
  categoryLabel,
  thumbnailUrl,
  estimatedTime = '15min',
  difficulty = 'beginner',
  difficultyLabel,
  isSelected = false,
  onSelect,
  className,
}: TemplateCardProps) {
  const CategoryIcon = getCategoryIcon(category);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select ${name} template`}
      className={cn(
        // Base styles
        'relative group w-full text-left',
        'rounded-xl sm:rounded-2xl overflow-hidden',
        'border-2 transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        
        // Hover states
        'hover:border-primary/50 hover:shadow-lg',
        'sm:hover:-translate-y-1',
        
        // Selected states
        isSelected 
          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
          : 'border-border bg-card hover:bg-accent/50',
        
        className
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div 
          className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10"
          aria-hidden="true"
        >
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
        </div>
      )}
      
      {/* Preview image or placeholder */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryIcon 
              className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" 
              aria-hidden="true"
            />
          </div>
        )}
        
        {/* Category badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <Badge 
            variant="secondary" 
            className="backdrop-blur-sm bg-background/80 text-xs sm:text-sm"
          >
            <CategoryIcon className="h-3 w-3 mr-1" aria-hidden="true" />
            {categoryLabel || category}
          </Badge>
        </div>
        
        {/* Gradient overlay for better text readability */}
        <div 
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
          aria-hidden="true"
        />
      </div>
      
      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5 sm:mt-1">
            {description}
          </p>
        </div>
        
        {/* Meta info */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{estimatedTime}</span>
          </div>
          <span aria-hidden="true">•</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" aria-hidden="true" />
            <span>{difficultyLabel || difficulty}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default TemplateCard;
