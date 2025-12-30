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

// Re-export individual renderers for direct use
export {
  // SaaS Sections
  NavigationSaaSRenderer,
  HeroSaaSRenderer,
  FeaturesSaaSRenderer,
  HowItWorksSaaSRenderer,
  PricingSaaSRenderer,
  TestimonialsSaaSRenderer,
  CTASaaSRenderer,
  FooterSaaSRenderer,
  // Portfolio Sections
  HeroRenderer,
  AboutRenderer,
  SkillsRenderer,
  ProjectsRenderer,
  ExperienceRenderer,
  EducationRenderer,
  ContactRenderer,
  ServicesRenderer,
  PricingRenderer,
  FAQRenderer,
  GalleryRenderer,
  BlogRenderer,
  CustomRenderer,
} from '@asap/renderers';

// Re-export types
export type { SectionRendererProps, Website, Section } from '@asap/renderers';

