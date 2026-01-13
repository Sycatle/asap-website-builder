# ASAP v2 - Plan d'Implémentation Détaillé

**Date**: 13 janvier 2026  
**Basé sur**: Analyse approfondie de la codebase existante  
**Objectif**: Plan step-by-step concret pour rendre ASAP opérationnel

---

## 📊 État des Lieux - Analyse Codebase

### ✅ Existant et Opérationnel

**Backend (Rust)**
- ✅ API Core: 15,000+ lignes (auth, multi-tenant, WebSocket, événements)
- ✅ Module AI: 9,181 lignes (OpenAI/Anthropic, streaming, actions, vision, tools)
  - `core/ai/`: 5,638 lignes
  - `core/api/src/ai/`: 3,543 lignes (11 endpoints)
- ✅ Extensions: GitHub Sync, Themes, Analytics, Projections
- ✅ Worker: Event processor avec retry mechanism
- ✅ Database: PostgreSQL avec migrations complètes

**Frontend (TypeScript/React)**
- ✅ Packages partagés
  - `@asap/shared`: Types, constantes, utils (8 fichiers)
  - `@asap/renderers`: Composants de rendu des éléments
- ✅ Onboarding: 1,733 lignes (7 composants)
  - Template selection
  - GitHub connect & import
  - Review profile
  - Publish step
- ✅ Studio partiel: 6,496 lignes
  - `SimplePreviewCanvas`: 520 lignes (iframe preview)
  - `PropertyEditors`: Property editors existants
  - `element-previews.tsx`: Previews des éléments
- ✅ AI Chat: 2,104 lignes
  - Global AI Chat Panel avec streaming
  - Action cards, tool visualization
  - Vision analysis integration

### ❌ Manquant / Incomplet

**Studio d'Édition (BLOQUANT)**
- ❌ Sidebar éléments avec drag & drop
- ❌ Panel propriétés intégré au studio
- ❌ Sélection visuelle d'éléments dans preview
- ❌ Actions rapides (dupliquer, supprimer, masquer)
- ❌ Toolbar avec undo/redo
- ❌ Integration complète preview ↔ properties

**Onboarding Intelligent**
- ❌ Questionnaire 5-7 questions
- ❌ Auto-configuration basée sur réponses
- ❌ Mapping persona → preset → configuration

**AI ↔ Studio**
- ❌ Preview des modifications AI avant application
- ❌ Highlight des éléments modifiés
- ❌ Sync bi-directionnelle AI ↔ Properties Panel
- ❌ Mode "AI Edit" contextuel

---

## 🎯 Plan d'Implémentation (10-14 Semaines)

---

## PHASE 1: Studio d'Édition Visuel Complet
**Durée**: 3-4 semaines  
**Prérequis**: Aucun  
**Objectif**: Studio entièrement opérationnel pour édition manuelle

### Sprint 1.1 - Refonte Layout Studio (Semaine 1, jours 1-3)

#### Task 1.1.1: Créer nouveau layout studio 3 colonnes
**Fichier**: `apps/web/src/components/studio/studio-page/studio-layout.tsx`

```typescript
/**
 * StudioLayout - Layout 3 colonnes
 * 
 * +-------------------+------------------------+-------------------+
 * | Sidebar Éléments  |   Preview Canvas       | Properties Panel  |
 * | (250-300px)       |   (flexible)           | (320-400px)       |
 * +-------------------+------------------------+-------------------+
 */
interface StudioLayoutProps {
  sidebar: React.ReactNode;
  preview: React.ReactNode;
  properties: React.ReactNode;
}
```

**Actions concrètes**:
1. Créer `studio-layout.tsx` avec resizable panels (react-resizable-panels)
2. Définir min/max widths: sidebar (250-400px), properties (320-500px)
3. Persist widths dans localStorage
4. Responsive: < 1024px = stack vertical, hide properties en modal
5. **Tests**: Vérifier resize, persist, responsive

**Temps estimé**: 6h

---

#### Task 1.1.2: Créer Sidebar Éléments
**Fichier**: `apps/web/src/components/studio/elements-sidebar/elements-sidebar.tsx`

```typescript
interface ElementsSidebarProps {
  elements: WebsiteElement[];
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onReorder: (elementIds: string[]) => Promise<void>;
  onAdd: () => void;
  onDuplicate: (elementId: string) => Promise<void>;
  onDelete: (elementId: string) => Promise<void>;
  onToggleVisible: (elementId: string, visible: boolean) => Promise<void>;
}
```

**Structure**:
```
elements-sidebar/
├── elements-sidebar.tsx      # Component principal
├── element-item.tsx          # Item avec drag handle + actions
├── add-element-button.tsx    # Bouton + modal add
└── elements-list.tsx         # Liste avec dnd-kit
```

**Actions concrètes**:
1. Liste scrollable des éléments avec virtualization si > 50
2. Drag & drop avec `@dnd-kit/core` + `@dnd-kit/sortable`
3. Element item:
   - Icône type élément (depuis `@asap/shared`)
   - Titre éditable inline (double-clic)
   - Badge visibility (œil)
   - Actions: 👁️ Hide, 📋 Duplicate, 🗑️ Delete
4. Highlight élément sélectionné (border primary + bg subtle)
5. Bouton "+ Ajouter élément" en bas avec modal
6. **Tests**: Drag & drop, actions, selection

