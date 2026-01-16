"use client"

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, ChevronRight, Copy, Check, AlertTriangle,
  ExternalLink, Sparkles, Zap, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownContent } from '@/components/shared/markdown-content';
import type { Message, AssistantMessage, UserMessage } from '../types';
import type { AIAction } from '@/lib/api/ai';
import { ExecutionPlanView } from './execution-plan';
import { ToolCardsList } from './tool-cards';
import { ArtifactCard } from './artifacts';

interface MessageBubbleProps {
  message: Message;
  userAvatar?: string;
  userInitials: string;
  userName: string;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  onActionClick?: (actionId: string) => void;
}

export function MessageBubble({
  message,
  userAvatar,
  userInitials,
  userName,
  onCopy,
  onRetry,
  onActionClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  if (isUser) {
    return <UserBubble message={message} avatar={userAvatar} initials={userInitials} name={userName} />;
  }
  
  return (
    <AssistantBubble 
      message={message} 
      onCopy={onCopy}
      onRetry={onRetry}
      onActionClick={onActionClick}
    />
  );
}

// ============================================================================
// User Bubble - ChatGPT style (right aligned, simple)
// ============================================================================

function UserBubble({ 
  message, 
  avatar, 
  initials, 
  name 
}: { 
  message: UserMessage; 
  avatar?: string; 
  initials: string; 
  name: string;
}) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="max-w-[85%] flex flex-col items-end">
        <div className="px-4 py-3 bg-muted rounded-2xl rounded-br-md">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
      
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// ============================================================================
// Assistant Bubble - ChatGPT style (left aligned, full width content)
// ============================================================================

function AssistantBubble({ 
  message, 
  onCopy,
  onRetry,
  onActionClick,
}: { 
  message: AssistantMessage;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  onActionClick?: (actionId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  const hasError = message.toolCalls?.some(t => t.status === 'failed') || 
                   message.plan?.steps.some(s => s.status === 'failed');
  
  const handleCopy = async () => {
    const text = message.content.summary || message.content.body;
    await navigator.clipboard.writeText(text);
    onCopy?.(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
        <Sparkles className={cn("w-4 h-4 text-white", message.isStreaming && "animate-pulse")} />
      </div>
      
      <div className="flex-1 min-w-0 space-y-3">
        {/* Streaming indicator */}
        {message.isStreaming && message.streamingPhase && (
          <StreamingIndicator phase={message.streamingPhase} />
        )}
        
        {/* Execution Plan (compact) */}
        {message.plan && message.plan.steps.length > 0 && (
          <ExecutionPlanView plan={message.plan} />
        )}
        
        {/* Tool Cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCardsList tools={message.toolCalls} />
        )}
        
        {/* Main Content */}
        <div className={cn(hasError && "border-l-2 border-destructive/50 pl-3")}>
          {/* Summary - prominent */}
          {message.content.summary && (
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium">{message.content.summary}</p>
            </div>
          )}
          
          {/* Body */}
          {message.content.body && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={message.content.body} />
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground animate-pulse" />
              )}
            </div>
          )}
          
          {/* Warnings */}
          {message.content.warnings && message.content.warnings.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                {message.content.warnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Details (collapsible) */}
          {message.content.details && (
            <div className="mt-3">
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {detailsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Voir les détails
              </button>
              {detailsExpanded && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <MarkdownContent content={message.content.details} />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Artifacts */}
        {message.content.artifacts && message.content.artifacts.length > 0 && (
          <div className="space-y-2">
            {message.content.artifacts.map(artifact => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
        
        {/* Sources */}
        {message.content.sources && message.content.sources.length > 0 && (
          <SourcesList sources={message.content.sources} />
        )}
        
        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <ActionsList 
            actions={message.actions} 
            executedActions={message.executedActions}
            onActionClick={onActionClick}
          />
        )}
        
        {/* Footer actions - ChatGPT style */}
        {!message.isStreaming && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
            
            {hasError && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={onRetry}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Réessayer
              </Button>
            )}
            
            {message.usage && (
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                {message.usage.total_tokens} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StreamingIndicator({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string }> = {
    thinking: { label: 'Réflexion...', color: 'text-violet-500' },
    searching: { label: 'Recherche...', color: 'text-blue-500' },
    executing: { label: 'Exécution...', color: 'text-amber-500' },
    writing: { label: 'Rédaction...', color: 'text-emerald-500' },
  };
  
  const { label, color } = config[phase] || config.thinking;
  
  return (
    <div className={cn("flex items-center gap-2 text-xs", color)}>
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span 
            key={i}
            className={cn("w-1 h-1 rounded-full animate-bounce", color.replace('text-', 'bg-'))} 
            style={{ animationDelay: `${i * 150}ms` }} 
          />
        ))}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function SourcesList({ sources }: { sources: { title: string; url?: string; snippet?: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="font-medium">{sources.length} source{sources.length > 1 ? 's' : ''}</span>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="p-2 rounded bg-muted/50 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{source.title}</span>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {source.snippet && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.snippet}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ActionsListProps {
  actions: AIAction[];
  executedActions?: { action: AIAction; success: boolean; error?: string }[];
  onActionClick?: (actionId: string) => void;
}

function ActionsList({ actions, executedActions, onActionClick }: ActionsListProps) {
  const stats = useMemo(() => {
    const total = actions.length;
    const executed = executedActions?.length || 0;
    const successful = executedActions?.filter(e => e.success).length || 0;
    return { total, executed, successful, failed: executed - successful };
  }, [actions, executedActions]);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          {stats.total} action{stats.total > 1 ? 's' : ''}
        </span>
        {stats.executed > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {stats.successful > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                {stats.successful}
              </span>
            )}
            {stats.failed > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                {stats.failed}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="divide-y">
        {actions.map((action, i) => {
          const executed = executedActions?.find(e => e.action === action);
          return (
            <div 
              key={i}
              className={cn(
                "flex items-center gap-2 px-3 py-2",
                executed?.success && "bg-emerald-500/5",
                executed?.success === false && "bg-destructive/5"
              )}
            >
              {executed ? (
                executed.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" />
              )}
              <span className="text-xs flex-1 truncate">
                {formatActionLabel(action)}
              </span>
              {!executed && onActionClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onActionClick(action.type)}
                >
                  Appliquer
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatActionLabel(action: AIAction): string {
  switch (action.type) {
    case 'update_section':
    case 'update_property':
      return `Modifier ${action.property || 'section'}`;
    case 'add_section':
      return `Ajouter ${action.section_type || 'section'}`;
    case 'remove_section':
      return 'Supprimer section';
    case 'update_theme':
      return 'Modifier thème';
    default:
      return action.type.replace(/_/g, ' ');
  }
}
