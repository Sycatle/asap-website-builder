"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Layout,
  Palette,
  Type,
  Wand2,
  ArrowRight,
} from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Layout,
    title: 'Améliorer le Hero',
    prompt: "Améliore le titre du Hero pour qu'il soit plus accrocheur",
  },
  {
    icon: Palette,
    title: 'Nouveau thème',
    prompt: 'Utilise un thème sombre avec des accents bleus',
  },
  {
    icon: Type,
    title: 'Réécrire le contenu',
    prompt: 'Réécris la section À propos pour la rendre plus professionnelle',
  },
  {
    icon: Wand2,
    title: 'Amélioration globale',
    prompt: 'Rends mon site plus moderne et professionnel',
  },
];

interface EmptyStateProps {
  userName: string;
  onPromptSelect: (prompt: string) => void;
}

export function EmptyState({ userName, onPromptSelect }: EmptyStateProps) {
  const firstName = userName.split(' ')[0];
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto text-center">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-xl">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
      
      {/* Title */}
      <h1 className="text-2xl font-semibold mb-2">
        Comment puis-je t'aider, {firstName} ?
      </h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm">
        Je peux modifier ton site, générer du contenu, changer les couleurs et bien plus.
      </p>
      
      {/* Suggestions Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {SUGGESTIONS.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className={cn(
              "h-auto p-4 flex flex-col items-start gap-2 text-left",
              "hover:border-primary/50 hover:bg-primary/5 transition-all"
            )}
            onClick={() => onPromptSelect(suggestion.prompt)}
          >
            <suggestion.icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{suggestion.title}</span>
          </Button>
        ))}
      </div>
      
      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>
        <span>pour ouvrir depuis n'importe où</span>
      </p>
    </div>
  );
}
