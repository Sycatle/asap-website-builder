/**
 * Landing SaaS Property Schema
 * 
 * Defines all customizable properties for Landing SaaS sections
 * in a declarative, component-first manner.
 * 
 * Each section has a schema that describes:
 * - Property name, type, default value
 * - UI metadata for the editor (label, placeholder, group)
 * - Nested structures (arrays of items)
 */

// ============================================
// Property Types
// ============================================

export type PropertyType =
  | 'text'          // Single line text
  | 'textarea'      // Multi-line text
  | 'number'        // Numeric value
  | 'boolean'       // Toggle switch
  | 'select'        // Dropdown selection
  | 'color'         // Color picker
  | 'icon'          // Icon selector
  | 'url'           // URL input
  | 'image'         // Image URL/upload
  | 'array'         // Array of items
  | 'group';        // Grouped properties

export interface PropertyOption {
  value: string;
  label: string;
  icon?: string;
}

export interface PropertySchema {
  key: string;
  type: PropertyType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  group?: string;
  
  // For select type
  options?: PropertyOption[];
  
  // For array type
  itemSchema?: PropertySchema[];
  itemLabel?: string;
  maxItems?: number;
  minItems?: number;
  
  // For group type
  properties?: PropertySchema[];
  
  // Conditional visibility
  showIf?: {
    key: string;
    value: unknown;
  };
}

export interface SectionSchema {
  type: string;
  label: string;
  description: string;
  icon: string;
  properties: PropertySchema[];
  defaultSettings: Record<string, unknown>;
}

// ============================================
// Common Property Definitions
// ============================================

const commonTextProps = {
  headline: (label: string = 'Titre principal'): PropertySchema => ({
    key: 'headline',
    type: 'text',
    label,
    placeholder: 'Entrez votre titre',
    group: 'content',
  }),
  
  headline_line1: (label: string = 'Titre (ligne 1)'): PropertySchema => ({
    key: 'headline_line1',
    type: 'text',
    label,
    placeholder: 'Première partie du titre',
    group: 'content',
  }),
  
  headline_line2: (label: string = 'Titre (ligne 2)'): PropertySchema => ({
    key: 'headline_line2',
    type: 'text',
    label,
    placeholder: 'Deuxième partie du titre',
    group: 'content',
  }),
  
  subheadline: (label: string = 'Sous-titre'): PropertySchema => ({
    key: 'subheadline',
    type: 'textarea',
    label,
    placeholder: 'Description courte',
    group: 'content',
  }),
  
  badge_text: (label: string = 'Badge'): PropertySchema => ({
    key: 'badge_text',
    type: 'text',
    label,
    placeholder: 'Texte du badge',
    group: 'content',
  }),
};

const commonCtaProps = {
  cta_primary: (): PropertySchema[] => [
    {
      key: 'cta_primary_text',
      type: 'text',
      label: 'Bouton principal - Texte',
      placeholder: 'Commencer',
      group: 'cta',
    },
    {
      key: 'cta_primary_href',
      type: 'url',
      label: 'Bouton principal - Lien',
      placeholder: '/signup',
      group: 'cta',
    },
    {
      key: 'cta_primary_icon',
      type: 'icon',
      label: 'Bouton principal - Icône',
      group: 'cta',
    },
    {
      key: 'cta_primary_variant',
      type: 'select',
      label: 'Bouton principal - Style',
      options: [
        { value: 'default', label: 'Principal' },
        { value: 'secondary', label: 'Secondaire' },
        { value: 'outline', label: 'Contour' },
      ],
      defaultValue: 'default',
      group: 'cta',
    },
  ],
  
  cta_secondary: (): PropertySchema[] => [
    {
      key: 'cta_secondary_text',
      type: 'text',
      label: 'Bouton secondaire - Texte',
      placeholder: 'En savoir plus',
      group: 'cta',
    },
    {
      key: 'cta_secondary_href',
      type: 'url',
      label: 'Bouton secondaire - Lien',
      placeholder: '#features',
      group: 'cta',
    },
    {
      key: 'cta_secondary_icon',
      type: 'icon',
      label: 'Bouton secondaire - Icône',
      group: 'cta',
    },
    {
      key: 'cta_secondary_variant',
      type: 'select',
      label: 'Bouton secondaire - Style',
      options: [
        { value: 'default', label: 'Principal' },
        { value: 'secondary', label: 'Secondaire' },
        { value: 'outline', label: 'Contour' },
        { value: 'ghost', label: 'Transparent' },
      ],
      defaultValue: 'outline',
      group: 'cta',
    },
  ],
};

// ============================================
// Available Icons
// ============================================

export const AVAILABLE_ICONS: PropertyOption[] = [
  { value: 'zap', label: 'Éclair' },
  { value: 'github', label: 'GitHub' },
  { value: 'globe', label: 'Globe' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'sparkles', label: 'Étoiles' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'bar-chart-3', label: 'Graphique' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'check', label: 'Check' },
  { value: 'arrow-right', label: 'Flèche droite' },
  { value: 'play', label: 'Play' },
  { value: 'star', label: 'Étoile' },
  { value: 'users', label: 'Utilisateurs' },
  { value: 'rocket', label: 'Fusée' },
  { value: 'chevron-right', label: 'Chevron droite' },
  { value: 'menu', label: 'Menu' },
  { value: 'x', label: 'Fermer' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'settings', label: 'Paramètres' },
  { value: 'lock', label: 'Cadenas' },
  { value: 'code', label: 'Code' },
  { value: 'heart', label: 'Coeur' },
  { value: 'bell', label: 'Cloche' },
  { value: 'mail', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'map-pin', label: 'Position' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'clock', label: 'Horloge' },
  { value: 'download', label: 'Télécharger' },
  { value: 'upload', label: 'Upload' },
];

// ============================================
// Navigation Section Schema
// ============================================

