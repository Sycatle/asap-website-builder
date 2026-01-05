# Vision & Modèle d'Affaires d'ASAP

**ASAP** = plateforme **SaaS centralisée** pour créateurs, entrepreneurs et agences. Une solution tout-en-un pour gérer leurs utilisateurs, clients, sites, modules, budgets tokens IA, quotas de stockage et facturation.

Ce document cadre :

- La **vision produit** (pas juste un website builder)
- Les **segments de marché**
- Le **business model** multi-produit
- La **monétisation**

---

## 1. Résumé exécutif

### Ce qu'est ASAP

ASAP n'est **pas** un simple générateur de websites. C'est une **plateforme multi-produits** avec :

- Un **dashboard central** pour gérer tout son écosystème
- Une **API Core** pour isoler et monétiser les ressources
- Des **modules** (produits) intégrés : Sites, IA, Analytics, Cloud Storage, etc.
- Un **système de quotas** : tokens IA limités, stockage limité, sites par utilisateur
- Une **facturation flexible** : freemium, usage-based, plans d'équipe

### Positionnement

> **Toutes les outils d'un créateur en un seul dashboard**

Plutôt que d'utiliser :
- Notion + Zapier pour automatiser
- Vercel pour héberger
- ChatGPT API + Anthropic pour l'IA
- Plausible ou Fathom pour les stats
- AWS S3 pour le stockage

Les utilisateurs ASAP ont **tout intégré, avec budgets partagés et gestion centralisée**.

---

## 2. Le problème

### Pour les indépendants & petites agences

- **Outils éparpillés** : 1 outil par besoin, coûts cumulatifs, pas de vue unifiée
- **Gestion budgets complex** : payer 5 services différents, perdre du temps à tracker
- **Escalade difficile** : ajouter un client = gérer manuellement sur 5 services
- **Manque d'intégration** : données en silos, pas d'automatisation centralisée

### Pour les entreprises

- **Gestion d'équipe** : pas de solution centralisée pour les besoins dev/créas
- **Conformité & isolation** : pas de séparation claire des données par client/projet
- **Coûts imprévisibles** : usage-based sur plusieurs services
- **Onboarding lent** : nouvelles personnes = setup manuel sur N outils

---

## 3. La solution ASAP

### 3.1. Un dashboard unifiéé

Les utilisateurs gèrent tout au même endroit :

```
┌─────────────────────────────────────────────────┐
│  Tableau de bord central ASAP                   │
│                                                 │
│  👥 Utilisateurs/Clients                        │
│     ├── Créer, inviter, gérer permissions      │
│     └── Assigner quotas et budgets             │
│                                                 │
│  📊 Sites & Websites                          │
│     ├── Créer, publier, personnaliser          │
│     └── Domaine, intégrations, modules         │
│                                                 │
│  🔧 Modules                                     │
│     ├── Activer/désactiver features            │
│     ├── Configurer par utilisateur/client      │
│     └── Budget et quotas par module             │
│                                                 │
│  🤖 Tokens IA                                   │
│     ├── Budget total et usage                  │
│     ├── Distribution par utilisateur            │
│     └── Alertes et projections                 │
│                                                 │
│  💾 Stockage Cloud                              │
│     ├── Quota global et per-client              │
│     ├── Gestion fichiers                        │
│     └── CDN et delivery                         │
│                                                 │
│  📈 Statistiques unifiées                       │
│     ├── Visites sites                           │
│     ├── Usage modules                           │
│     └── Coûts et ROI                            │
│                                                 │
│  💳 Facturation & Abonnement                    │
│     ├── Plan actuel et usage                   │
│     ├── Invoices                                │
│     └── Méthodes de paiement                   │
└─────────────────────────────────────────────────┘
       ↓ (API Core centralisée)
       
Core API + Database PostgreSQL
(Account isolation, RLS, isolé par account_id)
       ↓ (Consomment l'API)
Modules (Sites, IA, Analytics, Cloud, etc.)
```

### 3.2. Produits (Modules) intégrés

ASAP fournit une liste de **produits/modules** :

| Module | Description | Monétisation |
|--------|-------------|--------------|
| **Sites** | Créer/publier des sites rapides (GitHub import, custom domains) | Base (Free/Pro) |
| **IA** | Text gen, image gen, content optimization avec budget tokens | Usage-based |
| **Analytics** | Page views, user tracking, conversion, heatmaps | Pro/Team |
| **Cloud Storage** | File hosting, CDN, asset management | Usage-based |
| **Themes** | Pre-built designs, custom CSS | Free + Premium |
| **Intégrations** | GitHub, Zapier, API access | Core |
| **(Futurs modules)** | E-commerce, Forum, CMS, Marketplace | À définir |

**Point clé** : les sites ne sont qu'**1 produit parmi d'autres**. ASAP n'est pas un website builder, c'est un **ecosystem builder**.

