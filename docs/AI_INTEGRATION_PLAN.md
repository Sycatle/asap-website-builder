# Plan d'Intégration AI - ASAP Platform

> **Basé sur**: docs/ai/*.md  
> **Date**: 9 janvier 2026  
> **Durée estimée**: ~11 semaines

---

## 📋 Vue d'Ensemble

L'intégration AI transforme ASAP en éditeur de sites "conversationnel" où les utilisateurs décrivent leurs besoins en langage naturel et voient les modifications en temps réel.

```
Timeline:
═════════════════════════════════════════════════════════════════════════════
Phase 1 (4 sem)     Phase 2 (3 sem)      Phase 3 (4 sem)      Phase 4
────────────────    ────────────────     ────────────────     ────────────
Backend + Actions   Sections Library     Advanced Features    Premium
                                                              (ongoing)
═════════════════════════════════════════════════════════════════════════════
```

---

## 🔧 Pré-requis

### Dépendances à installer

```toml
# core/ai/Cargo.toml
[dependencies]
async-openai = "0.18"
reqwest = { version = "0.11", features = ["json", "stream"] }
tokio-stream = "0.1"
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
```

### Clés API nécessaires

- `OPENAI_API_KEY` - GPT-4o, DALL-E 3, Whisper
- `ANTHROPIC_API_KEY` - Claude 3.5 Sonnet (fallback)

---

## Phase 1: Foundation (4 semaines)

### 📦 Step 1.1: Créer le module `core/ai`

**Durée**: 2 jours  
**Fichiers à créer**:

```
core/ai/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── config.rs           # Configuration providers
│   ├── types.rs            # AIRequest, AIResponse, AIAction
│   ├── orchestrator.rs     # AI Orchestrator principal
│   ├── context.rs          # Context Builder
│   └── providers/
│       ├── mod.rs
│       ├── traits.rs       # AIProvider trait
│       ├── openai.rs       # OpenAI implementation
│       └── anthropic.rs    # Anthropic implementation
```

**Tâches**:
- [ ] Initialiser le crate avec `cargo new --lib core/ai`
- [ ] Définir le trait `AIProvider` avec méthodes `chat()` et `chat_stream()`
- [ ] Définir les types de base (`AIRequest`, `AIResponse`, `AIAction`)
- [ ] Ajouter au workspace Cargo.toml

---

### 📦 Step 1.2: Implémenter les Providers

**Durée**: 3 jours

#### OpenAI Provider

```rust
// core/ai/src/providers/openai.rs
pub struct OpenAIProvider {
    client: reqwest::Client,
    api_key: String,
    model: String, // gpt-4o par défaut
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn chat(&self, messages: Vec<Message>) -> Result<AIResponse>;
    async fn chat_stream(&self, messages: Vec<Message>) -> Result<impl Stream<Item = String>>;
    async fn generate_image(&self, prompt: &str) -> Result<Vec<ImageResult>>;
}
```

#### Anthropic Provider (fallback)

```rust
// core/ai/src/providers/anthropic.rs
pub struct AnthropicProvider {
    client: reqwest::Client,
    api_key: String,
    model: String, // claude-3-5-sonnet
}
```

**Tâches**:
- [ ] Implémenter OpenAI chat completions
- [ ] Implémenter OpenAI streaming (SSE parsing)
- [ ] Implémenter Anthropic comme fallback
- [ ] Écrire tests unitaires avec mocks

---

### 📦 Step 1.3: Model Router & Rate Limiting

**Durée**: 2 jours

```rust
// core/ai/src/router.rs
pub struct ModelRouter {
    providers: HashMap<String, Box<dyn AIProvider>>,
    fallback_chain: Vec<String>,
}

impl ModelRouter {
    pub async fn route(&self, request: AIRequest) -> Result<AIResponse> {
        // Try primary, fallback on error
    }
}
```

#### Rate Limiting Redis

```rust
// core/ai/src/rate_limiter.rs
pub struct AIRateLimiter {
    redis: RedisPool,
}

impl AIRateLimiter {
    pub async fn check_limit(&self, account_id: Uuid, plan: Plan) -> Result<bool>;
    pub async fn consume(&self, account_id: Uuid) -> Result<()>;
}
```

**Limites par plan**:
| Plan | Messages/jour | Images/mois |
|------|---------------|-------------|
| Free | 20 | 5 |
| Pro | 200 | 50 |
| Business | 1000 | 200 |

**Tâches**:
- [ ] Créer ModelRouter avec fallback chain
- [ ] Implémenter rate limiting Redis
- [ ] Ajouter headers `X-RateLimit-*` aux réponses

---

### 📦 Step 1.4: API Endpoint SSE

**Durée**: 3 jours  
**Fichier**: `apps/api/src/routes/ai.rs`

```rust
// POST /api/v1/ai/chat/stream
pub async fn chat_stream(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<AIChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // 1. Vérifier rate limit
    // 2. Build context
    // 3. Stream response
}
```

**Types de requête/réponse**:

```typescript
// Request
interface AIChatRequest {
    website_id: string;
    message: string;
    conversation_id?: string;
}

// SSE Events
type SSEEvent = 
    | { type: 'token', data: string }
    | { type: 'action', data: AIAction }
    | { type: 'done', data: null }
    | { type: 'error', data: ErrorData };
```

**Tâches**:
- [ ] Créer route `/api/v1/ai/chat/stream`
- [ ] Créer route `/api/v1/ai/chat` (non-streaming)
- [ ] Implémenter SSE avec keep-alive
- [ ] Ajouter middleware auth + rate limit
- [ ] Documenter dans OpenAPI

---

### 📦 Step 1.5: Context Builder

**Durée**: 2 jours

Le Context Builder injecte le contexte du site dans le prompt AI.

```rust
// core/ai/src/context.rs
pub struct ContextBuilder;

impl ContextBuilder {
    pub async fn build(
        &self,
        website_id: Uuid,
        pool: &PgPool,
    ) -> Result<WebsiteContext> {
        // 1. Charger website metadata
        // 2. Charger sections + leurs schemas
        // 3. Charger theme settings
        // 4. Charger collections (repos GitHub, etc.)
        // 5. Formater en contexte AI
    }
}
```

**Structure du contexte**:

```json
{
    "website": {
        "slug": "mario-restaurant",
        "title": "Chez Mario",
        "preset": "restaurant"
    },
    "sections": [
        {
            "id": "abc123",
            "type": "hero",
            "variant": "centered",
            "properties": {
                "headline": "Bienvenue chez Mario",
                "subheadline": "Cuisine italienne authentique"
            },
            "schema": { /* PropertySchema */ }
        }
    ],
    "theme": {
        "primaryColor": "#10B981",
        "font": "Inter"
    },
    "available_section_types": ["hero", "features", "pricing", "faq", ...]
}
```

**Tâches**:
- [ ] Créer ContextBuilder
- [ ] Injecter les PropertySchemas des sections
- [ ] Optimiser pour rester sous 16k tokens (Pro) / 4k (Free)
- [ ] Tests avec différentes tailles de sites

---

### 📦 Step 1.6: Actions System

**Durée**: 4 jours

#### Types d'actions AI

```typescript
type AIAction =
    | { type: 'UPDATE_SECTION_PROPERTY'; sectionId: string; property: string; value: unknown }
    | { type: 'ADD_SECTION'; sectionType: string; position: number; properties?: object }
    | { type: 'REMOVE_SECTION'; sectionId: string }
    | { type: 'REORDER_SECTIONS'; order: string[] }
    | { type: 'UPDATE_THEME'; changes: object }
    | { type: 'CHANGE_VARIANT'; sectionId: string; variant: string };
