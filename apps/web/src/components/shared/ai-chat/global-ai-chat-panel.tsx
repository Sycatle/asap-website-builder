"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  X,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  Undo2,
  Eye,
  History,
} from 'lucide-react';

import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { useUserData } from '@/lib/store/authStore';
import { streamChatMessage, type AIAction } from '@/lib/api/ai';
import { useAIActionExecutor } from '@/hooks/useAIActionExecutor';

import type { 
  AIChatPanelProps, 
  Message, 
  UserMessage, 
  AssistantMessage,
  ExecutionPlan,
  ExecutionStep,
  ToolCall,
  ChatContext,
  ChatControls,
} from './types';

import {
  MessageBubble,
  EmptyState,
  ContextBar,
  ChatInput,
} from './components';

export function GlobalAIChatPanel({ onClose, showBackButton = false }: AIChatPanelProps) {
  const { currentWebsite } = useWebsiteContext();
  const userData = useUserData();
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Context & Controls
  const [context, setContext] = useState<ChatContext>({
    scopes: { tools: true, web: false },
  });
  const [controls, setControls] = useState<ChatControls>({
    mode: 'chat',
    constraints: { maxLength: 'medium', tone: 'professional' },
  });
  
  // UI state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // User info
  const websiteSlug = currentWebsite?.slug ?? null;
  const userName = userData?.name || userData?.email?.split('@')[0] || 'Vous';
  const userAvatar = userData?.avatar;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  // AI Action Executor
  const { executeAction } = useAIActionExecutor({
    websiteId: currentWebsite?.id || '',
    onActionExecuted: (result) => {
      setMessages(prev => prev.map(m => {
        if (m.role === 'assistant' && m.actions?.some(a => a === result.action)) {
          return {
            ...m,
            executedActions: [...(m.executedActions || []), {
              action: result.action,
              success: result.success,
              error: result.error,
            }],
          };
        }
        return m;
      }));
    },
  });

  // Scroll handling
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100 && messages.length > 0);
    }
  }, [messages.length]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isLoading, scrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Stop streaming
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.map(m => 
      m.role === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m
    ));
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !currentWebsite?.id) return;

    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: AssistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: { body: '' },
      plan: { id: crypto.randomUUID(), steps: [], currentStep: 0 },
      toolCalls: [],
      actions: [],
      timestamp: new Date(),
      isStreaming: true,
      streamingPhase: 'thinking',
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Track plan steps
    const planSteps: ExecutionStep[] = [];
    let stepCounter = 0;

    const addPlanStep = (title: string, description?: string): string => {
      const step: ExecutionStep = {
        id: crypto.randomUUID(),
        index: stepCounter++,
        title,
        description,
        status: 'running',
      };
      planSteps.push(step);
      updateAssistantMessage({ plan: { id: assistantMessage.plan!.id, steps: [...planSteps], currentStep: step.index } });
      return step.id;
    };

    const updatePlanStep = (stepId: string, updates: Partial<ExecutionStep>) => {
      const stepIdx = planSteps.findIndex(s => s.id === stepId);
      if (stepIdx >= 0) {
        planSteps[stepIdx] = { ...planSteps[stepIdx], ...updates };
        updateAssistantMessage({ plan: { id: assistantMessage.plan!.id, steps: [...planSteps], currentStep: planSteps.findIndex(s => s.status === 'running') } });
      }
    };

    const updateAssistantMessage = (updates: Partial<AssistantMessage>) => {
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId ? { ...m, ...updates } as AssistantMessage : m
      ));
    };

    abortControllerRef.current = streamChatMessage(
      {
        message: userMessage.content,
        website_id: currentWebsite.id,
        conversation_id: conversationId ?? undefined,
      },
      {
        onToken: (token: string) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              content: { ...msg.content, body: (msg.content.body || '') + token },
              streamingPhase: 'writing',
            };
          }));
        },
        
        onThinking: (data) => {
          const stepId = addPlanStep(data.thought, data.insight);
          if (data.status === 'completed') {
            updatePlanStep(stepId, { status: 'done', confidence: 85 });
          }
        },
        
        onToolCall: (data) => {
          updateAssistantMessage({ streamingPhase: 'executing' });
          
          const toolCall: ToolCall = {
            id: data.id,
            tool: data.tool,
            label: data.description || data.tool,
            status: data.status as ToolCall['status'],
            input: data.args as Record<string, unknown>,
          };
          
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            const existing = msg.toolCalls || [];
            const existingIdx = existing.findIndex(t => t.id === data.id);
            if (existingIdx >= 0) {
              const updated = [...existing];
              updated[existingIdx] = { ...updated[existingIdx], status: data.status as ToolCall['status'] };
              return { ...msg, toolCalls: updated };
            }
            return { ...msg, toolCalls: [...existing, toolCall] };
          }));
        },
        
        onToolResult: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              toolCalls: msg.toolCalls?.map(t => 
                t.id === data.tool_call_id 
                  ? { 
                      ...t, 
                      status: data.success ? 'done' as const : 'failed' as const,
                      output: { success: data.success, error: data.message, data: data.data },
                    }
                  : t
              ),
            };
          }));
        },
        
        onToolRequest: async () => {},
        
        onIteration: (data) => {
          const stepId = addPlanStep(`Itération ${data.current}/${data.max}`, data.description);
          if (data.status === 'complete' || data.status === 'finished') {
            updatePlanStep(stepId, { status: 'done' });
          }
        },
        
        onPhase: (data) => {
          updateAssistantMessage({ 
            streamingPhase: data.phase as AssistantMessage['streamingPhase'],
          });
        },
        
        onPlanStep: (data) => {
          const existingStep = planSteps.find(s => s.id === data.id);
          if (existingStep) {
            updatePlanStep(data.id, { 
              status: data.status,
              confidence: data.confidence,
              error: data.error,
            });
          } else {
            const step: ExecutionStep = {
              id: data.id,
              index: data.index,
              title: data.title,
              description: data.description,
              status: data.status,
              confidence: data.confidence,
              error: data.error,
            };
            planSteps.push(step);
            updateAssistantMessage({ 
              plan: { id: assistantMessage.plan!.id, steps: [...planSteps], currentStep: step.index } 
            });
          }
        },
        
        onSummary: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              content: { ...msg.content, summary: data.text },
            };
          }));
        },
        
        onArtifact: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            
            // Convert string actions to ArtifactAction objects
            const artifactActions = data.actions?.map((actionLabel, idx) => ({
              id: `${data.id}-action-${idx}`,
              label: actionLabel,
              onClick: () => console.log('Artifact action:', actionLabel),
            }));
            
            return {
              ...msg,
              content: { 
                ...msg.content, 
                artifacts: [...(msg.content.artifacts || []), {
                  id: data.id,
                  type: data.artifact_type,
                  title: data.title,
                  content: data.content,
                  actions: artifactActions,
                }],
              },
            };
          }));
        },
        
        onSource: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              content: { 
                ...msg.content, 
                sources: [...(msg.content.sources || []), data],
              },
            };
          }));
        },
        
        onConfidence: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              content: { ...msg.content, confidence: data.level },
            };
          }));
        },
        
        onWarning: (data) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const msg = m as AssistantMessage;
            return {
              ...msg,
              content: { 
                ...msg.content, 
                warnings: [...(msg.content.warnings || []), data.message],
              },
            };
          }));
        },
        
        onAction: async (action: AIAction) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, actions: [...((m as AssistantMessage).actions || []), action] }
              : m
          ));
          
          // Auto-execute
          try {
            await executeAction(action);
          } catch {
            // Handled by executor
          }
        },
        
        onConversation: (data: { id: string }) => {
          setConversationId(data.id);
        },
        
        onUsage: (data) => {
          updateAssistantMessage({ usage: data });
        },
        
        onDone: () => {
          // Mark all running steps as done
          planSteps.forEach(step => {
            if (step.status === 'running' || step.status === 'pending') {
              step.status = 'done';
            }
          });
          
          updateAssistantMessage({ 
            isStreaming: false,
            streamingPhase: undefined,
            plan: { id: assistantMessage.plan!.id, steps: planSteps, currentStep: -1 },
          });
          setIsLoading(false);
          abortControllerRef.current = null;
        },
        
        onError: (error: { code: string; message: string; cause?: string; recoverable?: boolean }) => {
          // Mark running steps as failed
          planSteps.forEach(step => {
            if (step.status === 'running') {
              step.status = 'failed';
              step.error = { message: error.message, cause: error.cause, recoverable: error.recoverable ?? true };
            }
          });
          
          updateAssistantMessage({
            content: { 
              body: error.message,
              warnings: [error.cause || 'Une erreur est survenue. Vous pouvez réessayer.'],
            },
            isStreaming: false,
            streamingPhase: undefined,
            plan: { id: assistantMessage.plan!.id, steps: planSteps, currentStep: -1 },
          });
          setIsLoading(false);
          abortControllerRef.current = null;
        },
      }
    );
  }, [input, isLoading, currentWebsite?.id, conversationId, executeAction, messages]);

  // Handlers
  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const insertPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleRetry = useCallback((messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    
    let userIdx = idx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--;
    
    if (userIdx >= 0) {
      const userMsg = messages[userIdx] as UserMessage;
      setMessages(prev => prev.slice(0, userIdx));
      setInput(userMsg.content);
      setTimeout(handleSend, 100);
    }
  }, [messages, handleSend]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 h-14 px-3 sm:px-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">ASAP AI</h1>
              <Badge className="h-5 text-[10px] bg-gradient-to-r from-primary/20 to-violet-500/20 text-primary border-primary/30">
                Beta
              </Badge>
            </div>
            {websiteSlug && (
              <p className="text-xs text-muted-foreground">{websiteSlug}.asap.cool</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode indicator */}
          <Badge variant="outline" className="text-[10px] h-6">
            {controls.mode === 'chat' && '💬 Chat'}
            {controls.mode === 'plan' && '📋 Plan'}
            {controls.mode === 'execute' && '⚡ Exec'}
            {controls.mode === 'report' && '📊 Report'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer le chat
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Undo2 className="h-4 w-4 mr-2" />
                Annuler dernière action
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Eye className="h-4 w-4 mr-2" />
                Voir les logs
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

      {/* Context bar */}
      <ContextBar 
        context={context}
        onToggleScope={(scope) => setContext(prev => ({
          ...prev,
          scopes: { tools: prev.scopes?.tools ?? true, web: prev.scopes?.web ?? false, [scope]: !prev.scopes?.[scope] }
        }))}
      />

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <EmptyState userName={userName} onPromptSelect={insertPrompt} />
          </div>
        ) : (
          <div className="flex flex-col min-h-full justify-end">
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userAvatar={userAvatar}
                  userInitials={userInitials}
                  userName={userName}
                  onRetry={message.role === 'assistant' ? () => handleRetry(message.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border shadow-lg backdrop-blur-sm hover:bg-muted transition-all"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="text-xs font-medium">Nouveaux messages</span>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-3 z-10">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
          disabled={!currentWebsite?.id}
          controls={controls}
          onControlsChange={(c) => setControls(prev => ({ ...prev, ...c }))}
        />
      </div>
    </div>
  );
}

export default GlobalAIChatPanel;
