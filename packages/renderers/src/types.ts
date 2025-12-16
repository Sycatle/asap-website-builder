/**
 * Shared types for section data
 * These types are used by both the preview and public site renderers
 */

export interface Section {
  id: string;
  website_id: string;
  section_type: SectionType;
  title: string;
  layout: string;
  content?: Record<string, unknown>;
  data?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  visible?: boolean;
  order_index: number;
}

export type SectionType =
  | 'hero'
  | 'about'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'education'
  | 'contact'
  | 'testimonials'
  | 'services'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'blog'
  | 'custom';

export interface Website {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  status: 'draft' | 'published';
  metadata?: WebsiteMetadata;
}

export interface WebsiteMetadata {
  theme?: Theme;
  seo?: SEOMetadata;
  favicon?: string;
  logo?: string;
  socialImage?: string;
}

export interface Theme {
  mode: 'dark' | 'light';
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  image?: string;
  twitterHandle?: string;
}

// Content types for each section
export interface HeroContent {
  name?: string;
  headline?: string;
  title?: string;
  subtitle?: string;
  subheadline?: string;
  cta_text?: string;
  ctaText?: string;
  cta_link?: string;
  ctaLink?: string;
  secondary_cta?: string;
  secondaryCta?: string;
  secondary_cta_link?: string;
  secondaryCtaLink?: string;
  background_image?: string;
}

export interface AboutContent {
  description?: string;
  bio?: string;
  image?: string;
  imageUrl?: string;
  highlights?: string[];
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface SkillsContent {
  categories?: SkillCategory[];
}

export interface Project {
  title: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  tags?: string[];
  technologies?: string[];
  link?: string;
  liveUrl?: string;
  github?: string;
  githubUrl?: string;
}

export interface ProjectsContent {
  projects?: Project[];
}

export interface ExperienceItem {
  title?: string;
  position?: string;
  company?: string;
  organization?: string;
  period?: string;
  date?: string;
  description?: string;
  technologies?: string[];
  current?: boolean;
}

export interface ExperienceContent {
  experiences?: ExperienceItem[];
  items?: ExperienceItem[];
}

export interface EducationItem {
  degree?: string;
  title?: string;
  school?: string;
  institution?: string;
  period?: string;
  date?: string;
  description?: string;
}

export interface EducationContent {
  education?: EducationItem[];
  items?: EducationItem[];
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  dribbble?: string;
  youtube?: string;
  instagram?: string;
  website?: string;
}

export interface ContactContent {
  email?: string;
  phone?: string;
  location?: string;
  socials?: SocialLinks;
  socialLinks?: SocialLinks;
  description?: string;
}

export interface Testimonial {
  name?: string;
  author?: string;
  role?: string;
  company?: string;
  content?: string;
  quote?: string;
  avatar?: string;
  rating?: number;
}

export interface TestimonialsContent {
  testimonials?: Testimonial[];
  items?: Testimonial[];
}

export interface Service {
  title: string;
  description?: string;
  icon?: string;
  features?: string[];
  price?: string;
}

export interface ServicesContent {
  services?: Service[];
  items?: Service[];
  subtitle?: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  highlighted?: boolean;
  cta?: string;
  ctaLink?: string;
}

export interface PricingContent {
  plans?: PricingPlan[];
  items?: PricingPlan[];
  subtitle?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQContent {
  faqs?: FAQItem[];
  items?: FAQItem[];
}

export interface GalleryImage {
  src?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface GalleryContent {
  images?: GalleryImage[];
  items?: GalleryImage[];
  columns?: number;
}

export interface BlogPost {
  title: string;
  excerpt?: string;
  date?: string;
  image?: string;
  slug?: string;
}

export interface BlogContent {
  posts?: BlogPost[];
}

export interface CustomContent {
  content?: string;
  html?: string;
}
