"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowUp,
  Square,
  Paperclip,
} from 'lucide-react';
import type { ChatControls } from '../types';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  controls?: ChatControls;
  onControlsChange?: (controls: Partial<ChatControls>) => void;
  onAttach?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
  disabled,
  placeholder = "Envoie un message...",
  controls,
  onControlsChange,
  onAttach,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Controls row */}
      {controls && onControlsChange && (
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            {(['short', 'medium', 'long'] as const).map(length => (
              <button
                key={length}
                onClick={() => onControlsChange({ constraints: { ...controls.constraints, maxLength: length } })}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all",
                  controls.constraints?.maxLength === length
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {length === 'short' ? 'Court' : length === 'medium' ? 'Moyen' : 'Long'}
              </button>
            ))}
          </div>
          
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            {(['casual', 'professional', 'technical'] as const).map(tone => (
              <button
                key={tone}
                onClick={() => onControlsChange({ constraints: { ...controls.constraints, tone } })}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all",
                  controls.constraints?.tone === tone
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tone === 'casual' ? 'Casual' : tone === 'professional' ? 'Pro' : 'Tech'}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Main input container - ChatGPT style */}
      <div className={cn(
        "relative flex items-end gap-2 rounded-2xl border bg-muted/30 p-3",
        "focus-within:border-primary/40 focus-within:bg-background transition-all"
      )}>
        {/* Attach button */}
        {onAttach && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg"
                onClick={onAttach}
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Joindre un fichier</TooltipContent>
          </Tooltip>
        )}
        
        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent",
            "focus-visible:ring-0 p-0 text-sm leading-6"
          )}
          rows={1}
          disabled={disabled}
        />
        
        {/* Send/Stop button */}
        <Tooltip>
          <TooltipTrigger asChild>
            {isLoading ? (
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90"
                onClick={onStop}
              >
                <Square className="w-3 h-3 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 rounded-lg transition-all",
                  value.trim()
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                onClick={onSend}
                disabled={!value.trim() || isLoading || disabled}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLoading ? 'Arrêter' : 'Envoyer'}
            {!isLoading && <span className="ml-2 text-muted-foreground">⏎</span>}
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Hint */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        Shift+Entrée pour nouvelle ligne
      </p>
    </div>
  );
}
