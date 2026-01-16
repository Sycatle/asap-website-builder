"use client"

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, ChevronRight, Copy, Check, AlertTriangle,
  ExternalLink, Sparkles, Zap, CheckCircle2, RotateCcw
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
// User Bubble
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
    <div className="flex items-end gap-2 flex-row-reverse">
      <Avatar className="w-8 h-8 shrink-0 shadow-md ring-2 ring-background">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="max-w-[80%]">
        <div className="px-4 py-2.5 shadow-sm bg-primary text-primary-foreground rounded-2xl rounded-br-md">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 justify-end">
            {message.attachments.map((att, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {att.name}
              </span>
            ))}
          </div>
        )}
        
        <p className="text-[10px] text-muted-foreground mt-1 text-right">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Assistant Bubble
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
    <div className="flex items-start gap-2">
      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0 shadow-md ring-2 ring-background">
        <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white">
          <Sparkles className={cn("w-4 h-4", message.isStreaming && "animate-pulse")} />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-3">
        {/* Streaming indicator */}
        {message.isStreaming && message.streamingPhase && (
          <StreamingIndicator phase={message.streamingPhase} />
        )}
        
        {/* Execution Plan */}
        {message.plan && message.plan.steps.length > 0 && (
          <ExecutionPlanView plan={message.plan} />
        )}
        
        {/* Tool Cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCardsList tools={message.toolCalls} />
        )}
        
        {/* Main Content */}
        <div className={cn(
          "space-y-3",
          hasError && "border-l-2 border-red-500/50 pl-3"
        )}>
          {/* Summary (if exists) - Always visible, prominent */}
          {message.content.summary && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/10">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-relaxed">{message.content.summary}</p>
              </div>
            </div>
          )}
          
          {/* Body content */}
          {message.content.body && (
            <div className="text-sm leading-relaxed">
              <MarkdownContent content={message.content.body} />
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
              )}
            </div>
          )}
          
          {/* Warnings */}
          {message.content.warnings && message.content.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {message.content.warnings.map((warning, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Details (collapsible) */}
          {message.content.details && (
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {detailsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Voir les détails
              </button>
              {detailsExpanded && (
                <div className="px-3 pb-3 text-sm text-muted-foreground">
                  <MarkdownContent content={message.content.details} />
                </div>
              )}
            </div>
          )}
          
          {/* Confidence indicator */}
          {message.content.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confiance :</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full max-w-24 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    message.content.confidence >= 80 ? "bg-emerald-500" :
                    message.content.confidence >= 50 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${message.content.confidence}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-medium",
                message.content.confidence >= 80 ? "text-emerald-600" :
                message.content.confidence >= 50 ? "text-amber-600" : "text-red-600"
              )}>
                {message.content.confidence}%
              </span>
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
        
        {/* Footer */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          
          {message.usage && (
            <span className="font-mono">{message.usage.total_tokens} tokens</span>
          )}
          
          <div className="flex-1" />
          
          {!message.isStreaming && (
            <>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Copier"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
              
              {hasError && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2 py-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Réessayer
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StreamingIndicator({ phase }: { phase: string }) {
  const phases = {
    thinking: { label: 'Réflexion en cours...', color: 'text-violet-500' },
    searching: { label: 'Recherche en cours...', color: 'text-blue-500' },
    executing: { label: 'Exécution en cours...', color: 'text-amber-500' },
    writing: { label: 'Rédaction en cours...', color: 'text-emerald-500' },
  };
  
  const config = phases[phase as keyof typeof phases] || phases.thinking;
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex gap-1">
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", config.color.replace('text-', 'bg-'))} style={{ animationDelay: '0ms' }} />
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", config.color.replace('text-', 'bg-'))} style={{ animationDelay: '150ms' }} />
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", config.color.replace('text-', 'bg-'))} style={{ animationDelay: '300ms' }} />
      </div>
      <span className={cn("font-medium", config.color)}>{config.label}</span>
    </div>
  );
}

function SourcesList({ sources }: { sources: { title: string; url?: string; snippet?: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="font-medium">{sources.length} source{sources.length > 1 ? 's' : ''} consultée{sources.length > 1 ? 's' : ''}</span>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{source.title}</span>
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
              <span className="flex items-center gap-1 text-red-600">
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
                executed?.success === false && "bg-red-500/5"
              )}
            >
              {executed ? (
                executed.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className="text-xs flex-1 truncate">
                {formatActionLabel(action)}
              </span>
              {!executed && onActionClick && (
                <button
                  onClick={() => onActionClick(action.type)}
                  className="text-xs text-primary hover:underline"
                >
                  Appliquer
                </button>
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