```

#### Action Parser

```rust
// core/ai/src/actions/parser.rs
pub struct ActionParser;

impl ActionParser {
    pub fn extract_actions(response: &str) -> Vec<AIAction> {
        // Parse JSON actions from AI response
        // Validate against section schemas
    }
}
```

#### Action Executor (Backend)

```rust
// core/ai/src/actions/executor.rs
pub struct ActionExecutor;

impl ActionExecutor {
    pub async fn execute(
        &self,
        action: AIAction,
        website_id: Uuid,
        pool: &PgPool,
    ) -> Result<()> {
        match action {
            AIAction::UpdateSectionProperty { section_id, property, value } => {
                // Update website_sections table
            }
            AIAction::AddSection { section_type, position, properties } => {
                // Insert new section
            }
            // ...
        }
    }
}
```

**Tâches**:
- [ ] Définir tous les types AIAction
- [ ] Créer ActionParser avec validation schema
- [ ] Créer ActionExecutor pour chaque type d'action
- [ ] Tests unitaires pour chaque action

---

### 📦 Step 1.7: Frontend - Chat Panel

**Durée**: 4 jours  
**Fichiers**: `apps/web/src/components/features/ai/`

```
ai/
├── index.ts
├── ChatPanel.tsx           # Panel principal
├── ChatMessage.tsx         # Bulle de message
├── ChatInput.tsx           # Input avec envoi
├── ActionCard.tsx          # Affichage des actions
├── QuickActions.tsx        # Boutons rapides
├── hooks/
│   ├── useAIChat.ts        # Hook principal
│   └── useActionExecutor.ts
└── stores/
    └── chatStore.ts        # État conversation
