# Plan d'Action Révisé - ASAP v2

**Date:** 8 décembre 2025  
**Objectif:** Finaliser MVP utilisable avec frontend

---

## 🎯 Situation Actuelle

### ✅ Ce qui est FAIT
- **Backend complet** (Core API + Worker + Modules)
- **79 tests unitaires** passant
- **Optimisations avancées** (Redis, parallel processing, file storage)
- **4 migrations SQL** appliquées
- **Documentation technique** complète

### ❌ Ce qui MANQUE pour le MVP
- **Frontend Astro** (0% fait)
- **Tests E2E** (0% fait)
- **CI/CD** (0% fait)
- **Documentation utilisateur** (0% fait)

### 🔴 Blocage Critique
**Sans frontend, le projet n'est pas démontrable ni utilisable.** Toute la puissance du backend est inaccessible sans interface utilisateur.

---

## 📋 Plan d'Action Immédiat

### Sprint 1-2 (Semaines 1-2) : Frontend Core

**Objectif:** Pages publiques + authentification fonctionnelles

#### Jour 1-2 : Setup & Structure
```bash
# Initialiser Astro
cd apps/
npm create astro@latest web
cd web
npm install

# Installer dépendances
npm install -D tailwindcss @tailwindcss/typography @tailwindcss/forms
npx tailwindcss init

# Installer utilitaires
npm install axios zustand date-fns
```

**Fichiers à créer:**
```
apps/web/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts       # Wrapper fetch avec JWT
│   │   │   ├── auth.ts         # Signup, login, me
│   │   │   ├── portfolios.ts  # CRUD portfolios
│   │   │   └── files.ts        # Upload, list, delete
│   │   ├── store/
│   │   │   └── authStore.ts    # Zustand store pour auth
│   │   └── utils/
│   │       └── formatters.ts   # Helpers formatage
│   ├── components/
│   │   ├── Button.astro
│   │   ├── Input.astro
│   │   ├── Card.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── AppLayout.astro
│   └── pages/
│       └── index.astro         # Landing page
├── public/
│   └── assets/
├── astro.config.mjs
├── tailwind.config.cjs
└── tsconfig.json
```

**Checklist Jour 1-2:**
- [ ] Projet Astro initialisé
- [ ] Tailwind configuré
- [ ] Structure dossiers créée
- [ ] TypeScript configuré
- [ ] ESLint + Prettier setup

#### Jour 3-4 : Client API TypeScript

**Fichier: `src/lib/api/client.ts`**
```typescript
class APIClient {
  private baseURL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  
  async request(endpoint: string, options?: RequestInit) {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    
    return response.json();
  }
}
```

**Checklist Jour 3-4:**
- [ ] Client API avec gestion JWT
- [ ] Méthodes auth (signup, login, me)
- [ ] Méthodes portfolios (CRUD)
- [ ] Méthodes files (upload, list, delete)
- [ ] Gestion erreurs HTTP
- [ ] Types TypeScript complets

#### Jour 5-7 : Pages Publiques

**Fichier: `src/pages/index.astro`**
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Button from '../components/Button.astro';
---

<BaseLayout title="ASAP - Portfolio en 5 minutes">
  <section class="hero">
    <h1>Créez votre portfolio professionnel en 5 minutes</h1>
    <p>Importez vos projets GitHub, publiez, c'est fait.</p>
    <Button href="/signup">Commencer gratuitement</Button>
  </section>
  
  <section class="features">
    <!-- Features grid -->
  </section>
</BaseLayout>
```

**Fichier: `src/pages/[slug].astro`**
```astro
---
import { getPublicPortfolio } from '../lib/api/portfolios';

const { slug } = Astro.params;
const portfolio = await getPublicPortfolio(slug);
---

<div class="portfolio">
  <header>
    <h1>{portfolio.title}</h1>
    <p>{portfolio.tagline}</p>
  </header>
  
  <section class="projects">
    {portfolio.data.projects.map(project => (
      <ProjectCard project={project} />
    ))}
  </section>
</div>
```

**Checklist Jour 5-7:**
- [ ] Landing page avec hero + features
- [ ] Page portfolio public ([slug])
- [ ] SSG avec getStaticPaths
- [ ] Design responsive
- [ ] SEO meta tags

#### Jour 8-10 : Authentification

**Fichier: `src/pages/signup.astro`**
```astro
---
import AuthLayout from '../layouts/AuthLayout.astro';
---

<AuthLayout title="Inscription">
  <form id="signup-form">
    <Input type="email" name="email" label="Email" />
    <Input type="password" name="password" label="Mot de passe" />
    <Input type="text" name="slug" label="Slug portfolio" />
    <Button type="submit">Créer mon compte</Button>
  </form>
  
  <script>
    // Handle form submit avec API
    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      // ... API call
    });
  </script>
