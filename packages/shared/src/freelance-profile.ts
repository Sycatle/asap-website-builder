/**
 * @asap/shared - FreelanceDevProfile Data Model
 * 
 * CANONICAL data model for ASAP V1 MVP.
 * This is the single source of truth for a freelance developer portfolio.
 * 
 * DO NOT extend this model until business validation is achieved.
 */

// ============================================
// Core Identity
// ============================================

export interface FreelanceIdentity {
  /** Full name */
  name: string;
  /** Professional title (e.g., "Développeur Full-Stack Freelance") */
  title: string;
  /** Short tagline/headline (max 120 chars) */
  tagline: string;
  /** Avatar/profile photo URL */
  avatar?: string;
  /** Professional bio (2-3 paragraphs) */
  bio: string;
  /** Location (city, country) */
  location?: string;
  /** Availability status */
  availability: 'available' | 'busy' | 'not-available';
  /** Years of experience */
  yearsOfExperience?: number;
}

// ============================================
// Services Offered
// ============================================

export interface FreelanceService {
  /** Service title */
  title: string;
  /** Short description */
  description: string;
  /** Icon identifier (from predefined set) */
  icon: 'code' | 'globe' | 'mobile' | 'server' | 'database' | 'cloud' | 'design' | 'consulting';
}

// ============================================
// Projects / Portfolio
// ============================================

export interface FreelanceProject {
  /** Project ID (UUID) */
  id: string;
  /** Project title */
  title: string;
  /** Short description (max 200 chars) */
  description: string;
  /** Cover image URL */
  image?: string;
  /** Technologies/stack used */
  technologies: string[];
  /** Live demo URL */
  liveUrl?: string;
  /** GitHub repository URL */
  githubUrl?: string;
  /** Is featured project (shown first) */
  featured: boolean;
  /** Project type */
  type: 'personal' | 'client' | 'opensource';
  /** Year completed */
  year?: number;
  /** Auto-imported from GitHub */
  fromGithub?: boolean;
  /** GitHub stars (if from GitHub) */
  stars?: number;
}

// ============================================
// Process / How I Work
// ============================================

export interface FreelanceProcessStep {
  /** Step number (1-based) */
  step: number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Icon identifier */
  icon: 'chat' | 'pencil' | 'code' | 'rocket' | 'check' | 'handshake';
}

// ============================================
// Technical Stack
// ============================================

export interface FreelanceStackCategory {
  /** Category name (e.g., "Frontend", "Backend") */
  name: string;
  /** Skills in this category */
  skills: string[];
}

// ============================================
// Social Proof / Testimonials
// ============================================

export interface FreelanceProof {
  /** Type of proof */
  type: 'testimonial' | 'metric' | 'certification' | 'award';
  /** For testimonials: client name */
  author?: string;
  /** For testimonials: client role/company */
  authorRole?: string;
  /** Content/quote */
  content: string;
  /** For metrics: value (e.g., "50+") */
  value?: string;
  /** For metrics: label (e.g., "Projets livrés") */
  label?: string;
}

// ============================================
// Contact Information
// ============================================

export interface FreelanceContact {
  /** Contact email */
  email: string;
  /** Phone number (optional) */
  phone?: string;
  /** Calendly/Cal.com URL for booking */
  bookingUrl?: string;
  /** Social links */
  socials: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    dribbble?: string;
    website?: string;
  };
}

// ============================================
// CTA Configuration
// ============================================

export interface FreelanceCTA {
  /** Primary CTA text */
  primaryText: string;
  /** Primary CTA action */
  primaryAction: 'email' | 'booking' | 'scroll' | 'link';
  /** Primary CTA target (email, URL, or section ID) */
  primaryTarget: string;
  /** Secondary CTA text (optional) */
  secondaryText?: string;
  /** Secondary CTA action */
  secondaryAction?: 'email' | 'booking' | 'scroll' | 'link';
  /** Secondary CTA target */
  secondaryTarget?: string;
}

// ============================================
// Theme Configuration (LIMITED)
// ============================================

