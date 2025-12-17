"use client"

/**
 * V1 Section Renderers
 * 
 * Re-exports premium ElementPreviews as section renderers for the Studio.
 * These provide rich, visual previews of portfolio elements.
 */

import type { WebsiteElement } from "@/lib/api"
import { 
  ElementPreview as SectionRenderer,
  HeroPreview,
  ServicesPreview,
  ProjectsPreview,
  SkillsPreview,
  ProcessPreview,
  ProofPreview,
  AboutPreview,
  ContactPreview,
  GenericPreview,
  type ElementPreviewProps as SectionRendererProps,
} from "./ElementPreviews"

// Export main component
export { SectionRenderer }
export type { SectionRendererProps }

// Named renderers for specific element types
export const HeroRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const AboutRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const SkillsRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const ProjectsRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const ContactRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const ServicesRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const ProcessRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />
export const ProofRenderer = (props: SectionRendererProps) => <SectionRenderer {...props} />

// Type re-exports for compatibility
export type Section = WebsiteElement
export type Website = Record<string, unknown>
