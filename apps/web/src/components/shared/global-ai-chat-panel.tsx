"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Layout,
  Palette,
  Type,
  X,
  ArrowLeft,
  MoreHorizontal,
  Loader2,
  Trash2,
  Copy,
  Check,
  Wand2,
  ArrowUp,
  Image,
  Zap,
  Plus,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useUserData } from "@/lib/store/authStore";

// Helper to clean AI response content
// Removes section property dumps that AI sometimes includes
function cleanAIContent(content: string): string {
  // Remove lists of section properties (property_name: value format)
  // Pattern: lines that start with bullet and contain technical property names
  const propertyListPattern = /^(\s*[-*•]\s*)(\w+_\w+|\w+[A-Z]\w+):\s*.+$/gm;
  const technicalPropertyNames = [
    'cta_primary', 'cta_secondary', 'headline_line', 'badge_text', 'dashboard_',
    'social_proof', 'subheadline', 'nav_links', 'show_', 'avatar_'
  ];
  
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let skipPropertyBlock = false;
  let propertyBlockCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect start of property dump (multiple consecutive property-like lines)
    if (trimmed.match(/^[-*•]\s*\w+.*:\s*.+$/) && 
        technicalPropertyNames.some(prop => trimmed.toLowerCase().includes(prop))) {
      propertyBlockCount++;
      if (propertyBlockCount >= 2) {
        skipPropertyBlock = true;
      }
      continue;
    } else {
      propertyBlockCount = 0;
      skipPropertyBlock = false;
    }
    
    if (!skipPropertyBlock) {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Simple markdown renderer component
function MarkdownContent({ content, className }: { content: string; className?: string }) {
  // Clean the content first to remove property dumps
  const cleanedContent = cleanAIContent(content);
  
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const lines = cleanedContent.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    
    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag key={`list-${elements.length}`} className={listType === 'ul' ? 'list-disc pl-4 my-2 space-y-1' : 'list-decimal pl-4 my-2 space-y-1'}>
            {listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };
    
    const parseInline = (text: string): React.ReactNode => {
      // Parse inline elements: bold, italic, code, links
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;
      
      while (remaining) {
        // Bold **text** or __text__
        const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.*?)\2(.*)$/s);
        if (boldMatch) {
          if (boldMatch[1]) parts.push(boldMatch[1]);
          parts.push(<strong key={key++} className="font-semibold">{parseInline(boldMatch[3])}</strong>);
          remaining = boldMatch[4];
          continue;
        }
        
        // Italic *text* or _text_
        const italicMatch = remaining.match(/^(.*?)(\*|_)([^*_]+)\2(.*)$/s);
        if (italicMatch && !italicMatch[1].endsWith('*') && !italicMatch[1].endsWith('_')) {
          if (italicMatch[1]) parts.push(italicMatch[1]);
          parts.push(<em key={key++} className="italic">{italicMatch[3]}</em>);
          remaining = italicMatch[4];
          continue;
        }
        
        // Inline code `code`
        const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
        if (codeMatch) {
          if (codeMatch[1]) parts.push(codeMatch[1]);
          parts.push(<code key={key++} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{codeMatch[2]}</code>);
          remaining = codeMatch[3];
          continue;
        }
        
        // Links [text](url)
        const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);
        if (linkMatch) {
          if (linkMatch[1]) parts.push(linkMatch[1]);
          parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">{linkMatch[2]}</a>);
          remaining = linkMatch[4];
          continue;
        }
        
        parts.push(remaining);
        break;
      }
      
      return parts.length === 1 ? parts[0] : parts;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Code block start/end
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushList();
          // Skip JSON blocks that look like AI actions (contain "type": with action keywords)
          const isAIActionBlock = codeBlockLang === 'json' && 
            codeBlockContent.includes('"type"') && 
            /("type"\s*:\s*"(update_section|update_property|add_section|remove_section|reorder_sections|duplicate_section|update_theme|update_metadata|generate_content|UPDATE_SECTION_PROPERTY)"|"section_id"|"property")/i.test(codeBlockContent);
          
          if (!isAIActionBlock) {
            elements.push(
              <pre key={`code-${elements.length}`} className="my-2 p-3 bg-muted rounded-lg overflow-x-auto">
                <code className="text-xs font-mono">{codeBlockContent.trim()}</code>
              </pre>
            );
          }
          codeBlockContent = '';
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }
      
      // Headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        flushList();
        const level = headerMatch[1].length;
        const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-medium', 'text-xs font-medium'];
        elements.push(<div key={`h-${elements.length}`} className={`${sizes[level-1]} my-2`}>{parseInline(headerMatch[2])}</div>);
        continue;
      }
      
      // Unordered list
      const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        listItems.push(ulMatch[1]);
        continue;
      }
      
      // Ordered list
      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (olMatch) {
        if (listType !== 'ol') flushList();
        listType = 'ol';
        listItems.push(olMatch[1]);
        continue;
      }
      
      // Horizontal rule
      if (line.match(/^[-*_]{3,}$/)) {
        flushList();
        elements.push(<hr key={`hr-${elements.length}`} className="my-3 border-border" />);
        continue;
      }
      
      // Blockquote
      if (line.startsWith('>')) {
        flushList();
        elements.push(
          <blockquote key={`bq-${elements.length}`} className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
            {parseInline(line.slice(1).trim())}
          </blockquote>
        );
        continue;
      }
      
      // Empty line
      if (!line.trim()) {
        flushList();
        continue;
      }
      
      // Regular paragraph
      flushList();
      elements.push(<p key={`p-${elements.length}`} className="my-1">{parseInline(line)}</p>);
    }
    
    flushList();
    return elements;
  };
  
  return <div className={cn("prose-sm", className)}>{parseMarkdown(content)}</div>;
}
import { streamChatMessage, type AIAction, type ThinkingData, type ToolCallData, type ToolResultData, type IterationData } from "@/lib/api/ai";
import { useAIActionExecutor } from "@/hooks/useAIActionExecutor";

