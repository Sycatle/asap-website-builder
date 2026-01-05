# Plan de Migration - Application Accounts

## Vue d'ensemble

Création d'une application dédiée `accounts.asap.cool` pour centraliser :
- Authentification (login, signup, reset password)
- Gestion du profil utilisateur
- Paramètres de sécurité (2FA, sessions)
- Facturation et abonnements
- Notifications globales

## Architecture Cible

```
apps/
├── accounts/          # NOUVELLE APP - Gestion compte
│   ├── src/
│   │   ├── pages/
│   │   │   ├── login.astro
│   │   │   ├── signup.astro
│   │   │   ├── forgot-password.astro
│   │   │   ├── reset-password.astro
│   │   │   ├── verify-email.astro
│   │   │   └── [...path].astro  # SPA pour settings
│   │   ├── components/
│   │   │   ├── auth/            # Formulaires auth
│   │   │   ├── settings/        # Pages settings
│   │   │   └── shared/          # Composants partagés
│   │   └── lib/
│   └── public/
├── web/               # App principale (sites web)
└── sites/             # Sites générés
```

## Domaines

| App | URL | Fonction |
|-----|-----|----------|
| accounts | `accounts.asap.cool` | Auth + Settings compte |
| web | `app.asap.cool` | Gestion des sites web |
| sites | `*.asap.cool` | Sites générés |

---

## Phase 1 : Préparation (1-2 jours)

### 1.1 Créer la structure de l'app accounts

```
apps/accounts/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.cjs
├── postcss.config.cjs
└── src/
    ├── env.d.ts
    ├── layouts/
    │   └── AuthLayout.astro
    ├── styles/
    │   └── globals.css
    └── lib/
        └── api/
```

### 1.2 Partager les dépendances communes

Déplacer vers `packages/shared` :
- [ ] Types TypeScript (`User`, `Session`, etc.)
- [ ] Client API authentification
- [ ] Utilitaires (validation, formatage)
- [ ] Composants UI de base (déjà fait avec shadcn)
- [ ] **SettingsModal** - Modal réutilisable pour édition rapide du profil

### 1.3 Configuration infra

- [ ] Créer `Dockerfile.accounts`
- [ ] Ajouter service dans `docker-compose.yml`
- [ ] Configurer nginx/traefik pour `accounts.asap.cool`
- [ ] Variables d'environnement (`env.example/accounts.env`)

---

## Phase 2 : Migration Auth (2-3 jours)

### 2.1 Pages à migrer

| Source (web) | Destination (accounts) |
|--------------|------------------------|
| `pages/login.astro` | `pages/login.astro` |
| `pages/signup.astro` | `pages/signup.astro` |
| `pages/forgot-password.astro` | `pages/forgot-password.astro` |
| `pages/reset-password.astro` | `pages/reset-password.astro` |

### 2.2 Composants à migrer

- [ ] `LoginForm.tsx`
- [ ] `SignupForm.tsx`
- [ ] `ForgotPasswordForm.tsx`
- [ ] `ResetPasswordForm.tsx`
- [ ] `login-form.tsx` (variante)

### 2.3 Logique à migrer

- [ ] `lib/api/auth.ts` → `packages/shared/src/api/auth.ts`
- [ ] `lib/store/authStore.ts` → Garder dans les deux apps (état local)
- [ ] Hooks d'authentification

### 2.4 Flow SSO

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   app.asap.cool │────▶│accounts.asap.cool│────▶│   app.asap.cool │
│   (non auth)    │     │    (login)       │     │   (auth OK)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                      │                        │
         │  redirect to        │  set cookie            │
         │  /login?redirect=   │  httpOnly, secure      │
         │                      │  SameSite=None         │
         └──────────────────────┴────────────────────────┘
```

### 2.5 Gestion des tokens

**Option A : Cookie partagé (recommandé)**
- Cookie sur domaine `.asap.cool`
- `SameSite=None; Secure; HttpOnly`
- Validation côté API

**Option B : Token dans URL**
- Redirect avec token temporaire
- Échange contre session
- Plus complexe mais plus flexible

---

## Phase 3 : Migration Settings (2-3 jours)

### 3.1 Pages settings à créer

```
accounts/src/pages/[...path].astro  # SPA Router

Routes:
├── /                    # Dashboard compte
├── /profile             # Profil utilisateur
├── /security            # Mot de passe, 2FA, sessions
├── /notifications       # Préférences notifications  
├── /billing             # Abonnement, factures
├── /danger              # Suppression compte
└── /oauth               # Apps connectées (futur)
```

### 3.2 Composants à migrer depuis web

- [ ] `features/settings/SettingsPage.tsx` → Adapter en pages séparées
- [ ] `features/settings/AccountTab.tsx` → `/profile`
- [ ] `features/settings/SecurityTab.tsx` → `/security`
- [ ] `features/settings/NotificationsTab.tsx` → `/notifications`
- [ ] `features/settings/BillingTab.tsx` → `/billing`
- [ ] `features/settings/DangerTab.tsx` → `/danger`

### 3.3 Composants à déplacer vers packages/shared

Le `SettingsModal` reste utilisable dans les deux apps pour une édition rapide :

```
packages/shared/src/components/
└── settings/
    ├── SettingsModal.tsx       # Modal principal
    ├── AccountTab.tsx          # Onglet profil
    ├── SecurityTab.tsx         # Onglet sécurité  
    ├── NotificationsTab.tsx    # Onglet notifications
    ├── BillingTab.tsx          # Onglet facturation
    ├── DangerTab.tsx           # Onglet zone danger
    └── index.ts                # Exports
