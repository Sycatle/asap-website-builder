/**
 * SaaS Sections Index
 * 
 * Modular section components for SaaS landing pages.
 * Each section is a standalone component that handles its own data extraction.
 */

export { NavigationSection } from './navigation';
export { HeroSection } from './hero';
export { FeaturesSection } from './features';
export { HowItWorksSection } from './how-it-works';
export { PricingSection } from './pricing';
export { TestimonialsSection } from './testimonials';
export { CTASection } from './cta';
export { FooterSection } from './footer';

// Phase 2: New sections
export { ContentSection } from './content';
export { AboutSection } from './about';
export { FAQSection } from './faq';
export { ContactSection } from './contact';
export { GallerySection } from './gallery';
export { StatsSection } from './stats';
export { LogosSection } from './logos';
export { BlogListSection } from './blog-list';

// Re-export common types
export type { SectionProps } from './navigation';