</AuthLayout>
```

**Checklist Jour 8-10:**
- [ ] Page signup avec formulaire
- [ ] Page login avec formulaire
- [ ] Validation côté client
- [ ] Gestion erreurs UI
- [ ] Redirection après login
- [ ] JWT storage (localStorage)

#### Jour 11-14 : Dashboard (Core)

**Fichier: `src/pages/app/dashboard.astro`**
```astro
---
import AppLayout from '../../layouts/AppLayout.astro';
import { getMe } from '../../lib/api/auth';
import { getPortfolio } from '../../lib/api/portfolios';

// Auth guard
const token = Astro.cookies.get('auth_token');
if (!token) return Astro.redirect('/login');

const user = await getMe();
const portfolio = await getPortfolio(user.portfolio_id);
---

<AppLayout user={user}>
  <div class="dashboard">
    <aside class="sidebar">
      <nav>
        <a href="/app/dashboard">Dashboard</a>
        <a href="/app/portfolio">Mon Portfolio</a>
        <a href="/app/files">Fichiers</a>
        <a href="/app/settings">Paramètres</a>
      </nav>
    </aside>
    
    <main class="content">
      <h1>Bienvenue {user.email}</h1>
      
      <div class="stats">
        <Card title="Portfolio" value={portfolio.status} />
        <Card title="Fichiers" value={`${files.length} / 100`} />
        <Card title="Quota" value={`${quota.used} / ${quota.total}`} />
      </div>
      
      <div class="quick-actions">
        <Button href="/app/portfolio">Éditer Portfolio</Button>
        <Button href={`/${portfolio.slug}`}>Voir Public</Button>
      </div>
    </main>
  </div>
</AppLayout>
```

**Checklist Jour 11-14:**
- [ ] Layout dashboard avec sidebar
- [ ] Stats overview (quotas, fichiers)
- [ ] Navigation entre sections
- [ ] Quick actions
- [ ] Auth guard pour routes privées

---

### Sprint 3 (Semaine 3) : Dashboard Complet

#### Jour 15-17 : Gestion Portfolio

**Fichier: `src/pages/app/portfolio.astro`**
```astro
<form id="portfolio-form">
  <Input name="title" label="Titre" value={portfolio.title} />
  <Input name="tagline" label="Tagline" value={portfolio.tagline} />
  <Input name="github_username" label="GitHub Username" />
  
  <Button type="button" id="generate-btn">
    Générer depuis GitHub
  </Button>
  
  <Button type="submit">Sauvegarder</Button>
  
  <Button type="button" id="publish-btn" variant="primary">
    Publier Portfolio
  </Button>
</form>

<div class="preview">
  <iframe src={`/preview/${portfolio.slug}`}></iframe>
</div>
```

**Checklist Jour 15-17:**
- [ ] Formulaire édition portfolio
- [ ] Configuration GitHub username
- [ ] Bouton génération avec loading
- [ ] Bouton publication avec confirmation
- [ ] Preview iframe

#### Jour 18-19 : Gestion Fichiers

**Fichier: `src/pages/app/files.astro`**
```astro
<div class="files">
  <div class="upload-zone">
    <input type="file" id="file-input" multiple />
    <Button>Upload Fichiers</Button>
  </div>
  
  <div class="quota-bar">
    <ProgressBar value={quota.used} max={quota.total} />
    <span>{formatBytes(quota.used)} / {formatBytes(quota.total)}</span>
  </div>
  
  <div class="file-list">
    {files.map(file => (
      <FileCard file={file} onDelete={handleDelete} />
    ))}
  </div>
</div>
```

**Checklist Jour 18-19:**
- [ ] Upload zone avec drag & drop
- [ ] Progress bar upload
- [ ] Liste fichiers avec preview
- [ ] Delete fichier avec confirmation
- [ ] Quota usage visuel

#### Jour 20-21 : Polish & Responsive

**Checklist Jour 20-21:**
- [ ] Design mobile optimisé
- [ ] Animations transitions (fade, slide)
- [ ] Loading states partout
- [ ] Error states avec messages clairs
- [ ] Toast notifications
- [ ] Accessibility (aria labels, keyboard nav)

---

### Sprint 4 (Semaine 4) : Tests & CI/CD

#### Jour 22-24 : Tests E2E

**Fichier: `tests/e2e/signup.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test('user can signup and access dashboard', async ({ page }) => {
  await page.goto('/signup');
  
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.fill('[name="slug"]', 'test-user');
  
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/app/dashboard');
  await expect(page.locator('h1')).toContainText('Bienvenue');
});
```

**Checklist Jour 22-24:**
- [ ] Setup Playwright
- [ ] Test signup → dashboard
- [ ] Test configure GitHub → generate
- [ ] Test publish → public access
- [ ] Test file upload → quota
- [ ] Test isolation multi-tenant

#### Jour 25-26 : CI/CD

**Fichier: `.github/workflows/test.yml`**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: cargo test
  
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
```

