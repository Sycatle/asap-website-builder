"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Palette,
  Type,
  X,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  ArrowUp,
  Image,
  Zap,
  Plus,
  StopCircle,
  Volume2,
  VolumeX,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useUserData } from "@/lib/store/authStore";
import { streamChatMessage, type AIAction } from "@/lib/api/ai";
import { useAIActionExecutor } from "@/hooks/useAIActionExecutor";

import type { GlobalAIChatPanelProps, Message, ChainStep } from './types';
import { useSoundEffects } from './hooks';
import { formatActionLabel } from './utils';
import { EmptyState, QuickPill, MessageBubble } from './components';

// Global type declaration for preview capture function
declare global {
  interface Window {
    __capturePreview?: (viewport?: 'desktop' | 'tablet' | 'mobile') => Promise<{ imageId: string } | null>;
  }
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
  const conversationIdRef = useRef<string | null>(null);
  const pendingMessageRef = useRef<string>('');
  const { enabled: soundEnabled, toggle: toggleSound, playSound } = useSoundEffects();
  
  // AI Action Executor
  const { executeAction, isExecuting } = useAIActionExecutor({
    websiteId: currentWebsite?.id || '',
    onActionExecuted: (result) => {
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
    if (!autoExecuteActions) return true;
    
    try {
      await executeAction(action);
      return true;
    } catch (error) {
      return false;
    }
  }, [autoExecuteActions, executeAction]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.map(m => 
      m.isStreaming ? { ...m, isStreaming: false } : m
    ));
  }, []);

  // Sync conversationId ref with state
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !currentWebsite?.id) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    pendingMessageRef.current = input.trim();

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
          const stepKey = `thinking_${data.step || 0}`;
          const isStarting = data.status === 'starting';
          const isCompleted = data.status === 'completed';
          const stepStatus: ChainStep['status'] = isStarting ? 'running' : isCompleted ? 'completed' : 'running';
          
          if (!stepIdMap.has(stepKey)) {
            const stepId = addChainStep({
              type: 'thinking',
              title: data.thought,
              description: isCompleted && data.insight ? data.insight : undefined,
              status: stepStatus,
              tool: 'thinking',
            });
            stepIdMap.set(stepKey, stepId);
          } else {
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
              const updated = [...existing];
              updated[existingIdx] = { ...updated[existingIdx], status: data.status };
              return { ...m, toolCalls: updated, isAnalyzing: false };
            }
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
        onToolRequest: async () => {
          // Visual analysis is now handled fully server-side
        },
        onIteration: (data) => {
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
          setConversationId(data.id);
        },
        onUsage: (data) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, usage: data }
              : m
          ));
        },
        onDone: () => {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMessageId) return m;
            const steps = m.chainSteps || [];
            
            const usedTools = (m.toolCalls || [])
              .filter(tc => ['search_collections', 'search_variables', 'get_website_sections', 'get_website_theme', 'get_website_settings', 'list_extensions', 'get_page_content', 'request_visual_analysis'].includes(tc.tool))
              .map(tc => ({
                id: tc.id,
                name: tc.tool,
                description: tc.description,
                success: tc.status === 'completed',
              }));
            
            return {
              ...m,
              isStreaming: false,
              isAnalyzing: false,
              chainSteps: steps.map(s => s.status === 'running' || s.status === 'pending' ? { ...s, status: 'completed' as const } : s),
              usedTools: usedTools.length > 0 ? usedTools : undefined,
            };
          }));
          setIsLoading(false);
          abortControllerRef.current = null;
          playSound('receive');
        },
        onError: (error: { code: string; message: string }) => {
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
    
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }
    
    if (userMessageIndex >= 0) {
      const userMessage = messages[userMessageIndex];
      setMessages(prev => prev.slice(0, userMessageIndex));
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
      {/* Header */}
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

      {/* Messages Area */}
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

      {/* Input Area */}
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

export default GlobalAIChatPanel;