export interface FreelanceThemeConfig {
  /** Primary accent color (hex) */
  primaryColor: string;
  /** Always dark mode for V1 */
  mode: 'dark';
  /** Avatar border style */
  avatarStyle: 'rounded' | 'circle' | 'square';
}

// ============================================
// SEO Configuration
// ============================================

export interface FreelanceSEO {
  /** Page title (defaults to name + title) */
  title?: string;
  /** Meta description */
  description?: string;
  /** Keywords */
  keywords?: string[];
  /** Open Graph image */
  ogImage?: string;
}

// ============================================
// CANONICAL PROFILE MODEL
// ============================================

export interface FreelanceDevProfile {
  /** Profile version (for migrations) */
  version: 1;
  
  /** Unique slug (username.asap.cool) */
  slug: string;
  
  /** Core identity */
  identity: FreelanceIdentity;
  
  /** Services offered (max 4) */
  services: FreelanceService[];
  
  /** Portfolio projects (featured first) */
  projects: FreelanceProject[];
  
  /** Work process (max 5 steps) */
  process: FreelanceProcessStep[];
  
  /** Technical stack */
  stack: FreelanceStackCategory[];
  
  /** Social proof (testimonials, metrics) */
  proof: FreelanceProof[];
  
  /** Contact information */
  contact: FreelanceContact;
  
  /** CTA configuration */
  cta: FreelanceCTA;
  
  /** Theme configuration (limited) */
  theme: FreelanceThemeConfig;
  
  /** SEO configuration */
  seo: FreelanceSEO;
  
  /** Metadata */
  meta: {
    /** Creation date */
    createdAt: string;
    /** Last update */
    updatedAt: string;
    /** Published status */
    published: boolean;
    /** Publishing date */
    publishedAt?: string;
  };
}

// ============================================
// V1 Section Order (FIXED)
// ============================================

/**
 * Fixed section order for V1 landing page.
 * DO NOT allow reordering until business validation.
 */
export const V1_SECTION_ORDER = [
  'hero',      // Hero + CTA
  'services',  // What I do
  'projects',  // Portfolio
  'process',   // How I work
  'stack',     // Technologies
  'proof',     // Testimonials/metrics
  'about',     // About me
  'contact',   // Contact form
] as const;

export type V1SectionType = typeof V1_SECTION_ORDER[number];

// ============================================
// Activation Metrics
// ============================================

export interface ActivationMetrics {
  /** Site is published */
  published: boolean;
  /** Has at least 3 projects */
  hasMinProjects: boolean;
  /** CTA is configured */
  ctaConfigured: boolean;
  /** Contact email is set */
  contactConfigured: boolean;
  /** Overall activation score (0-100) */
  score: number;
  /** Is fully activated */
  activated: boolean;
}

/**
 * Calculate activation metrics for a profile
 */
export function calculateActivation(profile: FreelanceDevProfile): ActivationMetrics {
  const published = profile.meta.published;
  const hasMinProjects = profile.projects.length >= 3;
  const ctaConfigured = !!profile.cta.primaryText && !!profile.cta.primaryTarget;
  const contactConfigured = !!profile.contact.email;
  
  let score = 0;
  if (published) score += 25;
  if (hasMinProjects) score += 25;
  if (ctaConfigured) score += 25;
  if (contactConfigured) score += 25;
  
  const activated = published && hasMinProjects && ctaConfigured && contactConfigured;
  
  return {
    published,
    hasMinProjects,
    ctaConfigured,
    contactConfigured,
    score,
    activated,
  };
}

// ============================================
// Default Placeholder Profile
// ============================================

