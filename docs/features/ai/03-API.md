<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# API Design

> **Document**: 03-API.md  
> **Parent**: [README.md](./README.md)

---

## Table des Matières

1. [Endpoints](#endpoints)
2. [Request/Response Schemas](#requestresponse-schemas)
3. [Streaming (SSE)](#streaming-sse)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Error Handling](#error-handling)

---

## Endpoints

```yaml
# AI Chat
POST /api/v1/ai/chat
  - Envoi d'un message dans la conversation
  - Retourne réponse complète (non-streaming)
  
POST /api/v1/ai/chat/stream
  - Chat avec streaming SSE (Server-Sent Events)
  - Token-by-token response
  
# Génération de contenu
POST /api/v1/ai/generate/text
  - Génération de texte (copywriting, SEO, etc.)
  - Input: { type: 'headline' | 'description' | 'bio', context: string }
  
POST /api/v1/ai/generate/image
  - Génération d'images via DALL-E 3
  - Input: { prompt: string, style?: string, count?: number }
  - Returns: { images: [{ url: string, revised_prompt: string }] }

# Analyse
POST /api/v1/ai/analyze/website
  - Analyse complète du site (design, SEO, accessibility)
  - Input: { website_id: string }
  - Returns: AnalysisResult

POST /api/v1/ai/analyze/seo
  - Audit SEO spécifique
  - Input: { website_id: string }

# Suggestions
GET /api/v1/ai/suggestions
  - Suggestions contextuelles pour le site actuel
  - Query: ?website_id=xxx
  - Returns: Suggestion[]

# Voice
POST /api/v1/ai/transcribe
  - Transcription audio → texte (Whisper)
  - Input: multipart/form-data avec file audio
  - Returns: { text: string, language: string }
```

---

## Request/Response Schemas

### Chat Request

```typescript
interface AIChatRequest {
  // Required
  website_id: string;
  message: string;
  
  // Optional
  conversation_id?: string;   // Pour continuer une conversation existante
  attachments?: Attachment[];  // Images, fichiers
  context_override?: Partial<WebsiteContext>;  // Override context
  stream?: boolean;           // Default: true
}

interface Attachment {
  type: 'image' | 'file';
  url?: string;
  base64?: string;
  mime_type: string;
  filename?: string;
}
```

### Chat Response (Non-Streaming)

```typescript
interface AIChatResponse {
  id: string;
  conversation_id: string;
  message: string;
  actions?: AIAction[];      // Actions effectuées sur le site
  suggestions?: Suggestion[]; // Suggestions de suivi
  usage: TokenUsage;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;  // En USD
}
```

### Streaming Response (SSE)

```typescript
// Event types dans le stream SSE
interface AIChatStreamEvent {
  type: 'token' | 'action' | 'suggestion' | 'done' | 'error';
  data: string | AIAction | Suggestion | null | ErrorData;
}

// Exemple de stream
// data: {"type":"token","data":"Bonjour"}
// data: {"type":"token","data":" !"}
// data: {"type":"token","data":" Je"}
// data: {"type":"action","data":{"type":"UPDATE_SECTION_PROPERTY",...}}
// data: {"type":"done","data":null}
```

### AIAction

```typescript
interface AIAction {
  type: 
    | 'UPDATE_SECTION_PROPERTY'
    | 'ADD_SECTION'
    | 'REMOVE_SECTION'
    | 'REORDER_SECTIONS'
    | 'CHANGE_VARIANT'
    | 'UPDATE_THEME'
    | 'GENERATE_IMAGE';
  
  // Dépend du type
  sectionId?: string;
  property?: string;
  value?: unknown;
  sectionType?: string;
  variant?: string;
  position?: number;
  settings?: Record<string, unknown>;
  order?: string[];
  changes?: Record<string, unknown>;
  
  // Metadata
  preview?: {
    before?: string;  // Screenshot URL before
    after?: string;   // Screenshot URL after
  };
  reversible: boolean;
}
```

### Suggestion

```typescript
interface Suggestion {
  id: string;
  type: 'improvement' | 'content' | 'design' | 'seo';
  title: string;
  description: string;
  action?: AIAction;  // Action à exécuter si acceptée
  priority: 'low' | 'medium' | 'high';
}
```

---

## Streaming (SSE)

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   API        │────▶│  AI Provider │
│   (React)    │     │   (Axum)     │     │  (OpenAI)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │    SSE Events      │     HTTP Stream    │
       │◀───────────────────│◀───────────────────│
       │                    │                    │
       ▼                    ▼                    ▼
   Render           Parse & Forward        Generate
   tokens           AI responses           tokens
```

### Event Format

```
event: token
data: {"type":"token","data":"Hello"}

event: token
data: {"type":"token","data":" world"}

event: action
data: {"type":"action","data":{"type":"UPDATE_SECTION_PROPERTY","sectionId":"abc123","property":"headline","value":"Hello world","reversible":true}}

event: done
data: {"type":"done","data":null}
```

### Keep-Alive

Le server envoie des comments SSE régulièrement pour maintenir la connexion :

```
: ping
```

---

## Backend Implementation

### Route Handler (Rust/Axum)

```rust
// apps/api/src/routes/ai.rs
use axum::{
    response::sse::{Event, Sse},
    extract::{State, Json},
};
use futures::stream::Stream;
use std::convert::Infallible;

pub async fn chat_stream(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<AIChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        // 1. Build context
        let context = match state.ai.build_context(&request.website_id).await {
            Ok(ctx) => ctx,
            Err(e) => {
                yield Ok(Event::default()
                    .event("error")
                    .data(format!(r#"{{"type":"error","data":{{"message":"{}"}}}}"#, e)));
                return;
            }
        };
        
        // 2. Start AI stream
        let ai_stream = match state.ai.chat_stream(&request, context).await {
            Ok(stream) => stream,
            Err(e) => {
                yield Ok(Event::default()
                    .event("error")
                    .data(format!(r#"{{"type":"error","data":{{"message":"{}"}}}}"#, e)));
                return;
            }
        };
        
        // 3. Forward tokens
        pin_mut!(ai_stream);
        while let Some(chunk) = ai_stream.next().await {
            match chunk {
                Ok(StreamChunk::Token(token)) => {
                    yield Ok(Event::default()
                        .event("token")
                        .data(format!(r#"{{"type":"token","data":"{}"}}"#, 
                            token.replace('"', r#"\""#))));
                }
                Ok(StreamChunk::Action(action)) => {
                    let json = serde_json::to_string(&action).unwrap();
                    yield Ok(Event::default()
                        .event("action")
                        .data(format!(r#"{{"type":"action","data":{}}}"#, json)));
                }
                Err(e) => {
                    yield Ok(Event::default()
                        .event("error")
                        .data(format!(r#"{{"type":"error","data":{{"message":"{}"}}}}"#, e)));
                    break;
                }
            }
        }
        
        // 4. Send completion
        yield Ok(Event::default()
            .event("done")
            .data(r#"{"type":"done","data":null}"#));
    };
    
    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping")
    )
}
```

### OpenAI Provider

```rust
// core/ai/src/providers/openai.rs
pub struct OpenAIProvider {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl OpenAIProvider {
    pub async fn chat_stream(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
    ) -> Result<impl Stream<Item = Result<String, ProviderError>>, ProviderError> {
        let response = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&json!({
                "model": model,
                "messages": messages,
                "stream": true,
            }))
            .send()
            .await?;
            
        let stream = response.bytes_stream().map(|chunk| {
            // Parse SSE from OpenAI
            let text = String::from_utf8_lossy(&chunk?);
            for line in text.lines() {
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        return Ok(None);
                    }
                    let parsed: Value = serde_json::from_str(data)?;
                    if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                        return Ok(Some(content.to_string()));
                    }
                }
            }
            Ok(None)
        });
        
        Ok(stream.filter_map(|r| async { r.transpose() }))
    }
}
```

---

## Frontend Implementation

### React Hook: useAIChat

```typescript
// hooks/useAIChat.ts
export function useAIChat(websiteId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (content: string) => {
    // Reset error state
    setError(null);
    
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    setIsStreaming(true);
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actions: [],
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          website_id: websiteId, 
          message: content,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case 'token':
                  setMessages(prev => {
                    const last = prev[prev.length - 1];
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: last.content + event.data }
                    ];
                  });
                  break;
                  
                case 'action':
                  // Apply action to website preview
                  await applyAction(event.data);
                  setMessages(prev => {
                    const last = prev[prev.length - 1];
                    return [
                      ...prev.slice(0, -1),
                      { ...last, actions: [...(last.actions || []), event.data] }
                    ];
                  });
                  break;
                  
                case 'error':
                  setError(event.data.message);
                  break;
                  
                case 'done':
                  // Stream complete
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return { 
    messages, 
    sendMessage, 
    stopGeneration,
    clearMessages,
    isStreaming, 
    error 
  };
}
```

### Action Executor

```typescript
// utils/actionExecutor.ts
import { websiteStore } from '@/stores/websiteStore';

export async function applyAction(action: AIAction): Promise<void> {
  switch (action.type) {
    case 'UPDATE_SECTION_PROPERTY':
      await websiteStore.updateSectionProperty(
        action.sectionId!,
        action.property!,
        action.value
      );
      break;
      
    case 'ADD_SECTION':
      await websiteStore.addSection({
        type: action.sectionType!,
        variant: action.variant!,
        position: action.position!,
        settings: action.settings || {},
      });
      break;
      
    case 'REMOVE_SECTION':
      await websiteStore.removeSection(action.sectionId!);
      break;
      
    case 'REORDER_SECTIONS':
      await websiteStore.reorderSections(action.order!);
      break;
      
    case 'CHANGE_VARIANT':
      await websiteStore.changeSectionVariant(
        action.sectionId!,
        action.variant!
      );
      break;
      
    case 'UPDATE_THEME':
      await websiteStore.updateTheme(action.changes!);
      break;
      
    default:
      console.warn('Unknown action type:', action.type);
  }
}
```

---

## Error Handling

### Error Types

```typescript
interface AIErrorResponse {
  type: 'error';
  data: {
    code: AIErrorCode;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
    retry_after?: number;  // Seconds
  };
}

type AIErrorCode = 
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTEXT_TOO_LONG'
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'WEBSITE_NOT_FOUND'
  | 'SECTION_NOT_FOUND'
  | 'INVALID_ACTION'
  | 'CONTENT_FILTERED'
  | 'INTERNAL_ERROR';
```

### Error Messages (User-Facing)

```typescript
const errorMessages: Record<AIErrorCode, string> = {
  RATE_LIMIT_EXCEEDED: "Vous avez atteint la limite de requêtes. Réessayez dans quelques minutes.",
  CONTEXT_TOO_LONG: "Le contexte est trop long. Essayez avec un site plus petit.",
  INVALID_REQUEST: "Requête invalide. Vérifiez votre message.",
  PROVIDER_ERROR: "Le service AI est temporairement indisponible. Réessayez.",
  PROVIDER_UNAVAILABLE: "Le service AI est en maintenance. Réessayez plus tard.",
  AUTHENTICATION_ERROR: "Session expirée. Veuillez vous reconnecter.",
  PERMISSION_DENIED: "Vous n'avez pas accès à cette fonctionnalité.",
  WEBSITE_NOT_FOUND: "Site non trouvé.",
  SECTION_NOT_FOUND: "Section non trouvée.",
  INVALID_ACTION: "Action impossible. Essayez autrement.",
  CONTENT_FILTERED: "Ce contenu ne peut pas être généré.",
  INTERNAL_ERROR: "Erreur interne. Notre équipe a été notifiée.",
};
```

### Retry Logic

```typescript
async function sendWithRetry(
  request: AIChatRequest, 
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/v1/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (response.ok) {
        return response;
      }
      
      const error = await response.json();
      
      // Don't retry non-retryable errors
      if (!error.data?.retryable) {
        throw new Error(error.data?.message || 'Request failed');
      }
      
      // Wait before retry (exponential backoff)
      const delay = error.data?.retry_after || Math.pow(2, attempt) * 1000;
      await sleep(delay);
      
      lastError = new Error(error.data?.message);
    } catch (e) {
      lastError = e;
      
      // Network error - retry with backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
```

---

## Voir Aussi

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - Architecture backend
- [04-SECURITY.md](./04-SECURITY.md) - Rate limiting détaillé
- [05-UX.md](./05-UX.md) - Intégration UI
