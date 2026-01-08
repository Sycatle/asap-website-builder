"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Send,
  Sparkles,
  Plus,
  Image,
  Palette,
  Layout,
  Type,
  ArrowLeft,
  MoreHorizontal,
  Loader2,
  Bot,
  User,
  Trash2,
  Wand2,
  MessageSquare,
  Zap,
  Settings,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  websiteName: string;
  websiteSlug: string | null;
  onBack: () => void;
}

/**
 * AIChatPanel - AI-powered chat interface for website editing
 */
export function AIChatPanel({ websiteName, websiteSlug, onBack }: AIChatPanelProps) {
  const { t } = useTranslation(['common', 'editor']);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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

  const clearChat = () => {
    setMessages([]);
  };

  const insertPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20">
      {/* Header - absolute top */}
      <header className="absolute top-0 left-0 right-0 h-14 px-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('common:actions.back')}</TooltipContent>
          </Tooltip>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold">{websiteName}</h1>
                <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                  AI
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {websiteSlug ? `${websiteSlug}.asap.cool` : t('editor:ai.title')}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('editor:ai.clearChat')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <History className="h-4 w-4 mr-2" />
              {t('editor:ai.history')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="h-4 w-4 mr-2" />
              {t('editor:ai.settings')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages area - fills remaining space with padding for header/footer */}
      <div className="absolute inset-0 pt-14 pb-[180px] overflow-y-auto" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="min-h-full flex items-center justify-center p-4">
            <EmptyState onPromptSelect={insertPrompt} />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t('editor:ai.thinking')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - absolute bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t z-10">
        {/* Quick actions */}
        <div className="px-4 py-3 border-b bg-background/50">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <QuickAction 
              icon={Plus} 
              label={t('editor:ai.actions.addSection')} 
              onClick={() => insertPrompt("Add a new section for ")}
            />
            <QuickAction 
              icon={Palette} 
              label={t('editor:ai.actions.changeColors')}
              onClick={() => insertPrompt("Change the color scheme to ")}
            />
            <QuickAction 
              icon={Type} 
              label={t('editor:ai.actions.editText')}
              onClick={() => insertPrompt("Update the text in ")}
            />
            <QuickAction 
              icon={Image} 
              label={t('editor:ai.actions.addImage')}
              onClick={() => insertPrompt("Add an image to ")}
            />
            <QuickAction 
              icon={Layout} 
              label={t('editor:ai.actions.changeLayout')}
              onClick={() => insertPrompt("Reorganize the layout to ")}
            />
          </div>
        </div>

        {/* Input area */}
        <div className="p-4">
          <Card className="border-2 focus-within:border-primary/50 transition-colors">
            <CardContent className="p-2">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('editor:ai.placeholder')}
                  className="min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 p-2 text-sm"
                  rows={1}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full shrink-0"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('editor:ai.send')}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {t('editor:ai.hint')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * EmptyState - Welcome screen with suggestions
 */
function EmptyState({ onPromptSelect }: { onPromptSelect: (prompt: string) => void }) {
  const { t } = useTranslation(['editor']);
  
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
      {/* AI Avatar */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
          <Wand2 className="h-10 w-10 text-primary-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      <h3 className="font-semibold text-xl mb-2">{t('editor:ai.welcome.title')}</h3>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        {t('editor:ai.welcome.description')}
      </p>
      
      {/* Suggestions */}
      <div className="w-full space-y-2">
        <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-2">
          <MessageSquare className="h-3 w-3" />
          {t('editor:ai.trySaying')}
        </p>
        
        <SuggestionCard 
          icon={Layout}
          title={t('editor:ai.suggestions.hero.title')}
          description={t('editor:ai.suggestions.hero.description')}
          onClick={() => onPromptSelect("Make the headline more impactful and add a subtle animation")}
        />
        <SuggestionCard 
          icon={Palette}
          title={t('editor:ai.suggestions.theme.title')}
          description={t('editor:ai.suggestions.theme.description')}
          onClick={() => onPromptSelect("Use a dark theme with blue accents")}
        />
        <SuggestionCard 
          icon={Type}
          title={t('editor:ai.suggestions.content.title')}
          description={t('editor:ai.suggestions.content.description')}
          onClick={() => onPromptSelect("Rewrite the about section to be more professional")}
        />
      </div>
    </div>
  );
}

/**
 * SuggestionCard - Clickable suggestion card
 */
function SuggestionCard({ 
  icon: Icon, 
  title, 
  description,
  onClick,
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  onClick: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 hover:border-primary/30 transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-sm truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * QuickAction - Quick action pill button
 */
function QuickAction({ 
  icon: Icon, 
  label,
  onClick,
}: { 
  icon: React.ElementType; 
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-3 text-xs shrink-0 gap-2 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/30"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

/**
 * MessageBubble - Chat message with avatar
 */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-gradient-to-br from-muted to-muted/60"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <Card className={cn(
        "max-w-[80%]",
        isUser 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-card"
      )}>
        <CardContent className="p-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <p className={cn(
            "text-[10px] mt-2",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIChatPanel;
