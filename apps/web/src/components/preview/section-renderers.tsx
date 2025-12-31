"use client"

/**
 * Section Renderers for Studio Preview System
 * 
 * IMPORTANT: This file re-exports from @asap/renderers which is the
 * SINGLE SOURCE OF TRUTH for all section renderers.
 * 
 * Both the studio preview (apps/web) and public sites (apps/sites) use
 * the exact same renderers from this package, guaranteeing 100% visual parity.
 * 
 * DO NOT define renderers here - add them to packages/renderers instead.
 */

// Re-export main components
export {
  SectionRenderer,
  getRenderer,
  hasRenderer,
  getRegisteredSectionTypes,
  renderers,
} from '@asap/renderers';

// Re-export individual section components for direct use
export {
  NavigationSection,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  FooterSection,
} from '@asap/renderers';

// Re-export types
export type { SectionRendererProps, Website, Section } from '@asap/renderers';