### 3.3. Système de quotas & budgets

Chaque utilisateur/client a des **limites** gérées centralement :

| Ressource | Modèle |
|-----------|--------|
| **Tokens IA** | Budget mensuel (ex: 1M tokens/mois), partageable entre users |
| **Stockage Cloud** | Quota par tenant ou per-client (ex: 100GB/mois) |
| **Sites actifs** | Limite de sites par plan (Free: 1, Pro: 5, Team: unlimited) |
| **Utilisateurs** | Limite de sub-users par plan |
| **API calls** | Rate limiting par plan (Free: 100/min, Pro: 1K/min) |
| **Custom domains** | Inclus pour Pro+, payant en Free |

### 3.4. Architecture d'isolation par compte

- **Core API** = source de vérité pour toutes les données
- **Isolation account_id** sur toutes les tables sensibles
- **RLS (Row-Level Security)** au niveau base de données
- **Quotas vérifiés** avant chaque opération (token usage, storage, rate limits)
- **Event-driven** : les modules consomment les événements du Core

---

## 4. Segments de marché

### 4.1. Indépendants & Freelances (TAM initial)

**Profil** : Devs, designers, créateurs de contenu (1-5 clients chacun)

**Pain points** :
- Trop d'outils disparates (trop cher, trop complexe)
- Pas d'isolement client (données mélangées)
- Pas de suivi de revenu par client

**Proposition** :
- 1 dashboard pour gérer clients, sites, budgets IA
- Automatisation (GitHub sync, IA gen)
- Pricing simple et transparent

**Taille marché** : ~500K freelances tech en Europe, TAM = ~100M€/an avec ARPU de $200/an

### 4.2. Petites agences (SME)

**Profil** : Agences (2-20 personnes) vendant sites, contenu, services dev

**Pain points** :
- Gérer une équipe + clients sur plusieurs outils
- Pas de facturation intégrée
- Difficile de contrôler budgets/quotas par projet

**Proposition** :
- Multi-users avec permissions par rôle (admin, créa, dev, client)
- Facturation centralisée (passer coûts aux clients)
- Dashboards par utilisateur/projet

**Taille marché** : ~50K agences en France, TAM = ~500M€/an avec ARPU de $10K/an

### 4.3. Créateurs & Creators

**Profil** : Influencers, producteurs de contenu, streamers

**Pain points** :
- Besoin d'outils IA pour générer contenu rapidement
- Multiple channels (site, socials, email)
- Monétisation complex (sponsors, courses, merch)

**Proposition** :
- IA texts + images avec budget limité mais accessible
- Site de vente (produits digitaux, courses)
- Analytics unifiées (revenu, audience, engagement)

**Taille marché** : ~100K creators actifs, TAM = ~200M€/an avec ARPU de $2K/an

---

## 5. Proposition de valeur

### Pour les indépendants

> **Un seul outil pour tous les besoins. Payer une facture, pas 10.**

- ✅ Sites générés en minutes (GitHub auto-import)
- ✅ Budget IA partagé et visible
- ✅ Stockage cloud intégré (pas de S3 à manager)
- ✅ Stats unifiées (clients, usage, coûts)
- ✅ Isolation par client (leurs données ne se voient pas)
- ✅ Facturation centralisée (une facture pour tout)

### Pour les agences

> **Tableau de bord pour gérer l'équipe et les clients. Automatiser. Facturer.**

- ✅ Multi-utilisateurs avec contrôle d'accès (admin, lead, exécution)
- ✅ Gestion par projet (chaque client dans un silo)
- ✅ Facturation flexible : vendre sites, IA, stockage à vos clients
- ✅ Dashboards manager (KPIs, usage, coûts)
- ✅ Intégrations Zapier/API pour automatiser

### Pour les créateurs

> **Outils IA + sites de vente. Monétiser votre audience sans infra.**

