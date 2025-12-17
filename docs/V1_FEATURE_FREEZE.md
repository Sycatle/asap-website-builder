# ASAP V1 — Feature Freeze Document

> **Date**: 17 décembre 2025  
> **Status**: V1 MVP en cours  
> **Objectif**: Validation business du portfolio freelance dev

---

## 🎯 Focus V1: Générateur de Portfolio pour Développeurs Freelances

Un seul produit. Un seul flow. Une seule page.

### Proposition de valeur
> "Créez votre portfolio de développeur freelance en 5 minutes.  
> Importez vos projets GitHub, personnalisez, publiez."

---

## ✅ Features ACTIVES (V1 MVP)

| Feature | Statut | Priorité |
|---------|--------|----------|
| Auth (signup/login) | ✅ | P0 |
| 1 Portfolio par compte | ✅ | P0 |
| Data model `FreelanceDevProfile` | ✅ | P0 |
| Preset unique "Dev Freelance — Classic" | ✅ | P0 |
| Onboarding GitHub → Import → Publish | ✅ | P0 |
| 8 sections ordonnées (fixed) | ✅ | P0 |
| Renderer single-page optimisé | ✅ | P0 |
| Publication 1 clic (`slug.asap.cool`) | ✅ | P0 |
| Métriques d'activation | ✅ | P0 |
| Thème dark unique | ✅ | P1 |
| SEO basique | ✅ | P1 |
| Variables configurables (couleur, avatar) | ✅ | P1 |

---

## 🧊 Features GELÉES (jusqu'à validation business)

### Infrastructure & Architecture
- [ ] Multi-sites par compte
- [ ] Multi-pages par site
- [ ] Système de pages (beyond single-page)
- [ ] Custom domains
- [ ] Versioning/rollback

### Contenu & Customisation
- [ ] Éditeur WYSIWYG
- [ ] Réordonnancement des sections
- [ ] Ajout/suppression de sections
- [ ] Layouts multiples par section
- [ ] Thèmes multiples
- [ ] Mode light
- [ ] Polices personnalisées
- [ ] Animations avancées

### Element Types Legacy
Les types suivants sont archivés et masqués de l'UI :
- `experience` → Fusionné dans "About"
- `education` → Fusionné dans "About"  
- `testimonials` → Remplacé par "Proof"
- `pricing` → Non pertinent pour portfolio
- `faq` → Non pertinent pour portfolio
- `gallery` → Non pertinent pour portfolio
- `blog` → Phase 2
- `custom` → Trop flexible

### Presets Legacy
Tous les presets existants sont archivés avec le préfixe `[LEGACY]` :
- Portfolio Développeur (ancien)
- Portfolio Minimaliste
- Portfolio Freelance (ancien)

### Business & Monétisation
- [ ] Plans Team/Enterprise
- [ ] Marketplace de thèmes
- [ ] Marketplace d'extensions
- [ ] Abonnements (jusqu'à PMF)
- [ ] Facturation

### Extensions/Modules
- [ ] Module AI Generator
- [ ] Module Themes (selector)
- [ ] Tout module non-essentiel

---

## 📐 V1 Section Order (FIXED)

```
1. Hero        → Présentation + CTA principal
2. Services    → Ce que je fais (3-4 max)
3. Projects    → Portfolio (min 3 projets)
4. Process     → Comment je travaille (4 étapes)
5. Stack       → Technologies maîtrisées
6. Proof       → Témoignages + métriques
7. About       → Bio + parcours
8. Contact     → Email + réseaux sociaux
```

**⚠️ Ordre non modifiable jusqu'à validation business.**

---

## 📊 Métriques d'Activation

Un utilisateur est **activé** quand :

```typescript
activated = published 
         && hasMinProjects (≥3) 
         && ctaConfigured 
         && contactConfigured
```

### Funnel à tracker

```
Signup → GitHub Connect → Import Projects → Profile Review → Publish → Activated
```

### Events instrumentés
- `onboarding_started`
- `github_connected` / `github_skipped`
- `repos_imported`
- `profile_reviewed`
- `site_published`
- `onboarding_completed`

---

## 🚀 Happy Path (V1)

```
1. Signup
2. Create Portfolio (preset auto)
3. Connect GitHub
4. Select repos to import
5. Review imported projects
6. Edit profile (name, title, bio)
7. Preview
8. Publish
9. Share URL
```

**Temps cible**: < 5 minutes

---

## 🔐 Verrouillage V1

### Avant d'ajouter TOUTE feature :
1. ❓ Est-ce que ça améliore le funnel d'activation ?
2. ❓ Est-ce que c'est demandé par >3 users activés ?
3. ❓ Est-ce que ça peut attendre la Phase 2 ?

### Pour débloquer une feature gelée :
1. Atteindre 100 portfolios publiés
2. Atteindre 50% taux d'activation
3. Recevoir feedback utilisateur clair

---

## 📅 Timeline

| Phase | Objectif | Deadline |
|-------|----------|----------|
| V1 Alpha | MVP fonctionnel | 20 déc 2025 |
| V1 Beta | 20 beta testers | 27 déc 2025 |
| V1 Launch | 100 portfolios | 10 jan 2026 |
| V1.1 | Itérations feedback | Fév 2026 |
| V2 | Dégel features | Mars 2026 |

---

## 📁 Fichiers Clés

```
packages/shared/src/
├── freelance-profile.ts    # Data model canonique
├── types.ts                # ElementTypes simplifiés
└── constants.ts            # Layouts simplifiés

packages/renderers/src/
├── freelance-renderer.tsx  # Renderer V1 optimisé
└── renderers.tsx           # Renderers legacy (conservés)

apps/web/src/lib/api/
├── onboarding.ts           # Flow GitHub → Publish
└── metrics.ts              # Tracking activation

infra/migrations/
└── 20251217200000_v1_freelance_preset.sql
```

---

## ⚡ Rappel

> "Shipping beats perfection."
> 
> On valide le PMF avec le minimum. 
> On itère ensuite.
