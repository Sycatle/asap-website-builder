/**
 * @asap/shared - Shared types for the ASAP platform
 * 
 * This is the single source of truth for all shared types.
 * Import from here instead of duplicating type definitions.
 */

// ============================================
// Element Types
// ============================================

/**
 * V1 MVP: Portfolio-focused element types only.
 * FROZEN: Do not add new types until business validation.
 * 
 * @see V1_SECTION_ORDER in freelance-profile.ts for canonical order
 */
export type ElementType =
  // Portfolio element types
  | 'hero'       // Hero + CTA
  | 'about'      // About me / Bio
  | 'services'   // What I do (freelance services)
  | 'projects'   // Portfolio projects
  | 'process'    // How I work (steps)
  | 'skills'     // Tech stack / skills
  | 'proof'      // Testimonials / social proof
  | 'contact'    // Contact form
  // Landing SaaS element types
  | 'navigation' // Navigation bar
  | 'features'   // Features grid
  | 'how-it-works' // How it works steps
  | 'pricing'    // Pricing plans
  | 'testimonials' // Customer testimonials
  | 'cta'        // Call to action
  | 'footer';    // Footer

// ============================================
// LEGACY/FROZEN Element Types (V2+)
// ============================================
// These types are frozen and hidden from the UI.
// Do not use until business validation.
export type LegacyElementType =
  | 'experience'
  | 'education'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'blog'
  | 'custom';