export const DEFAULT_FREELANCE_PROFILE: Omit<FreelanceDevProfile, 'slug' | 'meta'> = {
  version: 1,
  identity: {
    name: 'Alex Martin',
    title: 'Développeur Full-Stack Freelance',
    tagline: 'Je transforme vos idées en applications web performantes et modernes.',
    bio: `Passionné par le développement web depuis plus de 5 ans, je me spécialise dans la création d'applications modernes avec React, Node.js et TypeScript.

Mon approche : comprendre vos besoins business pour livrer des solutions techniques qui créent de la valeur.

Disponible pour des missions freelance de 2 à 6 mois.`,
    location: 'Paris, France',
    availability: 'available',
    yearsOfExperience: 5,
  },
  services: [
    {
      title: 'Applications Web',
      description: 'Développement d\'applications web sur mesure avec les technologies modernes.',
      icon: 'globe',
    },
    {
      title: 'APIs & Backend',
      description: 'Conception et développement d\'APIs RESTful robustes et scalables.',
      icon: 'server',
    },
    {
      title: 'Consulting Tech',
      description: 'Audit de code, choix d\'architecture et accompagnement technique.',
      icon: 'consulting',
    },
  ],
  projects: [
    {
      id: 'placeholder-1',
      title: 'Projet E-commerce',
      description: 'Plateforme e-commerce moderne avec panier, paiement Stripe et dashboard admin.',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      featured: true,
      type: 'client',
      year: 2024,
    },
    {
      id: 'placeholder-2',
      title: 'Dashboard Analytics',
      description: 'Dashboard temps réel pour visualiser les métriques business avec graphiques interactifs.',
      technologies: ['Next.js', 'TypeScript', 'Recharts', 'Prisma'],
      featured: true,
      type: 'client',
      year: 2024,
    },
    {
      id: 'placeholder-3',
      title: 'API Open Source',
      description: 'Contribution à un projet open source populaire sur GitHub.',
      technologies: ['Rust', 'Docker', 'GitHub Actions'],
      featured: false,
      type: 'opensource',
      year: 2023,
      stars: 150,
    },
  ],
  process: [
    {
      step: 1,
      title: 'Découverte',
      description: 'On échange sur votre projet et vos objectifs pour définir le périmètre.',
      icon: 'chat',
    },
    {
      step: 2,
      title: 'Proposition',
      description: 'Je vous envoie un devis détaillé avec planning et livrables.',
      icon: 'pencil',
    },
    {
      step: 3,
      title: 'Développement',
      description: 'Développement itératif avec points réguliers pour valider l\'avancement.',
      icon: 'code',
    },
    {
      step: 4,
      title: 'Livraison',
      description: 'Mise en production, documentation et transfert de compétences.',
      icon: 'rocket',
    },
  ],
  stack: [
    {
      name: 'Frontend',
      skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS'],
    },
    {
      name: 'Backend',
      skills: ['Node.js', 'Express', 'Rust', 'GraphQL'],
    },
    {
      name: 'Base de données',
      skills: ['PostgreSQL', 'Redis', 'MongoDB'],
    },
    {
      name: 'DevOps',
      skills: ['Docker', 'GitHub Actions', 'Vercel', 'AWS'],
    },
  ],
  proof: [
    {
      type: 'metric',
      value: '50+',
      label: 'Projets livrés',
      content: '',
    },
    {
      type: 'metric',
      value: '30+',
      label: 'Clients satisfaits',
      content: '',
    },
    {
      type: 'testimonial',
      author: 'Marie Dupont',
      authorRole: 'CEO, StartupXYZ',
      content: 'Alex a livré notre MVP en 3 semaines avec une qualité exceptionnelle. Je recommande vivement.',
    },
  ],
  contact: {
    email: 'contact@example.com',
    socials: {
      github: 'https://github.com/alexmartin',
      linkedin: 'https://linkedin.com/in/alexmartin',
      twitter: 'https://twitter.com/alexmartin',
    },
  },
  cta: {
    primaryText: 'Discutons de votre projet',
    primaryAction: 'email',
    primaryTarget: 'contact@example.com',
    secondaryText: 'Voir mes projets',
    secondaryAction: 'scroll',
    secondaryTarget: '#projects',
  },
  theme: {
    primaryColor: '#6366f1',
    mode: 'dark',
    avatarStyle: 'rounded',
  },
  seo: {
    description: 'Développeur Full-Stack Freelance à Paris. React, Node.js, TypeScript. Disponible pour vos projets web.',
    keywords: ['développeur freelance', 'react', 'node.js', 'full-stack', 'paris'],
  },
};