export const NAVIGATION_SCHEMA: SectionSchema = {
  type: 'navigation',
  label: 'Navigation',
  description: 'Barre de navigation principale',
  icon: 'menu',
  properties: [
    // Brand
    {
      key: 'show_logo',
      type: 'boolean',
      label: 'Afficher le logo',
      defaultValue: true,
      group: 'brand',
    },
    {
      key: 'logo_icon',
      type: 'icon',
      label: 'Icône du logo',
      defaultValue: 'zap',
      group: 'brand',
    },
    {
      key: 'brand_name',
      type: 'text',
      label: 'Nom de la marque',
      placeholder: 'ASAP',
      defaultValue: 'ASAP',
      group: 'brand',
    },
    
    // Navigation Links
    {
      key: 'nav_links',
      type: 'array',
      label: 'Liens de navigation',
      itemLabel: 'Lien',
      group: 'navigation',
      maxItems: 6,
      itemSchema: [
        {
          key: 'label',
          type: 'text',
          label: 'Texte',
          placeholder: 'Fonctionnalités',
        },
        {
          key: 'href',
          type: 'url',
          label: 'URL',
          placeholder: '#features',
        },
      ],
      defaultValue: [
        { label: 'Fonctionnalités', href: '#features' },
        { label: 'Tarifs', href: '#pricing' },
        { label: 'Témoignages', href: '#testimonials' },
      ],
    },
    
    // Auth Buttons
    {
      key: 'show_auth_buttons',
      type: 'boolean',
      label: 'Afficher les boutons de connexion',
      defaultValue: true,
      group: 'auth',
    },
    {
      key: 'login_text',
      type: 'text',
      label: 'Texte connexion',
      placeholder: 'Connexion',
      defaultValue: 'Connexion',
      group: 'auth',
      showIf: { key: 'show_auth_buttons', value: true },
    },
    {
      key: 'login_href',
      type: 'url',
      label: 'Lien connexion',
      placeholder: '/login',
      defaultValue: '/login',
      group: 'auth',
      showIf: { key: 'show_auth_buttons', value: true },
    },
    {
      key: 'signup_text',
      type: 'text',
      label: 'Texte inscription',
      placeholder: 'Commencer gratuitement',
      defaultValue: 'Commencer gratuitement',
      group: 'auth',
      showIf: { key: 'show_auth_buttons', value: true },
    },
    {
      key: 'signup_href',
      type: 'url',
      label: 'Lien inscription',
      placeholder: '/signup',
      defaultValue: '/signup',
      group: 'auth',
      showIf: { key: 'show_auth_buttons', value: true },
    },
    
    // Mobile
    {
      key: 'mobile_menu',
      type: 'boolean',
      label: 'Menu mobile',
      defaultValue: true,
      group: 'mobile',
    },
  ],
  defaultSettings: {
    show_logo: true,
    logo_icon: 'zap',
    brand_name: 'ASAP',
    nav_links: [
      { label: 'Fonctionnalités', href: '#features' },
      { label: 'Tarifs', href: '#pricing' },
      { label: 'Témoignages', href: '#testimonials' },
    ],
    show_auth_buttons: true,
    login_text: 'Connexion',
    login_href: '/login',
    signup_text: 'Commencer gratuitement',
    signup_href: '/signup',
    mobile_menu: true,
  },
};

// ============================================
// Hero Section Schema
// ============================================

export const HERO_SCHEMA: SectionSchema = {
  type: 'hero',
  label: 'Hero',
  description: 'Section principale avec CTA',
  icon: 'rocket',
  properties: [
    // Badge
    {
      key: 'show_badge',
      type: 'boolean',
      label: 'Afficher le badge',
      defaultValue: true,
      group: 'badge',
    },
    {
      key: 'badge_icon',
      type: 'icon',
      label: 'Icône du badge',
      defaultValue: 'sparkles',
      group: 'badge',
      showIf: { key: 'show_badge', value: true },
    },
    {
      key: 'badge_text',
      type: 'text',
      label: 'Texte du badge',
      placeholder: 'Nouveau',
      defaultValue: 'Nouvelle version disponible',
      group: 'badge',
      showIf: { key: 'show_badge', value: true },
    },
    
    // Headlines
    commonTextProps.headline_line1('Titre ligne 1'),
    commonTextProps.headline_line2('Titre ligne 2'),
    {
      key: 'subheadline',
      type: 'textarea',
      label: 'Sous-titre',
      placeholder: 'Description courte de votre produit',
      group: 'content',
    },
    {
      key: 'subheadline_bold',
      type: 'text',
      label: 'Partie en gras du sous-titre',
      placeholder: 'Texte mis en évidence',
      group: 'content',
    },
    
    // CTA
    ...commonCtaProps.cta_primary(),
    ...commonCtaProps.cta_secondary(),
    
    // Social Proof
    {
      key: 'show_social_proof',
      type: 'boolean',
      label: 'Afficher la preuve sociale',
      defaultValue: true,
      group: 'social_proof',
    },
    {
      key: 'social_proof_avatars_count',
      type: 'number',
      label: 'Nombre d\'avatars',
      defaultValue: 5,
      group: 'social_proof',
      showIf: { key: 'show_social_proof', value: true },
    },
    {
      key: 'social_proof_text',
      type: 'text',
      label: 'Texte de preuve sociale',
      placeholder: '+500 utilisateurs',
      defaultValue: '+500 créateurs nous font confiance',
      group: 'social_proof',
      showIf: { key: 'show_social_proof', value: true },
    },
    {
      key: 'social_proof_rating',
      type: 'text',
      label: 'Note',
      placeholder: '4.9/5 sur 200+ avis',
      defaultValue: '4.9/5 sur 200+ avis',
      group: 'social_proof',
      showIf: { key: 'show_social_proof', value: true },
    },
    
    // Dashboard Preview
    {
      key: 'show_dashboard_preview',
      type: 'boolean',
      label: 'Afficher l\'aperçu dashboard',
      defaultValue: true,
      group: 'preview',
    },
    {
      key: 'dashboard_url',
      type: 'text',
      label: 'URL affichée',
      placeholder: 'app.asap.cool',
      defaultValue: 'app.asap.cool',
      group: 'preview',
      showIf: { key: 'show_dashboard_preview', value: true },
    },
    {
      key: 'dashboard_stats',
      type: 'array',
      label: 'Statistiques du dashboard',
      itemLabel: 'Stat',
      maxItems: 3,
      group: 'preview',
      showIf: { key: 'show_dashboard_preview', value: true },
      itemSchema: [
        {
          key: 'icon',
          type: 'icon',
          label: 'Icône',
        },
        {
          key: 'value',
          type: 'text',
          label: 'Valeur',
          placeholder: '100',
        },
        {
          key: 'label',
          type: 'text',
          label: 'Label',
          placeholder: 'Sites',
        },
      ],
      defaultValue: [
        { icon: 'globe', value: '3', label: 'Sites' },
        { icon: 'cloud', value: '2.4 GB', label: 'Storage' },
        { icon: 'sparkles', value: '8,500', label: 'Tokens' },
      ],
    },
    
    // Background
    {
      key: 'background_decorations',
      type: 'boolean',
      label: 'Décorations de fond',
      defaultValue: true,
      group: 'style',
    },
  ],
  defaultSettings: {
    show_badge: true,
    badge_icon: 'sparkles',
    badge_text: 'Nouvelle version disponible',
    headline_line1: 'Créez votre site web',
    headline_line2: 'en quelques minutes',
    subheadline: 'La plateforme tout-en-un pour créer, gérer et faire évoluer votre présence en ligne.',
    subheadline_bold: '',
    cta_primary_text: 'Commencer gratuitement',
    cta_primary_href: '/signup',
    cta_primary_icon: 'arrow-right',
    cta_primary_variant: 'default',
    cta_secondary_text: 'Voir la démo',
    cta_secondary_href: '#demo',
    cta_secondary_icon: 'play',
    cta_secondary_variant: 'outline',
    show_social_proof: true,
    social_proof_avatars_count: 5,
    social_proof_text: '+500 créateurs nous font confiance',
    social_proof_rating: '4.9/5 sur 200+ avis',
    show_dashboard_preview: true,
    dashboard_url: 'app.asap.cool',
    dashboard_stats: [
      { icon: 'globe', value: '3', label: 'Sites' },
      { icon: 'cloud', value: '2.4 GB', label: 'Storage' },
      { icon: 'sparkles', value: '8,500', label: 'Tokens' },
    ],
    background_decorations: true,
  },
};

// ============================================
// Features Section Schema
// ============================================