export interface Element {
  id: string;
  website_id: string;
  extension_id?: string;
  element_type: ElementType;
  slug?: string;
  title: string;
  order?: number;
  order_index: number;
  layout: string;
  /** Raw JSX/TSX written by the AI codegen pipeline. */
  source_code?: string | null;
  /** esbuild output ready to dynamic-import at render. */
  compiled_js?: string | null;
  /** Collections / variables the section consumes. */
  data_bindings?: Record<string, unknown>;
  /** AST-extracted props the studio renders as direct controls. */
  knobs_schema?: Record<string, unknown>;
  content?: Record<string, unknown>;
  data?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Website Types
// ============================================

export type WebsiteStatus = 'draft' | 'published';

export interface Website {
  id: string;
  account_id?: string;
  slug: string;
  title: string;
  tagline?: string;
  status: WebsiteStatus;
  creation_mode?: string;
  preset_id?: string;
  metadata?: WebsiteMetadata;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface WebsiteMetadata {
  theme?: Theme;
  tokens?: DesignTokens;
  seo?: SEOMetadata;
  favicon?: string;
  logo?: string;
  socialImage?: string;
}

// ============================================
// Theme Types (legacy — kept for backward compat)
// ============================================

export interface Theme {
  mode: 'dark' | 'light';
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  mutedColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

// ============================================
// Design Tokens (per-site visual identity)
// ============================================

export type DensityScale = 'compact' | 'default' | 'airy';
export type RadiusPhilosophy = 'sharp' | 'soft' | 'pill';
export type MotionIntensity = 'none' | 'subtle' | 'expressive';
export type ShadowPhilosophy = 'flat' | 'layered' | 'glow';
export type ColorMode = 'dark' | 'light';

export interface PaletteTokens {
  mode: ColorMode;
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  surface?: string;
  onSurface?: string;
  neutralScale?: string[]; // 11 stops, 50…950
}

export interface TypographyTokens {
  displayFamily: string;
  bodyFamily: string;
  scaleRatio: number;  // e.g. 1.2 (minor third) … 1.333 (perfect fourth)
  weights?: number[];
  tracking?: number;   // em
}

export interface SpacingTokens {
  base: number;        // px
  scaleRatio: number;
  density: DensityScale;
}

export interface RadiusTokens {
  sm: number;
  md: number;
  lg: number;
  full: number;
  philosophy: RadiusPhilosophy;
}

export interface MotionTokens {
  durationScale: number; // multiplier on base 200ms
  easing: string;        // CSS easing
  intensity: MotionIntensity;
}

export interface ShadowTokens {
  elevationScale: string[]; // 5 levels, valid CSS box-shadow values
  philosophy: ShadowPhilosophy;
}

export interface VoiceTokens {
  tone?: string;       // free-form descriptor (e.g. "warm", "precise")
  formality?: 'casual' | 'neutral' | 'formal';
  sector?: string;     // industry — informs AI copy
}

export interface DesignTokens {
  version: 1;
  palette: PaletteTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  motion: MotionTokens;
  shadow: ShadowTokens;
  voice?: VoiceTokens;
}

export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  image?: string;
  twitterHandle?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

// ============================================
// Page Types
// ============================================

export interface Page {
  id: string;
  website_id: string;
  slug: string;
  title: string;
  description?: string;
  is_homepage: boolean;
  visible: boolean;
  order_index: number;
  elements?: Element[];
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Element Content Types
// ============================================

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

// ============================================
// Collections & Variables Types
// ============================================

/**
 * Sync mode for collections
 */
export type SyncMode = 'manual' | 'auto';

/**
 * Sync frequency for auto-sync collections
 */
export type SyncFrequency = 'hourly' | 'daily' | 'weekly';

/**
 * Status of collection sync
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

/**
 * Field types for collection schemas
 */
export type CollectionFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'url'
  | 'email'
  | 'image'
  | 'rich_text'
  | 'json'
  | 'array'
  | 'reference';

/**
 * Field definition in a collection schema
 */
export interface CollectionFieldDef {
  key: string;
  type: CollectionFieldType;
  label: string;
  description?: string;
  required?: boolean;
  default_value?: unknown;
  filterable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  format?: string;
  icon?: string;
}

/**
 * Collection schema definition
 */
export interface CollectionSchema {
  primary_key: string;
  display_field: string;
  preview_fields: string[];
  fields: CollectionFieldDef[];
}

/**
 * Collection definition from extension catalog
 */
export interface CollectionDefinition {
  slug: string;
  name: string;
  description: string;
  sync_mode: SyncMode;
  sync_frequency?: SyncFrequency;
  schema: CollectionSchema;
}

/**
 * A single item in a collection
 */
export interface CollectionItem {
  id: string;
  data: Record<string, unknown>;
  _created_at: string;
  _updated_at: string;
  _source_id?: string;
}

/**
 * Collection instance for a specific website
 */
export interface WebsiteCollection {
  id: string;
  website_id: string;
  collection_slug: string;
  items: CollectionItem[];
  source_extension: string;
  source_version?: string;
  total_count: number;
  sync_status: SyncStatus;
  sync_error?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Collection summary (for listing)
 */
export interface CollectionSummary {
  collection_slug: string;
  source_extension: string;
  total_count: number;
  sync_status: SyncStatus;
  synced_at?: string;
}

/**
 * Variable value type
 */
export type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json';

/**
 * Variable source
 */
export type VariableSource = 'manual' | 'extension' | 'computed';

/**
 * Compute operation for computed variables
 */
export type ComputeOperation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'mode';

/**
 * Variable computation definition
 */
export interface VariableComputation {
  operation: ComputeOperation;
  collection: string;
  field?: string;
  filter?: FilterClause[];
  sort?: SortClause;
}

/**
 * Variable definition from extension catalog
 */
export interface VariableDefinition {
  key: string;
  name: string;
  description?: string;
  value_type: VariableType;
  source: VariableSourceDef;
}

/**
 * Variable source definition
 */
export type VariableSourceDef =
  | { type: 'manual' }
  | { type: 'extension'; setting_key: string }
  | { type: 'computed'; computation: VariableComputation };

/**
 * Variable instance for a specific website
 */
export interface WebsiteVariable {
  id: string;
  website_id: string;
  key: string;
  value: unknown;
  value_type: VariableType;
  source: VariableSource;
  source_ref?: string;
  stale: boolean;
  /**
   * When `false`, the variable is excluded from the public site data envelope
   * served at `GET /api/public/websites/:slug/data`. Defaults to `true`.
   */
  is_public: boolean;
  computation?: VariableComputation;
  created_at: string;
  updated_at: string;
}

/**
 * Variables list response with quick lookup map
 */
export interface VariablesListResponse {
  variables: WebsiteVariable[];
  /** Quick lookup map: key → value */
  values: Record<string, unknown>;
}

// ============================================
// Data Binding Types (for Studio)
// ============================================

/**
 * Filter operator for queries
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'exists'
  | 'not_exists';

/**
 * Filter clause for queries
 */
export interface FilterClause {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort clause for queries
 */
export interface SortClause {
  field: string;
  order: SortOrder;
}

/**
 * Collection binding for Studio components
 */
export interface CollectionBinding {
  slug: string;
  filter?: FilterClause[];
  sort?: SortClause;
  limit?: number;
  offset?: number;
}

/**
 * Data binding configuration for Studio sections
 */
export interface DataBinding {
  /** Collection binding */
  collection?: CollectionBinding;
  /** Field mapping: component prop → collection field */
  mapping?: Record<string, string | Record<string, string>>;
  /** Variable bindings: template key → variable key */
  variables?: Record<string, string>;
}

/**
 * Data source configuration for sections
 */
export interface DataSource {
  type: 'collection' | 'static';
  collection?: string;
  filter?: FilterClause[];
  sort?: SortClause;
  limit?: number;
  mapping?: Record<string, string | Record<string, string>>;
}

