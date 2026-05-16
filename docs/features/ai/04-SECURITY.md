<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# Sécurité, Performance & Pricing

> **Document**: 04-SECURITY.md  
> **Parent**: [README.md](./README.md)

---

## Table des Matières

1. [Principes de Sécurité](#principes-de-sécurité)
2. [Sanitization & Filtering](#sanitization--filtering)
3. [Rate Limiting](#rate-limiting)
4. [Pricing par Plan](#pricing-par-plan)
5. [Performance & Caching](#performance--caching)
6. [Audit & Monitoring](#audit--monitoring)
7. [Risques & Mitigations](#risques--mitigations)

---

## Principes de Sécurité

### Core Principles

1. **Data Minimization** : N'envoyer que le contexte nécessaire aux providers AI
2. **No PII to AI** : Anonymiser les données personnelles avant envoi
3. **User Consent** : Opt-in explicite pour les features AI
4. **Audit Trail** : Logger toutes les interactions AI (sans contenu sensible)
5. **Content Filtering** : Bloquer génération de contenu inapproprié

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User Request                                                                │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. AUTHENTICATION                                                    │   │
│  │    - Verify JWT token                                                │   │
│  │    - Check user permissions                                          │   │
│  │    - Validate website ownership                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. RATE LIMITING                                                     │   │
│  │    - Check plan limits                                               │   │
│  │    - Apply per-user quotas                                           │   │
│  │    - Fair use policy                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. INPUT SANITIZATION                                                │   │
│  │    - PII detection & masking                                         │   │
│  │    - Content filtering (harmful content)                             │   │
│  │    - Injection prevention                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. AI PROVIDER                                                       │   │
│  │    - Only anonymized context                                         │   │
│  │    - No PII, no credentials                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. OUTPUT FILTERING                                                  │   │
│  │    - Content moderation                                              │   │
│  │    - Action validation                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  User Response                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sanitization & Filtering

### Implementation

```rust
pub struct AISecurityLayer {
    pii_detector: PIIDetector,
    content_filter: ContentFilter,
    audit_logger: AuditLogger,
}

impl AISecurityLayer {
    pub async fn sanitize_request(
        &self,
        request: &mut AIRequest,
    ) -> Result<(), SecurityError> {
        // 1. Détecter et masquer les PII
        request.message = self.pii_detector.mask(&request.message)?;
        
        // 2. Filtrer le contenu inapproprié
        if self.content_filter.is_harmful(&request.message) {
            return Err(SecurityError::HarmfulContent);
        }
        
        // 3. Log pour audit (sans contenu sensible)
        self.audit_logger.log(AuditEvent {
            user_id: request.user_id,
            action: "ai_request",
            metadata: json!({
                "website_id": request.website_id,
                "message_length": request.message.len(),
            }),
        }).await;
        
        Ok(())
    }
    
    pub async fn filter_response(
        &self,
        response: &mut AIResponse,
    ) -> Result<(), SecurityError> {
        // Vérifier que l'AI n'a pas généré de contenu problématique
        if self.content_filter.is_harmful(&response.message) {
            response.message = "Je ne peux pas générer ce type de contenu.".into();
        }
        
        Ok(())
    }
}
```

### PII Detection

Types de PII détectés et masqués :
- Emails → `[EMAIL]`
- Numéros de téléphone → `[PHONE]`
- Numéros de carte bancaire → `[CREDIT_CARD]`
- Numéros de sécurité sociale → `[SSN]`
- Adresses IP → `[IP_ADDRESS]`
- Mots de passe potentiels → `[SENSITIVE]`

### Content Filtering Categories

| Category | Action | Examples |
|----------|--------|----------|
| Violence | Block | Armes, menaces, gore |
| Adult Content | Block | Contenu sexuel explicite |
| Hate Speech | Block | Discrimination, harcèlement |
| Self-Harm | Block | Suicide, automutilation |
| Illegal Activity | Block | Drogues, fraude |
| Spam/Scam | Block | Phishing, arnaques |

---

## Rate Limiting

### Limites par Plan

| Plan | AI Messages/jour | Image Gen/mois | Voice Minutes/mois | Max Context |
|------|------------------|----------------|---------------------|-------------|
| **Free** | 20 | 5 | 10 | 4k tokens |
| **Pro** | 200 | 50 | 60 | 16k tokens |
| **Business** | 1000 | 200 | 300 | 32k tokens |
| **Enterprise** | Unlimited | Unlimited | Unlimited | 128k tokens |

### Implementation

```rust
pub struct AIRateLimiter {
    redis: RedisPool,
    limits: HashMap<Plan, Limits>,
}

#[derive(Clone)]
pub struct Limits {
    pub messages_per_day: i64,
    pub images_per_month: i64,
    pub voice_minutes_per_month: i64,
}

impl AIRateLimiter {
    pub async fn check_and_consume(
        &self,
        user_id: &Uuid,
        plan: Plan,
        resource: AIResource,
    ) -> Result<RateLimitResult, RateLimitError> {
        let key = format!("ratelimit:ai:{}:{}:{}", 
            user_id, 
            resource, 
            self.period_key(&resource)
        );
        
        let limit = self.limits.get(&plan).unwrap().get(&resource);
        
        let current: i64 = self.redis.incr(&key).await?;
        
        if current == 1 {
            // Set TTL based on resource type
            let ttl = match resource {
                AIResource::Messages => 86400,      // 24h
                AIResource::Images => 2592000,      // 30 days
                AIResource::VoiceMinutes => 2592000, // 30 days
            };
            self.redis.expire(&key, ttl).await?;
        }
        
        if current > limit {
            return Err(RateLimitError::LimitExceeded {
                resource,
                limit,
                current,
                reset: self.next_reset(&resource),
            });
        }
        
        Ok(RateLimitResult {
            remaining: limit - current,
            limit,
            reset: self.next_reset(&resource),
        })
    }
}
```

### Response Headers

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 156
X-RateLimit-Reset: 1704844800
X-RateLimit-Resource: ai-messages
```

### Fair Use Policy

```markdown
## AI Fair Use Policy

Pour garantir une expérience optimale à tous les utilisateurs :

1. **Pas de spam** : Les requêtes automatisées/scripts sont interdits
2. **Usage personnel** : L'AI est pour votre propre site, pas pour revente
3. **Contenu légal** : Pas de génération de contenu illégal/harmful
4. **Rate limits** : Respectez les limites de votre plan

En cas d'abus détecté, nous nous réservons le droit de :
- Suspendre temporairement l'accès AI
- Rétrograder vers un plan inférieur
- Suspendre le compte en cas de récidive
```

---

## Pricing par Plan

### Cost Estimation by Model

| Model | Input (1K tokens) | Output (1K tokens) | Avg Request Cost |
|-------|-------------------|--------------------| -----------------|
| GPT-4o | $0.005 | $0.015 | ~$0.02 |
| Claude 3.5 Sonnet | $0.003 | $0.015 | ~$0.015 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | ~$0.002 |
| DALL-E 3 (1024x1024) | - | - | $0.04/image |
| DALL-E 3 (1792x1024) | - | - | $0.08/image |
| Whisper | - | - | $0.006/min |

### Monthly Cost per User (Estimated)

| Plan | Avg Usage | Est. AI Cost | Margin Target |
|------|-----------|--------------|---------------|
| **Free** | 15 msgs/mois | ~$0.30 | Subsidized |
| **Pro** ($15/mois) | 100 msgs/mois | ~$2.00 | 85%+ |
| **Business** ($49/mois) | 500 msgs/mois | ~$10.00 | 80%+ |

### Cost Protection

```yaml
# Cost Protection Config
daily_cap_per_user: $5          # Hard cap per user per day
monthly_cap_total: $10000       # Total budget alert threshold
alert_at: 80%                   # Alert when reaching 80% of cap

# Degradation Strategy
when_approaching_limit:
  - step_1: Switch to cheaper models (GPT-3.5)
  - step_2: Reduce context window
  - step_3: Queue non-urgent requests
  - step_4: Show warning to user
  - step_5: Disable AI temporarily
```

---

## Performance & Caching

### Caching Strategy

```rust
pub struct AICache {
    redis: RedisPool,
    local: MokaCache<String, CachedResponse>,
}

impl AICache {
    /// Cache les suggestions statiques (même pour tous les users)
    pub async fn get_static_suggestions(
        &self,
        website_type: &str,
    ) -> Option<Vec<Suggestion>> {
        let key = format!("ai:suggestions:static:{}", website_type);
        self.redis.get(&key).await
    }
    
    /// Cache les réponses similaires (embeddings)
    pub async fn get_similar_response(
        &self,
        query: &str,
        website_id: &str,
        similarity_threshold: f32,
    ) -> Option<CachedResponse> {
        let query_embedding = self.embed(query).await;
        
        // Recherche dans le cache par similarité cosine
        self.vector_search(
            &format!("ai:cache:{}", website_id),
            query_embedding,
            similarity_threshold,
        ).await
    }
    
    /// Cache une réponse avec TTL
    pub async fn cache_response(
        &self,
        key: &str,
        response: &AIResponse,
        ttl: Duration,
    ) -> Result<(), CacheError> {
        let embedding = self.embed(&response.message).await;
        
        self.redis.set_ex(
            key,
            serde_json::to_string(response)?,
            ttl.as_secs() as usize,
        ).await
    }
}
```

### Cache Layers

| Layer | TTL | Use Case |
|-------|-----|----------|
| **L1: Local (Moka)** | 5 min | Hot data, repeated requests |
| **L2: Redis** | 1 hour | Suggestions, common queries |
| **L3: Prompt Cache** | 24 hours | System prompts (Anthropic) |

### Optimizations

1. **Prompt Caching** : Anthropic supporte le caching de prompts système
2. **Batch Requests** : Grouper les requêtes non-urgentes
3. **Speculative Execution** : Pré-générer les suggestions probables
4. **Edge Caching** : Cache CDN pour les assets générés (images)
5. **Context Compression** : Résumer les longues conversations

---

## Audit & Monitoring

### Data Retention Policy

| Data Type | Retention | Encryption | Location |
|-----------|-----------|------------|----------|
| Conversation history | 30 jours | AES-256 | Redis + S3 |
| Generated content | Permanent | AES-256 | User data |
| AI request logs | 90 jours | At-rest | CloudWatch |
| Usage metrics | 1 an | Anonymized | Analytics DB |
| Error logs | 30 jours | At-rest | CloudWatch |

### Audit Events

```typescript
// Events logged for audit
interface AuditEvent {
  event_type: 
    | 'ai_request'
    | 'ai_response'
    | 'ai_action_applied'
    | 'ai_action_failed'
    | 'ai_rate_limited'
    | 'ai_content_filtered'
    | 'ai_error';
  
  user_id: string;
  website_id?: string;
  timestamp: Date;
  
  // Metadata (never includes actual content)
  metadata: {
    message_length?: number;
    action_type?: string;
    model_used?: string;
    tokens_used?: number;
    latency_ms?: number;
    error_code?: string;
  };
}
```

### Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ ASAP AI Monitoring                                   Last 24h   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🟢 Status: Healthy                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Requests     │ Latency P95  │ Error Rate  │ Cost        │   │
│  │ 45,234       │ 1.2s         │ 0.3%        │ $234.56     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Provider Status:                                                │
│  ┌────────────────┬────────────────┬────────────────┐           │
│  │ OpenAI: 🟢     │ Anthropic: 🟢  │ DALL-E: 🟢     │           │
│  │ 99.9% uptime   │ 99.8% uptime   │ 99.9% uptime   │           │
│  └────────────────┴────────────────┴────────────────┘           │
│                                                                  │
│  Alerts:                                                         │
│  ⚠️  Cost approaching 80% of daily budget                        │
│  ℹ️  Anthropic latency spike at 14:32 (resolved)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risques & Mitigations

### Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **API Provider Down** | Medium | High | Multi-provider fallback, queue for retry |
| **Hallucinations AI** | High | Medium | Validation des actions, sandbox preview |
| **Coûts explosent** | Medium | High | Hard caps, alertes, throttling progressif |
| **Latence élevée** | Medium | Medium | Caching, CDN, model routing intelligent |
| **Data leak** | Low | Critical | Chiffrement, audit, pas de PII vers AI |

### Risques Business

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Utilisateurs frustrés** | Medium | High | Onboarding progressif, fallback manuel |
| **Concurrence AI** | High | Medium | Features uniques, UX supérieure |
| **Régulation AI** | Medium | Medium | Compliance-ready, opt-in, transparency |
| **Abus du service** | Medium | Low | Rate limits, fair use policy, monitoring |

### Fallback Chain

```yaml
# Provider Fallback Configuration
providers:
  primary: claude-3.5-sonnet
  secondary: gpt-4o
  tertiary: gpt-3.5-turbo    # Degraded mode
  offline: manual-mode       # AI disabled, manual editing only

# Circuit Breaker Settings
circuit_breaker:
  error_threshold: 10        # errors in 1 minute
  cooldown: 30s              # before retry
  max_retries: 3             # per request
  health_check_interval: 60s # health check frequency
```

### Incident Response

```yaml
# Incident Levels
levels:
  P1_CRITICAL:
    - AI completely down
    - Data breach detected
    - Response: Immediate escalation, all hands
    
  P2_HIGH:
    - Primary provider down (fallback active)
    - Cost spike > 200%
    - Response: On-call engineer, 15min response
    
  P3_MEDIUM:
    - Elevated error rates (> 5%)
    - Latency degradation (P95 > 3s)
    - Response: Next business day
    
  P4_LOW:
    - Single user complaints
    - Minor feature issues
    - Response: Ticket queue
```

---

## Voir Aussi

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - Architecture providers
- [03-API.md](./03-API.md) - Error handling API
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Roadmap
