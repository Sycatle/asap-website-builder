"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Layout,
  Palette,
  Type,
  Wand2,
  ArrowUp,
  Zap,
  MessageSquare,
} from "lucide-react";

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void;
  userName: string;
}

export function EmptyState({ onPromptSelect, userName }: EmptyStateProps) {
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