export const FEATURES_SCHEMA: SectionSchema = {
  type: 'features',
  label: 'Fonctionnalités',
  description: 'Grille de fonctionnalités',
  icon: 'puzzle',
  properties: [
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline_line1('Titre ligne 1'),
    commonTextProps.headline_line2('Titre ligne 2'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Layout
    {
      key: 'columns',
      type: 'select',
      label: 'Nombre de colonnes',
      options: [
        { value: '2', label: '2 colonnes' },
        { value: '3', label: '3 colonnes' },
      ],
      defaultValue: '3',
      group: 'layout',
    },
    {
      key: 'show_badges',
      type: 'boolean',
      label: 'Afficher les badges',
      defaultValue: true,
      group: 'layout',
    },
    {
      key: 'show_icons',
      type: 'boolean',
      label: 'Afficher les icônes',
      defaultValue: true,
      group: 'layout',
    },
    {
      key: 'hover_effect',
      type: 'boolean',
      label: 'Effet au survol',
      defaultValue: true,
      group: 'layout',
    },
    
    // Features
    {
      key: 'features',
      type: 'array',
      label: 'Fonctionnalités',
      itemLabel: 'Fonctionnalité',
      maxItems: 12,
      group: 'features',
      itemSchema: [
        {
          key: 'icon',
          type: 'icon',
          label: 'Icône',
          defaultValue: 'sparkles',
        },
        {
          key: 'title',
          type: 'text',
          label: 'Titre',
          placeholder: 'Titre de la fonctionnalité',
        },
        {
          key: 'description',
          type: 'textarea',
          label: 'Description',
          placeholder: 'Description de la fonctionnalité',
        },
        {
          key: 'badge',
          type: 'text',
          label: 'Badge (optionnel)',
          placeholder: 'Nouveau',
        },
      ],
    },
  ],
  defaultSettings: {
    badge_text: 'Fonctionnalités',
    headline_line1: 'Tout ce dont vous avez besoin',
    headline_line2: 'pour réussir en ligne',
    subheadline: 'Des outils puissants pour créer et gérer votre présence web.',
    columns: '3',
    show_badges: true,
    show_icons: true,
    hover_effect: true,
    features: [
      { icon: 'github', title: 'Sync GitHub', description: 'Synchronisez automatiquement vos projets GitHub', badge: 'Populaire' },
      { icon: 'globe', title: 'Multi-sites', description: 'Gérez plusieurs sites depuis un seul tableau de bord' },
      { icon: 'cloud', title: 'Hébergement inclus', description: 'Hébergement cloud rapide et sécurisé inclus' },
      { icon: 'sparkles', title: 'Assistant IA', description: 'Générez du contenu avec l\'intelligence artificielle', badge: 'Nouveau' },
      { icon: 'puzzle', title: 'Extensions', description: 'Étendez les fonctionnalités avec notre marketplace' },
      { icon: 'bar-chart-3', title: 'Analytics', description: 'Suivez vos performances avec des statistiques détaillées' },
    ],
  },
};

// ============================================
// How It Works Section Schema
// ============================================

export const HOW_IT_WORKS_SCHEMA: SectionSchema = {
  type: 'how-it-works',
  label: 'Comment ça marche',
  description: 'Étapes du processus',
  icon: 'check',
  properties: [
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline_line1('Titre ligne 1'),
    commonTextProps.headline_line2('Titre ligne 2'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Layout
    {
      key: 'show_numbers',
      type: 'boolean',
      label: 'Afficher les numéros',
      defaultValue: true,
      group: 'layout',
    },
    {
      key: 'show_connectors',
      type: 'boolean',
      label: 'Afficher les connecteurs',
      defaultValue: true,
      group: 'layout',
    },
    
    // Steps
    {
      key: 'steps',
      type: 'array',
      label: 'Étapes',
      itemLabel: 'Étape',
      maxItems: 6,
      group: 'steps',
      itemSchema: [
        {
          key: 'number',
          type: 'text',
          label: 'Numéro',
          placeholder: '01',
        },
        {
          key: 'title',
          type: 'text',
          label: 'Titre',
          placeholder: 'Titre de l\'étape',
        },
        {
          key: 'description',
          type: 'textarea',
          label: 'Description',
          placeholder: 'Description de l\'étape',
        },
      ],
    },
  ],
  defaultSettings: {
    badge_text: 'Simple comme bonjour',
    headline_line1: 'Lancez-vous',
    headline_line2: 'en 4 étapes',
    subheadline: 'Un processus simple pour créer votre site web en quelques minutes.',
    show_numbers: true,
    show_connectors: true,
    steps: [
      { number: '01', title: 'Créez votre compte', description: 'Inscription gratuite en 30 secondes' },
      { number: '02', title: 'Choisissez un template', description: 'Sélectionnez parmi nos modèles professionnels' },
      { number: '03', title: 'Ajoutez votre contenu', description: 'Personnalisez selon vos besoins' },
      { number: '04', title: 'Publiez en un clic', description: 'Votre site est en ligne instantanément' },
    ],
  },
};

// ============================================
// Pricing Section Schema
// ============================================

export const PRICING_SCHEMA: SectionSchema = {
  type: 'pricing',
  label: 'Tarifs',
  description: 'Plans et tarification',
  icon: 'bar-chart-3',
  properties: [
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline_line1('Titre ligne 1'),
    commonTextProps.headline_line2('Titre ligne 2'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Currency
    {
      key: 'currency',
      type: 'text',
      label: 'Devise',
      placeholder: '€',
      defaultValue: '€',
      group: 'pricing',
    },
    {
      key: 'currency_position',
      type: 'select',
      label: 'Position de la devise',
      options: [
        { value: 'before', label: 'Avant (€99)' },
        { value: 'after', label: 'Après (99€)' },
      ],
      defaultValue: 'after',
      group: 'pricing',
    },
    {
      key: 'show_popular_badge',
      type: 'boolean',
      label: 'Afficher le badge populaire',
      defaultValue: true,
      group: 'pricing',
    },
    {
      key: 'popular_badge_text',
      type: 'text',
      label: 'Texte du badge populaire',
      placeholder: 'Populaire',
      defaultValue: 'Populaire',
      group: 'pricing',
      showIf: { key: 'show_popular_badge', value: true },
    },
    
    // Plans
    {
      key: 'plans',
      type: 'array',
      label: 'Plans',
      itemLabel: 'Plan',
      maxItems: 4,
      group: 'plans',
      itemSchema: [
        {
          key: 'name',
          type: 'text',
          label: 'Nom du plan',
          placeholder: 'Pro',
        },
        {
          key: 'description',
          type: 'text',
          label: 'Description',
          placeholder: 'Pour les professionnels',
        },
        {
          key: 'price',
          type: 'text',
          label: 'Prix',
          placeholder: '9',
        },
        {
          key: 'period',
          type: 'text',
          label: 'Période',
          placeholder: '/mois',
        },
        {
          key: 'popular',
          type: 'boolean',
          label: 'Mettre en avant',
          defaultValue: false,
        },
        {
          key: 'features',
          type: 'array',
          label: 'Fonctionnalités',
          itemLabel: 'Fonctionnalité',
          maxItems: 10,
          itemSchema: [
            {
              key: 'text',
              type: 'text',
              label: 'Texte',
              placeholder: '5 sites web',
            },
          ],
        },
        {
          key: 'cta_text',
          type: 'text',
          label: 'Texte du bouton',
          placeholder: 'Commencer',
          defaultValue: 'Commencer',
        },
        {
          key: 'cta_variant',
          type: 'select',
          label: 'Style du bouton',
          options: [
            { value: 'default', label: 'Principal' },
            { value: 'outline', label: 'Contour' },
          ],
          defaultValue: 'default',
        },
      ],
    },
  ],
  defaultSettings: {
    badge_text: 'Tarifs',
    headline_line1: 'Des prix simples',
    headline_line2: 'et transparents',
    subheadline: 'Choisissez le plan qui correspond à vos besoins.',
    currency: '€',
    currency_position: 'after',
    show_popular_badge: true,
    popular_badge_text: 'Populaire',
    plans: [
      {
        name: 'Gratuit',
        description: 'Pour démarrer',
        price: '0',
        period: 'Toujours gratuit',
        features: ['1 site web', '500 Mo de stockage', '1000 tokens IA', 'Sous-domaine asap.cool'],
        cta_text: 'Commencer',
        cta_variant: 'outline',
      },
      {
        name: 'Pro',
        description: 'Pour les créateurs',
        price: '9',
        period: '/mois',
        popular: true,
        features: ['5 sites web', '10 Go de stockage', '10 000 tokens IA', 'Domaines personnalisés', 'Analytics avancés'],
        cta_text: 'Commencer',
        cta_variant: 'default',
      },
      {
        name: 'Team',
        description: 'Pour les équipes',
        price: '29',
        period: '/mois',
        features: ['Sites illimités', '100 Go de stockage', 'Tokens illimités', 'Multi-utilisateurs', 'API access'],
        cta_text: 'Contacter',
        cta_variant: 'outline',
      },
    ],
  },
};

// ============================================
// Testimonials Section Schema
// ============================================

export const TESTIMONIALS_SCHEMA: SectionSchema = {
  type: 'testimonials',
  label: 'Témoignages',
  description: 'Avis clients',
  icon: 'star',
  properties: [
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline_line1('Titre ligne 1'),
    commonTextProps.headline_line2('Titre ligne 2'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Layout
    {
      key: 'columns',
      type: 'select',
      label: 'Nombre de colonnes',
      options: [
        { value: '2', label: '2 colonnes' },
        { value: '3', label: '3 colonnes' },
      ],
      defaultValue: '3',
      group: 'layout',
    },
    {
      key: 'show_avatars',
      type: 'boolean',
      label: 'Afficher les avatars',
      defaultValue: true,
      group: 'layout',
    },
    {
      key: 'show_quotes',
      type: 'boolean',
      label: 'Afficher les guillemets',
      defaultValue: true,
      group: 'layout',
    },
    
    // Testimonials
    {
      key: 'testimonials',
      type: 'array',
      label: 'Témoignages',
      itemLabel: 'Témoignage',
      maxItems: 9,
      group: 'testimonials',
      itemSchema: [
        {
          key: 'quote',
          type: 'textarea',
          label: 'Citation',
          placeholder: 'Ce produit a changé ma vie...',
        },
        {
          key: 'author',
          type: 'text',
          label: 'Auteur',
          placeholder: 'Marie L.',
        },
        {
          key: 'role',
          type: 'text',
          label: 'Rôle/Entreprise',
          placeholder: 'CEO, Startup Inc.',
        },
        {
          key: 'avatar_initials',
          type: 'text',
          label: 'Initiales avatar',
          placeholder: 'ML',
        },
        {
          key: 'avatar_image',
          type: 'image',
          label: 'Photo (optionnel)',
          placeholder: 'https://...',
        },
      ],
    },
  ],
  defaultSettings: {
    badge_text: 'Témoignages',
    headline_line1: 'Ils nous font',
    headline_line2: 'confiance',
    subheadline: 'Découvrez ce que nos clients disent de nous.',
    columns: '3',
    show_avatars: true,
    show_quotes: true,
    testimonials: [
      { quote: 'ASAP a complètement transformé ma façon de présenter mes projets. L\'éditeur est intuitif et le résultat est professionnel.', author: 'Marie L.', role: 'Développeuse Full-Stack', avatar_initials: 'ML' },
      { quote: 'En tant que freelance, j\'avais besoin d\'un site rapidement. ASAP a rendu cela possible en une soirée seulement.', author: 'Thomas R.', role: 'Designer UX/UI', avatar_initials: 'TR' },
      { quote: 'Notre agence utilise ASAP pour créer des portfolios pour nos clients. Le gain de temps est considérable.', author: 'Kevin M.', role: 'Directeur d\'agence', avatar_initials: 'KM' },
    ],
  },
};

// ============================================
// CTA Section Schema
// ============================================

export const CTA_SCHEMA: SectionSchema = {
  type: 'cta',
  label: 'Call to Action',
  description: 'Section d\'appel à l\'action',
  icon: 'rocket',
  properties: [
    // Style
    {
      key: 'background_style',
      type: 'select',
      label: 'Style de fond',
      options: [
        { value: 'primary', label: 'Couleur principale' },
        { value: 'secondary', label: 'Neutre' },
        { value: 'gradient', label: 'Dégradé' },
      ],
      defaultValue: 'primary',
      group: 'style',
    },
    
    // Content
    {
      key: 'headline',
      type: 'text',
      label: 'Titre',
      placeholder: 'Prêt à commencer ?',
      group: 'content',
    },
    {
      key: 'subheadline_line1',
      type: 'text',
      label: 'Sous-titre ligne 1',
      placeholder: 'Rejoignez des milliers de créateurs.',
      group: 'content',
    },
    {
      key: 'subheadline_line2',
      type: 'text',
      label: 'Sous-titre ligne 2',
      placeholder: 'C\'est gratuit pour commencer.',
      group: 'content',
    },
    
    // CTA
    ...commonCtaProps.cta_primary(),
    ...commonCtaProps.cta_secondary(),
  ],
  defaultSettings: {
    background_style: 'primary',
    headline: 'Prêt à créer votre site ?',
    subheadline_line1: 'Rejoignez des milliers de créateurs.',
    subheadline_line2: 'C\'est gratuit pour commencer.',
    cta_primary_text: 'Créer mon site gratuitement',
    cta_primary_href: '/signup',
    cta_primary_icon: 'rocket',
    cta_primary_variant: 'secondary',
    cta_secondary_text: 'Voir les tarifs',
    cta_secondary_href: '#pricing',
    cta_secondary_icon: 'chevron-right',
    cta_secondary_variant: 'outline',
  },
};

// ============================================
// Footer Section Schema
// ============================================

export const FOOTER_SCHEMA: SectionSchema = {
  type: 'footer',
  label: 'Pied de page',
  description: 'Footer avec liens et infos',
  icon: 'menu',
  properties: [
    // Brand
    {
      key: 'show_logo',
      type: 'boolean',
      label: 'Afficher le logo',
      defaultValue: true,
      group: 'brand',
    },
    {
      key: 'logo_icon',
      type: 'icon',
      label: 'Icône du logo',
      defaultValue: 'zap',
      group: 'brand',
      showIf: { key: 'show_logo', value: true },
    },
    {
      key: 'brand_name',
      type: 'text',
      label: 'Nom de la marque',
      placeholder: 'ASAP',
      defaultValue: 'ASAP',
      group: 'brand',
    },
    {
      key: 'tagline',
      type: 'textarea',
      label: 'Slogan',
      placeholder: 'Créez votre présence en ligne.',
      group: 'brand',
    },
    
    // Badges
    {
      key: 'show_badges',
      type: 'boolean',
      label: 'Afficher les badges',
      defaultValue: true,
      group: 'badges',
    },
    {
      key: 'badges',
      type: 'array',
      label: 'Badges',
      itemLabel: 'Badge',
      maxItems: 3,
      group: 'badges',
      showIf: { key: 'show_badges', value: true },
      itemSchema: [
        {
          key: 'icon',
          type: 'icon',
          label: 'Icône',
        },
        {
          key: 'text',
          type: 'text',
          label: 'Texte',
          placeholder: 'RGPD',
        },
      ],
    },
    
    // Link Columns
    {
      key: 'columns',
      type: 'array',
      label: 'Colonnes de liens',
      itemLabel: 'Colonne',
      maxItems: 4,
      group: 'links',
      itemSchema: [
        {
          key: 'title',
          type: 'text',
          label: 'Titre de la colonne',
          placeholder: 'Produit',
        },
        {
          key: 'links',
          type: 'array',
          label: 'Liens',
          itemLabel: 'Lien',
          maxItems: 8,
          itemSchema: [
            {
              key: 'label',
              type: 'text',
              label: 'Texte',
              placeholder: 'Fonctionnalités',
            },
            {
              key: 'href',
              type: 'url',
              label: 'URL',
              placeholder: '/features',
            },
          ],
        },
      ],
    },
    
    // Social Links
    {
      key: 'show_social_links',
      type: 'boolean',
      label: 'Afficher les réseaux sociaux',
      defaultValue: true,
      group: 'social',
    },
    {
      key: 'social_links',
      type: 'array',
      label: 'Réseaux sociaux',
      itemLabel: 'Réseau',
      maxItems: 5,
      group: 'social',
      showIf: { key: 'show_social_links', value: true },
      itemSchema: [
        {
          key: 'platform',
          type: 'select',
          label: 'Plateforme',
          options: [
            { value: 'github', label: 'GitHub' },
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'instagram', label: 'Instagram' },
          ],
        },
        {
          key: 'href',
          type: 'url',
          label: 'URL',
          placeholder: 'https://github.com/...',
        },
      ],
    },
    
    // Copyright
    {
      key: 'copyright',
      type: 'text',
      label: 'Copyright',
      placeholder: '© 2024 ASAP. Tous droits réservés.',
      defaultValue: '© 2024 ASAP. Tous droits réservés.',
      group: 'legal',
    },
  ],
  defaultSettings: {
    show_logo: true,
    logo_icon: 'zap',
    brand_name: 'ASAP',
    tagline: 'Créez votre présence en ligne, rapidement.',
    show_badges: true,
    badges: [
      { icon: 'shield', text: 'RGPD' },
      { text: '🇫🇷 Made in France' },
    ],
    columns: [
      {
        title: 'Produit',
        links: [
          { label: 'Fonctionnalités', href: '#features' },
          { label: 'Tarifs', href: '#pricing' },
          { label: 'Documentation', href: '/docs' },
        ],
      },
      {
        title: 'Entreprise',
        links: [
          { label: 'À propos', href: '/about' },
          { label: 'Blog', href: '/blog' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        title: 'Légal',
        links: [
          { label: 'CGU', href: '/terms' },
          { label: 'Confidentialité', href: '/privacy' },
          { label: 'Cookies', href: '/cookies' },
        ],
      },
    ],
    show_social_links: true,
    social_links: [
      { platform: 'github', href: 'https://github.com/asap' },
      { platform: 'twitter', href: 'https://twitter.com/asap' },
    ],
    copyright: '© 2024 ASAP. Tous droits réservés.',
  },
};

// ============================================
// Content Section Schema
// ============================================

export const CONTENT_SCHEMA: SectionSchema = {
  type: 'content',
  label: 'Contenu',
  description: 'Section de contenu riche',
  icon: 'text',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'centered', label: 'Centré' },
        { value: 'split', label: 'Image/Texte' },
        { value: 'full-width', label: 'Pleine largeur' },
      ],
      defaultValue: 'centered',
      group: 'layout',
    },
    
    // Content
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Introduction'),
    {
      key: 'content',
      type: 'textarea',
      label: 'Contenu',
      placeholder: 'Votre contenu ici...',
      group: 'content',
    },
    
    // Image (for split variant)
    {
      key: 'image_url',
      type: 'image',
      label: 'Image',
      placeholder: 'URL de l\'image',
      group: 'media',
      showIf: { key: 'variant', value: 'split' },
    },
    {
      key: 'image_position',
      type: 'select',
      label: 'Position de l\'image',
      options: [
        { value: 'left', label: 'Gauche' },
        { value: 'right', label: 'Droite' },
      ],
      defaultValue: 'right',
      group: 'media',
      showIf: { key: 'variant', value: 'split' },
    },
    {
      key: 'image_alt',
      type: 'text',
      label: 'Texte alternatif',
      placeholder: 'Description de l\'image',
      group: 'media',
    },
    
    // CTA
    ...commonCtaProps.cta_primary(),
    
    // Style
    {
      key: 'background',
      type: 'select',
      label: 'Arrière-plan',
      options: [
        { value: 'default', label: 'Par défaut' },
        { value: 'muted', label: 'Grisé' },
        { value: 'gradient', label: 'Dégradé' },
      ],
      defaultValue: 'default',
      group: 'style',
    },
  ],
  defaultSettings: {
    variant: 'centered',
    headline: 'Notre histoire',
    subheadline: 'Découvrez ce qui nous motive et nous anime au quotidien.',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    image_url: '',
    image_position: 'right',
    image_alt: '',
    cta_primary_text: 'En savoir plus',
    cta_primary_href: '/about',
    cta_primary_icon: '',
    cta_primary_variant: 'default',
    background: 'default',
  },
};

// ============================================
// About Section Schema
// ============================================

export const ABOUT_SCHEMA: SectionSchema = {
  type: 'about',
  label: 'À propos',
  description: 'Section bio/présentation',
  icon: 'user',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'simple', label: 'Simple' },
        { value: 'with-image', label: 'Avec image' },
        { value: 'team', label: 'Équipe' },
        { value: 'timeline', label: 'Timeline' },
      ],
      defaultValue: 'simple',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Description'),
    
    // Main person/company info
    {
      key: 'name',
      type: 'text',
      label: 'Nom',
      placeholder: 'John Doe',
      group: 'content',
    },
    {
      key: 'role',
      type: 'text',
      label: 'Rôle/Titre',
      placeholder: 'Fondateur & CEO',
      group: 'content',
    },
    {
      key: 'bio',
      type: 'textarea',
      label: 'Biographie',
      placeholder: 'Votre histoire...',
      group: 'content',
    },
    {
      key: 'avatar_url',
      type: 'image',
      label: 'Photo',
      group: 'media',
    },
    
    // Team members (for team variant)
    {
      key: 'team_members',
      type: 'array',
      label: 'Membres de l\'équipe',
      itemLabel: 'Membre',
      maxItems: 8,
      group: 'team',
      showIf: { key: 'variant', value: 'team' },
      itemSchema: [
        {
          key: 'name',
          type: 'text',
          label: 'Nom',
          placeholder: 'Jane Doe',
        },
        {
          key: 'role',
          type: 'text',
          label: 'Rôle',
          placeholder: 'Designer',
        },
        {
          key: 'avatar_url',
          type: 'image',
          label: 'Photo',
        },
        {
          key: 'linkedin',
          type: 'url',
          label: 'LinkedIn',
        },
      ],
    },
    
    // Timeline (for timeline variant)
    {
      key: 'milestones',
      type: 'array',
      label: 'Étapes clés',
      itemLabel: 'Étape',
      maxItems: 10,
      group: 'timeline',
      showIf: { key: 'variant', value: 'timeline' },
      itemSchema: [
        {
          key: 'year',
          type: 'text',
          label: 'Année',
          placeholder: '2024',
        },
        {
          key: 'title',
          type: 'text',
          label: 'Titre',
          placeholder: 'Lancement',
        },
        {
          key: 'description',
          type: 'textarea',
          label: 'Description',
        },
      ],
    },
    
    // Social links
    {
      key: 'show_social',
      type: 'boolean',
      label: 'Afficher les réseaux sociaux',
      defaultValue: true,
      group: 'social',
    },
    {
      key: 'social_links',
      type: 'array',
      label: 'Réseaux sociaux',
      itemLabel: 'Réseau',
      maxItems: 5,
      group: 'social',
      showIf: { key: 'show_social', value: true },
      itemSchema: [
        {
          key: 'platform',
          type: 'select',
          label: 'Plateforme',
          options: [
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'github', label: 'GitHub' },
            { value: 'youtube', label: 'YouTube' },
          ],
        },
        {
          key: 'href',
          type: 'url',
          label: 'URL',
        },
      ],
    },
  ],
  defaultSettings: {
    variant: 'simple',
    badge_text: 'À propos',
    headline: 'Notre mission',
    subheadline: 'Nous simplifions la création de sites web pour tous.',
    name: '',
    role: '',
    bio: '',
    avatar_url: '',
    team_members: [],
    milestones: [],
    show_social: true,
    social_links: [],
  },
};

