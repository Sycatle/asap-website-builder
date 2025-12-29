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
