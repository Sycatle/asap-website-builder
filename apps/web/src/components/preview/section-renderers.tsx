"use client"

/**
 * Section Renderers for Preview System
 * 
 * V1: Using fixed FreelanceDevProfile structure
 * Section renderers from @asap/renderers package are used for the public site rendering.
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

// Re-export types - Note: Section type removed in V1, using FreelanceDevProfile instead
export type { Website } from '@asap/renderers';