// ============================================
// FAQ Section Schema
// ============================================

export const FAQ_SCHEMA: SectionSchema = {
  type: 'faq',
  label: 'FAQ',
  description: 'Questions fréquentes',
  icon: 'help-circle',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'accordion', label: 'Accordéon' },
        { value: 'grid', label: 'Grille' },
        { value: 'two-columns', label: 'Deux colonnes' },
      ],
      defaultValue: 'accordion',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Questions
    {
      key: 'questions',
      type: 'array',
      label: 'Questions',
      itemLabel: 'Question',
      maxItems: 20,
      minItems: 1,
      group: 'content',
      itemSchema: [
        {
          key: 'question',
          type: 'text',
          label: 'Question',
          placeholder: 'Comment fonctionne votre service ?',
        },
        {
          key: 'answer',
          type: 'textarea',
          label: 'Réponse',
          placeholder: 'Notre service fonctionne...',
        },
        {
          key: 'category',
          type: 'text',
          label: 'Catégorie (optionnel)',
          placeholder: 'Général',
        },
      ],
    },
    
    // CTA
    {
      key: 'show_cta',
      type: 'boolean',
      label: 'Afficher le CTA',
      defaultValue: true,
      group: 'cta',
    },
    {
      key: 'cta_text',
      type: 'text',
      label: 'Texte CTA',
      placeholder: 'Une autre question ?',
      group: 'cta',
      showIf: { key: 'show_cta', value: true },
    },
    {
      key: 'cta_button_text',
      type: 'text',
      label: 'Bouton CTA',
      placeholder: 'Contactez-nous',
      group: 'cta',
      showIf: { key: 'show_cta', value: true },
    },
    {
      key: 'cta_href',
      type: 'url',
      label: 'Lien CTA',
      placeholder: '/contact',
      group: 'cta',
      showIf: { key: 'show_cta', value: true },
    },
    
    // Style
    {
      key: 'first_open',
      type: 'boolean',
      label: 'Première question ouverte',
      defaultValue: true,
      group: 'style',
    },
    {
      key: 'show_categories',
      type: 'boolean',
      label: 'Afficher les catégories',
      defaultValue: false,
      group: 'style',
    },
  ],
  defaultSettings: {
    variant: 'accordion',
    badge_text: 'FAQ',
    headline: 'Questions fréquentes',
    subheadline: 'Tout ce que vous devez savoir sur notre service.',
    questions: [
      {
        question: 'Comment puis-je commencer ?',
        answer: 'Créez simplement un compte gratuit et suivez notre guide de démarrage.',
        category: 'Démarrage',
      },
      {
        question: 'Quels moyens de paiement acceptez-vous ?',
        answer: 'Nous acceptons les cartes Visa, Mastercard, et les virements SEPA.',
        category: 'Paiement',
      },
      {
        question: 'Puis-je annuler mon abonnement ?',
        answer: 'Oui, vous pouvez annuler à tout moment depuis votre tableau de bord.',
        category: 'Abonnement',
      },
    ],
    show_cta: true,
    cta_text: 'Vous avez encore des questions ?',
    cta_button_text: 'Contactez-nous',
    cta_href: '/contact',
    first_open: true,
    show_categories: false,
  },
};

