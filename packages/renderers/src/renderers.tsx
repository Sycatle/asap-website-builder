/**
 * Section Renderer - Single Source of Truth
 * 
 * This is the ONLY renderer system. All section types are rendered
 * through this unified registry using modular SaaS components.
 * 
 * Used by both:
 * - apps/web (studio preview)
 * - apps/sites (public published sites)
 */

import React from 'react';
import DOMPurify from 'dompurify';
import type { Section, Website } from './types';
import { cn } from './utils';

// Import SaaS section components directly (no adapters needed)
import {
  NavigationSection,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  FooterSection,
} from './components/saas';

// ============================================
// HTML Sanitization
// ============================================

/**
 * Sanitize HTML content to prevent XSS attacks.
 */
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'pre', 'code',
      'span', 'div',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup', 'mark'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'title', 'alt', 'src',
      'class', 'id', 'style',
      'colspan', 'rowspan'
    ],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export { sanitizeHtml };

// ============================================
// Common Props
// ============================================

export interface SectionRendererProps {
  section: Section;
  website?: Website;
  isSelected?: boolean;
  isEditable?: boolean;
  onClick?: () => void;
}

// ============================================
// Fallback Renderer
// ============================================

function FallbackRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  return (
    <section 
      className={cn(
        'py-16 md:py-24 px-6 bg-muted/30',
        isSelected && 'ring-2 ring-ring ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-muted-foreground">
          Section type "{section.element_type}" non supporté.
        </p>
      </div>
    </section>
  );
}

// ============================================
// Section Registry
// ============================================

/**
 * Section Type Registry
 * 
 * Single source of truth for all section renderers.
 * Maps section types to their renderer components.
 * Components handle their own data extraction from section.
 */
const renderers: Record<string, React.ComponentType<SectionRendererProps>> = {
  // Navigation
  navigation: NavigationSection,
  
  // Content sections
  hero: HeroSection,
  features: FeaturesSection,
  'how-it-works': HowItWorksSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  cta: CTASection,
  
  // Footer
  footer: FooterSection,
};

// ============================================
// Main Exports
// ============================================

/**
 * SectionRenderer - Main component for rendering any section
 * 
 * Usage:
 * ```tsx
 * <SectionRenderer section={section} website={website} />
 * ```
 */
export function SectionRenderer({ 
  section, 
  website, 
  isSelected, 
  isEditable, 
  onClick 
}: SectionRendererProps) {
  const sectionType = section.element_type?.toLowerCase() || 'fallback';
  const Renderer = renderers[sectionType] || FallbackRenderer;
  
  return (
    <Renderer 
      section={section} 
      website={website} 
      isSelected={isSelected} 
      isEditable={isEditable} 
      onClick={onClick} 
    />
  );
}

/**
 * Get a specific renderer by section type
 */
export function getRenderer(type: string): React.ComponentType<SectionRendererProps> {
  return renderers[type?.toLowerCase()] || FallbackRenderer;
}

/**
 * Check if a section type has a registered renderer
 */
export function hasRenderer(type: string): boolean {
  return type?.toLowerCase() in renderers;
}

/**
 * Get all registered section types
 */
export function getRegisteredSectionTypes(): string[] {
  return Object.keys(renderers);
}

export { renderers };