// Helper to format action labels for display
function formatActionLabel(action: AIAction): string {
  switch (action.type) {
    case 'update_section':
    case 'update_property':
      return `Update ${action.property || 'section'}`;
    case 'add_section':
      return `Add ${action.section_type || 'section'}`;
    case 'remove_section':
      return 'Remove section';
    case 'reorder_sections':
      return 'Reorder sections';
    case 'duplicate_section':
      return 'Duplicate section';
    case 'update_theme':
      return 'Update theme';
    case 'update_metadata':
      return 'Update metadata';
    case 'generate_content':
      return 'Generate content';
    default:
      return action.type.replace(/_/g, ' ');
  }
}

// Tool icons and labels
const TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  'update_section': { icon: Wand2, label: 'Updating section', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'update_section_property': { icon: Wand2, label: 'Updating property', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'add_section': { icon: Plus, label: 'Adding section', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  'remove_section': { icon: Trash2, label: 'Removing section', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  'reorder_sections': { icon: Layout, label: 'Reordering', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  'update_theme': { icon: Palette, label: 'Updating theme', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  'generate_image': { icon: Image, label: 'Generating image', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  'generate_content': { icon: Sparkles, label: 'Generating content', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  'analyze': { icon: Sparkles, label: 'Analyzing', color: 'text-primary', bgColor: 'bg-primary/10' },
  'thinking': { icon: Sparkles, label: 'Thinking', color: 'text-primary', bgColor: 'bg-primary/10' },
  'default': { icon: Zap, label: 'Processing', color: 'text-primary', bgColor: 'bg-primary/10' },
};

// Chain of thought step type
interface ChainStep {
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
interface ThinkingState {
  thought: string;
  step?: number;
}

// Tool call state in a message  
interface ToolCallState {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: { success: boolean; message?: string };
}

// Iteration state
interface IterationState {
  current: number;
  max: number;
  status: 'starting' | 'processing' | 'complete' | 'finished';
  description?: string;
}

interface Message {
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
}

interface GlobalAIChatPanelProps {
  onClose: () => void;
  showBackButton?: boolean;
  websiteNameOverride?: string;
  websiteSlugOverride?: string | null;
}

// Sound effects hook (optional subtle audio feedback)
function useSoundEffects() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-chat-sounds') !== 'false';
    }
    return true;
  });

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('ai-chat-sounds', String(newVal));
      return newVal;
    });
  }, []);

  const playSound = useCallback((type: 'send' | 'receive' | 'success' | 'error') => {
    if (!enabled || typeof window === 'undefined') return;
    
    // Simple tone generation with Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = { send: 880, receive: 440, success: 660, error: 220 };
      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not supported, ignore
    }
  }, [enabled]);

  return { enabled, toggle, playSound };
}

