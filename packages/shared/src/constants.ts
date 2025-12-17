/**
 * @asap/shared - Shared constants for the ASAP platform
 * 
 * This is the single source of truth for all shared constants.
 * Import from here instead of duplicating constant definitions.
 */

import type { SectionType } from './types';

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
// Section Types Configuration
// ============================================

/** Section type definition with label and description */
export interface SectionTypeDefinition {
  value: SectionType;
  label: string;
  description: string;
}

/** Available layout definition */
export interface LayoutDefinition {
  value: string;
  label: string;
}

/** All available section types with their metadata */
export const SECTION_TYPES: SectionTypeDefinition[] = [
  { value: 'hero', label: 'Hero', description: "Section d'accueil principale" },
  { value: 'about', label: 'À propos', description: 'Présentation personnelle/entreprise' },
  { value: 'projects', label: 'Projets', description: 'Galerie de projets' },
  { value: 'skills', label: 'Compétences', description: 'Compétences techniques' },
  { value: 'experience', label: 'Expérience', description: 'Parcours professionnel' },
  { value: 'education', label: 'Formation', description: 'Parcours éducatif' },
  { value: 'contact', label: 'Contact', description: 'Formulaire de contact' },
  { value: 'blog', label: 'Blog', description: 'Articles de blog' },
  { value: 'gallery', label: 'Galerie', description: "Galerie d'images" },
  { value: 'testimonials', label: 'Témoignages', description: 'Témoignages clients' },
  { value: 'services', label: 'Services', description: 'Services proposés' },
  { value: 'pricing', label: 'Tarifs', description: 'Grille tarifaire' },
  { value: 'faq', label: 'FAQ', description: 'Questions fréquentes' },
  { value: 'custom', label: 'Personnalisé', description: 'Section personnalisée' },
];

/** Available layouts per section type */
export const SECTION_LAYOUTS: Record<SectionType, LayoutDefinition[]> = {
  hero: [{ value: 'full', label: 'Plein écran' }],
  about: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
  ],
  projects: [
    { value: 'grid', label: 'Grille' },
    { value: 'cards', label: 'Cartes' },
  ],
  skills: [
    { value: 'grid', label: 'Grille' },
    { value: 'list', label: 'Liste' },
  ],
  experience: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  education: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  contact: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
  ],
  blog: [
    { value: 'list', label: 'Liste' },
    { value: 'grid', label: 'Grille' },
  ],
  gallery: [{ value: 'grid', label: 'Grille' }],
  testimonials: [{ value: 'cards', label: 'Cartes' }],
  services: [
    { value: 'cards', label: 'Cartes' },
    { value: 'grid', label: 'Grille' },
  ],
  pricing: [{ value: 'cards', label: 'Cartes' }],
  faq: [{ value: 'list', label: 'Liste' }],
  custom: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
    { value: 'grid', label: 'Grille' },
    { value: 'cards', label: 'Cartes' },
    { value: 'list', label: 'Liste' },
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get section type definition by value
 */
export function getSectionType(type: string): SectionTypeDefinition | undefined {
  return SECTION_TYPES.find(t => t.value === type);
}

/**
 * Get section label by type
 */
export function getSectionLabel(type: string): string {
  return getSectionType(type)?.label || type;
}

/**
 * Get section description by type
 */
export function getSectionDescription(type: string): string {
  return getSectionType(type)?.description || '';
}

/**
 * Get available layouts for a section type
 */
export function getLayoutsForType(type: string): LayoutDefinition[] {
  return SECTION_LAYOUTS[type as SectionType] || SECTION_LAYOUTS.custom;
}
