"use client"

import React, { useState, useRef, useEffect } from 'react';
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useUserData } from "@/lib/store/authStore";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GlobalAIChatPanelProps {
  onClose: () => void;
  showBackButton?: boolean;
  websiteNameOverride?: string;
  websiteSlugOverride?: string | null;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const _websiteName = websiteNameOverride ?? currentWebsite?.title ?? 'ASAP';
  const websiteSlug = websiteSlugOverride !== undefined ? websiteSlugOverride : (currentWebsite?.slug ?? null);
  
  const userName = userData?.name || userData?.email?.split('@')[0] || 'You';
  const userAvatar = userData?.avatar;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('editor:ai.comingSoon'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

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
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <EmptyState onPromptSelect={insertPrompt} userName={userName} />
          </div>
        ) : (
          <div className="flex flex-col min-h-full justify-end">
            <div className="space-y-3">
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  userAvatar={userAvatar}
                  userInitials={userInitials}
                  userName={userName}
                  onCopy={() => copyMessage(message.id, message.content)}
                  isCopied={copiedId === message.id}
                />
              ))}
              
              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
            />
            <QuickPill 
              icon={Palette} 
              label={t('editor:ai.actions.changeColors')}
              color="pink"
              onClick={() => insertPrompt("Change the color scheme to ")}
            />
            <QuickPill 
              icon={Type} 
              label={t('editor:ai.actions.editText')}
              color="blue"
              onClick={() => insertPrompt("Update the text in ")}
            />
            <QuickPill 
              icon={Image} 
              label={t('editor:ai.actions.addImage')}
              color="emerald"
              onClick={() => insertPrompt("Add an image to ")}
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
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-xl shrink-0 transition-all",
                    input.trim() 
                      ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105" 
                      : "bg-muted text-muted-foreground"
                  )}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>{t('editor:ai.send')}</span>
                <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">↵</kbd>
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
 * EmptyState - Welcome avec style ASAP
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
    },
    {
      icon: Palette,
      title: t('editor:ai.suggestions.theme.title'),
      description: t('editor:ai.suggestions.theme.description'),
      prompt: "Use a dark theme with blue accents",
      gradient: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-500",
    },
    {
      icon: Type,
      title: t('editor:ai.suggestions.content.title'),
      description: t('editor:ai.suggestions.content.description'),
      prompt: "Rewrite the about section to be more professional",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
    },
    {
      icon: Wand2,
      title: t('editor:ai.suggestions.magic.title', { defaultValue: 'Surprise me' }),
      description: t('editor:ai.suggestions.magic.description', { defaultValue: 'Let AI enhance your site' }),
      prompt: "Make my website look more modern and professional",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-500",
    },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4">
      {/* AI Avatar with glow effect */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-violet-600 rounded-3xl blur-xl opacity-30 animate-pulse" />
        <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center shadow-2xl">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 border-4 border-background flex items-center justify-center shadow-lg">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl font-semibold mb-1">
        {getGreeting()}, {userName.split(' ')[0]} 👋
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        {t('editor:ai.welcome.description')}
      </p>
      
      {/* Suggestions Grid */}
      <div className="w-full max-w-sm space-y-2">
        {suggestions.map((suggestion, index) => (
          <Card 
            key={index}
            className={cn(
              "cursor-pointer border-transparent transition-all hover:scale-[1.02]",
              "bg-gradient-to-r",
              suggestion.gradient,
              "hover:shadow-lg"
            )}
            onClick={() => onPromptSelect(suggestion.prompt)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0",
                suggestion.iconColor
              )}>
                <suggestion.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * QuickPill - Quick action pill style ASAP
 */
function QuickPill({ 
  icon: Icon, 
  label,
  color,
  onClick,
}: { 
  icon: React.ElementType;
  label: string;
  color: 'primary' | 'pink' | 'blue' | 'emerald' | 'violet';
  onClick: () => void;
}) {
  const colorClasses = {
    primary: 'hover:bg-primary hover:text-primary-foreground hover:border-primary',
    pink: 'hover:bg-pink-500 hover:text-white hover:border-pink-500',
    blue: 'hover:bg-blue-500 hover:text-white hover:border-blue-500',
    emerald: 'hover:bg-emerald-500 hover:text-white hover:border-emerald-500',
    violet: 'hover:bg-violet-500 hover:text-white hover:border-violet-500',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border bg-card text-sm shrink-0",
        "transition-all hover:shadow-md",
        colorClasses[color]
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

/**
 * MessageBubble - iMessage/WhatsApp style bubble
 */
function MessageBubble({ 
  message, 
  userAvatar, 
  userInitials, 
  userName,
  onCopy,
  isCopied,
}: { 
  message: Message;
  userAvatar?: string;
  userInitials: string;
  userName: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex items-end gap-2 group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md">
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white">
            <Sparkles className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Bubble */}
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div className={cn(
          "px-4 py-2.5 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md" 
            : "bg-muted rounded-2xl rounded-bl-md"
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* Timestamp & Actions */}
        <div className={cn(
          "flex items-center gap-2 px-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {!isUser && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalAIChatPanel;
