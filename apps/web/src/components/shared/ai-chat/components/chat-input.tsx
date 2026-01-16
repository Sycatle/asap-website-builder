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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUp,
  StopCircle,
  Paperclip,
  Settings2,
  FileText,
  Maximize2,
  Minimize2,
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
  placeholder = "Décris ce que tu veux modifier...",
  controls,
  onControlsChange,
  onAttach,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  
  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = expanded ? 200 : 120;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [value, expanded]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Quick constraints */}
      {controls && onControlsChange && (
        <QuickConstraints controls={controls} onChange={onControlsChange} />
      )}
      
      {/* Main input */}
      <div className={cn(
        "flex items-end gap-2 rounded-2xl border-2 bg-card p-2 transition-all",
        "focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10",
        expanded && "rounded-xl"
      )}>
        {/* Left actions */}
        <div className="flex items-center gap-1 shrink-0">
          {onAttach && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={onAttach}
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Joindre un fichier</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{expanded ? 'Réduire' : 'Agrandir'}</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0 py-2 px-2 text-sm",
            expanded && "min-h-[100px]"
          )}
          rows={1}
          disabled={disabled}
        />
        
        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {controls && onControlsChange && (
            <ControlsDropdown controls={controls} onChange={onControlsChange} />
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              {isLoading ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-xl border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
                  onClick={onStop}
                >
                  <StopCircle className="w-4 h-4 text-red-500" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-xl transition-all",
                    value.trim()
                      ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
                      : "bg-muted text-muted-foreground"
                  )}
                  onClick={onSend}
                  disabled={!value.trim() || isLoading || disabled}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {isLoading ? 'Stop' : 'Envoyer'}
              {!isLoading && <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">↵</kbd>}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {/* Hint */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        Shift+Entrée pour nouvelle ligne • Cmd+K pour focus
      </p>
    </div>
  );
}

// Quick constraints bar
function QuickConstraints({ 
  controls, 
  onChange 
}: { 
  controls: ChatControls; 
  onChange: (controls: Partial<ChatControls>) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {/* Length */}
      <div className="flex items-center rounded-full bg-muted p-0.5 text-xs">
        {(['short', 'medium', 'long'] as const).map(length => (
          <button
            key={length}
            onClick={() => onChange({ constraints: { ...controls.constraints, maxLength: length } })}
            className={cn(
              "px-2 py-1 rounded-full transition-colors",
              controls.constraints?.maxLength === length
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {length === 'short' ? 'Court' : length === 'medium' ? 'Moyen' : 'Long'}
          </button>
        ))}
      </div>
      
      {/* Tone */}
      <div className="flex items-center rounded-full bg-muted p-0.5 text-xs">
        {(['casual', 'professional', 'technical'] as const).map(tone => (
          <button
            key={tone}
            onClick={() => onChange({ constraints: { ...controls.constraints, tone } })}
            className={cn(
              "px-2 py-1 rounded-full transition-colors",
              controls.constraints?.tone === tone
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tone === 'casual' ? 'Casual' : tone === 'professional' ? 'Pro' : 'Tech'}
          </button>
        ))}
      </div>
    </div>
  );
}

// Controls dropdown
function ControlsDropdown({
  controls,
  onChange,
}: {
  controls: ChatControls;
  onChange: (controls: Partial<ChatControls>) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Mode</div>
        {(['chat', 'plan', 'execute', 'report'] as const).map(mode => (
          <DropdownMenuItem
            key={mode}
            onClick={() => onChange({ mode })}
            className={cn(controls.mode === mode && "bg-muted")}
          >
            {mode === 'chat' && '💬 Chat'}
            {mode === 'plan' && '📋 Plan'}
            {mode === 'execute' && '⚡ Exécution'}
            {mode === 'report' && '📊 Rapport'}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Format</div>
        {(['text', 'markdown', 'json'] as const).map(format => (
          <DropdownMenuItem
            key={format}
            onClick={() => onChange({ constraints: { ...controls.constraints, format } })}
            className={cn(controls.constraints?.format === format && "bg-muted")}
          >
            <FileText className="w-4 h-4 mr-2" />
            {format.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
