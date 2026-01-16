"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  History,
  Settings2,
  Wrench,
  Globe,
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
  ExecutionStep,
  ToolCall,
  ChatContext,
  ChatControls,
  StepStatus,
} from './types';

import {
  MessageBubble,
  EmptyState,
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
  
  // Message update queue to ensure chronological order
  const updateQueueRef = useRef<Array<() => void>>([]);
  const isProcessingRef = useRef(false);
  
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

  // Process update queue sequentially
  const processUpdateQueue = useCallback(() => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const update = updateQueueRef.current.shift();
    
    if (update) {
      update();
    }
    
    isProcessingRef.current = false;
    
    // Process next update if any
    if (updateQueueRef.current.length > 0) {
      requestAnimationFrame(processUpdateQueue);
    }
  }, []);

  // Queue an update to be processed in order
  const queueUpdate = useCallback((updateFn: () => void) => {
    updateQueueRef.current.push(updateFn);
    if (!isProcessingRef.current) {
      requestAnimationFrame(processUpdateQueue);
    }
  }, [processUpdateQueue]);

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

    // Track plan steps from backend events only
    const planSteps: ExecutionStep[] = [];

    const updateAssistantMessage = (updates: Partial<AssistantMessage>) => {
      queueUpdate(() => {
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId ? { ...m, ...updates } as AssistantMessage : m
        ));
      });
    };
    
    const updateOrAddPlanStep = (data: { 
      id: string; 
      index: number; 
      title: string; 
      description?: string; 
      status: StepStatus; 
      specialist?: string;
      producesOutput?: boolean;
      error?: { message: string; cause?: string; recoverable: boolean } 
    }) => {
      queueUpdate(() => {
        const existingIdx = planSteps.findIndex(s => s.id === data.id);
        const stepData: ExecutionStep = {
          id: data.id,
          index: data.index,
          title: data.title,
          description: data.description,
          status: data.status,
          specialist: data.specialist as ExecutionStep['specialist'],
          producesOutput: data.producesOutput,
          error: data.error,
        };
        
        if (existingIdx >= 0) {
          planSteps[existingIdx] = { ...planSteps[existingIdx], ...stepData };
        } else {
          planSteps.push(stepData);
        }
        // Sort by index to maintain order
        planSteps.sort((a, b) => a.index - b.index);
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m, 
                plan: { id: (m as AssistantMessage).plan!.id, steps: [...planSteps], currentStep: planSteps.findIndex(s => s.status === 'running') } 
              } as AssistantMessage
            : m
        ));
      });
    };

    abortControllerRef.current = streamChatMessage(
      {
        message: userMessage.content,
        website_id: currentWebsite.id,
        conversation_id: conversationId ?? undefined,
      },
      {
        onToken: (token: string) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMessageId) return m;
              const msg = m as AssistantMessage;
              return {
                ...msg,
                content: { ...msg.content, body: (msg.content.body || '') + token },
                streamingPhase: 'writing',
              };
            }));
          });
        },
        
        // Handle real-time thinking tokens during reasoning
        onThinkingToken: (data) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMessageId) return m;
              const msg = m as AssistantMessage;
              // Append thinking token to currentReasoning
              const currentReasoning = (msg.currentReasoning || '') + data.token;
              return {
                ...msg,
                streamingPhase: 'thinking',
                currentReasoning,
                currentThought: data.step ? `Étape ${data.step}` : undefined,
              };
            }));
          });
        },
        
        // Handle real-time insight tokens during step execution
        onInsightToken: (data) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMessageId) return m;
              const msg = m as AssistantMessage;
              // Update the current step's description with streamed insight
              if (msg.plan && data.step) {
                const steps = [...msg.plan.steps];
                const stepIdx = steps.findIndex(s => s.id === `step_${data.step}`);
                if (stepIdx >= 0) {
                  steps[stepIdx] = {
                    ...steps[stepIdx],
                    description: (steps[stepIdx].description || '') + data.token,
                  };
                  return {
                    ...msg,
                    plan: { ...msg.plan, steps },
                  };
                }
              }
              return msg;
            }));
          });
        },
        
        onThinking: (data) => {
          // Update with rich thinking data including reasoning, observations, and recommendations
          updateAssistantMessage({ 
            streamingPhase: 'thinking',
            currentThought: data.thought,
            currentReasoning: data.reasoning,
            currentObservations: data.observations || [],
            currentRecommendations: data.recommendations || [],
          });
        },
        
        onToolCall: (data) => {
          queueUpdate(() => {
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
          });
        },
        
        onToolResult: (data) => {
          queueUpdate(() => {
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
          });
        },
        
        onToolRequest: async () => {},
        
        onIteration: (data) => {
          // Just update phase, don't duplicate plan steps
          updateAssistantMessage({ 
            streamingPhase: 'executing',
            currentIteration: { current: data.current, max: data.max, description: data.description },
          });
        },
        
        onPhase: (data) => {
          updateAssistantMessage({ 
            streamingPhase: data.phase as AssistantMessage['streamingPhase'],
          });
        },
        
        onPlanStep: (data) => {
          updateOrAddPlanStep({
            id: data.id,
            index: data.index,
            title: data.title,
            description: data.description,
            status: data.status,
            specialist: data.specialist,
            producesOutput: data.produces_output,
            error: data.error,
          });
        },
        
        onSummary: (data) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMessageId) return m;
              const msg = m as AssistantMessage;
              return {
                ...msg,
                content: { ...msg.content, summary: data.text },
              };
            }));
          });
        },
        
        onArtifact: (data) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMessageId) return m;
              const msg = m as AssistantMessage;
              
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
          });
        },
        
        onSource: (data) => {
          queueUpdate(() => {
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
          });
        },
        
        onWarning: (data) => {
          queueUpdate(() => {
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
          });
        },
        
        onAction: async (action: AIAction) => {
          queueUpdate(() => {
            setMessages(prev => prev.map(m => 
              m.id === assistantMessageId 
                ? { ...m, actions: [...((m as AssistantMessage).actions || []), action] }
                : m
            ));
          });
          
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
          queueUpdate(() => {
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
          });
        },
        
        onError: (error: { code: string; message: string; cause?: string; recoverable?: boolean }) => {
          queueUpdate(() => {
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
          });
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

  const toggleScope = (scope: 'tools' | 'web') => {
    setContext(prev => ({
      ...prev,
      scopes: { 
        tools: prev.scopes?.tools ?? true, 
        web: prev.scopes?.web ?? false, 
        [scope]: !(prev.scopes?.[scope] ?? (scope === 'tools')) 
      }
    }));
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Ultra-minimal Header */}
      <header className="shrink-0 h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 flex items-center justify-center shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-white dark:text-zinc-900" />
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">ASAP AI</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0">Beta</Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Minimalist scope toggles */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={context.scopes?.tools ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-8 px-2.5 text-xs gap-1.5 transition-colors",
                  context.scopes?.tools 
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
                )}
                onClick={() => toggleScope('tools')}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Outils</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activer/désactiver les outils</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={context.scopes?.web ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-8 px-2.5 text-xs gap-1.5 transition-colors",
                  context.scopes?.web 
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
                )}
                onClick={() => toggleScope('web')}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Web</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activer/désactiver la recherche web</TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer la conversation
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Undo2 className="h-4 w-4 mr-2" />
                Annuler
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings2 className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {!showBackButton && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Area - Clean & Spacious */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <EmptyState userName={userName} onPromptSelect={insertPrompt} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
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
        )}
        
        {/* Minimalist scroll button */}
        {showScrollButton && (
          <div className="sticky bottom-6 flex justify-center pointer-events-none">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => scrollToBottom()}
              className="rounded-full shadow-lg pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Nouveaux messages</span>
            </Button>
          </div>
        )}
      </div>

      {/* Input Area - Ultra-clean */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pt-3 pb-6 px-4">
        <div className="max-w-3xl mx-auto">
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
          
          {/* Subtle context indicator */}
          {websiteSlug && (
            <p className="text-[10px] text-zinc-400 text-center mt-2.5">
              Contexte : {websiteSlug}.asap.cool
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalAIChatPanel;