// ============================================
// Contact Section Schema
// ============================================

export const CONTACT_SCHEMA: SectionSchema = {
  type: 'contact',
  label: 'Contact',
  description: 'Formulaire de contact',
  icon: 'mail',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'simple', label: 'Simple' },
        { value: 'split', label: 'Formulaire + Info' },
        { value: 'map', label: 'Avec carte' },
      ],
      defaultValue: 'simple',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Contact info
    {
      key: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'contact@example.com',
      group: 'info',
    },
    {
      key: 'phone',
      type: 'text',
      label: 'Téléphone',
      placeholder: '+33 1 23 45 67 89',
      group: 'info',
    },
    {
      key: 'address',
      type: 'textarea',
      label: 'Adresse',
      placeholder: '123 Rue Example, 75001 Paris',
      group: 'info',
    },
    
    // Form fields
    {
      key: 'show_name',
      type: 'boolean',
      label: 'Champ nom',
      defaultValue: true,
      group: 'form',
    },
    {
      key: 'show_phone',
      type: 'boolean',
      label: 'Champ téléphone',
      defaultValue: false,
      group: 'form',
    },
    {
      key: 'show_subject',
      type: 'boolean',
      label: 'Champ sujet',
      defaultValue: true,
      group: 'form',
    },
    {
      key: 'submit_text',
      type: 'text',
      label: 'Texte du bouton',
      placeholder: 'Envoyer',
      group: 'form',
    },
    {
      key: 'success_message',
      type: 'text',
      label: 'Message de succès',
      placeholder: 'Message envoyé !',
      group: 'form',
    },
    
    // Social links
    {
      key: 'show_social',
      type: 'boolean',
      label: 'Afficher les réseaux',
      defaultValue: true,
      group: 'social',
    },
    {
      key: 'social_links',
      type: 'array',
      label: 'Réseaux sociaux',
      itemLabel: 'Réseau',
      maxItems: 5,
      group: 'social',
      showIf: { key: 'show_social', value: true },
      itemSchema: [
        {
          key: 'platform',
          type: 'select',
          label: 'Plateforme',
          options: [
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'github', label: 'GitHub' },
          ],
        },
        {
          key: 'href',
          type: 'url',
          label: 'URL',
        },
      ],
    },
  ],
  defaultSettings: {
    variant: 'simple',
    badge_text: 'Contact',
    headline: 'Contactez-nous',
    subheadline: 'Nous serions ravis d\'échanger avec vous.',
    email: 'contact@example.com',
    phone: '',
    address: '',
    show_name: true,
    show_phone: false,
    show_subject: true,
    submit_text: 'Envoyer le message',
    success_message: 'Merci ! Nous vous répondrons rapidement.',
    show_social: true,
    social_links: [],
  },
};

