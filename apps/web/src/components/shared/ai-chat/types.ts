import type { AIAction } from "@/lib/api/ai";

// Chain of thought step type
export interface ChainStep {
  id: string;
  type: 'thinking' | 'tool' | 'result';
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: Date;
  tool?: string;
  result?: { success: boolean; message?: string };
}

// Thinking/processing state in a message
export interface ThinkingState {
  thought: string;
  step?: number;
}

// Tool call state in a message  
export interface ToolCallState {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: { success: boolean; message?: string };
}

// Iteration state
export interface IterationState {
  current: number;
  max: number;
  status: 'starting' | 'processing' | 'complete' | 'finished';
  description?: string;
}

// Used tool information (displayed after response)
export interface UsedTool {
  id: string;
  name: string;
  description: string;
  success: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  executedActions?: { action: AIAction; success: boolean; error?: string }[];
  isStreaming?: boolean;
  error?: boolean;
  // Chain of thoughts
  thinking?: ThinkingState;
  toolCalls?: ToolCallState[];
  iteration?: IterationState;
  chainSteps?: ChainStep[];
  isAnalyzing?: boolean;
  // Token usage
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  // Used tools (for display after completion)
  usedTools?: UsedTool[];
}

export interface GlobalAIChatPanelProps {
  onClose: () => void;
  showBackButton?: boolean;
  websiteNameOverride?: string;
  websiteSlugOverride?: string | null;
}