**Temps estimé**: 12h

---

#### Task 1.1.3: Améliorer Preview Canvas avec Sélection
**Fichier**: `apps/web/src/components/studio/studio-page/components/simple-preview-canvas.tsx`

**Modifications**:
1. Ajouter highlight visuel sur élément sélectionné
   - Border 2px primary avec animation
   - Overlay avec label élément + bouton "Edit"
2. Click sur élément → Trigger selection
3. Hover sur élément → Border subtle pour affordance
4. Injecter styles via postMessage vers iframe
5. **Tests**: Selection, hover, click

**Temps estimé**: 8h

---

### Sprint 1.2 - Properties Panel Dynamique (Semaine 1, jours 4-5 + Semaine 2, jours 1-2)

#### Task 1.2.1: Créer Properties Panel Container
**Fichier**: `apps/web/src/components/studio/properties-panel/properties-panel.tsx`

```typescript
interface PropertiesPanelProps {
  element: WebsiteElement | null;
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<void>;
  onClose?: () => void;
}
```

**Structure**:
```
properties-panel/
├── properties-panel.tsx           # Container
├── property-section.tsx           # Section collapsible
├── editors/
│   ├── text-editor.tsx           # Input + Textarea
│   ├── color-editor.tsx          # Color picker
│   ├── image-editor.tsx          # Upload + URL
│   ├── link-editor.tsx           # URL + label
│   ├── select-editor.tsx         # Select/Combobox
│   ├── switch-editor.tsx         # Boolean toggle
│   └── rich-text-editor.tsx      # Markdown/WYSIWYG
└── element-properties/
    ├── hero-properties.tsx        # Specific to hero
    ├── about-properties.tsx       # Specific to about
    └── ... (1 par element type)
```

**Actions concrètes**:
1. ScrollArea avec sections:
   - **General**: Title, Layout, Visibility
   - **Content**: Dynamique selon element type
   - **Style**: Colors, spacing (V2)
   - **Advanced**: Custom CSS classes (V2)
2. Auto-save avec debounce 500ms
3. Validation temps réel avec zod
4. Loading states et error messages
5. **Tests**: Rendering, validation, auto-save

**Temps estimé**: 16h

---

#### Task 1.2.2: Implémenter Property Editors pour Chaque Type
**Fichiers**: `apps/web/src/components/studio/properties-panel/element-properties/*.tsx`

