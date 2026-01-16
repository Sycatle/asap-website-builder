import type { AIAction } from "@/lib/api/ai";

// ============================================================================
// Execution Plan & Steps - "Chef de Projet Digital" Architecture
// ============================================================================

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/** Specialist types that handle tasks */
export type SpecialistType = 
  | 'data_analyst'    // Collects and analyzes data
  | 'content_writer'  // Creates/modifies text
  | 'designer'        // Handles styling and visuals
  | 'strategist'      // Plans structure and flow
  | 'validator'       // Checks quality and consistency
  | 'researcher';     // Gathers external info

export interface ExecutionStep {
  id: string;
  index: number;
  title: string;
  description?: string;
  status: StepStatus;
  specialist?: SpecialistType; // Agent handling this task
  producesOutput?: boolean;
  startedAt?: Date;
  completedAt?: Date;
  error?: {
    message: string;
    cause?: string;
    recoverable: boolean;
  };
}

export interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  currentStep: number;
  hypothesis?: string[];
  reasoning?: string;
}

// ============================================================================
// Tool Cards
// ============================================================================

export interface ToolCall {
  id: string;
  tool: string;
  label: string;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: {
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
  };
  retryable?: boolean;
}

// ============================================================================
// Artifacts (Rich Content)
// ============================================================================

export type ArtifactType = 
  | 'code' 
  | 'table' 
  | 'checklist' 
  | 'timeline' 
  | 'image' 
  | 'diff' 
  | 'json'
  | 'markdown';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title?: string;
  content: unknown;
  actions?: ArtifactAction[];
}

export interface ArtifactAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

// ============================================================================
// Message Structure
// ============================================================================

export interface MessageSource {
  title: string;
  url?: string;
  snippet?: string;
}

export interface MessageContent {
  summary?: string; // Quick result (3 sec read)
  body: string; // Main content
  details?: string; // Collapsible extra details
  artifacts?: Artifact[];
  sources?: MessageSource[];
  warnings?: string[];
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  content: MessageContent;
  plan?: ExecutionPlan;
  toolCalls?: ToolCall[];
  actions?: AIAction[];
  executedActions?: { action: AIAction; success: boolean; error?: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  timestamp: Date;
  isStreaming?: boolean;
  streamingPhase?: 'thinking' | 'searching' | 'executing' | 'writing';
  currentThought?: string;
  currentReasoning?: string;
  currentObservations?: string[];
  currentRecommendations?: string[];
  currentIteration?: { current: number; max: number; description?: string };
}

export interface UserMessage {
  id: string;
  role: 'user';
  content: string;
  attachments?: { type: string; name: string; size?: number }[];
  timestamp: Date;
}

export type Message = UserMessage | AssistantMessage;

// ============================================================================
// Context & Controls
// ============================================================================

export interface ChatContext {
  files?: { name: string; type: string }[];
  pins?: { label: string; value: string }[];
  scopes?: { tools: boolean; web: boolean };
}

export interface ChatControls {
  mode: 'chat' | 'plan' | 'execute' | 'report';
  constraints?: {
    maxLength?: 'short' | 'medium' | 'long';
    tone?: 'casual' | 'professional' | 'technical';
    format?: 'text' | 'markdown' | 'json';
  };
}

// ============================================================================
// Props
// ============================================================================

export interface AIChatPanelProps {
  onClose: () => void;
  showBackButton?: boolean;
}
