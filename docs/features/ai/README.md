<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# ASAP AI Integration Documentation

> **Version**: 2.0  
> **Date**: Janvier 2026  
> **Status**: Draft

---

## 📚 Table des Documents

Ce dossier contient la documentation technique complète pour l'intégration AI dans ASAP.

| Document | Description | Audience |
|----------|-------------|----------|
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | Architecture technique, providers, infrastructure | Backend Devs |
| [02-FEATURES.md](./02-FEATURES.md) | Fonctionnalités AI (Tier 1, 2, 3) | Product/Devs |
| [03-API.md](./03-API.md) | API Design, endpoints, schemas, streaming | Full-stack |
| [04-SECURITY.md](./04-SECURITY.md) | Sécurité, privacy, rate limiting, pricing | DevOps/Backend |
| [05-UX.md](./05-UX.md) | Guidelines UX/UI, chat panel, inline AI | Frontend Devs |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | **Plan d'implémentation structuré** | Tech Lead |

---

## 🎯 Executive Summary

L'intégration d'une IA conversationnelle dans ASAP vise à transformer radicalement l'expérience de création de sites web. Au lieu d'interfaces traditionnelles point-and-click, les utilisateurs pourront :

- **Décrire** ce qu'ils veulent en langage naturel
- **Voir** les modifications en temps réel sur leur site
- **Itérer** par conversation jusqu'au résultat souhaité
- **Apprendre** les bonnes pratiques web via l'assistant

> "Créer un site web devrait être aussi simple qu'avoir une conversation."

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Astro)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  AI Chat Panel  ◄──────►  Studio Editor  ◄──────►  Live Preview            │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ SSE / WebSocket
                    ┌────────────────▼────────────────┐
                    │           API (Rust/Axum)        │
                    │  - AI Orchestrator               │
                    │  - Context Builder               │
                    │  - Action Executor               │
                    └────────────────┬────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
    ┌──────────┐              ┌──────────┐              ┌──────────┐
    │ OpenAI   │              │ Anthropic│              │ DALL-E 3 │
    │ GPT-4o   │              │ Claude   │              │ Images   │
    └──────────┘              └──────────┘              └──────────┘
```

---

## 📊 Décisions Clés

### Approche Hybrid pour les Composants

| Tier | Feature | Timeline |
|------|---------|----------|
| **Tier 1: No-Code** | 30+ sections prédéfinies, AI modifie les propriétés | V1 (maintenant) |
| **Tier 2: Element Library** | Save/reuse des configurations de sections (Pro) | V2 (Q2 2026) |
| **Tier 3: Code Blocks** | Custom HTML/CSS sandboxé (Business) | V3 (Q4 2026) |

### Pourquoi cette approche ?

1. **80/20 Rule** : 95% des utilisateurs n'ont pas besoin de code custom
2. **AI-First** : Le code custom rend l'AI moins efficace
3. **Maintenabilité** : Sections standard = bugs prévisibles
4. **Business Model** : L'Element Library devient un feature Pro

---

## 📈 Objectifs

### Business

| Objectif | Métrique | Target |
|----------|----------|--------|
| Réduire le temps de création | Temps moyen de création d'un site | **-60%** |
| Augmenter la rétention | Taux de rétention J30 | **+25%** |
| Différenciation marché | NPS score | **> 60** |
| Monétisation | Conversion Free → Pro via AI | **> 15%** |

### Technique

| Objectif | Target |
|----------|--------|
| Latence premier token | < 500ms |
| Uptime AI | 99.9% |
| Requêtes simultanées | 10k |
| Précision des actions | > 90% |

---

## 🚀 Phases d'Implémentation

```
Q1 2026                        Q2 2026                       Q3-Q4 2026
═══════════════════════        ═══════════════════════       ═══════════════════════

┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ Phase 1: Foundation │ ───── │ Phase 2: Sections   │ ───── │ Phase 4: Premium    │
│ (4 semaines)        │       │ Library (3 sem)     │       │ (Ongoing)           │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐       ┌─────────────────────┐
│ • core/ai module    │       │ Phase 3: Advanced   │
│ • Streaming SSE     │       │ (4 semaines)        │
│ • Actions system    │       │ • Image generation  │
│ • Undo/Redo         │       │ • Inline AI         │
└─────────────────────┘       └─────────────────────┘
```

**Voir [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) pour le détail complet.**

---

## 📖 Lecture Recommandée

1. **Nouveau sur le projet?** → Commencez par ce README puis [02-FEATURES.md](./02-FEATURES.md)
2. **Backend developer?** → [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) puis [03-API.md](./03-API.md)
3. **Frontend developer?** → [05-UX.md](./05-UX.md) puis [03-API.md](./03-API.md)
4. **Tech Lead?** → [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) directement

---

## 🔗 Ressources Externes

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [AI UX Best Practices - Google PAIR](https://pair.withgoogle.com)
- [OWASP AI Security Guidelines](https://owasp.org/www-project-machine-learning-security-top-10/)

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jan 2026 | Split en documents modulaires, ajout plan d'implémentation |
| 1.0 | Jan 2026 | Document initial monolithique |
