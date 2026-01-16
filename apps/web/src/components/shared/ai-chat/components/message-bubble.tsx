"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, ChevronRight, Copy, Check, AlertTriangle,
  ExternalLink, Sparkles, Zap, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown,
  Loader2, Wrench
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownContent } from '@/components/shared/markdown-content';
import type { Message, AssistantMessage, UserMessage, ToolCall } from '../types';
import type { AIAction } from '@/lib/api/ai';
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
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  
  const hasError = message.toolCalls?.some(t => t.status === 'failed') || 
                   message.plan?.steps.some(s => s.status === 'failed');
  
  const isThinking = Boolean(message.isStreaming && message.streamingPhase !== 'writing');
  const isWriting = Boolean(message.isStreaming && message.streamingPhase === 'writing');
  const hasContent = Boolean(message.content.body && message.content.body.length > 0);
  
  // Auto-collapse thinking when writing starts
  useEffect(() => {
    if (isWriting && hasContent) {
      setThinkingExpanded(false);
    }
  }, [isWriting, hasContent]);
  
  // Re-expand when new message starts
  useEffect(() => {
    if (message.isStreaming && !hasContent) {
      setThinkingExpanded(true);
    }
  }, [message.isStreaming, hasContent]);
  
  const handleCopy = async () => {
    const text = message.content.summary || message.content.body;
    await navigator.clipboard.writeText(text);
    onCopy?.(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Get current action label for thinking indicator
  const currentAction = useMemo(() => {
    const runningTool = message.toolCalls?.find(t => t.status === 'running');
    if (runningTool) return runningTool.label;
    
    const runningStep = message.plan?.steps.find(s => s.status === 'running');
    if (runningStep) return runningStep.title;
    
    if (message.currentThought) return message.currentThought;
    
    return null;
  }, [message.toolCalls, message.plan?.steps, message.currentThought]);
  
  // Count completed steps with specialist info
  const stepsInfo = useMemo(() => {
    const steps = (message.plan?.steps || []).map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      specialist: s.specialist,
      description: s.description,
      confidence: s.confidence,
    }));
    const completed = steps.filter(s => s.status === 'done').length;
    const total = steps.length;
    return { completed, total, steps };
  }, [message.plan?.steps]);
  
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-foreground/5 flex items-center justify-center">
        <Sparkles className={cn("w-3.5 h-3.5 text-foreground/70", message.isStreaming && "animate-pulse")} />
      </div>
      
      <div className="flex-1 min-w-0 space-y-3">
        {/* Thinking Section - ChatGPT style collapsible */}
        {(isThinking || (stepsInfo.total > 0 && !hasContent)) && (
          <ThinkingSection
            isThinking={isThinking}
            currentAction={currentAction}
            stepsInfo={stepsInfo}
            expanded={thinkingExpanded}
            onToggle={() => setThinkingExpanded(!thinkingExpanded)}
          />
        )}
        
        {/* Collapsible thinking when we have content - Chef de Projet style */}
        {hasContent && stepsInfo.total > 0 && (
          <Collapsible open={thinkingExpanded} onOpenChange={setThinkingExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              </span>
              <span>Plan exécuté</span>
              <span className="text-[10px]">
                {stepsInfo.completed}/{stepsInfo.total} étapes
              </span>
              <ChevronDown className={cn(
                "w-3 h-3 ml-auto transition-transform",
                !thinkingExpanded && "-rotate-90"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="relative pl-4 space-y-1.5">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                
                {stepsInfo.steps.map((step) => (
                  <div key={step.id} className="relative flex items-start gap-2 py-1 pl-2">
                    {/* Status indicator */}
                    <div className={cn(
                      "absolute left-0 w-3.5 h-3.5 rounded-full flex items-center justify-center -translate-x-[7px] bg-background",
                      step.status === 'done' && "bg-emerald-500/10",
                      step.status === 'failed' && "bg-red-500/10",
                    )}>
                      {step.status === 'done' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                      {step.status === 'running' && (
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      )}
                      {step.status === 'failed' && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                      {(step.status === 'pending' || step.status === 'skipped') && (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {step.specialist && (
                          <span className="text-xs">
                            {step.specialist === 'data_analyst' && '📊'}
                            {step.specialist === 'content_writer' && '✍️'}
                            {step.specialist === 'designer' && '🎨'}
                            {step.specialist === 'strategist' && '🧭'}
                            {step.specialist === 'validator' && '✅'}
                            {step.specialist === 'researcher' && '🔍'}
                            {!['data_analyst', 'content_writer', 'designer', 'strategist', 'validator', 'researcher'].includes(step.specialist) && '🤖'}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs truncate",
                          step.status === 'done' && "text-muted-foreground",
                          step.status === 'failed' && "text-red-500"
                        )}>
                          {step.title}
                        </span>
                        {step.confidence && step.status === 'done' && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {step.confidence}%
                          </span>
                        )}
                      </div>
                      {step.description && step.status === 'done' && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground/50 animate-pulse" />
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
            <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-3">
                {detailsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Voir les détails
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <MarkdownContent content={message.content.details} />
                </div>
              </CollapsibleContent>
            </Collapsible>
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
        {!message.isStreaming && hasContent && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
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

interface ThinkingSectionProps {
  isThinking: boolean;
  currentAction: string | null;
  stepsInfo: { 
    completed: number; 
    total: number; 
    steps: { 
      id: string; 
      title: string; 
      status: string;
      specialist?: string;
      description?: string;
      confidence?: number;
    }[] 
  };
  expanded: boolean;
  onToggle: () => void;
}

/** Get icon for specialist type */
function getSpecialistIcon(specialist?: string) {
  switch (specialist) {
    case 'data_analyst':
      return '📊';
    case 'content_writer':
      return '✍️';
    case 'designer':
      return '🎨';
    case 'strategist':
      return '🧭';
    case 'validator':
      return '✅';
    case 'researcher':
      return '🔍';
    default:
      return '🤖';
  }
}

/** Get label for specialist type */
function getSpecialistLabel(specialist?: string): string {
  switch (specialist) {
    case 'data_analyst':
      return 'Analyste';
    case 'content_writer':
      return 'Rédacteur';
    case 'designer':
      return 'Designer';
    case 'strategist':
      return 'Stratège';
    case 'validator':
      return 'Validateur';
    case 'researcher':
      return 'Chercheur';
    default:
      return 'Assistant';
  }
}

function ThinkingSection({ isThinking, currentAction, stepsInfo, expanded, onToggle }: ThinkingSectionProps) {
  const runningStep = stepsInfo.steps.find(s => s.status === 'running');
  
  return (
    <div className="space-y-2">
      {/* Main thinking indicator - Modern ChatGPT style */}
      <button 
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left group"
      >
        {isThinking ? (
          <>
            {/* Animated dots */}
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-foreground/70">
              {runningStep ? (
                <>
                  <span className="mr-1">{getSpecialistIcon(runningStep.specialist)}</span>
                  {currentAction || runningStep.title}
                </>
              ) : (
                currentAction || 'Réflexion en cours...'
              )}
            </span>
            {stepsInfo.total > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {stepsInfo.completed + 1}/{stepsInfo.total}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            </span>
            <span className="text-xs">
              Plan exécuté
            </span>
            <span className="text-[10px] text-muted-foreground">
              {stepsInfo.completed}/{stepsInfo.total} étapes
            </span>
            <ChevronDown className={cn(
              "w-3 h-3 ml-auto transition-transform",
              !expanded && "-rotate-90"
            )} />
          </>
        )}
      </button>
      
      {/* Expanded steps list - Modern pipeline style */}
      {expanded && stepsInfo.steps.length > 0 && (
        <div className="relative pl-4 space-y-1.5">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
          
          {stepsInfo.steps.map((step, idx) => (
            <div 
              key={step.id} 
              className={cn(
                "relative flex items-start gap-2 py-1 pl-2",
                step.status === 'running' && "bg-muted/30 rounded-md -ml-2 pl-4"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "absolute left-0 w-3.5 h-3.5 rounded-full flex items-center justify-center -translate-x-[7px] bg-background",
                step.status === 'done' && "bg-emerald-500/10",
                step.status === 'running' && "bg-primary/10",
                step.status === 'failed' && "bg-red-500/10",
              )}>
                {step.status === 'done' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                )}
                {step.status === 'failed' && (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
                {(step.status === 'pending' || step.status === 'skipped') && (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {step.specialist && (
                    <span className="text-xs" title={getSpecialistLabel(step.specialist)}>
                      {getSpecialistIcon(step.specialist)}
                    </span>
                  )}
                  <span className={cn(
                    "text-xs truncate",
                    step.status === 'done' && "text-muted-foreground",
                    step.status === 'running' && "text-foreground font-medium",
                    step.status === 'pending' && "text-muted-foreground/50",
                    step.status === 'failed' && "text-red-500"
                  )}>
                    {step.title}
                  </span>
                  {step.confidence && step.status === 'done' && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {step.confidence}%
                    </span>
                  )}
                </div>
                {/* Show description/insight for completed or running steps */}
                {step.description && (step.status === 'done' || step.status === 'running') && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