export function GlobalAIChatPanel({ 
  onClose, 
  showBackButton = false,
  websiteNameOverride,
  websiteSlugOverride,
}: GlobalAIChatPanelProps) {
  const { t } = useTranslation(['common', 'editor']);
  const { currentWebsite } = useWebsiteContext();
  const userData = useUserData();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autoExecuteActions, setAutoExecuteActions] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound, playSound } = useSoundEffects();
  
  // AI Action Executor
  const { executeAction, isExecuting } = useAIActionExecutor({
    websiteId: currentWebsite?.id || '',
    onActionExecuted: (result) => {
      // Update message with execution result
      setMessages(prev => prev.map(m => {
        if (m.role === 'assistant' && m.actions?.some(a => a === result.action)) {
          const existingExecuted = m.executedActions || [];
          return {
            ...m,
            executedActions: [...existingExecuted, {
              action: result.action,
              success: result.success,
              error: result.error,
            }],
          };
        }
        return m;
      }));
      playSound(result.success ? 'success' : 'error');
    },
  });

  const _websiteName = websiteNameOverride ?? currentWebsite?.title ?? 'ASAP';
  const websiteSlug = websiteSlugOverride !== undefined ? websiteSlugOverride : (currentWebsite?.slug ?? null);
  
  const userName = userData?.name || userData?.email?.split('@')[0] || 'You';
  const userAvatar = userData?.avatar;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Check if user is near bottom for scroll button
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }
  }, [messages.length]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isLoading, scrollToBottom]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Auto-execute actions when they arrive
  const handleActionReceived = useCallback(async (action: AIAction, _messageId: string): Promise<boolean> => {
    if (!autoExecuteActions) return true; // Skip but consider success
    
    try {
      // Execute the action
      await executeAction(action);
      return true;
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }, [autoExecuteActions, executeAction]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    // Mark current streaming message as complete
    setMessages(prev => prev.map(m => 
      m.isStreaming ? { ...m, isStreaming: false } : m
    ));
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !currentWebsite?.id) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    playSound('send');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actions: [],
      toolCalls: [],
      chainSteps: [],
      isStreaming: true,
      isAnalyzing: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Helper to add chain step
    const addChainStep = (step: Omit<ChainStep, 'id' | 'timestamp'>) => {
      const newStep: ChainStep = {
        ...step,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      setMessages(prev => prev.map(m => {
        if (m.id !== assistantMessageId) return m;
        const existingSteps = m.chainSteps || [];
        return { ...m, chainSteps: [...existingSteps, newStep] };
      }));
      return newStep.id;
    };

    // Helper to update chain step
    const updateChainStep = (stepId: string, updates: Partial<ChainStep>) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== assistantMessageId) return m;
        const steps = m.chainSteps || [];
        return {
          ...m,
          chainSteps: steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
        };
      }));
    };

    // Track current chain step IDs
    const stepIdMap = new Map<string, string>();

    // Create abort controller for this request
    abortControllerRef.current = streamChatMessage(
      {
        message: userMessage.content,
        website_id: currentWebsite.id,
        conversation_id: conversationId ?? undefined,
      },
      {
        onToken: (token: string) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: m.content + token, thinking: undefined, isAnalyzing: false }
              : m
          ));
        },
        onThinking: (data) => {
          // Add or update thinking step in chain
          const stepKey = `thinking_${data.step || 0}`;
          
          // Determine status based on the new API response
          const isStarting = data.status === 'starting';
          const isCompleted = data.status === 'completed';
          const stepStatus: ChainStep['status'] = isStarting ? 'running' : isCompleted ? 'completed' : 'running';
          
          if (!stepIdMap.has(stepKey)) {
            // New step - add it
            const stepId = addChainStep({
              type: 'thinking',
              title: data.thought,
              description: isCompleted && data.insight ? data.insight : undefined,
              status: stepStatus,
              tool: 'thinking',
            });
            stepIdMap.set(stepKey, stepId);
          } else {
            // Existing step - update with new status and insight
            updateChainStep(stepIdMap.get(stepKey)!, {
              title: data.thought,
              description: isCompleted && data.insight ? data.insight : undefined,
              status: stepStatus,
            });
          }
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, thinking: { thought: data.thought, step: data.step } }
              : m
          ));
        },
        onToolCall: (data) => {
          // Add tool call to chain steps
          const stepKey = `tool_${data.id}`;
          if (!stepIdMap.has(stepKey)) {
            const stepId = addChainStep({
              type: 'tool',
              title: data.description || data.tool,
              description: data.args ? `Args: ${JSON.stringify(data.args).slice(0, 100)}...` : undefined,
              status: data.status === 'running' ? 'running' : data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'pending',
              tool: data.tool,
            });
            stepIdMap.set(stepKey, stepId);
          } else {
            const newStatus = data.status === 'running' ? 'running' : data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'pending';
            updateChainStep(stepIdMap.get(stepKey)!, { status: newStatus as ChainStep['status'] });
          }
          
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const existing = m.toolCalls || [];
            const existingIdx = existing.findIndex(tc => tc.id === data.id);
            if (existingIdx >= 0) {
              // Update existing tool call
              const updated = [...existing];
              updated[existingIdx] = { ...updated[existingIdx], status: data.status };
              return { ...m, toolCalls: updated, isAnalyzing: false };
            }
            // Add new tool call
            return { 
              ...m, 
              thinking: undefined,
              isAnalyzing: false,
              toolCalls: [...existing, {
                id: data.id,
                tool: data.tool,
                description: data.description,
                status: data.status,
              }]
            };
          }));
        },
        onToolResult: (data) => {
          // Update chain step with result
          const stepKey = `tool_${data.tool_call_id}`;
          if (stepIdMap.has(stepKey)) {
            updateChainStep(stepIdMap.get(stepKey)!, {
              status: data.success ? 'completed' : 'failed',
              result: { success: data.success, message: data.message },
            });
          }
          
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const toolCalls = m.toolCalls || [];
            return {
              ...m,
              toolCalls: toolCalls.map(tc => 
                tc.id === data.tool_call_id 
                  ? { ...tc, status: data.success ? 'completed' as const : 'failed' as const, result: { success: data.success, message: data.message } }
                  : tc
              ),
            };
          }));
        },
        onIteration: (data) => {
          // Add iteration step to chain
          const stepKey = `iteration_${data.current}`;
          if (!stepIdMap.has(stepKey)) {
            const stepId = addChainStep({
              type: 'thinking',
              title: `Iteration ${data.current}/${data.max}`,
              description: data.description,
              status: data.status === 'complete' || data.status === 'finished' ? 'completed' : 'running',
              tool: 'thinking',
            });
            stepIdMap.set(stepKey, stepId);
          } else {
            updateChainStep(stepIdMap.get(stepKey)!, {
              status: data.status === 'complete' || data.status === 'finished' ? 'completed' : 'running',
              description: data.description,
            });
          }
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, iteration: data }
              : m
          ));
        },
        onAction: (action: AIAction) => {
          // Add action execution step to chain
          const actionLabel = formatActionLabel(action);
          const stepId = addChainStep({
            type: 'result',
            title: `Executing: ${actionLabel}`,
            status: 'running',
            tool: action.type.includes('add') ? 'add_section' : action.type.includes('remove') ? 'remove_section' : 'update_section',
          });
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, actions: [...(m.actions || []), action] }
              : m
          ));
          
          // Auto-execute the action with feedback
          handleActionReceived(action, assistantMessageId).then((success: boolean) => {
            updateChainStep(stepId, {
              status: success ? 'completed' : 'failed',
              result: { success, message: success ? 'Applied successfully' : 'Failed to apply' },
            });
          }).catch(() => {
            updateChainStep(stepId, {
              status: 'failed',
              result: { success: false, message: 'Execution error' },
            });
          });
        },
        onConversation: (data: { id: string }) => {
          // Store conversation ID for follow-up messages
          setConversationId(data.id);
        },
        onUsage: (data) => {
          // Store token usage in the message
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, usage: data }
              : m
          ));
        },
        onDone: () => {
          // Mark all remaining chain steps as completed
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const steps = m.chainSteps || [];
            return {
              ...m,
              isStreaming: false,
              isAnalyzing: false,
              chainSteps: steps.map(s => s.status === 'running' || s.status === 'pending' ? { ...s, status: 'completed' as const } : s),
            };
          }));
          setIsLoading(false);
          abortControllerRef.current = null;
          playSound('receive');
        },
        onError: (error: { code: string; message: string }) => {
          console.error('AI chat error:', error);
          // Mark chain steps as failed
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const steps = m.chainSteps || [];
            return {
              ...m,
              content: error.message || t('editor:ai.error'),
              isStreaming: false,
              isAnalyzing: false,
              error: true,
              chainSteps: steps.map(s => s.status === 'running' ? { ...s, status: 'failed' as const } : s),
            };
          }));
          setIsLoading(false);
          abortControllerRef.current = null;
          playSound('error');
        },
      }
    );
  }, [input, isLoading, currentWebsite?.id, conversationId, t, handleActionReceived, playSound]);

  // Retry failed message
  const handleRetry = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Find the user message before this assistant message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }
    
    if (userMessageIndex >= 0) {
      const userMessage = messages[userMessageIndex];
      // Remove the user message and all messages after it (including the failed one)
      setMessages(prev => prev.slice(0, userMessageIndex));
      // Re-send with the original user message content
      setInput(userMessage.content);
      setTimeout(() => handleSend(), 100);
    }
  }, [messages, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const insertPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - fixed at top */}
      <header className="shrink-0 h-14 px-3 sm:px-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          {/* AI Avatar avec indicateur live */}
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background"></span>
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">ASAP AI</h1>
              <Badge className="h-5 text-[10px] bg-gradient-to-r from-primary/20 to-violet-500/20 text-primary border-primary/30 hover:bg-primary/30">
                Beta
              </Badge>
            </div>
            {websiteSlug && (
              <p className="text-xs text-muted-foreground">
                {websiteSlug}.asap.cool
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('editor:ai.clearChat')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleSound}>
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 mr-2" />
                ) : (
                  <VolumeX className="h-4 w-4 mr-2" />
                )}
                {soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setAutoExecuteActions(!autoExecuteActions)}
              >
                <Zap className={cn("h-4 w-4 mr-2", autoExecuteActions && "text-primary")} />
                {autoExecuteActions ? 'Auto-execute on' : 'Auto-execute off'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {!showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Area - scrollable, takes remaining space */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <EmptyState onPromptSelect={insertPrompt} userName={userName} />
          </div>
        ) : (
          <div className="flex flex-col min-h-full justify-end">
            <div className="space-y-3">
              {messages.map((message, idx) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  userAvatar={userAvatar}
                  userInitials={userInitials}
                  userName={userName}
                  onCopy={() => copyMessage(message.id, message.content)}
                  isCopied={copiedId === message.id}
                  onRetry={message.error ? () => handleRetry(message.id) : undefined}
                  animationDelay={idx * 50}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border shadow-lg backdrop-blur-sm hover:bg-muted transition-all animate-in fade-in slide-in-from-bottom-2"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="text-xs font-medium">New messages</span>
          </button>
        )}
      </div>

      {/* Input Area - fixed at bottom */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-3 z-10">
        {/* Quick Actions Pills */}
        {messages.length === 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <QuickPill 
              icon={Plus} 
              label={t('editor:ai.actions.addSection')}
              color="primary"
              onClick={() => insertPrompt("Add a new section for ")}
              index={0}
            />
            <QuickPill 
              icon={Palette} 
              label={t('editor:ai.actions.changeColors')}
              color="pink"
              onClick={() => insertPrompt("Change the color scheme to ")}
              index={1}
            />
            <QuickPill 
              icon={Type} 
              label={t('editor:ai.actions.editText')}
              color="blue"
              onClick={() => insertPrompt("Update the text in ")}
              index={2}
            />
            <QuickPill 
              icon={Image} 
              label={t('editor:ai.actions.addImage')}
              color="emerald"
              onClick={() => insertPrompt("Add an image to ")}
              index={3}
            />
          </div>
        )}
        
        {/* Input Box */}
        <div className="relative">
          <div className={cn(
            "flex items-end gap-2 rounded-2xl border-2 bg-card p-2 transition-all",
            "focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10"
          )}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('editor:ai.placeholder')}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 py-2 px-2 text-sm"
              rows={1}
            />
            
            <Tooltip>
              <TooltipTrigger asChild>
                {isLoading ? (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-xl shrink-0 transition-all border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
                    onClick={handleStopStreaming}
                  >
                    <StopCircle className="h-4 w-4 text-red-500" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl shrink-0 transition-all",
                      input.trim() 
                        ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105" 
                        : "bg-muted text-muted-foreground"
                    )}
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !currentWebsite?.id}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>{isLoading ? t('editor:ai.stop') : t('editor:ai.send')}</span>
                {!isLoading && <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">↵</kbd>}
              </TooltipContent>
            </Tooltip>
          </div>
          
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
            {t('editor:ai.hint')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ThinkingIndicator - Simple bouncing dots for initial thinking
 */
function ThinkingIndicator({ thought, step }: { thought: string; step?: number }) {
  return (
    <div className="mb-3 flex items-start gap-2 text-muted-foreground animate-in fade-in-0 slide-in-from-left-2">
      <div className="shrink-0 mt-0.5">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {step && <span className="text-[10px] text-primary/60 mr-1.5">Step {step}</span>}
        <p className="text-xs italic text-muted-foreground/80">{thought}</p>
      </div>
    </div>
  );
}

/**
 * ChainOfThoughtsDisplay - Visual chain of thoughts with steps
 */
function ChainOfThoughtsDisplay({ steps, isStreaming }: { steps: ChainStep[]; isStreaming?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const hasRunning = steps.some(s => s.status === 'running');
  
  if (steps.length === 0) return null;
  
  return (
    <div className="mb-4 animate-in fade-in-0 slide-in-from-left-2">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        <div className="flex items-center gap-1.5">
          {hasRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : completedCount === totalCount ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {hasRunning ? 'Processing...' : completedCount === totalCount ? 'Completed' : 'Thinking'}
          </span>
        </div>
        
        {/* Progress indicator */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{completedCount}/{totalCount}</span>
        </div>
        
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform",
          isCollapsed && "-rotate-90"
        )} />
      </button>
      
      {/* Steps list */}
      {!isCollapsed && (
        <div className="space-y-1.5 pl-1 border-l-2 border-muted ml-1.5">
          {steps.map((step, idx) => {
            const config = TOOL_CONFIG[step.tool || step.type] || TOOL_CONFIG['default'];
            const Icon = config.icon;
            const isRunning = step.status === 'running';
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isPending = step.status === 'pending';
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-start gap-2 pl-3 py-1.5 transition-all relative",
                  "animate-in fade-in-0 slide-in-from-left-1",
                  isRunning && "bg-primary/5 rounded-r-lg"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Connection dot on the border */}
                <div className={cn(
                  "absolute -left-[5px] top-3 w-2 h-2 rounded-full border-2 border-background",
                  isCompleted && "bg-green-500",
                  isRunning && "bg-primary animate-pulse",
                  isFailed && "bg-red-500",
                  isPending && "bg-muted"
                )} />
                
                {/* Step icon */}
                <div className={cn(
                  "shrink-0 h-6 w-6 rounded-md flex items-center justify-center",
                  config.bgColor
                )}>
                  {isRunning ? (
                    <Loader2 className={cn("h-3.5 w-3.5 animate-spin", config.color)} />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : isFailed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isPending ? "text-muted-foreground" : config.color)} />
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium",
                    isPending && "text-muted-foreground",
                    isFailed && "text-red-600"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  )}
                  {step.result?.message && (
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      step.result.success ? "text-green-600" : "text-red-600"
                    )}>
                      {step.result.message}
                    </p>
                  )}
                </div>
                
                {/* Status badge */}
                {isRunning && (
                  <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Running
                  </span>
                )}
              </div>
            );
          })}
          
          {/* Show "more steps coming" indicator when streaming */}
          {isStreaming && hasRunning && (
            <div className="flex items-center gap-2 pl-3 py-1.5 text-muted-foreground/60">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px]">More steps...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EmptyState - Welcome avec style ASAP et animations
 */
function EmptyState({ 
  onPromptSelect,
  userName,
}: { 
  onPromptSelect: (prompt: string) => void;
  userName: string;
}) {
  const { t } = useTranslation(['editor']);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('editor:ai.welcome.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('editor:ai.welcome.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('editor:ai.welcome.greeting.evening', { defaultValue: 'Good evening' });
  };
  
  const suggestions = [
    {
      icon: Layout,
      title: t('editor:ai.suggestions.hero.title'),
      description: t('editor:ai.suggestions.hero.description'),
      prompt: "Make the headline more impactful and add a subtle animation",
      gradient: "from-primary/20 to-violet-500/20",
      iconColor: "text-primary",
      hoverGradient: "hover:from-primary/30 hover:to-violet-500/30",
    },
    {
      icon: Palette,
      title: t('editor:ai.suggestions.theme.title'),
      description: t('editor:ai.suggestions.theme.description'),
      prompt: "Use a dark theme with blue accents",
      gradient: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-500",
      hoverGradient: "hover:from-pink-500/30 hover:to-rose-500/30",
    },
    {
      icon: Type,
      title: t('editor:ai.suggestions.content.title'),
      description: t('editor:ai.suggestions.content.description'),
      prompt: "Rewrite the about section to be more professional",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
      hoverGradient: "hover:from-blue-500/30 hover:to-cyan-500/30",
    },
    {
      icon: Wand2,
      title: t('editor:ai.suggestions.magic.title', { defaultValue: 'Surprise me' }),
      description: t('editor:ai.suggestions.magic.description', { defaultValue: 'Let AI enhance your site' }),
      prompt: "Make my website look more modern and professional",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-500",
      hoverGradient: "hover:from-amber-500/30 hover:to-orange-500/30",
    },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4 animate-in fade-in-0 duration-500">
      {/* AI Avatar with glow effect */}
      <div className="relative mb-6 animate-in zoom-in-50 duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-violet-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />
        <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30">
          <Sparkles className="h-10 w-10 text-white animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 border-4 border-background flex items-center justify-center shadow-lg">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl font-semibold mb-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-100">
        {getGreeting()}, {userName.split(' ')[0]} 👋
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150">
        {t('editor:ai.welcome.description')}
      </p>
      
      {/* Keyboard shortcut hint */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground animate-in fade-in-0 duration-500 delay-200">
        <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">⌘</kbd>
        <span>+</span>
        <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">K</kbd>
        <span>to focus</span>
      </div>
      
      {/* Suggestions Grid */}
      <div className="w-full max-w-sm space-y-2">
        {suggestions.map((suggestion, index) => (
          <Card 
            key={index}
            className={cn(
              "cursor-pointer border-transparent transition-all duration-300 hover:scale-[1.02] group animate-in fade-in-0 slide-in-from-bottom-2",
              "bg-gradient-to-r",
              suggestion.gradient,
              suggestion.hoverGradient,
              "hover:shadow-lg hover:border-border/50"
            )}
            style={{ animationDelay: `${200 + index * 75}ms` }}
            onClick={() => onPromptSelect(suggestion.prompt)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                suggestion.iconColor
              )}>
                <suggestion.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
              </div>
              <ArrowUp className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pro tip */}
      <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground max-w-sm animate-in fade-in-0 duration-500 delay-500">
        <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-medium">Pro tip:</span> Be specific! Instead of "change colors", try "use a warm orange and cream color palette".
        </p>
      </div>
    </div>
  );
}

/**
 * QuickPill - Quick action pill style ASAP with animations
 */
function QuickPill({ 
  icon: Icon, 
  label,
  color,
  onClick,
  index = 0,
}: { 
  icon: React.ElementType;
  label: string;
  color: 'primary' | 'pink' | 'blue' | 'emerald' | 'violet';
  onClick: () => void;
  index?: number;
}) {
  const colorClasses = {
    primary: 'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-primary/25',
    pink: 'hover:bg-pink-500 hover:text-white hover:border-pink-500 hover:shadow-pink-500/25',
    blue: 'hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-blue-500/25',
    emerald: 'hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-emerald-500/25',
    violet: 'hover:bg-violet-500 hover:text-white hover:border-violet-500 hover:shadow-violet-500/25',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border bg-card text-sm shrink-0",
        "transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        colorClasses[color]
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

/**
 * MessageBubble - iMessage/WhatsApp style bubble with animations
 */
function MessageBubble({ 
  message, 
  userAvatar, 
  userInitials, 
  userName,
  onCopy,
  isCopied,
  onRetry,
  animationDelay = 0,
}: { 
  message: Message;
  userAvatar?: string;
  userInitials: string;
  userName: string;
  onCopy: () => void;
  isCopied: boolean;
  onRetry?: () => void;
  animationDelay?: number;
}) {
  const isUser = message.role === 'user';
  const hasError = message.error;
  
  // Memoize action status calculations
  const actionStats = useMemo(() => {
    if (!message.actions?.length) return null;
    const total = message.actions.length;
    const executed = message.executedActions?.length || 0;
    const successful = message.executedActions?.filter(e => e.success).length || 0;
    const failed = message.executedActions?.filter(e => !e.success).length || 0;
    return { total, executed, successful, failed };
  }, [message.actions, message.executedActions]);
  
  return (
    <div 
      className={cn(
        "flex items-end gap-2 group animate-in fade-in-0 slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Avatar */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md ring-2 ring-background">
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white">
            <Sparkles className={cn("h-4 w-4", message.isStreaming && "animate-pulse")} />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md ring-2 ring-background">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Bubble */}
      <div className={cn("flex flex-col gap-1", isUser && "max-w-[80%]")}>
        <div className={cn(
          "transition-all",
          isUser 
            ? "px-4 py-2.5 shadow-sm bg-primary text-primary-foreground rounded-2xl rounded-br-md" 
            : "py-1",
          hasError && !isUser && "px-4 py-2.5 border border-red-500/50 bg-red-50 dark:bg-red-950/30 rounded-2xl",
          message.isStreaming && !isUser && "border-l-2 border-primary/50 pl-3"
        )}>
          {/* Error indicator */}
          {hasError && !isUser && (
            <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">Failed to generate response</span>
            </div>
          )}
          
          {/* Iteration indicator */}
          {!isUser && message.iteration && message.iteration.status !== 'finished' && (
            <div className="mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3 animate-spin" />
                  Iteration {message.iteration.current}/{message.iteration.max}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">{message.iteration.status}</span>
              </div>
              {message.iteration.description && (
                <p className="text-xs text-muted-foreground">{message.iteration.description}</p>
              )}
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${(message.iteration.current / message.iteration.max) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Chain of Thoughts - Visual step-by-step display */}
          {!isUser && message.chainSteps && message.chainSteps.length > 0 && (
            <ChainOfThoughtsDisplay steps={message.chainSteps} isStreaming={message.isStreaming} />
          )}
          
          {/* Simple thinking indicator when no chain steps */}
          {!isUser && message.thinking && (!message.chainSteps || message.chainSteps.length === 0) && (
            <ThinkingIndicator thought={message.thinking.thought} step={message.thinking.step} />
          )}
          
          {/* Tool calls display (ChatGPT style) */}
          {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.toolCalls.map((toolCall) => {
                const config = TOOL_CONFIG[toolCall.tool] || TOOL_CONFIG['default'];
                const Icon = config.icon;
                const isRunning = toolCall.status === 'running' || toolCall.status === 'pending';
                const isCompleted = toolCall.status === 'completed';
                const isFailed = toolCall.status === 'failed';
                
                return (
                  <div 
                    key={toolCall.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all animate-in fade-in-0 slide-in-from-left-2",
                      isRunning && "bg-primary/5 border-primary/30",
                      isCompleted && "bg-green-500/5 border-green-500/30",
                      isFailed && "bg-red-500/5 border-red-500/30"
                    )}
                  >
                    <div className={cn(
                      "shrink-0 h-6 w-6 rounded-md flex items-center justify-center",
                      isRunning && "bg-primary/10",
                      isCompleted && "bg-green-500/10",
                      isFailed && "bg-red-500/10"
                    )}>
                      {isRunning ? (
                        <Loader2 className={cn("h-3.5 w-3.5 animate-spin", config.color)} />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : isFailed ? (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{toolCall.description}</p>
                      {toolCall.result?.message && (
                        <p className={cn(
                          "text-[10px] truncate mt-0.5",
                          toolCall.result.success ? "text-green-600" : "text-red-600"
                        )}>
                          {toolCall.result.message}
                        </p>
                      )}
                    </div>
                    {isRunning && (
                      <span className="text-[10px] text-muted-foreground">Running...</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Message content with markdown rendering */}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed">
              <MarkdownContent content={message.content} />
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
              )}
            </div>
          )}
          
          {/* AI Actions indicator - improved design */}
          {!isUser && message.actions && message.actions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              {/* Summary bar */}
              {actionStats && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    {actionStats.total} action{actionStats.total > 1 ? 's' : ''}
                  </span>
                  {actionStats.executed > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      {actionStats.successful > 0 && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {actionStats.successful}
                        </span>
                      )}
                      {actionStats.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {actionStats.failed}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Action list */}
              <div className="space-y-1.5">
                {message.actions.map((action, idx) => {
                  const executed = message.executedActions?.find(e => e.action === action);
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors",
                        executed?.success && "bg-green-500/10",
                        executed?.success === false && "bg-red-500/10",
                        !executed && "bg-muted/50"
                      )}
                    >
                      {executed ? (
                        executed.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{executed.error || 'Action failed'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                      )}
                      <span className={cn(
                        "truncate flex-1",
                        executed?.success === false && "text-red-600 dark:text-red-400"
                      )}>
                        {formatActionLabel(action)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Timestamp, Tokens & Actions */}
        <div className={cn(
          "flex items-center gap-2 px-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {/* Token usage for assistant messages */}
          {!isUser && message.usage && (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  {message.usage.total_tokens} tokens
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs space-y-0.5">
                  <p>Prompt: {message.usage.prompt_tokens}</p>
                  <p>Completion: {message.usage.completion_tokens}</p>
                  <p className="font-medium">Total: {message.usage.total_tokens}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Copy button */}
          {!isUser && !hasError && message.content && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCopy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{isCopied ? 'Copied!' : 'Copy message'}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Retry button for errors */}
          {hasError && onRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Try again</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalAIChatPanel;