// ============================================
// Gallery Section Schema
// ============================================

export const GALLERY_SCHEMA: SectionSchema = {
  type: 'gallery',
  label: 'Galerie',
  description: 'Galerie d\'images',
  icon: 'image',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'grid', label: 'Grille' },
        { value: 'masonry', label: 'Masonry' },
        { value: 'carousel', label: 'Carousel' },
      ],
      defaultValue: 'grid',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Layout options
    {
      key: 'columns',
      type: 'select',
      label: 'Colonnes',
      options: [
        { value: '2', label: '2 colonnes' },
        { value: '3', label: '3 colonnes' },
        { value: '4', label: '4 colonnes' },
      ],
      defaultValue: '3',
      group: 'layout',
    },
    {
      key: 'gap',
      type: 'select',
      label: 'Espacement',
      options: [
        { value: 'sm', label: 'Petit' },
        { value: 'md', label: 'Moyen' },
        { value: 'lg', label: 'Grand' },
      ],
      defaultValue: 'md',
      group: 'layout',
    },
    
    // Images
    {
      key: 'images',
      type: 'array',
      label: 'Images',
      itemLabel: 'Image',
      maxItems: 20,
      minItems: 1,
      group: 'content',
      itemSchema: [
        {
          key: 'url',
          type: 'image',
          label: 'Image',
        },
        {
          key: 'alt',
          type: 'text',
          label: 'Texte alternatif',
          placeholder: 'Description de l\'image',
        },
        {
          key: 'caption',
          type: 'text',
          label: 'Légende (optionnel)',
        },
      ],
    },
    
    // Features
    {
      key: 'lightbox',
      type: 'boolean',
      label: 'Lightbox au clic',
      defaultValue: true,
      group: 'features',
    },
    {
      key: 'rounded',
      type: 'boolean',
      label: 'Coins arrondis',
      defaultValue: true,
      group: 'features',
    },
    {
      key: 'hover_effect',
      type: 'boolean',
      label: 'Effet au survol',
      defaultValue: true,
      group: 'features',
    },
  ],
  defaultSettings: {
    variant: 'grid',
    badge_text: '',
    headline: 'Notre galerie',
    subheadline: 'Découvrez nos réalisations en images.',
    columns: '3',
    gap: 'md',
    images: [
      { url: '/placeholder-1.jpg', alt: 'Image 1', caption: '' },
      { url: '/placeholder-2.jpg', alt: 'Image 2', caption: '' },
      { url: '/placeholder-3.jpg', alt: 'Image 3', caption: '' },
    ],
    lightbox: true,
    rounded: true,
    hover_effect: true,
  },
};

