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

export interface SseThinkingEvent {
  type: 'thinking';
  data: {
    thought: string;
    step?: number;
    /** Status: "starting" (AI call in progress), "completed" (AI call done), or absent (legacy/simple) */
    status?: 'starting' | 'completed';
    /** Insight from AI execution (only when status is "completed") */
    insight?: string;
  };
}

export interface SseToolCallEvent {
  type: 'toolcall';
  data: {
    id: string;
    tool: string;
    description: string;
    args?: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
}

export interface SseToolResultEvent {
  type: 'toolresult';
  data: {
    tool_call_id: string;
    success: boolean;
    message?: string;
    data?: unknown;
  };
}

export interface SseToolRequestEvent {
  type: 'toolrequest';
  data: {
    request_id: string;
    request_type: string;
    params: Record<string, unknown>;
    timeout_seconds?: number;
  };
}

export interface SseIterationEvent {
  type: 'iteration';
  data: {
    current: number;
    max: number;
    status: 'starting' | 'processing' | 'complete' | 'finished';
    description?: string;
  };
}

export interface SseActionEvent {
  type: 'action';
  data: AIAction;
}

export interface SseConversationEvent {
  type: 'conversation';
  data: {
    id: string;
  };
}

export interface SseUsageEvent {
  type: 'usage';
  data: TokenUsage;
}

export interface SseDoneEvent {
  type: 'done';
}

export interface SseErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type SseEvent = 
  | SseTokenEvent 
  | SseThinkingEvent
  | SseToolCallEvent
  | SseToolResultEvent
  | SseToolRequestEvent
  | SseIterationEvent
  | SseActionEvent 
  | SseConversationEvent
  | SseUsageEvent
  | SseDoneEvent 
  | SseErrorEvent;

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
// Action Execution
// ============================================================================

export interface ExecuteActionRequest {
  website_id: string;
  action: AIAction;
}

export interface ExecuteActionResponse {
  success: boolean;
  message: string;
  affected_element_id?: string;
  error?: string;
}

/**
 * Execute an AI action on the backend
 * This persists the change to the database
 */
export async function executeAIAction(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
  return apiClient.post<ExecuteActionResponse>('/ai/execute', request);
}

// ============================================================================
// SSE Streaming
// ============================================================================

export interface ThinkingData {
  thought: string;
  step?: number;
}

export interface ToolCallData {
  id: string;
  tool: string;
  description: string;
  args?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ToolResultData {
  tool_call_id: string;
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface ToolRequestData {
  request_id: string;
  request_type: string;
  params: Record<string, unknown>;
  timeout_seconds?: number;
}

export interface IterationData {
  current: number;
  max: number;
  status: 'starting' | 'processing' | 'complete' | 'finished';
  description?: string;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onThinking?: (data: ThinkingData) => void;
  onToolCall?: (data: ToolCallData) => void;
  onToolResult?: (data: ToolResultData) => void;
  onToolRequest?: (data: ToolRequestData) => void;
  onIteration?: (data: IterationData) => void;
  onAction?: (action: AIAction) => void;
  onConversation?: (data: { id: string }) => void;
  onUsage?: (data: TokenUsage) => void;
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
  
  // Start the async streaming process
  (async () => {
    try {
      // Get auth token from localStorage (same as apiClient)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Build URL
      const apiBase = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
      const url = `${apiBase}/ai/chat/stream`;
      
      // Helper to make the fetch request
      const makeRequest = async (csrfToken: string | null) => {
        return fetch(url, {
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
        });
      };
      
      // Ensure we have a CSRF token
      let csrfToken = apiClient.getCsrfToken();
      if (!csrfToken) {
        csrfToken = await apiClient.fetchCsrfToken();
      }
      
      // Start streaming
      let response = await makeRequest(csrfToken);
      
      // If CSRF error, refresh token and retry once
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code?.startsWith('CSRF_')) {
          apiClient.clearCsrfToken();
          csrfToken = await apiClient.fetchCsrfToken();
          response = await makeRequest(csrfToken);
        }
      }
      
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
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              callbacks.onDone?.();
              return;
            }
            
            try {
              const event = JSON.parse(data) as SseEvent;
              
              switch (event.type) {
                case 'token':
                  callbacks.onToken?.(event.data);
                  break;
                case 'thinking':
                  callbacks.onThinking?.(event.data);
                  break;
                case 'toolcall':
                  callbacks.onToolCall?.(event.data);
                  break;
                case 'toolresult':
                  callbacks.onToolResult?.(event.data);
                  break;
                case 'toolrequest':
                  callbacks.onToolRequest?.(event.data);
                  break;
                case 'iteration':
                  callbacks.onIteration?.(event.data);
                  break;
                case 'action':
                  callbacks.onAction?.(event.data);
                  break;
                case 'conversation':
                  callbacks.onConversation?.(event.data);
                  break;
                case 'usage':
                  callbacks.onUsage?.(event.data);
                  break;
                case 'done':
                  callbacks.onDone?.();
                  return;
                case 'error':
                  callbacks.onError?.({
                    code: event.code,
                    message: event.message,
                  });
                  return;
              }
            } catch (e) {
              // Not JSON, might be a token directly
              if (data.trim()) {
                callbacks.onToken?.(data);
              }
            }
          }
        }
      }
      
      // If we reach here without a done event, call onDone
      callbacks.onDone?.();
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Aborted by user, don't call onError
      }
      callbacks.onError?.({
        code: 'fetch_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();
  
  return controller;
}
