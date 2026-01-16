"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle, 
  Eye, EyeOff, RotateCcw, Clock,
  Wand2, Search, Database, Layout, Palette, Image, Sparkles, Zap
} from 'lucide-react';
import type { ToolCall, StepStatus } from '../types';

const TOOL_ICONS: Record<string, React.ElementType> = {
  'update_section': Wand2,
  'add_section': Layout,
  'remove_section': Layout,
  'update_theme': Palette,
  'generate_image': Image,
  'generate_content': Sparkles,
  'search': Search,
  'search_collections': Database,
  'get_website_sections': Layout,
  'default': Zap,
};

const STATUS_STYLES: Record<StepStatus, { border: string; bg: string }> = {
  pending: { border: 'border-muted', bg: 'bg-muted/30' },
  running: { border: 'border-blue-500/50', bg: 'bg-blue-500/5' },
  done: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5' },
  failed: { border: 'border-red-500/50', bg: 'bg-red-500/5' },
  skipped: { border: 'border-muted', bg: 'bg-muted/20' },
};

interface ToolCardProps {
  tool: ToolCall;
  onRetry?: () => void;
}

export function ToolCard({ tool, onRetry }: ToolCardProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  
  const Icon = TOOL_ICONS[tool.tool] || TOOL_ICONS['default'];
  const styles = STATUS_STYLES[tool.status];
  const isRunning = tool.status === 'running';
  const isDone = tool.status === 'done';
  const isFailed = tool.status === 'failed';
  
  return (
    <div className={cn(
      "rounded-lg border transition-all",
      styles.border,
      styles.bg
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          isRunning ? "bg-blue-500/20" : 
          isDone ? "bg-emerald-500/20" : 
          isFailed ? "bg-red-500/20" : "bg-muted"
        )}>
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : isFailed ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <Icon className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tool.label}</p>
          {tool.output?.duration && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tool.output.duration}ms
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {tool.input && (
            <button
              onClick={() => setShowInput(!showInput)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showInput ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
              )}
              title={showInput ? "Masquer l'entrée" : "Voir l'entrée"}
            >
              {showInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          
          {isFailed && tool.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
              title="Réessayer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Input (collapsed by default) */}
      {showInput && tool.input && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-md bg-muted/50 border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Input</p>
            <pre className="text-xs font-mono overflow-x-auto">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {/* Output (show if success or error) */}
      {tool.output && (isDone || isFailed) && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOutput ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>{isFailed ? 'Voir l\'erreur' : 'Voir le résultat'}</span>
          </button>
          
          {showOutput && (
            <div className={cn(
              "mt-2 p-2 rounded-md border",
              isFailed ? "bg-red-500/5 border-red-500/20" : "bg-muted/50 border-muted"
            )}>
              {isFailed && tool.output.error ? (
                <p className="text-xs text-red-600">{tool.output.error}</p>
              ) : tool.output.data ? (
                <pre className="text-xs font-mono overflow-x-auto max-h-32">
                  {typeof tool.output.data === 'string' 
                    ? tool.output.data 
                    : JSON.stringify(tool.output.data, null, 2)
                  }
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">Exécuté avec succès</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolCardsListProps {
  tools: ToolCall[];
  onRetry?: (toolId: string) => void;
}

export function ToolCardsList({ tools, onRetry }: ToolCardsListProps) {
  if (tools.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {tools.map(tool => (
        <ToolCard 
          key={tool.id} 
          tool={tool} 
          onRetry={onRetry ? () => onRetry(tool.id) : undefined}
        />
      ))}
    </div>
  );
}
