# Spécification fonctionnelle du MVP

## Objectif du MVP

Permettre à un développeur ou étudiant de générer et publier un portfolio professionnel en **moins de 5 minutes** en utilisant son compte GitHub, avec un nombre minimal de champs obligatoires.

> **Important :** Le MVP se concentre uniquement sur le **CORE**. Les fonctionnalités viennent des **MODULES**.

---

## Portée du Core MVP

Le core expose :

- ✅ **Authentification** : signup, login, JWT
- ✅ **Gestion utilisateurs** : profil, email, password
- ✅ **Gestion data utilisateur** : intégrations (GitHub username, tokens)
- ✅ **Gestion portfolios** : structure (slug, title, tagline, status)
- ✅ **Événements** : publication et système d'événements pour modules
- ✅ **Multi-tenant** : isolation parfaite par tenant_id
- ✅ **Module registry** : enregistrement et gestion des modules

---

## Portée des Modules MVP

Les modules fournis avec le MVP :

### Module GitHub Generator

- Récupère le `github_username` du `user_data` via Core API
- Appelle GitHub API
- Transforme les repos en contenu structuré
- Stocke dans `portfolio_data` (JSONB)

### Module Default Theme

- Lit `portfolio_data` depuis Core
- Applique le thème par défaut
- Génère `data/sites/<slug>.json`

---

## Données du portfolio (Core)

Le core gère la **structure** du portfolio :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `UUID` | Identifiant unique du portfolio |
| `tenant_id` | `UUID` | Tenant propriétaire |
| `slug` | `string` | URL-friendly slug |
| `title` | `string` | Titre (ex. "John Doe") |
| `tagline` | `string` | Sous-titre (ex. "Full-Stack Dev") |
| `status` | `enum` | draft \| published |
| `metadata` | `JSONB` | SEO, settings générales |
| `portfolio_data` | `JSONB` | **Contenu généré par les modules** |

Le **contenu** du portfolio vit dans `portfolio_data` et est gén

éré par les modules.

---

## Données utilisateur (Core)

Le core centralise les données utilisateur :

| Champ | Stockage | Description |
|-------|----------|-------------|
| `email` | `users.email` | Email unique |
| `password` | `users.password_hash` | Hash sécurisé |
| `integrations` | `user_data.data.integrations` | GitHub username, tokens, etc. |
| `preferences` | `user_data.data.preferences` | Modules activés, thème préféré, etc. |

**Les modules lisent ces données dynamiquement** via les endpoints du Core.

---

## Contraintes MVP

- ❌ Pas de personnalisation CSS avancée (vient du module Theme)
- ❌ Pas de multi-langues
- ❌ Pas de plusieurs portfolios par tenant
- ❌ Pas de commerce/Stripe
- ❌ Pas d'analytics avancées

---

## Flux MVP

```
1. User signup → Core crée user, tenant, portfolio
2. User configure GitHub → Core stocke dans user_data
3. Frontend déclenche GitHubGenerator module
4. GitHubGenerator lit user_data du Core
5. GitHubGenerator remplit portfolio_data
6. Frontend déclenche Theme module
7. Theme module génère projection
8. User voit le portfolio public
```

---

## Hors scope MVP

- Gestion de plusieurs portfolios par user
- Thèmes avancés personnalisés
- Blog ou pages supplémentaires
- Générateur IA
- Analytics et mesures de trafic
- Marketplace de composants
