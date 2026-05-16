<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# Architecture Technique AI

> **Document**: 01-ARCHITECTURE.md  
> **Parent**: [README.md](./README.md)

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Écosystème Existant](#écosystème-existant)
3. [Composants Backend](#composants-backend)
4. [Providers & Model Router](#providers--model-router)
5. [Context Management](#context-management)
6. [Décisions Architecturales](#décisions-architecturales)

---

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Astro)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  AI Chat Panel  │  │  Studio Editor  │  │  Preview (Live Updates)     │ │
│  │  - Conversation │  │  - Visual Edit  │  │  - Iframe / Live Preview    │ │
│  │  - Voice Input  │  │  - AI Suggestions│  │  - Optimistic Updates      │ │
│  │  - Quick Actions│  │  - Inline AI    │  │  - Rollback Support        │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘ │
│           │                    │                          │                 │
│           └────────────────────┼──────────────────────────┘                 │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │   WebSocket / SSE      │                               │
│                    │   (Real-time Stream)   │                               │
│                    └───────────┬───────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      API Gateway        │
                    │   (Rate Limiting, Auth) │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│                           BACKEND (Rust/Axum)                               │
├────────────────────────────────┼────────────────────────────────────────────┤
│                    ┌───────────▼───────────┐                               │
│                    │    AI Orchestrator    │                               │
│                    │  - Request Routing    │                               │
│                    │  - Context Building   │                               │
│                    │  - Response Parsing   │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│    ┌───────────────────────────┼───────────────────────────────┐           │
│    │                           │                               │           │
│    ▼                           ▼                               ▼           │
│ ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐      │
│ │ Text Gen     │    │ Code Generation  │    │ Image Generation     │      │
│ │ - Chat       │    │ - HTML/CSS       │    │ - Illustrations      │      │
│ │ - Suggestions│    │ - Components     │    │ - Backgrounds        │      │
│ │ - Analysis   │    │ - Animations     │    │ - Avatars            │      │
│ └──────┬───────┘    └────────┬─────────┘    └──────────┬───────────┘      │
│        │                     │                         │                   │
│        └─────────────────────┼─────────────────────────┘                   │
│                              │                                             │
│                    ┌─────────▼─────────┐                                  │
│                    │   Model Router    │                                  │
│                    │  - Cost Optimize  │                                  │
│                    │  - Fallback Chain │                                  │
│                    └─────────┬─────────┘                                  │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ OpenAI   │        │ Anthropic│        │ Local    │
    │ GPT-4o   │        │ Claude   │        │ Ollama   │
    └──────────┘        └──────────┘        └──────────┘
```

---

## Écosystème Existant

### Architecture ASAP V1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASAP ARCHITECTURE V1                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  websites           │ Core metadata (slug, title, status, preset)   │   │
│  │  website_data       │ JSONB extensible (profile, theme, SEO)        │   │
│  │  website_sections   │ Blocs modulaires (hero, features, pricing...) │   │
│  │  website_collections│ Données typées des extensions (repos, posts)  │   │
│  │  website_variables  │ Variables dynamiques (manual/computed)        │   │
│  │  website_extensions │ Extensions activées par site                  │   │
│  │  presets            │ Templates prédéfinis avec config complète     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RENDERING LAYER                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  @asap/renderers    │ Single Source of Truth pour le rendu          │   │
│  │  - Schema-driven    │ Chaque section a un PropertySchema            │   │
│  │  - Type-safe        │ Types partagés via @asap/shared               │   │
│  │  - Composable       │ Composants UI réutilisables                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     EDITING LAYER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Studio             │ AI-first editor avec preview live             │   │
│  │  Property Editors   │ UI générée depuis les schemas                 │   │
│  │  Data Binding       │ Connection sections ↔ collections/variables   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Points Forts pour l'AI

| Aspect | Implementation | Avantage pour AI |
|--------|----------------|------------------|
| **Schema-driven** | PropertySchema pour chaque section | Prompt structuré, validation auto |
| **Single Source of Truth** | @asap/renderers | Modification = même résultat partout |
| **JSONB flexible** | website_data, settings | Extensible sans migration |
| **Collections typées** | website_collections | Contexte riche pour personnalisation |
| **Variables** | website_variables | Templating dynamique |

### Sections Existantes

| Type | Catégorie | Status | Description |
|------|-----------|--------|-------------|
| `hero` | SaaS/Landing | ✅ Active | Hero section avec headline, CTA |
| `features` | SaaS/Landing | ✅ Active | Grid de features avec icônes |
| `how-it-works` | SaaS/Landing | ✅ Active | Steps/process flow |
| `pricing` | SaaS/Landing | ✅ Active | Plans tarifaires |
| `testimonials` | SaaS/Landing | ✅ Active | Témoignages clients |
| `cta` | SaaS/Landing | ✅ Active | Call to action |
| `navigation` | Global | ✅ Active | Header navigation |
| `footer` | Global | ✅ Active | Footer avec liens |

---

## Composants Backend

### Structure du Module `core/ai`

```
core/
└── ai/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── orchestrator.rs      # AI Orchestrator principal
        ├── providers/
        │   ├── mod.rs
        │   ├── openai.rs        # Client OpenAI
        │   ├── anthropic.rs     # Client Anthropic
        │   └── traits.rs        # AIProvider trait
        ├── context/
        │   ├── mod.rs
        │   ├── builder.rs       # ContextBuilder
        │   └── types.rs         # AIContext, WebsiteContext
        ├── actions/
        │   ├── mod.rs
        │   ├── parser.rs        # Parse actions from AI response
        │   ├── executor.rs      # Execute actions on website
        │   └── types.rs         # AIAction enum
        ├── router.rs            # Model selection & routing
        └── error.rs             # AIError types
```

### AI Orchestrator

```rust
// core/ai/src/orchestrator.rs
pub struct AIOrchestrator {
    providers: HashMap<String, Box<dyn AIProvider>>,
    context_builder: ContextBuilder,
    response_parser: ResponseParser,
    rate_limiter: RateLimiter,
}

impl AIOrchestrator {
    pub async fn process_request(
        &self,
        request: AIRequest,
        website_context: WebsiteContext,
        user_context: UserContext,
    ) -> Result<AIResponse, AIError> {
        // 1. Build full context
        let context = self.context_builder.build(website_context, user_context)?;
        
        // 2. Select appropriate model
        let model = self.select_model(&request)?;
        
        // 3. Execute with streaming
        let stream = self.providers[&model].stream(request, context).await?;
        
        // 4. Parse and validate response
        self.response_parser.parse(stream).await
    }
}
```

### AIProvider Trait

```rust
// core/ai/src/providers/traits.rs
#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Identifiant unique du provider
    fn id(&self) -> &str;
    
    /// Liste des modèles supportés
    fn models(&self) -> Vec<ModelInfo>;
    
    /// Chat completion (non-streaming)
    async fn chat(
        &self,
        request: ChatRequest,
    ) -> Result<ChatResponse, ProviderError>;
    
    /// Chat completion avec streaming
    async fn chat_stream(
        &self,
        request: ChatRequest,
    ) -> Result<impl Stream<Item = Result<StreamChunk, ProviderError>>, ProviderError>;
    
    /// Génération d'images
    async fn generate_image(
        &self,
        request: ImageRequest,
    ) -> Result<ImageResponse, ProviderError>;
    
    /// Transcription audio
    async fn transcribe(
        &self,
        audio: AudioData,
    ) -> Result<TranscriptionResponse, ProviderError>;
}
```

---

## Providers & Model Router

### Stratégie Multi-Provider

| Use Case | Primary | Fallback | Reason |
|----------|---------|----------|--------|
| **Chat conversationnel** | Claude 3.5 Sonnet | GPT-4o | Meilleur ton naturel |
| **Code generation** | GPT-4o | Claude 3.5 | Meilleur pour code structuré |
| **Analyse design** | Claude 3.5 Opus | GPT-4 Vision | Compréhension visuelle |
| **Traduction** | DeepL | GPT-4 | Qualité traduction |
| **Images** | DALL-E 3 | Stable Diffusion | Qualité/cohérence |
| **Transcription** | Whisper | - | Seul provider viable |

### Model Router

```rust
pub struct ModelRouter {
    providers: HashMap<Provider, ProviderClient>,
    routing_rules: Vec<RoutingRule>,
    cost_optimizer: CostOptimizer,
}

impl ModelRouter {
    pub fn select_model(&self, request: &AIRequest) -> ModelSelection {
        // 1. Check user's plan limits
        let plan_constraints = self.get_plan_constraints(&request.user_id);
        
        // 2. Apply routing rules based on request type
        let candidates = self.routing_rules
            .iter()
            .filter(|rule| rule.matches(&request))
            .map(|rule| rule.model)
            .collect();
        
        // 3. Optimize for cost/quality
        self.cost_optimizer.select(candidates, plan_constraints)
    }
}
```

### Cost Estimation

| Model | Input (1K tokens) | Output (1K tokens) | Avg Request Cost |
|-------|-------------------|--------------------| -----------------|
| GPT-4o | $0.005 | $0.015 | ~$0.02 |
| Claude 3.5 Sonnet | $0.003 | $0.015 | ~$0.015 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | ~$0.002 |
| DALL-E 3 | - | - | $0.04/image |
| Whisper | - | - | $0.006/min |

**Estimation mensuelle par utilisateur actif** :
- Free tier: ~$0.50/mois (limité)
- Pro tier: ~$2-5/mois (usage normal)
- Business tier: ~$10-20/mois (usage intensif)

### Fallback Chain

```yaml
# Configuration fallback
primary: claude-3.5-sonnet
secondary: gpt-4o
tertiary: gpt-3.5-turbo  # Degraded mode
offline: manual-mode     # AI disabled, manual editing only

# Circuit Breaker
error_threshold: 10      # errors in 1 minute
cooldown: 30s            # before retry
max_retries: 3           # per request
```

---

## Context Management

### WebsiteContext

```rust
pub struct WebsiteContext {
    // Structure du site
    pub sections: Vec<SectionContext>,
    pub theme: ThemeContext,
    pub navigation: NavigationContext,
    
    // Contenu
    pub texts: HashMap<String, String>,
    pub images: Vec<ImageMeta>,
    
    // Metadata
    pub domain: String,
    pub industry: Option<String>,
    pub target_audience: Option<String>,
}

pub struct SectionContext {
    pub id: Uuid,
    pub section_type: SectionType,
    pub position: u32,
    pub content: serde_json::Value,
    pub styles: StyleOverrides,
}
```

### AIContext Complet

```typescript
interface AIContext {
  // Website metadata
  website: {
    id: string;
    slug: string;
    title: string;
    preset: string;
    createdAt: Date;
  };
  
  // Current structure with schemas
  sections: Array<{
    id: string;
    type: SectionType;
    variant: string;
    position: number;
    settings: Record<string, unknown>;
    // Schema info for AI understanding
    schema: {
      properties: PropertySchema[];
      editableFields: string[];
      constraints: Record<string, Constraint>;
    };
  }>;
  
  // Theme info
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    fonts: { heading: string; body: string };
  };
  
  // Collections data (from extensions)
  collections: {
    github_repos?: Array<{ name: string; description: string; stars: number }>;
    blog_posts?: Array<{ title: string; excerpt: string }>;
  };
  
  // Variables
  variables: Record<string, unknown>;
  
  // User context
  user: {
    name: string;
    industry?: string;
    plan: 'free' | 'pro' | 'business';
  };
}
```

### Conversation Memory

```rust
pub struct ConversationManager {
    store: RedisStore,
    max_history: usize,
    summarizer: Summarizer,
}

impl ConversationManager {
    /// Récupère l'historique de conversation avec compression
    pub async fn get_history(
        &self,
        conversation_id: &str,
        max_tokens: usize,
    ) -> Result<Vec<Message>, Error> {
        let full_history = self.store.get_messages(conversation_id).await?;
        
        // Si l'historique est trop long, on résume les anciens messages
        if self.count_tokens(&full_history) > max_tokens {
            let (old, recent) = self.split_history(full_history, max_tokens / 2);
            let summary = self.summarizer.summarize(&old).await?;
            
            return Ok(vec![
                Message::system(format!("Résumé de la conversation: {}", summary)),
                ..recent
            ]);
        }
        
        Ok(full_history)
    }
    
    /// Sauvegarde avec TTL (conversations expirent après 7 jours)
    pub async fn save_message(
        &self,
        conversation_id: &str,
        message: Message,
    ) -> Result<(), Error> {
        self.store.append_message(conversation_id, message).await?;
        self.store.set_ttl(conversation_id, Duration::from_days(7)).await
    }
}
```

### System Prompt Builder

```rust
pub fn build_system_prompt(website: &Website, sections: &[Section]) -> String {
    format!(r#"
Tu es l'assistant AI d'ASAP, un website builder moderne.

## Site actuel
- Nom: {name}
- URL: {slug}.asap.cool
- Type: {preset}
- Sections: {section_count}

## Structure du site
{sections_summary}

## Thème actuel
- Couleur primaire: {primary_color}
- Police titres: {heading_font}
- Police corps: {body_font}
- Mode: {color_mode}

## Tes capacités
Tu peux:
1. Modifier le contenu (textes, images)
2. Ajouter/supprimer des sections
3. Changer le thème et les couleurs
4. Générer du contenu (textes, images)
5. Analyser et améliorer le site

## Format de réponse
Quand tu effectues une modification, utilise ce format:
```action
{{"type": "update_section", "target": "section_id", "changes": {{...}}}}
```

Sois concis, amical et professionnel.
"#,
        name = website.title,
        slug = website.slug,
        preset = website.preset,
        section_count = sections.len(),
        sections_summary = format_sections(sections),
        primary_color = website.theme.primary_color,
        heading_font = website.theme.heading_font,
        body_font = website.theme.body_font,
        color_mode = website.theme.color_mode,
    )
}
```

---

## Décisions Architecturales

### Composants Custom en Code vs Templates Only

**Décision: Approche Hybride (Tier 1-2-3)**

| Tier | Feature | Timeline | Scope |
|------|---------|----------|-------|
| **Tier 1: No-Code** | Sections prédéfinies | V1 (maintenant) | 30+ sections, AI modifie propriétés |
| **Tier 2: Element Library** | Save/reuse configs | V2 (Q2 2026) | Pro feature |
| **Tier 3: Code Blocks** | Custom HTML/CSS | V3 (Q4 2026) | Business/Enterprise |

**Justification**:
1. **80/20 Rule** : 95% des utilisateurs n'ont pas besoin de code custom
2. **AI-First** : Le code custom rend l'AI moins efficace
3. **Maintenabilité** : Sections standard = bugs prévisibles
4. **Business Model** : L'Element Library devient un feature Pro

### Section Variants vs Sections Séparées

**Décision: Variants**

```typescript
interface SectionSchema {
  type: 'hero';
  variants: [
    { id: 'centered', name: 'Centered', preview: '...' },
    { id: 'split-image-right', name: 'Split with Image', preview: '...' },
    { id: 'video-background', name: 'Video Background', preview: '...' },
  ];
  properties: PropertySchema[];
}
```

**Avantages**:
- Moins de sections dans le catalogue (UX cleaner)
- Changement de variante sans perdre le contenu
- AI peut suggérer la meilleure variante
- Maintenance centralisée

---

## Voir Aussi

- [02-FEATURES.md](./02-FEATURES.md) - Fonctionnalités AI
- [03-API.md](./03-API.md) - API Design
- [04-SECURITY.md](./04-SECURITY.md) - Sécurité & Performance