**Types prioritaires** (15 types d'éléments):
1. `hero`: name, tagline, cta_text, cta_url, image
2. `about`: title, bio, image, highlights[]
3. `services`: title, services[]{title, description, icon}
4. `projects`: title, projects[]{name, description, image, url, tags[]}
5. `skills`: title, skills[]{name, level, category}
6. `contact`: title, email, phone, social_links
7. `navigation`: logo, links[]{label, url}
8. `features`: title, features[]{title, description, icon}
9. `pricing`: title, plans[]{name, price, features[]}
10. `testimonials`: title, testimonials[]{name, role, content, avatar}
11. `cta`: headline, description, button_text, button_url
12. `footer`: copyright, links[], social_links[]
13. `process`: title, steps[]{title, description, icon}
14. `proof`: title, stats[]{label, value}
15. `how-it-works`: title, steps[]{title, description, icon}

**Actions concrètes par type**:
1. Créer composant properties avec zod schema
2. Mapper content fields → editors appropriés
3. Array fields: Add/Remove/Reorder items
4. Image fields: Upload avec preview + crop (V2)
5. **Tests**: 1 test par element type

**Temps estimé**: 20h (1-2h par type)

---

### Sprint 1.3 - Toolbar & Actions (Semaine 2, jours 3-5)

#### Task 1.3.1: Créer Toolbar Principal
**Fichier**: `apps/web/src/components/studio/studio-toolbar/studio-toolbar.tsx`

```typescript
interface StudioToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  devicePreview: DevicePreview;
  onDeviceChange: (device: DevicePreview) => void;
  onPublish: () => void;
  isPublishing: boolean;
}
```

**Layout**:
```
+--------------------------------------------------+
| [←] [→] | [💻] [📱] [⌚] | [🌙/☀️] | [Publish ▼] |
+--------------------------------------------------+
```

**Actions concrètes**:
1. Undo/Redo buttons (disabled si !can*)
2. Device switcher (Desktop, Tablet, Mobile)
3. Theme toggle (Light/Dark)
4. Publish dropdown:
   - Publish now
   - Schedule publish (V2)
   - View published site
5. Keyboard shortcuts display (?)
6. **Tests**: Buttons, shortcuts

**Temps estimé**: 6h

---

#### Task 1.3.2: Implémenter Undo/Redo avec History
**Fichier**: `apps/web/src/hooks/useStudioHistory.ts`

```typescript
interface HistoryState {
  elements: WebsiteElement[];
  timestamp: number;
}

function useStudioHistory(websiteId: string) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  
  const recordChange = (elements: WebsiteElement[]) => { ... };
  const undo = () => { ... };
  const redo = () => { ... };
  
  return { canUndo, canRedo, undo, redo, recordChange };
}
```

**Actions concrètes**:
1. Stack de max 50 états
2. Record change après chaque modification
3. Undo: Restore previous state + refetch
4. Redo: Restore next state + refetch
5. Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z
6. **Tests**: Record, undo, redo, shortcuts

**Temps estimé**: 8h

---

#### Task 1.3.3: Actions Rapides Éléments
**Fichier**: `apps/web/src/components/studio/elements-sidebar/element-actions.tsx`

**Actions**:
1. **Duplicate**: POST `/api/elements/{id}/duplicate`
   - Clone element avec "(Copy)" suffix
   - Insert après l'original
   - Select le nouveau
2. **Delete**: DELETE `/api/elements/{id}`
   - Confirmation dialog
   - Remove de la liste
   - Select element suivant ou null
3. **Toggle Visible**: PATCH `/api/elements/{id}`
   - Update visible field
   - Update icon (eye/eye-off)
4. **Move Up/Down**: Réordonnancement rapide

**Actions concrètes**:
1. Créer API endpoints manquants (duplicate)
2. Implémenter confirmation dialogs
3. Optimistic updates avec rollback
4. Toast notifications
5. **Tests**: Duplicate, delete, toggle

**Temps estimé**: 6h

---

### Sprint 1.4 - Intégration & Polish (Semaine 3)

#### Task 1.4.1: Intégrer Tous les Composants
**Fichier**: `apps/web/src/components/studio/studio-page/studio-page.tsx`

**Modifications**:
1. Remplacer layout actuel par `StudioLayout`
2. Connecter `ElementsSidebar` avec queries
3. Connecter `PropertiesPanel` avec selected element
4. Connecter `StudioToolbar` avec actions
5. Sync state entre composants:
   - Selection: Sidebar ↔ Preview ↔ Properties
   - Updates: Properties → Sidebar → Preview
6. **Tests**: Integration E2E

**Temps estimé**: 8h

---

#### Task 1.4.2: Keyboard Shortcuts
**Fichier**: `apps/web/src/hooks/useStudioShortcuts.ts`

**Shortcuts**:
- `Ctrl+S`: Save (trigger auto-save now)
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`: Redo
- `Ctrl+D`: Duplicate selected element
- `Delete`: Delete selected element
- `Esc`: Deselect element / Close modal
- `Ctrl+/`: Show shortcuts help
- `↑/↓`: Navigate elements list

**Actions concrètes**:
1. Hook useStudioShortcuts avec event listeners
2. Help modal avec shortcuts list
3. Visual feedback on shortcut press
4. **Tests**: Chaque shortcut

**Temps estimé**: 6h

---

#### Task 1.4.3: Polish UX Studio
**Fichiers**: Multiples

**Actions concrètes**:
1. **Animations**:
   - Sidebar expand/collapse
   - Element selection (highlight fade-in)
   - Properties panel slide-in
   - Toast notifications
2. **Loading States**:
   - Skeleton screens pendant fetch
   - Spinners sur actions async
   - Progress bar sur publish
3. **Error Handling**:
   - Toast errors avec retry
   - Validation errors inline
   - Network error banner
4. **Empty States**:
   - No elements: CTA "Add first element"
   - No selection: Guide "Select an element"
5. **Mobile Responsive**:
   - Stack vertical < 1024px
   - Bottom sheet pour properties
   - Touch-friendly interactions
6. **Tests**: Visual regression tests

**Temps estimé**: 12h

---

### Sprint 1.5 - Testing & Documentation (Semaine 4)

#### Task 1.5.1: Tests Unitaires
**Fichiers**: `*.test.tsx` à côté de chaque composant

**Coverage**:
- [ ] ElementsSidebar: drag & drop, actions
- [ ] PropertiesPanel: editors, validation
- [ ] StudioToolbar: buttons, shortcuts
- [ ] useStudioHistory: undo/redo logic
- [ ] Element property editors (sample)

**Temps estimé**: 12h

---

#### Task 1.5.2: Documentation Studio
**Fichier**: `docs/STUDIO.md`

**Contenu**:
1. Architecture overview
2. Components structure
3. State management
4. Adding new element type guide
5. Troubleshooting

**Temps estimé**: 4h

---

#### Task 1.5.3: Manuel Utilisateur
**Fichier**: `apps/web/public/docs/studio-guide.md`

**Contenu**:
1. Getting started
2. Adding elements
3. Editing properties
4. Publishing
5. Keyboard shortcuts reference

**Temps estimé**: 4h

---

### ✅ Checkpoint Phase 1 - Critères de Validation

**Fonctionnel**:
- [ ] Créer site depuis template
- [ ] Ajouter élément via sidebar
- [ ] Éditer propriétés via panel
- [ ] Voir preview mis à jour
- [ ] Drag & drop pour réordonner
- [ ] Dupliquer/Supprimer éléments
- [ ] Undo/Redo fonctionne
- [ ] Publier le site

**Performance**:
- [ ] Preview refresh < 300ms
- [ ] Property update < 200ms
- [ ] Drag & drop smooth (60 FPS)

**UX**:
- [ ] Keyboard shortcuts fonctionnent
- [ ] Responsive mobile OK
- [ ] Animations smooth
- [ ] Error handling complet

---

## PHASE 2: Onboarding Intelligent
**Durée**: 2 semaines  
**Prérequis**: Phase 1 complète (Studio opérationnel)  
**Objectif**: Questionnaire smart + auto-configuration

### Sprint 2.1 - Questionnaire Design (Semaine 5, jours 1-2)

#### Task 2.1.1: Définir Questions & Mapping
**Fichier**: `apps/web/src/components/onboarding/questionnaire/questions-config.ts`

```typescript
interface Question {
  id: string;
  type: 'single' | 'multiple' | 'text' | 'scale';
  question: string;
  description?: string;
  options?: QuestionOption[];
  validation?: (answer: unknown) => boolean;
}

interface QuestionnaireAnswers {
  siteType: 'portfolio' | 'business' | 'blog' | 'landing';
  targetAudience: 'b2b' | 'b2c' | 'developers' | 'general';
  objectives: ('showcase' | 'sell' | 'leads' | 'inform')[];
  visualStyle: 'modern' | 'minimal' | 'colorful' | 'professional';
  priorities: ('speed' | 'design' | 'features' | 'seo')[];
}
```

**Questions** (7 questions):
1. **Type de site** (single choice avec icons)
   - Portfolio Freelance
   - Site Business/Entreprise
   - Blog/Magazine
   - Landing Page Produit
2. **Public cible** (single choice)
   - Clients B2B
   - Consommateurs B2C
   - Développeurs/Tech
   - Grand public
3. **Objectifs principaux** (multiple choice, max 3)
   - Montrer mon travail/projets
   - Vendre services/produits
   - Générer des leads
   - Informer/Éduquer
   - Construire ma marque
4. **Style visuel** (single choice avec previews)
   - Moderne & Bold
   - Minimal & Épuré
   - Coloré & Créatif
   - Professionnel & Corporate
5. **Fonctionnalités prioritaires** (multiple choice, max 4)
   - Portfolio projets
   - Blog intégré
   - Formulaire contact
   - E-commerce
   - Témoignages clients
   - Système de réservation
6. **Niveau technique** (scale 1-5)
   - 1: Débutant complet
   - 5: Développeur expérimenté
7. **Call-to-action principal** (text input)
   - Ex: "Me contacter", "Télécharger", "Acheter"

**Mapping Answers → Configuration**:
```typescript
interface SiteConfiguration {
  presetId: string;
  elementTypes: ElementType[];
  themeConfig: Partial<Theme>;
  contentSuggestions: Record<string, unknown>;
}

function mapAnswersToConfig(answers: QuestionnaireAnswers): SiteConfiguration {
  // Logic to map answers to preset, elements, theme
}
```

**Actions concrètes**:
1. Définir 7 questions avec types + options
2. Créer mapping logic answers → config
3. **Tests**: Mapping pour chaque combinaison majeure

**Temps estimé**: 8h

---

#### Task 2.1.2: Créer UI Questionnaire
**Fichier**: `apps/web/src/components/onboarding/questionnaire/questionnaire.tsx`

**Structure**:
```
questionnaire/
├── questionnaire.tsx              # Container avec steps
├── question-types/
│   ├── single-choice-question.tsx # Radio avec icons
│   ├── multiple-choice-question.tsx # Checkboxes
│   ├── text-question.tsx          # Input
│   └── scale-question.tsx         # Slider 1-5
├── question-option.tsx            # Option card avec hover
└── questionnaire-progress.tsx     # Progress bar
```

**UI Design**:
- Fullscreen avec centering vertical
- 1 question par page
- Progress bar en haut (1/7, 2/7...)
- Options en grid 2x2 ou 3x2 avec cards
- Boutons: [← Back] [Skip] [Continue →]
- Auto-advance sur single choice selection
- Animations entre questions (slide)

**Actions concrètes**:
1. Step-by-step wizard avec react-hook-form
2. Validation per question
3. Persist answers dans localStorage (reprise)
4. Animations smooth entre steps
5. **Tests**: Navigation, validation, persist

**Temps estimé**: 12h

---

### Sprint 2.2 - Auto-Configuration (Semaine 5, jours 3-5 + Semaine 6, jour 1)

#### Task 2.2.1: Implémenteur Auto-Config Engine
**Fichier**: `apps/web/src/lib/onboarding/auto-config-engine.ts`

```typescript
class AutoConfigEngine {
  async generateSiteConfig(answers: QuestionnaireAnswers): Promise<SiteConfiguration> {
    const preset = this.selectPreset(answers);
    const elements = this.selectElements(answers);
    const theme = this.generateTheme(answers);
    const content = this.generateContent(answers);
    
    return { preset, elements, theme, content };
  }
  
  private selectPreset(answers: QuestionnaireAnswers): string {
    // Portfolio Freelance si siteType = portfolio
    // Landing SaaS si siteType = landing
    // etc.
  }
  
  private selectElements(answers: QuestionnaireAnswers): ElementType[] {
    // Basé sur objectives + priorities
    // Ex: objectives includes 'showcase' → add 'projects'
    // Ex: priorities includes 'contact' → add 'contact'
  }
  
  private generateTheme(answers: QuestionnaireAnswers): Partial<Theme> {
    // Visual style mapping
    // modern → primaryColor: blue-600
    // minimal → primaryColor: gray-900, mode: light
    // colorful → primaryColor: purple-500, accentColor: orange-500
    // professional → primaryColor: blue-700, mode: light
  }
  
  private generateContent(answers: QuestionnaireAnswers): Record<string, unknown> {
    // CTA text from answer
    // Placeholder content based on type
  }
}
```

**Actions concrètes**:
1. Preset selection logic (rules-based)
2. Elements selection logic (scoring)
3. Theme generation (color palettes)
4. Content suggestions (placeholders pertinents)
5. **Tests**: Chaque method avec fixtures

**Temps estimé**: 12h

---

#### Task 2.2.2: Intégrer Auto-Config dans Flow
**Fichier**: `apps/web/src/components/onboarding/new-user-onboarding.tsx`

**Modifications**:
1. Remplacer template selection par questionnaire
2. Generate config après questionnaire
3. Create website avec config
4. Show preview du site généré
5. Allow manual tweaks avant final creation
6. **Tests**: E2E flow complet

**Temps estimé**: 8h

---

### Sprint 2.3 - Smart Suggestions (Semaine 6, jours 2-5)

#### Task 2.3.1: Suggestions Post-Creation
**Fichier**: `apps/web/src/components/onboarding/suggestions/suggestions-panel.tsx`

**Suggestions basées sur answers**:
1. Elements manquants suggérés
2. Content tips (ex: "Add 3+ projects for credibility")
3. SEO recommendations (meta description, etc.)
4. Design improvements (contrast, spacing)

**Actions concrètes**:
1. Analyze created site vs answers
2. Generate suggestions list
3. UI: Cards avec [Add] [Dismiss]
4. Track dismissed suggestions
5. **Tests**: Suggestions generation

**Temps estimé**: 8h

---

#### Task 2.3.2: A/B Testing Framework (Bonus V2)
**Fichier**: `apps/web/src/lib/onboarding/ab-testing.ts`

Pour optimiser questionnaire:
1. Track conversion rate par question variant
2. Analytics events
3. Dashboard metrics

**Temps estimé**: 8h (V2)

---

### ✅ Checkpoint Phase 2 - Critères de Validation

**Fonctionnel**:
- [ ] Questionnaire 7 questions complet
- [ ] Auto-config génère site cohérent
- [ ] Preset correct sélectionné
- [ ] Elements pertinents ajoutés
- [ ] Theme matching style choisi
- [ ] Suggestions post-creation visibles

**UX**:
- [ ] Questions claires et rapides (< 3min)
- [ ] Progress visible
- [ ] Back/Skip fonctionnent
- [ ] Preview avant final creation
- [ ] 80%+ users complètent questionnaire

---

## PHASE 3: AI ↔ Studio Integration
**Durée**: 2-3 semaines  
**Prérequis**: Phase 1 + Phase 2 complètes  
**Objectif**: Édition conversationnelle opérationnelle

### Sprint 3.1 - Preview Modifications AI (Semaine 7, jours 1-3)

#### Task 3.1.1: AI Actions Preview System
**Fichier**: `apps/web/src/components/studio/ai-preview/ai-actions-preview.tsx`

```typescript
interface AIActionPreview {
  action: AIAction;
  element: WebsiteElement;
  changes: Record<string, { before: unknown; after: unknown }>;
  timestamp: number;
}

interface AIActionsPreviewProps {
  previews: AIActionPreview[];
  onAccept: (previewId: string) => Promise<void>;
  onReject: (previewId: string) => void;
  onAcceptAll: () => Promise<void>;
  onRejectAll: () => void;
}
```

**UI Design**:
- Toast-like cards en bas à droite
- 1 card par action pending
- Show before/after values
- Buttons: [✓ Accept] [✗ Reject]
- Batch actions: [Accept All] [Reject All]
- Auto-dismiss after 30s si non interacted

**Actions concrètes**:
1. Preview system avec pending actions queue
2. Highlight concerned elements in preview
3. Show diff before/after
4. Accept → Apply + remove from queue
5. Reject → Remove from queue
6. **Tests**: Preview, accept, reject

**Temps estimé**: 10h

---

#### Task 3.1.2: Highlight Éléments Modifiés
**Fichier**: `apps/web/src/components/studio/studio-page/components/element-highlight.tsx`

**Modifications**:
1. Inject highlight styles dans iframe
2. Different colors per state:
   - Selected: primary border
   - AI Pending: yellow border + pulse
   - AI Applied: green border (fade out)
3. Label with action type
4. **Tests**: Highlights rendering

**Temps estimé**: 6h

---

### Sprint 3.2 - Sync Bi-Directionnelle (Semaine 7, jours 4-5 + Semaine 8, jours 1-2)

#### Task 3.2.1: AI Actions → Properties Panel Sync
**Fichier**: `apps/web/src/hooks/useAIStudioSync.ts`

```typescript
interface AIStudioSync {
  // When AI proposes changes
  onAIAction: (action: AIAction) => void;
  
  // When user manually edits
  onManualEdit: (elementId: string, field: string, value: unknown) => void;
  
  // Sync state
  pendingAIActions: AIActionPreview[];
  appliedAIActions: AIAction[];
}
```

**Logic**:
1. AI action received → Create preview
2. Preview accepted → Apply to element + update properties panel
3. Manual edit → Cancel related AI preview + notify AI of change
4. Keep history of AI vs Manual changes

**Actions concrètes**:
1. Hook for bi-directional sync
2. Conflict resolution (AI + Manual same field)
3. Update properties panel when AI applies
4. Notify AI context of manual changes
5. **Tests**: Sync scenarios

**Temps estimé**: 12h

---

#### Task 3.2.2: Properties Panel → AI Context Sync
**Fichier**: `apps/web/src/lib/ai/ai-context-sync.ts`

**Actions**:
1. On property change → Add to AI context
2. Build message: "User manually changed {field} to {value}"
3. Send via existing AI chat
4. AI adjusts suggestions based on manual edits

**Actions concrètes**:
1. Detect manual property changes
2. Format context update message
3. Send to AI via streaming endpoint
4. **Tests**: Context updates

**Temps estimé**: 6h

---

### Sprint 3.3 - Mode "AI Edit" Contextuel (Semaine 8, jours 3-5)

#### Task 3.3.1: Context Menu AI Edit
**Fichier**: `apps/web/src/components/studio/ai-edit/ai-context-menu.tsx`

**Trigger**: Right-click sur élément dans preview

**Menu Options**:
1. ✨ Edit with AI
2. 🎨 Change style
3. 📝 Improve text
4. 🔄 Rewrite differently
5. 🌍 Translate to...
6. ✂️ Shorten / Expand

**Actions concrètes**:
1. Context menu component
2. Detect element under cursor
3. Show relevant AI actions
4. Open AI mini-chat avec context
5. **Tests**: Menu, actions

**Temps estimé**: 10h

---

#### Task 3.3.2: AI Mini-Chat Contextuel
**Fichier**: `apps/web/src/components/studio/ai-edit/ai-mini-chat.tsx`

**UI**:
- Popover attaché à l'élément
- Input: "What do you want to change?"
- Quick suggestions chips:
  - "Make it shorter"
  - "More professional"
  - "Add emoji"
  - "Translate to English"
- Streaming response
- Apply button

**Actions concrètes**:
1. Popover component avec positioning
2. Send element context to AI
3. Stream AI response
4. Preview changes inline
5. **Tests**: Mini-chat flow

**Temps estimé**: 8h

---

### Sprint 3.4 - Smart Suggestions (Semaine 9)

#### Task 3.4.1: AI Analyze Site
**Fichier**: `apps/web/src/lib/ai/site-analyzer.ts`

```typescript
interface SiteAnalysis {
  designIssues: Issue[];
  contentIssues: Issue[];
  seoIssues: Issue[];
  accessibilityIssues: Issue[];
  recommendations: Recommendation[];
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  category: 'design' | 'content' | 'seo' | 'accessibility';
  message: string;
  elementId?: string;
  fix?: AIAction; // Suggested fix
}
```

**Analyses**:
1. **Design**: Contrast, spacing, hierarchy
2. **Content**: Length, clarity, SEO keywords
3. **SEO**: Meta tags, headings, alt text
4. **Accessibility**: ARIA labels, keyboard nav

**Actions concrètes**:
1. Call AI endpoint `/api/ai/analyze/website`
2. Parse analysis results
3. Map to Issues list
4. Generate AIAction fixes
5. **Tests**: Analysis accuracy

**Temps estimé**: 10h

---

#### Task 3.4.2: Suggestions Panel
**Fichier**: `apps/web/src/components/studio/suggestions/suggestions-panel.tsx`

**UI**:
- Sidebar collapsible (right side)
- Tabs: All / Design / Content / SEO / A11y
- Issue cards avec:
  - Severity badge
  - Description
  - Element preview (if applicable)
  - [Fix] [Dismiss] buttons
- Score overview (0-100)

**Actions concrètes**:
1. Panel component avec tabs
2. Issue cards avec actions
3. Fix → Apply AI action
4. Dismiss → Hide permanently
5. Score calculation
6. **Tests**: Panel interactions

**Temps estimé**: 8h

---

### ✅ Checkpoint Phase 3 - Critères de Validation

**Fonctionnel**:
- [ ] AI propose action → Preview visible
- [ ] Accept preview → Applied to element + properties updated
- [ ] Reject preview → Cancelled
- [ ] Manual edit → AI notified
- [ ] Right-click element → AI Edit menu
- [ ] AI Mini-Chat fonctionne
- [ ] Site analysis génère suggestions
- [ ] Suggestions applicables

**UX**:
- [ ] Preview avant application (no surprise)
- [ ] Undo AI actions works
- [ ] Suggestions pertinentes
- [ ] 90%+ suggestions accuracy

---

## PHASE 4: Polish UX & Optimisations
**Durée**: 1-2 semaines  
**Prérequis**: Phase 1 + 2 + 3 complètes  
**Objectif**: Expérience professionnelle et performante

### Sprint 4.1 - Animations & Transitions (Semaine 10, jours 1-2)

#### Task 4.1.1: Animations Library
**Fichier**: `apps/web/src/lib/animations.ts`

**Animations**:
1. Fade in/out (modals, toasts)
2. Slide in/out (panels, drawers)
3. Scale (buttons, cards)
4. Pulse (highlights, notifications)
5. Skeleton shimmer (loading states)

**Actions concrètes**:
1. Define animation variants (framer-motion)
2. Reusable animation components
3. Apply to existing components
4. Performance: GPU-accelerated
5. **Tests**: Visual regression

**Temps estimé**: 6h

---

#### Task 4.1.2: Transitions Between Views
**Actions**:
1. Page transitions (fade)
2. Modal transitions (scale + fade)
3. Drawer transitions (slide)
4. List reordering (smooth drag)

**Temps estimé**: 4h

---

### Sprint 4.2 - Loading & Feedback (Semaine 10, jours 3-4)

#### Task 4.2.1: Skeleton Screens
**Fichiers**: `apps/web/src/components/ui/skeleton/*.tsx`

**Skeletons pour**:
1. Elements sidebar
2. Properties panel
3. Preview canvas
4. AI chat
5. Onboarding steps

**Actions concrètes**:
1. Skeleton components matching real UI
2. Replace loading spinners with skeletons
3. Animate shimmer effect
4. **Tests**: Skeletons rendering

**Temps estimé**: 6h

---

#### Task 4.2.2: Progress Indicators
**Components**:
1. Linear progress (publish, upload)
2. Circular progress (async actions)
3. Indeterminate loaders
4. Step progress (onboarding)

**Temps estimé**: 4h

---

#### Task 4.2.3: Toast Notifications System
**Fichier**: Améliorer sonner existant

**Toasts**:
1. Success: Green avec ✓
2. Error: Red avec ✗ + Retry
3. Warning: Yellow avec ⚠️
4. Info: Blue avec ℹ️
5. Loading: Spinner
6. Promise: Auto-update (loading → success/error)

**Actions concrètes**:
1. Standardize toast usage
2. Add retry action on errors
3. Queue management (max 3 visible)
4. **Tests**: Toast behaviors

**Temps estimé**: 4h

---

### Sprint 4.3 - Performance Optimizations (Semaine 10, jour 5 + Semaine 11, jour 1)

#### Task 4.3.1: Code Splitting & Lazy Loading
**Actions**:
1. Route-based code splitting (React.lazy)
2. Component lazy loading (studio modules)
3. Image lazy loading (IntersectionObserver)
4. Virtualization (elements list > 50 items)

**Optimisations**:
- Initial bundle < 200KB
- Route chunks < 100KB
- TTI < 3s
- **Tests**: Lighthouse CI

**Temps estimé**: 8h

---

#### Task 4.3.2: API Optimizations
**Actions**:
1. Debounce property updates (500ms)
2. Batch element reordering (1 API call)
3. Optimistic updates (immediate UI)
4. Cache with SWR (dedupe requests)
5. Prefetch on hover (links, tabs)

**Temps estimé**: 6h

---

### Sprint 4.4 - Dark Mode (Semaine 11, jours 2-3)

#### Task 4.4.1: Dark Mode Implementation
**Fichier**: `apps/web/src/lib/theme/dark-mode.ts`

**Actions**:
1. CSS variables pour colors
2. Toggle dans toolbar
3. Persist dans localStorage
4. System preference detection
5. Smooth transition (no flash)
6. Update all components

**Temps estimé**: 10h

---

### Sprint 4.5 - Responsive & Mobile (Semaine 11, jours 4-5)

#### Task 4.5.1: Responsive Layouts
**Breakpoints**:
- Desktop: > 1024px (3 cols)
- Tablet: 768-1023px (2 cols, properties en modal)
- Mobile: < 768px (1 col, fullscreen)

**Actions**:
1. Stack vertical < 1024px
2. Bottom sheets pour panels
3. Touch gestures (swipe, pinch)
4. Mobile-friendly spacing
5. **Tests**: Responsive tests

**Temps estimé**: 8h

---

### ✅ Checkpoint Phase 4 - Critères de Validation

**Performance**:
- [ ] Lighthouse score > 90
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] TTI < 3s
- [ ] Bundle size < 200KB (initial)

**UX**:
- [ ] Animations smooth (60 FPS)
- [ ] Dark mode complet
- [ ] Responsive mobile OK
- [ ] Skeletons partout
- [ ] Toast feedback cohérent

---

## PHASE 5: Tests E2E & CI/CD
**Durée**: 2-3 semaines  
**Prérequis**: Product complet et fonctionnel  
**Objectif**: Production-ready avec tests et CI/CD

### Sprint 5.1 - Tests E2E (Semaine 12-13)

#### Task 5.1.1: Setup Playwright
**Fichier**: `playwright.config.ts`

**Config**:
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['github']],
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
  ],
});
```

**Temps estimé**: 2h

---

#### Task 5.1.2: Tests E2E - Flows Critiques
**Fichiers**: `tests/e2e/*.spec.ts`

**Tests** (30+ scenarios):

**Auth** (3 tests):
1. Signup flow
2. Login flow
3. Logout flow

**Onboarding** (5 tests):
1. Complete questionnaire → Site created
2. Skip questionnaire → Template selection
3. GitHub import flow
4. Publish first site
5. Suggestions post-creation

**Studio** (10 tests):
1. Create element via sidebar
2. Edit properties → Preview updated
3. Drag & drop reorder
4. Duplicate element
5. Delete element
6. Undo/Redo
7. Keyboard shortcuts
8. Device preview switch
9. Publish site
10. Mobile responsive

**AI** (8 tests):
1. AI chat → Action → Preview → Accept
2. AI chat → Action → Preview → Reject
3. Right-click AI Edit
4. AI Mini-Chat
5. Manual edit → AI notified
6. Site analysis → Suggestions
7. Apply AI suggestion
8. AI + Manual conflict resolution

**Performance** (4 tests):
1. Lighthouse CI (desktop)
2. Lighthouse CI (mobile)
3. Page load time < 2s
4. API response time < 200ms

**Temps estimé**: 40h

---

### Sprint 5.2 - CI/CD Pipeline (Semaine 13-14)

#### Task 5.2.1: GitHub Actions Workflows
**Fichiers**: `.github/workflows/*.yml`

**Workflows**:

**1. CI (ci.yml)** - On PR:
```yaml
name: CI
on: pull_request
jobs:
  test:
    - Install deps
    - Lint (TypeScript, Rust)
    - Unit tests
    - E2E tests
    - Build Docker images
    - Lighthouse CI
```

**2. Build (build.yml)** - On push main:
```yaml
name: Build
on: push: branches: [main]
jobs:
  build:
    - Build API (Rust)
    - Build Web (Node)
    - Push to registry
```

**3. Deploy Staging (deploy-staging.yml)** - On push main:
```yaml
name: Deploy Staging
on: push: branches: [main]
jobs:
  deploy:
    - Pull images
    - Deploy to staging
    - Run smoke tests
    - Rollback if fail
```

**Temps estimé**: 12h

---

#### Task 5.2.2: Monitoring & Alerting
**Services**:

**1. Sentry** (Error Tracking):
- Frontend errors
- Backend errors
- Performance monitoring
- Release tracking

**2. Health Checks**:
- `/health`: API status
- `/ready`: DB + Redis connected
- Uptime monitoring (UptimeRobot)

**3. Logging**:
- Structured logs (JSON)
- Log aggregation (Grafana Cloud / CloudWatch)
- Error alerting (Slack/Email)

**Temps estimé**: 8h

---

#### Task 5.2.3: Rollback Mechanism
**Strategy**: Blue-Green Deployment

**Process**:
1. Deploy to green env
2. Run smoke tests
3. If pass: Switch traffic green → blue
4. If fail: Keep traffic on blue + alert
5. Keep last 3 versions for instant rollback

**Temps estimé**: 8h

---

### ✅ Checkpoint Phase 5 - Critères de Validation

**Tests**:
- [ ] 30+ E2E tests passent
- [ ] Coverage > 80% (unit + E2E)
- [ ] Visual regression tests OK
- [ ] Performance tests < thresholds

**CI/CD**:
- [ ] CI < 10 min
- [ ] Deploy staging < 5 min
- [ ] Rollback < 2 min
- [ ] 0 downtime deployments

**Monitoring**:
- [ ] Sentry configuré
- [ ] Health checks actifs
- [ ] Logs centralisés
- [ ] Alerts fonctionnelles

---

## 📊 Métriques de Succès Globales

### Technique
- [ ] Lighthouse score > 90
- [ ] E2E tests coverage > 80%
- [ ] API response time < 200ms (p95)
- [ ] Preview refresh < 300ms
- [ ] Zero critical bugs

### Produit
- [ ] User peut créer site en < 5 min
- [ ] 90%+ users complètent onboarding
- [ ] 80%+ users publient leur site
- [ ] 70%+ users utilisent AI
- [ ] NPS > 40

### Business
- [ ] Prêt pour beta publique
- [ ] Documentation complète
- [ ] Support workflow défini
- [ ] Pricing model validé

---

## 📅 Timeline Résumé

| Phase | Semaines | Dates | Effort (h) |
|-------|----------|-------|-----------|
| Phase 1: Studio | 3-4 sem | S1-S4 | 160h |
| Phase 2: Onboarding | 2 sem | S5-S6 | 64h |
| Phase 3: AI ↔ Studio | 2-3 sem | S7-S9 | 80h |
| Phase 4: Polish | 1-2 sem | S10-S11 | 56h |
| Phase 5: Tests & CI/CD | 2-3 sem | S12-S14 | 70h |
| **TOTAL** | **10-14 sem** | **3-4 mois** | **430h** |

**Équipe**: 1 développeur full-stack → 10-14 semaines  
**Équipe**: 2 développeurs → 5-7 semaines (parallélisation)

---

## 🚀 Prochaines Étapes Immédiates

### Semaine 1 - Sprint 1.1 & 1.2 Start

**Jour 1**:
- [ ] Task 1.1.1: Créer StudioLayout (6h)

**Jour 2**:
- [ ] Task 1.1.2 (part 1): Sidebar structure (6h)

**Jour 3**:
- [ ] Task 1.1.2 (part 2): Drag & drop (6h)

**Jour 4**:
- [ ] Task 1.1.3: Preview selection (8h)

**Jour 5**:
- [ ] Task 1.2.1 (part 1): Properties panel container (8h)

**Livrable Semaine 1**: Layout 3 colonnes avec sidebar + preview interactif

---

## 📚 Ressources & Références

### Libraries à Installer
```json
{
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^8.0.0",
  "react-resizable-panels": "^1.0.0",
  "framer-motion": "^10.0.0",
  "react-hook-form": "^7.49.0",
  "zod": "^3.22.0",
  "@playwright/test": "^1.40.0"
}
```

### Documentation Externe
- [DnD Kit](https://dndkit.com/)
- [Resizable Panels](https://github.com/bvaughn/react-resizable-panels)
- [Framer Motion](https://www.framer.com/motion/)
- [Playwright](https://playwright.dev/)

---

## ✅ Sign-Off

Ce plan est:
- ✅ Basé sur analyse réelle de la codebase
- ✅ Concret avec fichiers et code samples
- ✅ Séquentiel avec dépendances claires
- ✅ Estimé avec temps par task
- ✅ Validable avec checkpoints
- ✅ Prêt à être exécuté immédiatement

**Prêt à démarrer Task 1.1.1 ?** 🚀