```

#### Hook useAIChat

```typescript
// hooks/useAIChat.ts
export function useAIChat(websiteId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    
    const sendMessage = async (content: string) => {
        // 1. Add user message
        // 2. Create EventSource for SSE
        // 3. Process streaming tokens
        // 4. Execute actions received
        // 5. Handle errors
    };
    
    return { messages, sendMessage, isStreaming, stopGeneration };
}
```

#### Action Executor (Frontend)

```typescript
// hooks/useActionExecutor.ts
export function useActionExecutor() {
    const applyAction = async (action: AIAction) => {
        switch (action.type) {
            case 'UPDATE_SECTION_PROPERTY':
                // Update section in store
                // Trigger preview refresh
                break;
            case 'ADD_SECTION':
                // Add section via API
                break;
            // ...
        }
    };
    
    return { applyAction };
}
```

**Tâches**:
- [ ] Créer ChatPanel avec layout (header, messages, input)
- [ ] Implémenter streaming SSE dans useAIChat
- [ ] Créer ActionCard pour afficher les modifications
- [ ] Implémenter undo/redo (Cmd+Z / Cmd+Shift+Z)
- [ ] Ajouter raccourci Cmd+J pour ouvrir/fermer le panel
- [ ] Tests composants

---

### ✅ Checkpoint Phase 1

**Critères de validation**:
- [ ] Envoyer "Change le titre en 'Bienvenue'" → titre modifié en streaming
- [ ] Rate limit atteint → message d'erreur clair
- [ ] Undo/Redo fonctionne
- [ ] Preview se rafraîchit après action

---

## Phase 2: Sections Library (3 semaines)

### 📦 Step 2.1: Nouvelles Sections

**Durée**: 2 semaines

| Section | Variantes | Priorité |
|---------|-----------|----------|
| `content` | text-left, text-right, text-center | P0 |
| `about` | simple, with-image, timeline, team | P0 |
| `faq` | accordion, grid, simple | P1 |
| `contact` | form, info, map | P1 |
| `gallery` | grid, masonry, carousel | P1 |
| `stats` | numbers, progress, icons | P1 |
| `logos` | grid, carousel, marquee | P1 |

**Pour chaque section**:
1. Définir PropertySchema dans `@asap/shared`
2. Créer composant dans `@asap/renderers`
3. Créer property editor dans Studio
4. Ajouter variantes
5. Tests visuels

---

### 📦 Step 2.2: Système de Variantes

**Durée**: 3 jours

```typescript
// @asap/shared/src/schemas/hero.ts
export const HERO_SCHEMA: PropertySchema = {
    type: 'hero',
    variants: ['centered', 'split', 'video-background', 'minimal'],
    properties: {
        headline: { type: 'text', maxLength: 100 },
        subheadline: { type: 'text', maxLength: 200 },
        cta_text: { type: 'text' },
        cta_url: { type: 'url' },
        // Properties conditionnelles par variante
        background_video: { 
            type: 'url', 
            showWhen: { variant: 'video-background' } 
        },
    }
};
```

**Tâches**:
- [ ] Ajouter `variants` aux schemas existants
- [ ] Créer Variant Picker UI dans Studio
- [ ] AI peut suggérer/changer de variante
- [ ] Migration données existantes

---

### 📦 Step 2.3: Element Templates

**Durée**: 4 jours

Permet aux utilisateurs Pro de sauvegarder des configurations de sections.

```sql
-- Migration: element_templates
CREATE TABLE element_templates (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    section_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    properties JSONB NOT NULL,
    variant VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tâches**:
- [ ] Migration table element_templates
- [ ] API CRUD templates
- [ ] UI "Save as Template" dans Studio
- [ ] UI bibliothèque de templates utilisateur

---

### ✅ Checkpoint Phase 2

**Critères de validation**:
- [ ] 8+ nouveaux types de sections disponibles
- [ ] Chaque section a au moins 3 variantes
- [ ] AI peut ajouter/modifier toutes les nouvelles sections
- [ ] Templates sauvegardables (Pro)

---

## Phase 3: Advanced Features (4 semaines)

### 📦 Step 3.1: Génération d'Images

**Durée**: 1 semaine

```rust
// POST /api/v1/ai/generate/image
pub async fn generate_image(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<ImageGenRequest>,
) -> Result<Json<ImageGenResponse>> {
    // 1. Check rate limit (images/month)
    // 2. Call DALL-E 3
    // 3. Upload to storage
    // 4. Return URL
}
```

**Request/Response**:

```typescript
interface ImageGenRequest {
    prompt: string;
    style?: 'natural' | 'vivid';
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    count?: number; // 1-4
}

interface ImageGenResponse {
    images: Array<{
        url: string;
        revised_prompt: string;
    }>;
}
```

**Tâches**:
- [ ] Endpoint génération d'images
- [ ] Intégration DALL-E 3
- [ ] Upload vers storage (S3/R2)
- [ ] UI sélection d'image générée
- [ ] Rate limiting images/mois

---

### 📦 Step 3.2: Inline AI (Studio)

**Durée**: 1 semaine

AI accessible directement sur les éléments du Studio.

```
┌─────────────────────────────────────────────┐
│ [Section Hero]                              │
│ ┌─────────────────────────────────────────┐ │
│ │     Bienvenue chez Mario    [✨ AI]     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│         ┌─────────────────────┐             │
│         │ 🪄 Améliorer        │             │
│         │ 📝 Réécrire         │             │
│         │ 🌍 Traduire         │             │
│         │ ✂️ Raccourcir       │             │
│         └─────────────────────┘             │
└─────────────────────────────────────────────┘
```

**Actions inline**:
- Améliorer le texte
- Réécrire différemment
- Traduire
- Raccourcir / Développer
- Corriger grammaire
- Changer de ton (formel/décontracté)

**Tâches**:
- [ ] Menu contextuel sur sélection texte
- [ ] Endpoint `/api/v1/ai/transform/text`
- [ ] Preview avant/après
- [ ] Raccourcis clavier

---

### 📦 Step 3.3: AI Website Analyzer (Pro)

**Durée**: 1 semaine

```typescript
interface AnalysisResult {
    overall_score: number; // 0-100
    categories: {
        design: { score: number; issues: Issue[] };
        content: { score: number; issues: Issue[] };
        seo: { score: number; issues: Issue[] };
        performance: { score: number; issues: Issue[] };
        accessibility: { score: number; issues: Issue[] };
    };
    recommendations: Recommendation[];
}
```

**Tâches**:
- [ ] Endpoint `/api/v1/ai/analyze/website`
- [ ] Analyse design (couleurs, typo, espacements)
- [ ] Analyse SEO (meta, headings, alt text)
- [ ] Analyse accessibilité basique
- [ ] UI affichage score + recommandations

---

### 📦 Step 3.4: Suggestions Proactives

**Durée**: 4 jours

L'AI suggère des améliorations automatiquement.

```typescript
// GET /api/v1/ai/suggestions?website_id=xxx
interface Suggestion {
    id: string;
    type: 'improvement' | 'content' | 'design' | 'seo';
    title: string;
    description: string;
    action?: AIAction; // Action à exécuter si acceptée
    priority: 'low' | 'medium' | 'high';
}
```

**Types de suggestions**:
- Section manquante (ex: "Ajoutez une FAQ")
- Contenu à améliorer
- SEO (meta description manquante)
- Design (contraste insuffisant)

**Tâches**:
- [ ] Endpoint suggestions
- [ ] Algorithme de détection des améliorations
- [ ] UI cards de suggestions dans le chat
- [ ] Cache Redis pour éviter recalculs

---

### ✅ Checkpoint Phase 3

**Critères de validation**:
- [ ] Génération d'images fonctionne
- [ ] Inline AI sur textes sélectionnés
- [ ] Analyzer donne un score cohérent
- [ ] Suggestions pertinentes affichées

---

## Phase 4: Premium Features (Ongoing)

### Features Business

| Feature | Description | Priorité |
|---------|-------------|----------|
| **Voice Input** | Transcription Whisper | P2 |
| **A/B Testing AI** | Test de variantes | P3 |
| **Competitor Analysis** | Analyse concurrents | P3 |
| **Custom Prompts** | Personnalisation du comportement AI | P2 |

---

## 🔒 Sécurité

### Checklist Sécurité

- [ ] **PII Detection**: Masquer emails, téléphones avant envoi AI
- [ ] **Content Filtering**: Bloquer contenu inapproprié
- [ ] **Rate Limiting**: Implémenter par plan
- [ ] **Audit Logging**: Logger toutes les requêtes AI (sans contenu)
- [ ] **Cost Protection**: Cap journalier par user ($5)

### Headers de Sécurité

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 156
X-RateLimit-Reset: 1704844800
```

---

## 📊 Métriques à Tracker

| Métrique | Description | Target |
|----------|-------------|--------|
| Time to First Token | Latence initiale | < 500ms |
| Action Success Rate | Actions AI réussies | > 90% |
| Messages per Session | Engagement | > 5 |
| Undo Rate | Taux d'annulation | < 20% |
| Conversion Free→Pro | Via features AI | > 15% |

---

## 📁 Structure Finale des Fichiers

```
core/ai/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── config.rs
│   ├── types.rs
│   ├── orchestrator.rs
│   ├── context.rs
│   ├── rate_limiter.rs
│   ├── router.rs
│   ├── providers/
│   │   ├── mod.rs
│   │   ├── traits.rs
│   │   ├── openai.rs
│   │   └── anthropic.rs
│   └── actions/
│       ├── mod.rs
│       ├── parser.rs
│       ├── executor.rs
│       └── types.rs

apps/api/src/routes/
├── ai.rs                   # Routes AI

apps/web/src/components/features/ai/
├── index.ts
├── ChatPanel.tsx
├── ChatMessage.tsx
├── ChatInput.tsx
├── ActionCard.tsx
├── QuickActions.tsx
├── InlineAIMenu.tsx
├── SuggestionCard.tsx
├── hooks/
│   ├── useAIChat.ts
│   └── useActionExecutor.ts
└── stores/
    └── chatStore.ts
```

---

## 🚀 Commandes de Développement

```bash
# Lancer l'environnement complet
make dev

# Tester le module AI
cargo test -p core-ai

# Logs API pour debug AI
make logs | grep -i ai

# Vérifier rate limits Redis
docker exec -it asap-redis redis-cli KEYS "ratelimit:ai:*"
```

---

## 📚 Ressources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Axum SSE](https://docs.rs/axum/latest/axum/response/sse/index.html)
- [AI UX Best Practices](https://pair.withgoogle.com)