```

**Usage dans web app :**
```tsx
import { SettingsModal } from '@asap/shared/components/settings'

// Ouverture rapide depuis bottom-nav ou header
<SettingsModal open={open} onOpenChange={setOpen} />
```

**Usage dans accounts app :**
```tsx
// Réutilisation des mêmes composants dans les pages dédiées
import { AccountTab } from '@asap/shared/components/settings'

// Page /profile utilise le même composant
<AccountTab user={user} onUpdate={handleUpdate} />
```

### 3.4 Mettre à jour l'app web

L'app web conserve le `SettingsModal` pour l'édition rapide, mais peut aussi rediriger vers accounts pour les paramètres avancés :

```tsx
// Bouton profil → ouvre le modal (édition rapide)
<Button onClick={() => setSettingsOpen(true)}>
  Mon compte
</Button>

// Lien vers paramètres complets
<a href="https://accounts.asap.cool/security">
  Paramètres avancés →
</a>
```

---

## Phase 4 : Migration Notifications (1 jour)

### 4.1 Décision architecture

**Option A : Notifications dans accounts**
- Centralise tout ce qui est "compte utilisateur"
- Les notifications de l'app web redirigent vers accounts

**Option B : Notifications dans web (recommandé pour MVP)**
- Les notifications sont liées aux sites web
- Garder dans l'app web pour l'instant
- Migrer plus tard si besoin

### 4.2 Si migration vers accounts

- [ ] `features/notifications/` → accounts
- [ ] `lib/api/notifications.ts` → packages/shared
- [ ] `hooks/useNotifications.ts` → packages/shared
- [ ] Route `/notifications` dans accounts

---

## Phase 5 : Tests & Déploiement (2-3 jours)

### 5.1 Tests à effectuer

- [ ] Flow signup complet
- [ ] Flow login + redirect vers app
- [ ] Flow forgot/reset password
- [ ] Modification profil
- [ ] Changement mot de passe
- [ ] Sessions actives
- [ ] Déconnexion (toutes les apps)
- [ ] Cross-domain cookies

### 5.2 Déploiement

1. Déployer accounts en staging
2. Configurer DNS `accounts.staging.asap.cool`
3. Tester flows complets
4. Déployer en production
5. Mettre à jour app web pour rediriger

### 5.3 Migration données

- Aucune migration de données nécessaire (même API backend)
- Les tokens existants restent valides

---

## Phase 6 : Nettoyage (1 jour)

### 6.1 Mettre à jour les imports dans l'app web

- [ ] Pages auth (`login.astro`, `signup.astro`, etc.) → Supprimer (migré vers accounts)
- [ ] Composants auth (`LoginForm.tsx`, etc.) → Supprimer (migré vers accounts)
- [ ] `SettingsModal` → Importer depuis `@asap/shared`
- [ ] Composants settings tabs → Importer depuis `@asap/shared`
- [ ] Routes auth dans `app-router.tsx` → Supprimer

### 6.2 Mettre à jour

- [ ] `bottom-nav.tsx` - Lien externe vers accounts
- [ ] `HeaderUser.tsx` - Lien externe vers accounts
- [ ] Middleware auth - Redirect vers accounts si non connecté
- [ ] Documentation

---

## Estimation totale

| Phase | Durée estimée |
|-------|---------------|
| Phase 1 : Préparation | 1-2 jours |
| Phase 2 : Migration Auth | 2-3 jours |
| Phase 3 : Migration Settings | 2-3 jours |
| Phase 4 : Notifications | 1 jour |
| Phase 5 : Tests & Déploiement | 2-3 jours |
| Phase 6 : Nettoyage | 1 jour |
| **Total** | **9-13 jours** |

---

## Risques & Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Cookies cross-domain | Auth cassée | Tester en staging, fallback token URL |
| UX fragmentée | Confusion users | Navigation claire, breadcrumbs |
| Duplication code | Maintenance | Packages partagés stricts |
| SEO pages auth | Perte référencement | Redirects 301, sitemap |

---

## Décisions à prendre

1. **Notifications** : Garder dans web ou migrer vers accounts ?
2. **Cookie strategy** : Domaine partagé ou token exchange ?
3. **Priorité** : Faire maintenant ou attendre plus d'utilisateurs ?

---

## Notes techniques

### Cookie cross-domain

```typescript
// API - Set cookie
res.cookie('auth_token', token, {
  domain: '.asap.cool',      // Partagé entre sous-domaines
  httpOnly: true,
  secure: true,
  sameSite: 'none',          // Requis pour cross-site
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

### Redirect après login

```typescript
// accounts/login
const redirectUrl = searchParams.get('redirect') || 'https://app.asap.cool';

// Après login réussi
window.location.href = redirectUrl;
```

### Middleware app web

```typescript
// web/middleware.ts
if (!hasValidSession() && !isPublicRoute(path)) {
  const redirect = encodeURIComponent(currentUrl);
  return Response.redirect(`https://accounts.asap.cool/login?redirect=${redirect}`);
}
```