- ✅ IA unlimited pour générer contenu rapidement
- ✅ Sites de vente clé-en-main (produits digitaux, courses)
- ✅ Analytics de revenu (qu'est-ce qui vend, qui clique)
- ✅ Pas d'infra à gérer, focus sur le contenu
- ✅ Intégrations avec Stripe, email, socials

---

## 6. Modèle de revenus

### 6.1. Plans SaaS

#### Free

- **Price** : 0€
- **Inclus** :
  - 1 site
  - Sous-domaine asap.cool
  - Thèmes de base
  - 0 tokens IA (IA is paid à l'usage)
  - 1GB cloud storage
  - Analytics basiques
  - 1 utilisateur seulement (pas d'invitations)
- **Objectif** : acquisition, product-market fit

#### Pro (pour indépendants)

- **Price** : 29€/mois
- **Inclus** :
  - 5 sites
  - 1 domaine custom (.com, .fr)
  - Tous les thèmes
  - 100K tokens IA/mois (sharable)
  - 50GB cloud storage
  - Analytics complets
  - 3 utilisateurs (inviter clients/collègues)
  - Support email prioritaire
- **Objectif** : monétiser les indépendants sérieux

#### Team (pour agences & créateurs)

- **Price** : 99€/mois
- **Inclus** :
  - Sites illimités
  - Domaines custom illimités
  - 500K tokens IA/mois
  - 500GB cloud storage
  - Analytics avancées
  - Utilisateurs illimités
  - Roles & permissions (admin, lead, exécution)
  - Webhooks & API access
  - Support prioritaire + Slack
- **Objectif** : capturing agences et creators à fort usage

### 6.2. Usage-based (en plus du plan)

Les utilisateurs payent la **consommation** en plus de leur plan :

| Ressource | Pricing |
|-----------|---------|
| **Tokens IA extra** | $0.0002 par token (après quota inclus) |
| **Stockage extra** | $0.05 par GB/mois (après quota) |
| **Domains custom supplémentaires** | $1/domaine/mois |
| **Advanced Analytics** | +$20/mois (inclus en Team) |
| **Priority Support** | +$50/mois (inclus en Pro+) |

### 6.3. Marketplace (futur)

- **Thèmes premium** : 70/30 split (ASAP 30%)
- **Composants/plugins** : 70/30 split
- **Services marketplace** : designers, devs → commission 15%

### 6.4. Enterprise & Self-hosted (B2B)

- **ASAP Core (open-source)** : gratuit avec source code complet
- **Enterprise License** : $10K-100K+ /an + support dédié
  - Self-hosted, clustering, monitoring, SLA
  - Custom features
  - Dedicated account manager

---

## 7. Stratégie d'acquisition

### Phases

#### Phase 1 : Indépendants & Étudiants (mois 1-6)

- **Partenariats éducatifs** : 3W Academy, Wildcode School → website tool officiel
- **GitHub** : Open-core ASAP Core sur GitHub → stars, contributions, viralité
- **Product Hunt** : lancer en public, teaser vidéo
- **Communities** : dev.to, IndieHackers, subreddits
- **Content** : blog "Comment créer un website en 5 min"

**Target** : 1000 utilisateurs Free, 50 utilisateurs Pro

#### Phase 2 : Petites agences (mois 6-12)

- **Direct outreach** : linkedIn, appels à agences web
- **B2B marketing** : podcasts dev, conférences
- **Case studies** : success stories d'agences utilisant ASAP
- **Partenariats** : Stripe, Vercel, Zapier

**Target** : 200 utilisateurs Team (= $200K MRR)

#### Phase 3 : Créateurs & Marketplace (mois 12+)

- **Creator economy** : sponsorships, influencer partnerships
- **Marketplace** : onboard designers/thèmes premium
- **Intégrations** : Gumroad, Lemonsqueezy, email providers

**Target** : 1000 utilisateurs Team + 500 pro + marketplace revenue

---

## 8. Pricing strategy

### Justification tarifaire

| Tier | Position | ARPU | LTV (36 mois) |
|------|----------|------|---------------|
| **Free** | Acquisition | 0€ | 0€ |
| **Pro** | Indépendants sérieux | 29€ | 1,000€ |
| **Team** | Agences, creators | 99€+ usage | 4,000€+ |
| **Enterprise** | B2B | 100€+/jour | 100K€+ |

### Stratégie

- **Free tier agressif** : produit-led growth, no credit card
- **Pro abordable** : $29 = 1-2 heures de travail freelance (pas cher)
- **Team premium** : $99 = ROI immédiat pour une agence (1 client = revenue)
- **Usage-based** : pas de surprise ("overage charges" dès le départ)

---

## 9. Métriques clés (OKRs)

### Q1-Q2 (Product/Market Fit)

- CAC (Customer Acquisition Cost) < $50
- LTV > 3x CAC
- MRR > $100K
- Churn < 5% (monthly)
- NPS > 50

### Q3-Q4 (Growth)

- MRR > $500K
- Team tier revenue > 60% total
- Marketplace revenue > $10K/mois
- Enterprise deals > 3

### Year 2

- MRR > $2M
- Multiple revenue streams > équilibre (SaaS 60%, Marketplace 20%, Enterprise 20%)
- International expansion (EU, US)

---

## 10. Conclusion

**ASAP n'est pas un website builder. C'est une plateforme SaaS multi-produit** avec :

- ✅ Dashboard central pour tout gérer
- ✅ Modules intégrés (Sites, IA, Analytics, etc.)
- ✅ Isolation multi-tenant et quotas
- ✅ Pricing flexible (freemium + usage-based)
- ✅ Marché large (indépendants, agences, creators)

Le **repositionnement clé** : plutôt que de vendre "un website en 5 min", on vend **"tous les outils d'un créateur en un seul dashboard"**.

Ça change la TAM, la proposition de valeur, et la stratégie d'acquisition. Mais techniquement, c'est exactement ce que nous construisons.
