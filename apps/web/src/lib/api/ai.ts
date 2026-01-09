import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface AIAction {
  type: string;
  section_id?: string;
  property?: string;
  value?: unknown;
  section_type?: string;
  position?: number;
  variant?: string;
  properties?: Record<string, unknown>;
  order?: string[];
  changes?: Record<string, unknown>;
  prompt?: string;
  target_section_id?: string;
  target_property?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
}

export interface ChatRequest {
  website_id: string;
  message: string;
  conversation_id?: string;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  conversation_id: string;
  message: string;
  actions: AIAction[];
  usage: TokenUsage;
}

export interface QuotaResponse {
  plan: string;
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  resets_at: string;
}

export interface AIStatusResponse {
  available: boolean;
  providers: string[];
}

// SSE Event types
export interface SseTokenEvent {
  type: 'token';
  data: string;
}

export interface SseActionEvent {
  type: 'action';
  data: AIAction;
}

export interface SseDoneEvent {
  type: 'done';
}

export interface SseErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type SseEvent = SseTokenEvent | SseActionEvent | SseDoneEvent | SseErrorEvent;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Send a non-streaming chat message
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>('/ai/chat', {
    ...request,
    stream: false,
  });
}

/**
 * Get user's AI quota information
 */
export async function getAIQuota(): Promise<QuotaResponse> {
  return apiClient.get<QuotaResponse>('/ai/quota');
}

/**
 * Get AI service status
 */
export async function getAIStatus(): Promise<AIStatusResponse> {
  return apiClient.get<AIStatusResponse>('/ai/status');
}

// ============================================================================
// SSE Streaming
// ============================================================================

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onAction?: (action: AIAction) => void;
  onDone?: () => void;
  onError?: (error: { code: string; message: string }) => void;
}

/**
 * Send a streaming chat message using SSE
 * Returns an AbortController to cancel the stream
 */
export function streamChatMessage(
  request: ChatRequest,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();
  
  // Get auth token
  const token = localStorage.getItem('access_token');
  const csrfToken = localStorage.getItem('csrf_token');
  
  // Build URL
  const apiBase = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const url = `${apiBase}/ai/chat/stream`;
  
  // Start streaming
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
    signal: controller.signal,
    credentials: 'include',
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        callbacks.onError?.({
          code: errorData.code || 'http_error',
          message: errorData.error || `HTTP ${response.status}`,
        });
        return;
      }
      
      if (!response.body) {
        callbacks.onError?.({
          code: 'no_body',
          message: 'No response body',
        });
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callbacks.onDone?.();
              continue;
            }
            
            try {
              const event = JSON.parse(data) as SseEvent;
              
              switch (event.type) {
                case 'token':
                  callbacks.onToken?.(event.data);
                  break;
                case 'action':
                  callbacks.onAction?.(event.data);
                  break;
                case 'done':
                  callbacks.onDone?.();
                  break;
                case 'error':
                  callbacks.onError?.({
                    code: event.code,
                    message: event.message,
                  });
                  break;
              }
            } catch {
              // Ignore parse errors for malformed events
            }
          }
        }
      }
      
      // Final done callback if not already called
      callbacks.onDone?.();
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        // Intentionally cancelled, don't report as error
        return;
      }
      callbacks.onError?.({
        code: 'network_error',
        message: error.message || 'Network error',
      });
    });
  
  return controller;
}