**Checklist Jour 25-26:**
- [ ] GitHub Actions tests automatiques
- [ ] Build Docker images
- [ ] Deploy staging automatique
- [ ] Deploy production sur tag

#### Jour 27-28 : Documentation & Déploiement

**Checklist Jour 27-28:**
- [ ] Guide démarrage utilisateur
- [ ] Vidéo démo (Loom)
- [ ] Documentation API (OpenAPI)
- [ ] Deploy production initial
- [ ] Monitoring setup (Sentry)
- [ ] Analytics setup (Plausible)

---

## 🎯 Définition of Done - MVP

### Critères Techniques
- [x] Backend API complet et testé
- [x] Worker traite événements
- [x] 79 tests unitaires passent
- [ ] Frontend déployé et accessible
- [ ] 20+ tests E2E passent
- [ ] CI/CD fonctionnel
- [ ] Monitoring actif

### Critères Fonctionnels
- [ ] Utilisateur peut s'inscrire via web
- [ ] Utilisateur peut se connecter via web
- [ ] Utilisateur peut configurer GitHub
- [ ] Portfolio généré automatiquement
- [ ] Portfolio publié visible publiquement
- [ ] Upload fichiers fonctionne
- [ ] Quotas affichés correctement

### Critères Qualité
- [ ] Design responsive (mobile + desktop)
- [ ] Performance (LCP < 2.5s, FID < 100ms)
- [ ] Accessibilité (WCAG AA)
- [ ] SEO (meta tags, sitemap)
- [ ] Error handling (messages clairs)

---

## 📊 Métriques de Suivi

### Hebdomadaires
- [ ] Pages complétées / total
- [ ] Tests E2E passants / total
- [ ] Bugs critiques ouverts
- [ ] Performance metrics (Lighthouse)

### Quotidiennes (Stand-up)
- Qu'ai-je fait hier ?
- Que vais-je faire aujourd'hui ?
- Quels blocages ?

---

## 🚨 Risques Identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Retard Frontend | Moyenne | 🔴 Critique | Réduire scope, focus MVP strict |
| Tests E2E fragiles | Haute | 🟡 Moyen | Fixtures stables, retry logic |
| Problèmes déploiement | Moyenne | 🟡 Moyen | Test staging rigoureux |
| Scope creep | Haute | 🔴 Critique | **Dire NON à nouvelles features** |

---

## ✅ Prochaines Actions Immédiates

### Aujourd'hui
1. ✅ Créer analyse codebase (FAIT)
2. ✅ Mettre à jour documentation (FAIT)
3. [ ] **Initialiser projet Astro dans apps/web/**
4. [ ] Configurer Tailwind CSS
5. [ ] Créer structure dossiers

### Cette Semaine
- [ ] Landing page complète
- [ ] Page portfolio public
- [ ] Pages signup/login
- [ ] Client API TypeScript

### Prochain Sprint
- [ ] Dashboard complet
- [ ] Gestion fichiers
- [ ] Tests E2E
- [ ] CI/CD

---

## 💡 Conseils d'Exécution

### À FAIRE ✅
1. **Focus laser sur frontend** - Rien d'autre
2. **MVP minimal** - Fonctionnalités essentielles uniquement
3. **Tests au fur et à mesure** - Pas à la fin
4. **Deploy early** - Staging dès semaine 2
5. **Demos hebdo** - Valider direction

### À NE PAS FAIRE ❌
1. ❌ Ajouter nouvelles features backend
2. ❌ Optimiser ce qui fonctionne déjà
3. ❌ Refactoriser sans raison
4. ❌ Perfectionnisme design (MVP d'abord)
5. ❌ Features "nice to have"

---

## 📝 Conclusion

**Timeline réaliste:** 4 semaines pour MVP complet

**Effort requis:** Focus temps plein sur frontend

**Succès assuré si:**
- Discipline stricte (pas de scope creep)
- Frontend avant tout
- Tests continus
- Démos régulières

**Le backend est prêt. C'est l'heure du frontend ! 🚀**

---

**Auteur:** Analyse Copilot  
**Date:** 8 décembre 2025  
**Version:** 1.0
