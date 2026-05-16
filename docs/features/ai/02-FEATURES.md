<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# Fonctionnalités AI

> **Document**: 02-FEATURES.md  
> **Parent**: [README.md](./README.md)

---

## Table des Matières

1. [Vue d'Ensemble des Tiers](#vue-densemble-des-tiers)
2. [Tier 1: Core Features (MVP)](#tier-1-core-features-mvp)
3. [Tier 2: Advanced Features](#tier-2-advanced-features)
4. [Tier 3: Premium Features](#tier-3-premium-features)
5. [AI Actions System](#ai-actions-system)
6. [Sections Library](#sections-library)
7. [Element Templates](#element-templates)

---

## Vue d'Ensemble des Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI FEATURES TIERS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 1: Core (Free + Pro)                                             │ │
│  │                                                                        │ │
│  │  • Conversation naturelle        • Modifications temps réel           │ │
│  │  • Suggestions contextuelles     • Undo/Redo                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 2: Advanced (Pro)                                                │ │
│  │                                                                        │ │
│  │  • Génération de contenu         • Génération d'images                │ │
│  │  • Design assistance             • Code generation                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ TIER 3: Premium (Business)                                            │ │
│  │                                                                        │ │
│  │  • Website Analyzer              • A/B Testing AI                      │ │
│  │  • Competitor Analysis           • Voice Input                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: Core Features (MVP)

### 1.1 Conversation Naturelle

L'utilisateur peut décrire ses besoins en langage naturel :

```
User: "Je voudrais un site pour mon restaurant italien à Paris"

AI: "Parfait ! Je vais créer un site élégant pour votre restaurant italien. 
     Voici ce que je propose :
     
     🏠 Page d'accueil avec :
     - Hero avec photo ambiance italienne
     - Section menu du jour
     - Horaires et localisation
     
     📍 Informations :
     - Quel est le nom de votre restaurant ?
     - Avez-vous des photos à utiliser ?"
```

**Capacités**:
- Comprendre les intentions utilisateur
- Proposer des structures de site adaptées
- Poser des questions de clarification
- Guider vers les bonnes décisions

### 1.2 Modifications en Temps Réel

```
User: "Change le titre en 'Bienvenue chez Mario'"

AI: [Modifie le titre en temps réel dans le preview]
    "✓ J'ai mis à jour le titre. Que pensez-vous de cette police ?"
```

**Capacités**:
- Modifier textes, couleurs, images
- Ajouter/supprimer des sections
- Changer les variantes de section
- Réorganiser les sections
- Modifier le thème global

### 1.3 Suggestions Contextuelles

L'IA analyse le site et propose des améliorations :

```
AI: "💡 J'ai remarqué que votre section 'À propos' est un peu courte.
     Voulez-vous que je vous aide à l'enrichir ?
     
     Suggestions :
     • Ajouter l'histoire du restaurant
     • Présenter le chef
     • Mettre en avant vos valeurs"
```

**Types de suggestions**:
- Contenu manquant
- Améliorations design
- SEO basique
- Accessibilité
- Cohérence visuelle

---

## Tier 2: Advanced Features

### 2.1 Génération de Contenu

| Feature | Description | Modèle |
|---------|-------------|--------|
| **Copywriting** | Génération de textes marketing | GPT-4 / Claude |
| **SEO Content** | Méta descriptions, titres optimisés | GPT-4 |
| **Traductions** | Multi-langue automatique | GPT-4 / DeepL |
| **Bio Generator** | Biographies professionnelles | GPT-4 |

**Exemple**:

```
User: "Écris une description accrocheuse pour mon restaurant"

AI: "Voici 3 propositions :

     1. 'Depuis 1985, La Trattoria vous fait voyager au cœur 
        de l'Italie avec des recettes authentiques et des 
        ingrédients frais sélectionnés chaque jour.'
        
     2. 'Pizza au feu de bois, pâtes fraîches, tiramisu 
        maison... Découvrez la vraie cuisine italienne à 
        deux pas de la Tour Eiffel.'
        
     3. 'Un chef napolitain, des produits d'exception, 
        une ambiance chaleureuse. La Trattoria, c'est 
        l'Italie comme si vous y étiez.'
        
     Laquelle préférez-vous ?"
```

### 2.2 Génération d'Images

```
User: "Génère une illustration d'un chef italien pour ma page À propos"

AI: [Génère via DALL-E 3]
    "Voici 4 propositions. Laquelle préférez-vous ?"
    [Grid de 4 images]
```

**Providers supportés**:
- DALL-E 3 (OpenAI) - Primary
- Stable Diffusion (self-hosted option)
- Ideogram (logos, illustrations)

**Types d'images**:
- Illustrations
- Backgrounds/Patterns
- Avatars/Portraits
- Icônes personnalisées
- Photos de produits (stylisées)

### 2.3 Design Assistance

```
User: "Le site fait un peu amateur, comment l'améliorer ?"

AI: "Je vois plusieurs points à améliorer :

     🎨 Couleurs :
     - Votre palette manque de cohérence
     - Je suggère : #1A1A2E (fond), #E94560 (accent), #F5F5F5 (texte)
     
     📐 Espacement :
     - Les sections sont trop serrées
     - Ajout de padding recommandé
     
     🔤 Typographie :
     - Trop de polices différentes (4 actuellement)
     - Je recommande : Playfair Display + Inter
     
     Voulez-vous que j'applique ces changements ?"
```

**Analyses disponibles**:
- Palette de couleurs
- Typographie
- Espacements
- Hiérarchie visuelle
- Contraste et lisibilité

### 2.4 Code Generation (Future V3)

Pour les utilisateurs Business, génération de sections custom :

```
User: "Ajoute un carrousel d'images personnalisé"

AI: [Génère le composant React sandboxé]
    "J'ai créé un carrousel avec :
     - Navigation flèches + dots
     - Swipe mobile
     - Autoplay optionnel
     
     Le composant est maintenant disponible dans votre site."
```

---

## Tier 3: Premium Features

### 3.1 AI Website Analyzer

Analyse complète du site avec scoring :

```json
{
  "overall_score": 78,
  "categories": {
    "design": {
      "score": 82,
      "issues": [
        { "severity": "medium", "message": "Contraste insuffisant sur le CTA" }
      ]
    },
    "seo": {
      "score": 65,
      "issues": [
        { "severity": "high", "message": "Meta description manquante" },
        { "severity": "low", "message": "Images sans attribut alt" }
      ]
    },
    "performance": {
      "score": 88,
      "issues": []
    },
    "accessibility": {
      "score": 72,
      "issues": [
        { "severity": "medium", "message": "Navigation au clavier incomplète" }
      ]
    }
  },
  "recommendations": [
    "Ajouter une meta description pour améliorer le SEO (+15 points)",
    "Augmenter le contraste du bouton principal (+5 points)"
  ]
}
```

### 3.2 A/B Testing AI

```
User: "Quel titre convertit le mieux ?"

AI: "Je vais créer un test A/B :
     
     Version A: 'Découvrez notre cuisine italienne authentique'
     Version B: 'Les saveurs de l'Italie à Paris depuis 1985'
     
     Je vous recommande de tester pendant 2 semaines minimum.
     Voulez-vous lancer le test ?"
```

### 3.3 Competitor Analysis

```
User: "Analyse les sites de mes concurrents"

AI: "J'ai analysé 5 restaurants italiens similaires à Paris :

     📊 Tendances observées :
     - 80% utilisent des photos professionnelles
     - 60% ont un système de réservation en ligne
     - Hero video de plus en plus populaire
     
     🎯 Opportunités pour vous :
     - Aucun concurrent n'a de blog recettes
     - Menu interactif avec allergènes peu répandu
     
     Voulez-vous que j'implémente une de ces idées ?"
```

### 3.4 Voice Input

Support de la saisie vocale pour une expérience plus naturelle :

```typescript
// Integration Whisper API
const transcribeVoice = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  
  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

---

## AI Actions System

### Types d'Actions

```typescript
// Union type de toutes les actions possibles
type AIAction =
  | { type: 'UPDATE_SECTION_PROPERTY'; sectionId: string; property: string; value: unknown }
  | { type: 'ADD_SECTION'; sectionType: string; variant: string; position: number; settings?: Record<string, unknown> }
  | { type: 'REMOVE_SECTION'; sectionId: string }
  | { type: 'REORDER_SECTIONS'; order: string[] }
  | { type: 'CHANGE_VARIANT'; sectionId: string; newVariant: string }
  | { type: 'UPDATE_THEME'; changes: Partial<ThemeConfig> }
  | { type: 'GENERATE_CONTENT'; target: 'section' | 'page'; context: string }
  | { type: 'SAVE_AS_TEMPLATE'; sectionId: string; name: string };
```

### Interaction AI ↔ Schemas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI ↔ SCHEMA INTERACTION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: "Change the headline to 'Welcome to the future'"                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. AI UNDERSTANDS INTENT                                            │   │
│  │    - Action: UPDATE_PROPERTY                                        │   │
│  │    - Target: hero section                                           │   │
│  │    - Property: headline_line1                                       │   │
│  │    - Value: "Welcome to the future"                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. SCHEMA VALIDATION                                                │   │
│  │    - Property exists? ✓ (HERO_SCHEMA.properties)                   │   │
│  │    - Type match? ✓ (string)                                        │   │
│  │    - Constraints? ✓ (max 100 chars)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. API CALL                                                         │   │
│  │    PATCH /api/v1/websites/:id/sections/:section_id                  │   │
│  │    { settings: { headline_line1: "Welcome to the future" } }        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                       │                                                     │
│                       ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. LIVE PREVIEW UPDATE (WebSocket)                                  │   │
│  │    Preview refreshes with new headline                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation des Actions

```typescript
function validateAction(action: AIAction, context: AIContext): ValidationResult {
  switch (action.type) {
    case 'UPDATE_SECTION_PROPERTY':
      const section = context.sections.find(s => s.id === action.sectionId);
      if (!section) return { valid: false, error: 'Section not found' };
      
      const property = section.schema.properties.find(p => p.key === action.property);
      if (!property) return { valid: false, error: 'Property not in schema' };
      
      // Type validation
      if (!validateType(action.value, property.type)) {
        return { valid: false, error: `Expected ${property.type}` };
      }
      
      return { valid: true };
      
    case 'ADD_SECTION':
      // Validate section type exists
      if (!SECTION_SCHEMAS[action.sectionType]) {
        return { valid: false, error: 'Unknown section type' };
      }
      // Validate variant exists
      const schema = SECTION_SCHEMAS[action.sectionType];
      if (!schema.variants.find(v => v.id === action.variant)) {
        return { valid: false, error: 'Unknown variant' };
      }
      return { valid: true };
      
    // ... autres types
  }
}
```

---

## Sections Library

### Sections Existantes

| Type | Catégorie | Status | Variantes |
|------|-----------|--------|-----------|
| `hero` | SaaS/Landing | ✅ Active | centered, split, video |
| `features` | SaaS/Landing | ✅ Active | grid, list, icons |
| `how-it-works` | SaaS/Landing | ✅ Active | steps, timeline |
| `pricing` | SaaS/Landing | ✅ Active | cards, table |
| `testimonials` | SaaS/Landing | ✅ Active | carousel, grid |
| `cta` | SaaS/Landing | ✅ Active | simple, split, newsletter |
| `navigation` | Global | ✅ Active | header, transparent |
| `footer` | Global | ✅ Active | simple, columns |

### Sections à Développer

| Section | Variantes Prévues | Priorité | Status |
|---------|-------------------|----------|--------|
| `content` | text, text-image, columns | 🟢 P0 | 🔄 TODO |
| `about` | team, story, values, timeline | 🟢 P0 | 🔄 TODO |
| `faq` | accordion, two-column, search | 🟡 P1 | 🔄 TODO |
| `contact` | form, info-map, split | 🟡 P1 | 🔄 TODO |
| `gallery` | grid, masonry, lightbox | 🟡 P1 | 🔄 TODO |
| `stats` | counters, progress, icons | 🟡 P1 | 🔄 TODO |
| `logos` | strip, grid, animated | 🟡 P1 | 🔄 TODO |
| `blog-list` | grid, list, featured | 🔴 P2 | 🔄 TODO |

**Total cible: 16 types × 3-4 variantes = ~50-60 options**

---

## Element Templates

### Concept

Les Element Templates permettent aux utilisateurs Pro de sauvegarder des configurations de sections pour les réutiliser.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER ELEMENT LIBRARY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM ELEMENTS (Read-Only)                                           │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │  Hero   │ │Features │ │ Pricing │ │Testimon.│ │  CTA    │        │ │
│  │  │ (5 var) │ │ (3 var) │ │ (2 var) │ │ (4 var) │ │ (3 var) │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ USER ELEMENTS (Pro Feature)                                           │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │  My Hero Style  │ │  FAQ Corporate  │ │  Footer Brand   │         │ │
│  │  │  (saved config) │ │  (saved config) │ │  (saved config) │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  │                                                                        │ │
│  │  Actions: Edit | Duplicate | Export | Delete                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ COMMUNITY ELEMENTS (Future: Marketplace)                              │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │  Agency Hero    │ │  SaaS Pricing   │ │  Startup FAQ    │         │ │
│  │  │  by @designer   │ │  by @templates  │ │  by @founder    │         │ │
│  │  │  ⭐ 4.8 (234)   │ │  ⭐ 4.9 (567)   │ │  ⭐ 4.7 (123)   │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schema de Stockage

```sql
CREATE TABLE element_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),  -- NULL = system template
    
    -- Metadata
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Base section info
    element_type VARCHAR(50) NOT NULL,  -- 'hero', 'features', etc.
    variant VARCHAR(50),                 -- 'centered', 'split', etc.
    
    -- Configuration snapshot
    settings JSONB NOT NULL,             -- Property values
    styles JSONB,                        -- Custom style overrides
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'private',  -- 'private', 'public', 'marketplace'
    
    -- Stats (for marketplace)
    usage_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(2,1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_element_templates_account ON element_templates(account_id);
CREATE INDEX idx_element_templates_type ON element_templates(element_type);
```

### API

```yaml
# Element Templates API
GET    /api/v1/element-templates          # List user's templates
POST   /api/v1/element-templates          # Create from section
GET    /api/v1/element-templates/:id      # Get template details
PUT    /api/v1/element-templates/:id      # Update template
DELETE /api/v1/element-templates/:id      # Delete template

# Apply template to site
POST   /api/v1/websites/:id/sections/from-template
  body: { template_id: uuid, position: number }
```

---

## Voir Aussi

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - Architecture technique
- [03-API.md](./03-API.md) - API Design détaillé
- [05-UX.md](./05-UX.md) - Guidelines UX/UI
