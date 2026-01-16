"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Layout,
  Palette,
  Type,
  Wand2,
  ArrowUp,
  Zap,
  MessageSquare,
} from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Layout,
    title: 'Améliorer le Hero',
    description: 'Rendre le titre plus impactant',
    prompt: "Améliore le titre du Hero pour qu'il soit plus accrocheur et ajoute une animation subtile",
    gradient: 'from-primary/20 to-violet-500/20',
    iconColor: 'text-primary',
  },
  {
    icon: Palette,
    title: 'Changer le thème',
    description: 'Nouvelle palette de couleurs',
    prompt: 'Utilise un thème sombre avec des accents bleus',
    gradient: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-500',
  },
  {
    icon: Type,
    title: 'Réécrire le contenu',
    description: 'Ton plus professionnel',
    prompt: 'Réécris la section À propos pour la rendre plus professionnelle',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: Wand2,
    title: 'Surprise !',
    description: "Laisse l'IA améliorer ton site",
    prompt: 'Rends mon site plus moderne et professionnel',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-500',
  },
];

interface EmptyStateProps {
  userName: string;
  onPromptSelect: (prompt: string) => void;
}

export function EmptyState({ userName, onPromptSelect }: EmptyStateProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4">
      {/* AI Avatar */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-violet-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center shadow-lg">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl font-semibold mb-1">
        {getGreeting()}, {userName.split(' ')[0]} 👋
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        Je suis ton assistant IA. Dis-moi ce que tu veux améliorer sur ton site.
      </p>
      
      {/* Keyboard shortcut */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">⌘</kbd>
        <span>+</span>
        <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">K</kbd>
        <span>pour focus</span>
      </div>
      
      {/* Suggestions */}
      <div className="w-full max-w-sm space-y-2">
        {SUGGESTIONS.map((suggestion, index) => (
          <Card
            key={index}
            className={cn(
              "cursor-pointer border-transparent transition-all duration-300 hover:scale-[1.02] group",
              "bg-gradient-to-r hover:shadow-lg hover:border-border/50",
              suggestion.gradient
            )}
            onClick={() => onPromptSelect(suggestion.prompt)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                suggestion.iconColor
              )}>
                <suggestion.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
              </div>
              <ArrowUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pro tip */}
      <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground max-w-sm">
        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-medium">Pro tip :</span> Sois précis ! Au lieu de "change les couleurs", 
          essaie "utilise une palette orange chaud et crème".
        </p>
      </div>
    </div>
  );
}
