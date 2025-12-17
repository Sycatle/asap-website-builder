"use client"

/**
 * Section Renderers for Preview System
 * 
 * Re-exports the shared renderers from @asap/renderers package
 * This ensures 100% visual parity between preview and published sites.
 */

// Re-export all renderers from the shared package
export {
  SectionRenderer,
  HeroRenderer,
  AboutRenderer,
  SkillsRenderer,
  ProjectsRenderer,
  ExperienceRenderer,
  EducationRenderer,
  ContactRenderer,
  TestimonialsRenderer,
  ServicesRenderer,
  PricingRenderer,
  FAQRenderer,
  GalleryRenderer,
  BlogRenderer,
  CustomRenderer,
  type SectionRendererProps,
} from '@asap/renderers';

// Re-export types
export type { Section, Website } from '@asap/renderers';