// ============================================
// Stats Section Schema
// ============================================

export const STATS_SCHEMA: SectionSchema = {
  type: 'stats',
  label: 'Statistiques',
  description: 'Chiffres clés',
  icon: 'bar-chart',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'simple', label: 'Simple' },
        { value: 'cards', label: 'Cartes' },
        { value: 'inline', label: 'En ligne' },
      ],
      defaultValue: 'simple',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Stats
    {
      key: 'stats',
      type: 'array',
      label: 'Statistiques',
      itemLabel: 'Stat',
      maxItems: 6,
      minItems: 1,
      group: 'content',
      itemSchema: [
        {
          key: 'value',
          type: 'text',
          label: 'Valeur',
          placeholder: '10K+',
        },
        {
          key: 'label',
          type: 'text',
          label: 'Label',
          placeholder: 'Utilisateurs',
        },
        {
          key: 'icon',
          type: 'icon',
          label: 'Icône (optionnel)',
        },
        {
          key: 'description',
          type: 'text',
          label: 'Description (optionnel)',
        },
      ],
    },
    
    // Animation
    {
      key: 'animate_numbers',
      type: 'boolean',
      label: 'Animer les chiffres',
      defaultValue: true,
      group: 'animation',
    },
    
    // Style
    {
      key: 'background',
      type: 'select',
      label: 'Arrière-plan',
      options: [
        { value: 'default', label: 'Par défaut' },
        { value: 'muted', label: 'Grisé' },
        { value: 'primary', label: 'Couleur primaire' },
      ],
      defaultValue: 'default',
      group: 'style',
    },
  ],
  defaultSettings: {
    variant: 'simple',
    badge_text: '',
    headline: 'Nos chiffres',
    subheadline: 'Des résultats qui parlent d\'eux-mêmes.',
    stats: [
      { value: '10K+', label: 'Utilisateurs', icon: 'users', description: '' },
      { value: '99.9%', label: 'Uptime', icon: 'check-circle', description: '' },
      { value: '4.9/5', label: 'Note moyenne', icon: 'star', description: '' },
      { value: '24/7', label: 'Support', icon: 'headphones', description: '' },
    ],
    animate_numbers: true,
    background: 'default',
  },
};

// ============================================
// Logos Section Schema
// ============================================

export const LOGOS_SCHEMA: SectionSchema = {
  type: 'logos',
  label: 'Logos',
  description: 'Logo cloud / Partenaires',
  icon: 'building',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'simple', label: 'Simple' },
        { value: 'marquee', label: 'Défilant' },
        { value: 'grid', label: 'Grille' },
      ],
      defaultValue: 'simple',
      group: 'layout',
    },
    
    // Header
    {
      key: 'show_header',
      type: 'boolean',
      label: 'Afficher le titre',
      defaultValue: true,
      group: 'header',
    },
    {
      key: 'headline',
      type: 'text',
      label: 'Titre',
      placeholder: 'Ils nous font confiance',
      group: 'header',
      showIf: { key: 'show_header', value: true },
    },
    
    // Logos
    {
      key: 'logos',
      type: 'array',
      label: 'Logos',
      itemLabel: 'Logo',
      maxItems: 12,
      minItems: 1,
      group: 'content',
      itemSchema: [
        {
          key: 'name',
          type: 'text',
          label: 'Nom',
          placeholder: 'Entreprise',
        },
        {
          key: 'url',
          type: 'image',
          label: 'Logo',
        },
        {
          key: 'href',
          type: 'url',
          label: 'Lien (optionnel)',
        },
      ],
    },
    
    // Style
    {
      key: 'grayscale',
      type: 'boolean',
      label: 'Niveaux de gris',
      defaultValue: true,
      group: 'style',
    },
    {
      key: 'hover_color',
      type: 'boolean',
      label: 'Couleur au survol',
      defaultValue: true,
      group: 'style',
    },
    {
      key: 'size',
      type: 'select',
      label: 'Taille des logos',
      options: [
        { value: 'sm', label: 'Petit' },
        { value: 'md', label: 'Moyen' },
        { value: 'lg', label: 'Grand' },
      ],
      defaultValue: 'md',
      group: 'style',
    },
  ],
  defaultSettings: {
    variant: 'simple',
    show_header: true,
    headline: 'Ils nous font confiance',
    logos: [
      { name: 'Company 1', url: '/logo-1.svg', href: '' },
      { name: 'Company 2', url: '/logo-2.svg', href: '' },
      { name: 'Company 3', url: '/logo-3.svg', href: '' },
      { name: 'Company 4', url: '/logo-4.svg', href: '' },
    ],
    grayscale: true,
    hover_color: true,
    size: 'md',
  },
};

