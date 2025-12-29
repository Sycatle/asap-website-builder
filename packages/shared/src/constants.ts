/**
 * @asap/shared - Shared constants for the ASAP platform
 * 
 * This is the single source of truth for all shared constants.
 * Import from here instead of duplicating constant definitions.
 */

import type { ElementType } from './types';

// ============================================
// Domain Configuration
// ============================================

/** The base domain for ASAP sites */
export const ASAP_DOMAIN = 'asap.cool';

// ============================================
// Slug Configuration
// ============================================

/** Minimum length for slugs */
export const SLUG_MIN_LENGTH = 3;

/** Maximum length for slugs */
export const SLUG_MAX_LENGTH = 63;

/** Regex pattern for validating slugs */
export const SLUG_REGEX = /^[a-z0-9-]+$/;

// ============================================
// Element Types Configuration
// ============================================

/** Element type definition with label and description */
export interface ElementTypeDefinition {
  value: ElementType;
  label: string;
  description: string;
}

/** Available layout definition */
export interface LayoutDefinition {
  value: string;
  label: string;
}

/**
 * V1 MVP: Portfolio-focused element types only.
 * ORDERED: This is the canonical order for the freelance landing page.
 * FROZEN: Do not modify until business validation.
 */
export const ELEMENT_TYPES: ElementTypeDefinition[] = [
  // Portfolio element types
  { value: 'hero', label: 'Hero', description: 'Présentation et appel à l\'action principal' },
  { value: 'services', label: 'Services', description: 'Ce que je fais (3-4 services max)' },
  { value: 'projects', label: 'Projets', description: 'Portfolio de réalisations' },
  { value: 'process', label: 'Process', description: 'Comment je travaille (étapes)' },
  { value: 'skills', label: 'Stack', description: 'Technologies maîtrisées' },
  { value: 'proof', label: 'Preuves', description: 'Témoignages et métriques' },
  { value: 'about', label: 'À propos', description: 'Bio et parcours' },
  { value: 'contact', label: 'Contact', description: 'Formulaire de contact' },
  // Landing SaaS element types
  { value: 'navigation', label: 'Navigation', description: 'Barre de navigation avec menu et boutons' },
  { value: 'features', label: 'Fonctionnalités', description: 'Grille de fonctionnalités du produit' },
  { value: 'how-it-works', label: 'Comment ça marche', description: 'Étapes d\'utilisation du produit' },
  { value: 'pricing', label: 'Tarifs', description: 'Plans et tarification' },
  { value: 'testimonials', label: 'Témoignages', description: 'Témoignages et avis clients' },
  { value: 'cta', label: 'Appel à l\'action', description: 'Section d\'incitation à l\'action' },
  { value: 'footer', label: 'Pied de page', description: 'Liens et informations légales' },
];

/**
 * LEGACY element types - hidden from UI, kept for backward compatibility.
 * @deprecated Do not use for new features.
 */
export const LEGACY_ELEMENT_TYPES: ElementTypeDefinition[] = [
  { value: 'experience' as ElementType, label: 'Expérience', description: '[LEGACY] Parcours professionnel' },
  { value: 'education' as ElementType, label: 'Formation', description: '[LEGACY] Parcours éducatif' },
  { value: 'testimonials' as ElementType, label: 'Témoignages', description: '[LEGACY] Témoignages clients' },
  { value: 'pricing' as ElementType, label: 'Tarifs', description: '[LEGACY] Grille tarifaire' },
  { value: 'faq' as ElementType, label: 'FAQ', description: '[LEGACY] Questions fréquentes' },
  { value: 'gallery' as ElementType, label: 'Galerie', description: '[LEGACY] Galerie d\'images' },
  { value: 'blog' as ElementType, label: 'Blog', description: '[LEGACY] Articles de blog' },
  { value: 'custom' as ElementType, label: 'Personnalisé', description: '[LEGACY] Élément personnalisé' },
];

/**
 * V1 MVP: Fixed layouts per element type.
 * FROZEN: Do not customize until business validation.
 */
export const ELEMENT_LAYOUTS: Record<ElementType, LayoutDefinition[]> = {
  // Portfolio layouts
  hero: [{ value: 'full', label: 'Plein écran' }],
  services: [{ value: 'grid', label: 'Grille' }],
  projects: [{ value: 'grid', label: 'Grille' }],
  process: [{ value: 'steps', label: 'Étapes' }],
  skills: [{ value: 'grid', label: 'Grille' }],
  proof: [{ value: 'cards', label: 'Cartes' }],
  about: [{ value: 'split', label: 'Divisé' }],
  contact: [{ value: 'full', label: 'Plein écran' }],
  // Landing SaaS layouts
  navigation: [{ value: 'sticky', label: 'Fixe' }, { value: 'static', label: 'Statique' }],
  features: [{ value: 'grid', label: 'Grille' }, { value: 'list', label: 'Liste' }],
  'how-it-works': [{ value: 'timeline', label: 'Timeline' }, { value: 'steps', label: 'Étapes' }],
  pricing: [{ value: 'cards', label: 'Cartes' }, { value: 'table', label: 'Tableau' }],
  testimonials: [{ value: 'cards', label: 'Cartes' }, { value: 'carousel', label: 'Carrousel' }],
  cta: [{ value: 'full', label: 'Plein écran' }, { value: 'split', label: 'Divisé' }],
  footer: [{ value: 'full', label: 'Complet' }, { value: 'minimal', label: 'Minimal' }],
};

/**
 * @deprecated LEGACY layouts - kept for backward compatibility only.
 */
export const LEGACY_ELEMENT_LAYOUTS: Record<string, LayoutDefinition[]> = {
  experience: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  education: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  testimonials: [{ value: 'cards', label: 'Cartes' }],
  pricing: [{ value: 'cards', label: 'Cartes' }],
  faq: [{ value: 'list', label: 'Liste' }],
  gallery: [{ value: 'grid', label: 'Grille' }],
  blog: [
    { value: 'list', label: 'Liste' },
    { value: 'grid', label: 'Grille' },
  ],
  custom: [
    { value: 'full', label: 'Plein écran' },
    { value: 'grid', label: 'Grille' },
    { value: 'cards', label: 'Cartes' },
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get element type definition by value
 */
export function getElementType(type: string): ElementTypeDefinition | undefined {
  return ELEMENT_TYPES.find(t => t.value === type);
}

/**
 * Get element label by type
 */
export function getElementLabel(type: string): string {
  return getElementType(type)?.label || type;
}

/**
 * Get element description by type
 */
export function getElementDescription(type: string): string {
  return getElementType(type)?.description || '';
}

/**
 * Get available layouts for an element type
 */
export function getLayoutsForType(type: string): LayoutDefinition[] {
  // V1: Return layouts for known types, or default to hero layout
  return ELEMENT_LAYOUTS[type as ElementType] || [{ value: 'default', label: 'Par défaut' }];
}
