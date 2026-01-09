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

// Simple markdown renderer component
function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
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
          elements.push(
            <pre key={`code-${elements.length}`} className="my-2 p-3 bg-muted rounded-lg overflow-x-auto">
              <code className="text-xs font-mono">{codeBlockContent.trim()}</code>
            </pre>
          );
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
import { streamChatMessage, type AIAction } from "@/lib/api/ai";
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  executedActions?: { action: AIAction; success: boolean; error?: string }[];
  isStreaming?: boolean;
  error?: boolean;
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
  const handleActionReceived = useCallback(async (action: AIAction, messageId: string) => {
    if (!autoExecuteActions) return;
    
    // Execute the action
    await executeAction(action);
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
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

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
              ? { ...m, content: m.content + token }
              : m
          ));
        },
        onAction: (action: AIAction) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, actions: [...(m.actions || []), action] }
              : m
          ));
          // Auto-execute the action
          handleActionReceived(action, assistantMessageId);
        },
        onDone: () => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, isStreaming: false }
              : m
          ));
          setIsLoading(false);
          abortControllerRef.current = null;
          playSound('receive');
        },
        onError: (error: { code: string; message: string }) => {
          console.error('AI chat error:', error);
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: error.message || t('editor:ai.error'), isStreaming: false, error: true }
              : m
          ));
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
      // Remove the failed message and all after it
      setMessages(prev => prev.slice(0, messageIndex));
      // Re-send
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
        
        {/* Timestamp & Actions */}
        <div className={cn(
          "flex items-center gap-2 px-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
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
