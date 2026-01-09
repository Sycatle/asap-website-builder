    /**
 * Variant Picker Component
 * 
 * Visual picker for section variants with thumbnails.
 * Provides a more intuitive way to switch between section variants.
 */

"use client"

import React from 'react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { PropertyOption } from "@asap/shared";

// ============================================
// Variant Icons/Thumbnails
// ============================================

// Visual representations for common variant patterns
const VARIANT_VISUALS: Record<string, Record<string, React.ReactNode>> = {
  // Hero variants
  hero: {
    centered: (
      <div className="space-y-1">
        <div className="h-1.5 w-8 bg-current mx-auto rounded" />
        <div className="h-1 w-12 bg-current/50 mx-auto rounded" />
        <div className="flex justify-center gap-1 mt-1">
          <div className="h-1.5 w-4 bg-current rounded" />
          <div className="h-1.5 w-4 bg-current/40 rounded" />
        </div>
      </div>
    ),
    split: (
      <div className="flex gap-1">
        <div className="flex-1 space-y-0.5">
          <div className="h-1 w-full bg-current rounded" />
          <div className="h-0.5 w-3/4 bg-current/50 rounded" />
          <div className="h-1.5 w-3 bg-current rounded mt-0.5" />
        </div>
        <div className="w-6 h-6 bg-current/30 rounded" />
      </div>
    ),
  },
  
  // Content variants
  content: {
    centered: (
      <div className="space-y-1">
        <div className="h-1 w-6 bg-current mx-auto rounded" />
        <div className="h-0.5 w-10 bg-current/50 mx-auto rounded" />
        <div className="h-0.5 w-8 bg-current/30 mx-auto rounded" />
      </div>
    ),
    split: (
      <div className="flex gap-1">
        <div className="w-5 h-5 bg-current/30 rounded" />
        <div className="flex-1 space-y-0.5">
          <div className="h-1 w-full bg-current rounded" />
          <div className="h-0.5 w-3/4 bg-current/50 rounded" />
        </div>
      </div>
    ),
    'full-width': (
      <div className="space-y-0.5">
        <div className="h-1 w-full bg-current rounded" />
        <div className="h-0.5 w-full bg-current/50 rounded" />
        <div className="h-0.5 w-3/4 bg-current/30 rounded" />
      </div>
    ),
  },
  
  // About variants
  about: {
    simple: (
      <div className="space-y-1">
        <div className="h-1 w-6 bg-current mx-auto rounded" />
        <div className="h-0.5 w-10 bg-current/50 mx-auto rounded" />
      </div>
    ),
    'with-image': (
      <div className="flex gap-1 items-center">
        <div className="w-4 h-4 rounded-full bg-current/30" />
        <div className="flex-1 space-y-0.5">
          <div className="h-0.5 w-full bg-current rounded" />
          <div className="h-0.5 w-3/4 bg-current/50 rounded" />
        </div>
      </div>
    ),
    team: (
      <div className="grid grid-cols-3 gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-current/40 mx-auto" />
            <div className="h-0.5 w-full bg-current/30 rounded" />
          </div>
        ))}
      </div>
    ),
    timeline: (
      <div className="space-y-0.5">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="h-0.5 flex-1 bg-current/50 rounded" />
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="h-0.5 flex-1 bg-current/50 rounded" />
        </div>
      </div>
    ),
  },
  
  // FAQ variants
  faq: {
    accordion: (
      <div className="space-y-0.5">
        <div className="flex items-center gap-0.5 p-0.5 border border-current/30 rounded">
          <div className="h-0.5 flex-1 bg-current rounded" />
          <div className="w-1 h-1 border-r border-b border-current rotate-45" />
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-current/20 rounded">
          <div className="h-0.5 flex-1 bg-current/50 rounded" />
        </div>
      </div>
    ),
    grid: (
      <div className="grid grid-cols-2 gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-0.5 border border-current/30 rounded">
            <div className="h-0.5 w-full bg-current/50 rounded" />
          </div>
        ))}
      </div>
    ),
    'two-columns': (
      <div className="flex gap-1">
        <div className="w-4 space-y-0.5">
          <div className="h-1 w-full bg-current rounded" />
          <div className="h-0.5 w-3/4 bg-current/50 rounded" />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="h-0.5 w-full bg-current/30 rounded" />
          <div className="h-0.5 w-full bg-current/30 rounded" />
        </div>
      </div>
    ),
  },
  
  // Contact variants
  contact: {
    simple: (
      <div className="space-y-0.5 p-0.5 border border-current/30 rounded">
        <div className="h-0.5 w-full bg-current/30 rounded" />
        <div className="h-0.5 w-full bg-current/30 rounded" />
        <div className="h-1.5 w-6 bg-current rounded mx-auto mt-0.5" />
      </div>
    ),
    split: (
      <div className="flex gap-1">
        <div className="flex-1 space-y-0.5">
          <div className="h-0.5 w-full bg-current/50 rounded" />
          <div className="h-0.5 w-3/4 bg-current/30 rounded" />
        </div>
        <div className="w-5 space-y-0.5 p-0.5 border border-current/30 rounded">
          <div className="h-0.5 w-full bg-current/30 rounded" />
        </div>
      </div>
    ),
    map: (
      <div className="flex gap-1">
        <div className="w-6 h-5 bg-current/20 rounded flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-current/50 rounded-full" />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="h-0.5 w-full bg-current/30 rounded" />
          <div className="h-0.5 w-full bg-current/30 rounded" />
        </div>
      </div>
    ),
  },
  
  // Gallery variants
  gallery: {
    grid: (
      <div className="grid grid-cols-3 gap-0.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-current/30 rounded" />
        ))}
      </div>
    ),
    masonry: (
      <div className="flex gap-0.5">
        <div className="flex-1 space-y-0.5">
          <div className="h-3 bg-current/30 rounded" />
          <div className="h-2 bg-current/20 rounded" />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="h-2 bg-current/20 rounded" />
          <div className="h-3 bg-current/30 rounded" />
        </div>
      </div>
    ),
    carousel: (
      <div className="flex items-center gap-0.5">
        <div className="w-0.5 h-2 bg-current/30" />
        <div className="flex-1 flex gap-0.5">
          <div className="w-4 h-3 bg-current/30 rounded" />
          <div className="w-4 h-3 bg-current/20 rounded" />
        </div>
        <div className="w-0.5 h-2 bg-current/30" />
      </div>
    ),
  },
  
  // Stats variants
  stats: {
    simple: (
      <div className="flex justify-center gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-1.5 w-3 bg-current mx-auto rounded" />
            <div className="h-0.5 w-4 bg-current/50 mt-0.5 rounded" />
          </div>
        ))}
      </div>
    ),
    cards: (
      <div className="flex gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 p-0.5 border border-current/30 rounded text-center">
            <div className="h-1 w-2 bg-current mx-auto rounded" />
          </div>
        ))}
      </div>
    ),
    inline: (
      <div className="flex items-center justify-center gap-1">
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-current/30 rounded" />
          <div className="h-0.5 w-3 bg-current/50 rounded" />
        </div>
        <div className="w-px h-2 bg-current/30" />
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-current/30 rounded" />
          <div className="h-0.5 w-3 bg-current/50 rounded" />
        </div>
      </div>
    ),
  },
  
  // Logos variants
  logos: {
    simple: (
      <div className="flex justify-center gap-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-2.5 h-1.5 bg-current/40 rounded" />
        ))}
      </div>
    ),
    marquee: (
      <div className="relative overflow-hidden">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2 h-1.5 bg-current/30 rounded flex-shrink-0" />
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-background to-transparent" />
      </div>
    ),
    grid: (
      <div className="grid grid-cols-4 gap-0.5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-1.5 bg-current/30 rounded" />
        ))}
      </div>
    ),
  },
  
  // Blog list variants
  'blog-list': {
    grid: (
      <div className="grid grid-cols-2 gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-0.5">
            <div className="h-2 bg-current/30 rounded" />
            <div className="h-0.5 w-full bg-current/50 rounded" />
          </div>
        ))}
      </div>
    ),
    list: (
      <div className="space-y-0.5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-0.5">
            <div className="w-3 h-2 bg-current/30 rounded" />
            <div className="flex-1 space-y-0.5">
              <div className="h-0.5 w-full bg-current/50 rounded" />
              <div className="h-0.5 w-3/4 bg-current/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    ),
    featured: (
      <div className="space-y-0.5">
        <div className="flex gap-0.5">
          <div className="w-6 h-4 bg-current/30 rounded" />
          <div className="flex-1 space-y-0.5">
            <div className="h-0.5 w-full bg-current/50 rounded" />
            <div className="h-0.5 w-3/4 bg-current/30 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-2 bg-current/20 rounded" />
          ))}
        </div>
      </div>
    ),
  },
  
  // Features variants (existing)
  features: {
    grid: (
      <div className="grid grid-cols-3 gap-0.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-0.5 text-center">
            <div className="w-1.5 h-1.5 rounded bg-current/40 mx-auto" />
            <div className="h-0.5 w-full bg-current/30 mt-0.5 rounded" />
          </div>
        ))}
      </div>
    ),
    list: (
      <div className="space-y-0.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded bg-current/40" />
            <div className="h-0.5 flex-1 bg-current/30 rounded" />
          </div>
        ))}
      </div>
    ),
    cards: (
      <div className="grid grid-cols-2 gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-0.5 border border-current/30 rounded">
            <div className="w-1 h-1 rounded bg-current/40" />
          </div>
        ))}
      </div>
    ),
  },
  
  // Pricing variants (existing)
  pricing: {
    cards: (
      <div className="flex gap-0.5 justify-center">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn(
            "w-3 p-0.5 border rounded",
            i === 1 ? "border-current h-5" : "border-current/30 h-4"
          )}>
            <div className="h-0.5 w-full bg-current/50 rounded" />
          </div>
        ))}
      </div>
    ),
    comparison: (
      <div className="space-y-0.5">
        <div className="flex gap-0.5">
          <div className="flex-1" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="w-3 h-1 bg-current/30 rounded" />
          ))}
        </div>
        <div className="h-px bg-current/20" />
        <div className="flex gap-0.5">
          <div className="flex-1 h-0.5 bg-current/20 rounded" />
          <div className="w-3 h-0.5 bg-current/30 rounded" />
          <div className="w-3 h-0.5 bg-current/30 rounded" />
        </div>
      </div>
    ),
  },
  
  // Testimonials variants (existing)
  testimonials: {
    cards: (
      <div className="flex gap-0.5 justify-center">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-4 p-0.5 border border-current/30 rounded">
            <div className="h-0.5 w-full bg-current/30 rounded" />
          </div>
        ))}
      </div>
    ),
    carousel: (
      <div className="flex items-center gap-0.5">
        <div className="w-0.5 h-2 bg-current/30" />
        <div className="flex-1 p-0.5 border border-current/30 rounded">
          <div className="h-1 w-full bg-current/20 rounded" />
        </div>
        <div className="w-0.5 h-2 bg-current/30" />
      </div>
    ),
    minimal: (
      <div className="space-y-1">
        <div className="h-1.5 w-8 bg-current/20 mx-auto rounded" />
        <div className="flex justify-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-current/40" />
          <div className="h-0.5 w-6 bg-current/30 rounded self-center" />
        </div>
      </div>
    ),
  },
};

// ============================================
// Variant Picker Props
// ============================================

interface VariantPickerProps {
  sectionType: string;
  options: PropertyOption[];
  value: string;
  onChange: (value: string) => void;
}

// ============================================
// Variant Picker Component
// ============================================

export function VariantPicker({ sectionType, options, value, onChange }: VariantPickerProps) {
  const visuals = VARIANT_VISUALS[sectionType] || {};
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Variante</span>
        <Badge variant="outline" className="text-xs">
          {options.find(o => o.value === value)?.label || value}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const visual = visuals[option.value];
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all text-left",
                "hover:border-primary/50 hover:bg-muted/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-muted bg-background"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
              
              {/* Visual preview */}
              <div className={cn(
                "h-10 mb-2 flex items-center justify-center",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {visual || (
                  // Fallback visual
                  <div className="w-full h-full bg-current/10 rounded flex items-center justify-center">
                    <span className="text-[8px] uppercase tracking-wider opacity-50">
                      {option.value}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Label */}
              <p className={cn(
                "text-xs font-medium truncate",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {option.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Check if a property is a variant selector
// ============================================

export function isVariantProperty(propertyKey: string): boolean {
  return propertyKey === 'variant';
}

export default VariantPicker;
