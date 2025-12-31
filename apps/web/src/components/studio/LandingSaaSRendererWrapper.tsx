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
  NavigationSaaSRenderer,
  HeroSaaSRenderer,
  FeaturesSaaSRenderer,
  HowItWorksSaaSRenderer,
  PricingSaaSRenderer,
  TestimonialsSaaSRenderer,
  CTASaaSRenderer,
  FooterSaaSRenderer,
} from '@asap/renderers';

// ============================================
// Types
// ============================================

export interface LandingPreviewProps {
  element: WebsiteElement;
  isSelected?: boolean;
}

/**
 * Convert WebsiteElement to Element format expected by renderers
 */
function toSection(element: WebsiteElement): Element {
  return {
    id: element.id,
    website_id: element.website_id,
    element_type: element.element_type,
    // Use settings as the primary data source (SaaS sections use settings)
    settings: element.settings ?? {},
    data: element.data ?? element.content ?? {},
    content: element.content,
    visible: element.visible ?? true,
    order_index: element.order_index ?? element.order ?? 0,
  } as Element;
}

// ============================================
// Wrapper Components
// ============================================

export function LandingNavigationPreview({ element }: LandingPreviewProps) {
  return <NavigationSaaSRenderer section={toSection(element)} />;
}

export function LandingHeroPreview({ element }: LandingPreviewProps) {
  return <HeroSaaSRenderer section={toSection(element)} />;
}

export function LandingFeaturesPreview({ element }: LandingPreviewProps) {
  return <FeaturesSaaSRenderer section={toSection(element)} />;
}

export function LandingHowItWorksPreview({ element }: LandingPreviewProps) {
  return <HowItWorksSaaSRenderer section={toSection(element)} />;
}

export function LandingPricingPreview({ element }: LandingPreviewProps) {
  return <PricingSaaSRenderer section={toSection(element)} />;
}

export function LandingTestimonialsPreview({ element }: LandingPreviewProps) {
  return <TestimonialsSaaSRenderer section={toSection(element)} />;
}

export function LandingCTAPreview({ element }: LandingPreviewProps) {
  return <CTASaaSRenderer section={toSection(element)} />;
}

export function LandingFooterPreview({ element }: LandingPreviewProps) {
  return <FooterSaaSRenderer section={toSection(element)} />;
}
