/**
 * Landing SaaS Renderer Wrapper
 * 
 * This file wraps @asap/renderers to use them directly in the Studio.
 * This eliminates code duplication and ensures 100% parity between
 * Studio preview and published site.
 * 
 * The renderers use CSS responsive classes (md:, lg:) which work
 * correctly when the preview is resized to different widths.
 */

"use client"

import React from 'react';
import type { WebsiteElement } from "@/lib/api";
import type { Element } from '@asap/shared';
import {
  NavigationSection,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  FooterSection,
} from '@asap/renderers';

// ============================================
// Types
// ============================================

export interface LandingPreviewProps {
  element: WebsiteElement;
  isSelected?: boolean;
}

/**
 * Convert WebsiteElement to Element format expected by renderers.
 * 
 * Handles both data sources:
 * - SaaS sections: use `settings` as primary source
 * - Portfolio sections: use `content` or `data` as primary source
 * 
 * The renderer's getData() function will look in both `settings` and `data`,
 * so we ensure both are properly populated.
 */
export function toSection(element: WebsiteElement): Element {
  // Merge all data sources for maximum compatibility
  // Priority: settings > data > content (for SaaS sections)
  const settings = element.settings ?? {};
  const data = element.data ?? {};
  const content = element.content ?? {};
  
  // For SaaS sections, settings is the primary source
  // For Portfolio sections, content/data is the primary source
  // We keep both to ensure getData() in renderers can find the values
  
  return {
    id: element.id,
    website_id: element.website_id,
    element_type: element.element_type,
    slug: element.slug,
    title: element.title,
    layout: element.layout,
    // Settings for SaaS sections
    settings: settings,
    // Data/content for compatibility - merge them
    data: { ...content, ...data },
    content: content,
    visible: element.visible ?? true,
    order_index: element.order_index ?? element.order ?? 0,
  } as Element;
}

// ============================================
// Wrapper Components
// ============================================

export function LandingNavigationPreview({ element }: LandingPreviewProps) {
  return <NavigationSection section={toSection(element)} />;
}

export function LandingHeroPreview({ element }: LandingPreviewProps) {
  return <HeroSection section={toSection(element)} />;
}

export function LandingFeaturesPreview({ element }: LandingPreviewProps) {
  return <FeaturesSection section={toSection(element)} />;
}

export function LandingHowItWorksPreview({ element }: LandingPreviewProps) {
  return <HowItWorksSection section={toSection(element)} />;
}

export function LandingPricingPreview({ element }: LandingPreviewProps) {
  return <PricingSection section={toSection(element)} />;
}

export function LandingTestimonialsPreview({ element }: LandingPreviewProps) {
  return <TestimonialsSection section={toSection(element)} />;
}

export function LandingCTAPreview({ element }: LandingPreviewProps) {
  return <CTASection section={toSection(element)} />;
}

export function LandingFooterPreview({ element }: LandingPreviewProps) {
  return <FooterSection section={toSection(element)} />;
}