// ============================================
// Blog List Section Schema
// ============================================

export const BLOG_LIST_SCHEMA: SectionSchema = {
  type: 'blog-list',
  label: 'Liste d\'articles',
  description: 'Liste d\'articles de blog',
  icon: 'newspaper',
  properties: [
    // Variant
    {
      key: 'variant',
      type: 'select',
      label: 'Variante',
      options: [
        { value: 'grid', label: 'Grille' },
        { value: 'list', label: 'Liste' },
        { value: 'featured', label: 'Article mis en avant' },
      ],
      defaultValue: 'grid',
      group: 'layout',
    },
    
    // Header
    commonTextProps.badge_text('Badge'),
    commonTextProps.headline('Titre'),
    commonTextProps.subheadline('Sous-titre'),
    
    // Layout
    {
      key: 'columns',
      type: 'select',
      label: 'Colonnes',
      options: [
        { value: '2', label: '2 colonnes' },
        { value: '3', label: '3 colonnes' },
      ],
      defaultValue: '3',
      group: 'layout',
    },
    
    // Articles
    {
      key: 'articles',
      type: 'array',
      label: 'Articles',
      itemLabel: 'Article',
      maxItems: 12,
      minItems: 1,
      group: 'content',
      itemSchema: [
        {
          key: 'title',
          type: 'text',
          label: 'Titre',
          placeholder: 'Titre de l\'article',
        },
        {
          key: 'excerpt',
          type: 'textarea',
          label: 'Extrait',
          placeholder: 'Résumé de l\'article...',
        },
        {
          key: 'image_url',
          type: 'image',
          label: 'Image',
        },
        {
          key: 'category',
          type: 'text',
          label: 'Catégorie',
          placeholder: 'Tech',
        },
        {
          key: 'date',
          type: 'text',
          label: 'Date',
          placeholder: '15 Jan 2024',
        },
        {
          key: 'author',
          type: 'text',
          label: 'Auteur',
          placeholder: 'John Doe',
        },
        {
          key: 'href',
          type: 'url',
          label: 'Lien',
          placeholder: '/blog/article-1',
        },
      ],
    },
    
    // Features
    {
      key: 'show_category',
      type: 'boolean',
      label: 'Afficher la catégorie',
      defaultValue: true,
      group: 'features',
    },
    {
      key: 'show_date',
      type: 'boolean',
      label: 'Afficher la date',
      defaultValue: true,
      group: 'features',
    },
    {
      key: 'show_author',
      type: 'boolean',
      label: 'Afficher l\'auteur',
      defaultValue: true,
      group: 'features',
    },
    
    // CTA
    {
      key: 'show_view_all',
      type: 'boolean',
      label: 'Afficher "Voir tout"',
      defaultValue: true,
      group: 'cta',
    },
    {
      key: 'view_all_text',
      type: 'text',
      label: 'Texte "Voir tout"',
      placeholder: 'Voir tous les articles',
      group: 'cta',
      showIf: { key: 'show_view_all', value: true },
    },
    {
      key: 'view_all_href',
      type: 'url',
      label: 'Lien "Voir tout"',
      placeholder: '/blog',
      group: 'cta',
      showIf: { key: 'show_view_all', value: true },
    },
  ],
  defaultSettings: {
    variant: 'grid',
    badge_text: 'Blog',
    headline: 'Derniers articles',
    subheadline: 'Restez informé des dernières actualités.',
    columns: '3',
    articles: [
      {
        title: 'Comment créer un site web en 5 minutes',
        excerpt: 'Découvrez comment lancer votre site rapidement avec ASAP.',
        image_url: '/blog-1.jpg',
        category: 'Tutoriel',
        date: '15 Jan 2024',
        author: 'John Doe',
        href: '/blog/article-1',
      },
      {
        title: 'Les tendances web design 2024',
        excerpt: 'Explorez les dernières tendances en matière de design web.',
        image_url: '/blog-2.jpg',
        category: 'Design',
        date: '10 Jan 2024',
        author: 'Jane Doe',
        href: '/blog/article-2',
      },
      {
        title: 'Optimiser son SEO facilement',
        excerpt: 'Conseils pratiques pour améliorer votre référencement.',
        image_url: '/blog-3.jpg',
        category: 'SEO',
        date: '5 Jan 2024',
        author: 'John Doe',
        href: '/blog/article-3',
      },
    ],
    show_category: true,
    show_date: true,
    show_author: true,
    show_view_all: true,
    view_all_text: 'Voir tous les articles',
    view_all_href: '/blog',
  },
};

// ============================================
// Schema Registry
// ============================================

export const LANDING_SAAS_SCHEMAS: Record<string, SectionSchema> = {
  navigation: NAVIGATION_SCHEMA,
  hero: HERO_SCHEMA,
  features: FEATURES_SCHEMA,
  'how-it-works': HOW_IT_WORKS_SCHEMA,
  pricing: PRICING_SCHEMA,
  testimonials: TESTIMONIALS_SCHEMA,
  cta: CTA_SCHEMA,
  footer: FOOTER_SCHEMA,
  // New sections
  content: CONTENT_SCHEMA,
  about: ABOUT_SCHEMA,
  faq: FAQ_SCHEMA,
  contact: CONTACT_SCHEMA,
  gallery: GALLERY_SCHEMA,
  stats: STATS_SCHEMA,
  logos: LOGOS_SCHEMA,
  'blog-list': BLOG_LIST_SCHEMA,
};

/**
 * Get schema for a section type
 */
export function getSectionSchema(sectionType: string): SectionSchema | undefined {
  return LANDING_SAAS_SCHEMAS[sectionType];
}

/**
 * Get default settings for a section type
 */
export function getDefaultSettings(sectionType: string): Record<string, unknown> {
  const schema = getSectionSchema(sectionType);
  return schema?.defaultSettings || {};
}

/**
 * Get property groups from a schema
 */
export function getPropertyGroups(schema: SectionSchema): string[] {
  const groups = new Set<string>();
  schema.properties.forEach(prop => {
    if (prop.group) groups.add(prop.group);
  });
  return Array.from(groups);
}

/**
 * Get properties by group
 */
export function getPropertiesByGroup(schema: SectionSchema, group: string): PropertySchema[] {
  return schema.properties.filter(prop => prop.group === group);
}
