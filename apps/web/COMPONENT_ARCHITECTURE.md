# Component-First Architecture

Cette documentation décrit l'architecture component-first appliquée dans l'application web ASAP.

## Principes

### 1. **Composants Petits et Ciblés**
- Chaque composant a une seule responsabilité
- Moins de 200 lignes par fichier idéalement
- Extraction des sous-composants dès que la logique devient complexe

### 2. **Structure par Feature**
```
src/components/
├── ui/                    # Composants UI primitifs (Button, Input, Card...)
├── shared/                # Composants partagés entre features
│   ├── command-palette/
│   │   ├── command-palette.tsx
│   │   └── index.ts
│   └── index.ts
├── features/              # Composants organisés par domaine métier
│   ├── settings/
│   │   ├── tabs/
│   │   │   ├── account-settings.tsx
│   │   │   ├── security-settings.tsx
│   │   │   ├── billing-settings.tsx
│   │   │   ├── cloud-settings.tsx
│   │   │   ├── plan-settings.tsx
│   │   │   ├── notifications-settings.tsx
│   │   │   ├── appearance-settings.tsx
│   │   │   └── index.ts
│   │   ├── settings-modal.tsx
│   │   └── index.ts
│   ├── notifications/
│   │   ├── config.ts
│   │   ├── notification-item.tsx
│   │   ├── notification-list.tsx
│   │   ├── notification-settings-tab.tsx
│   │   ├── notifications-page.tsx
│   │   └── index.ts
│   ├── websites/
│   │   ├── dashboard/
│   │   │   ├── types.ts
│   │   │   ├── utils.tsx
│   │   │   ├── stats-cards.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   ├── conversions-card.tsx
│   │   │   ├── quick-actions.tsx
│   │   │   ├── cloud-preview-card.tsx
│   │   │   ├── team-card.tsx
│   │   │   ├── recent-events-card.tsx
│   │   │   ├── site-progression-card.tsx
│   │   │   ├── weekly-goals-card.tsx
│   │   │   ├── achievements-card.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── index.ts
│   │   └── Dashboard.tsx  # Re-export pour compatibilité
│   └── index.ts
└── layouts/               # Composants de mise en page
```

### 3. **Barrel Exports**
Chaque dossier a un fichier `index.ts` qui exporte tout ce qui est public :

```typescript
// features/settings/index.ts
export { SettingsModal, type SettingsModalProps } from './settings-modal';
export * from './tabs';
```

### 4. **Organisation d'un Fichier Composant**

```typescript
"use client"

// ============================================================================
// Types
// ============================================================================

export interface MyComponentProps {
  // ...
}

// ============================================================================
// Config / Constants
// ============================================================================

const MY_CONFIG = { /* ... */ }

// ============================================================================
// Helpers
// ============================================================================

function myHelper() { /* ... */ }

// ============================================================================
// Hooks (si spécifiques au composant)
// ============================================================================

function useMyHook() { /* ... */ }

// ============================================================================
// Sub-components
// ============================================================================

function SubComponent() { /* ... */ }

// ============================================================================
// Main Component
// ============================================================================

export function MyComponent(props: MyComponentProps) {
  // ...
}
```

## Avantages

1. **Maintenabilité** : Chaque fichier est facile à comprendre
2. **Réutilisabilité** : Les sous-composants peuvent être importés séparément
3. **Testabilité** : Chaque composant peut être testé isolément
4. **Tree-shaking** : Imports granulaires = bundles plus légers
5. **Collaboration** : Moins de conflits de merge

## Exemples Appliqués

### Settings Modal
**Avant** : 1 fichier de 1528 lignes
**Après** : 8 fichiers < 300 lignes chacun

```
settings-modal.tsx (1528 lignes)
↓
settings/
├── settings-modal.tsx (~200 lignes - orchestration)
└── tabs/
    ├── account-settings.tsx
    ├── security-settings.tsx
    ├── billing-settings.tsx
    ├── cloud-settings.tsx
    ├── plan-settings.tsx
    ├── notifications-settings.tsx
    └── appearance-settings.tsx
```

### Notifications Page
**Avant** : 1 fichier de 674 lignes
**Après** : 5 fichiers spécialisés

```
NotificationsPage.tsx (674 lignes)
↓
notifications/
├── config.ts             # Types et constantes
├── notification-item.tsx # Un item de notification
├── notification-list.tsx # Liste avec loading/empty states
├── notification-settings-tab.tsx # Onglet paramètres
└── notifications-page.tsx # Page principale (orchestration)
```

### Dashboard
**Avant** : 1 fichier de 1366 lignes
**Après** : 16 fichiers modulaires

```
Dashboard.tsx (1366 lignes)
↓
websites/dashboard/
├── types.ts                  # Interfaces et types partagés
├── utils.tsx                 # Fonctions utilitaires et ChangeIndicator
├── stats-cards.tsx           # Cartes de statistiques temps réel
├── trend-chart.tsx           # Graphique de tendance 7 jours
├── conversions-card.tsx      # Carte conversions (newsletter, contact)
├── quick-actions.tsx         # Actions rapides (liens de navigation)
├── cloud-preview-card.tsx    # Aperçu fichiers cloud
├── team-card.tsx             # Carte équipe administrateurs
├── recent-events-card.tsx    # Activité récente
├── site-progression-card.tsx # Progression setup du site
├── weekly-goals-card.tsx     # Objectifs hebdomadaires
├── achievements-card.tsx     # Badges/récompenses gamification
├── dashboard.tsx             # Composant principal (orchestration)
└── index.ts                  # Barrel exports
```

## Guidelines d'Import

```typescript
// ✅ Import depuis le barrel export (préféré)
import { SettingsModal, AccountSettings } from '@/components/features/settings';

// ✅ Import direct si besoin d'un seul composant
import { NotificationItem } from '@/components/features/notifications/notification-item';

// ❌ Éviter les imports profonds sans raison
import { AccountSettings } from '@/components/features/settings/tabs/account-settings';
```

## Migration Progressive

Pour migrer un gros composant :

1. **Identifier** les sections logiques (tabs, listes, formulaires...)
2. **Extraire** la configuration/types dans un fichier `config.ts`
3. **Créer** les sous-composants un par un
4. **Simplifier** le composant principal en orchestrateur
5. **Ajouter** les barrel exports
6. **Mettre à jour** les imports existants
