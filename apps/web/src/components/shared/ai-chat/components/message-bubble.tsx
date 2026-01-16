"use client"

import React, { useMemo, useCallback, useState, useEffect } from 'react';
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

// Direct text display - no artificial delay
function useTypewriter(text: string, _isActive: boolean, _speed: number = 15) {
  return text || '';
}

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
    <div className="flex gap-4 justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-br-md shadow-sm">
          <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
      
      <Avatar className="w-7 h-7 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// ============================================================================
// Assistant Bubble - Modern minimalist style (ChatGPT-inspired)
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
    }));
    const completed = steps.filter(s => s.status === 'done').length;
    const total = steps.length;
    return { completed, total, steps };
  }, [message.plan?.steps]);
  
  return (
    <div className="flex gap-4 group">
      {/* Minimalist Avatar */}
      <div className="w-6 h-6 shrink-0 mt-1 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
        <Sparkles className={cn("w-3 h-3 text-zinc-600 dark:text-zinc-400", message.isStreaming && "animate-pulse")} />
      </div>
      
      <div className="flex-1 min-w-0 space-y-4">
        {/* Thinking Section - Minimalist with real-time feedback */}
        {(isThinking || (stepsInfo.total > 0 && !hasContent)) && (
          <ThinkingSection
            isThinking={isThinking}
            currentAction={currentAction}
            currentReasoning={message.currentReasoning}
            stepsInfo={stepsInfo}
            expanded={thinkingExpanded}
            onToggle={() => setThinkingExpanded(!thinkingExpanded)}
          />
        )}
        
        {/* Collapsible plan when content arrives */}
        {hasContent && stepsInfo.total > 0 && (
          <Collapsible open={thinkingExpanded} onOpenChange={setThinkingExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium">Analyse terminée</span>
              <span className="text-zinc-400">· {stepsInfo.completed} étapes</span>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 ml-auto transition-transform",
                !thinkingExpanded && "-rotate-90"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2 pl-1">
                {stepsInfo.steps.map((step, idx) => (
                  <div key={step.id} className="flex items-start gap-2.5 text-sm">
                    <span className="text-zinc-400 dark:text-zinc-600 mt-0.5">•</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {step.description || step.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Main Content - Clean & Spacious */}
        <div className="space-y-4">
          {/* Summary - Highlighted */}
          {message.content.summary && (
            <div className="px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 font-medium">
                {message.content.summary}
              </p>
            </div>
          )}
          
          {/* Body - Maximum readability */}
          {message.content.body && (
            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800">
              <MarkdownContent content={message.content.body} />
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 ml-1 bg-zinc-400 animate-pulse" />
              )}
            </div>
          )}
          
          {/* Warnings - Subtle but visible */}
          {message.content.warnings && message.content.warnings.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1 text-amber-900 dark:text-amber-200">
                {message.content.warnings.map((warning, i) => (
                  <p key={i} className="leading-relaxed">{warning}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Details - Collapsed by default */}
          {message.content.details && (
            <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", detailsExpanded && "rotate-90")} />
                <span>Voir les détails</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 text-sm prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <MarkdownContent content={message.content.details} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        
        {/* Artifacts */}
        {message.content.artifacts && message.content.artifacts.length > 0 && (
          <div className="space-y-3">
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
        
        {/* Footer actions - Minimalist style */}
        {!message.isStreaming && hasContent && (
          <div className="flex items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
            
            {hasError && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                onClick={onRetry}
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Réessayer
              </Button>
            )}
            
            {message.usage && (
              <span className="ml-auto text-[10px] text-zinc-400 font-mono">
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
  currentReasoning?: string;
  stepsInfo: { 
    completed: number; 
    total: number; 
    steps: { 
      id: string; 
      title: string; 
      status: string;
      specialist?: string;
      description?: string;
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

function ThinkingSection({ isThinking, currentAction, currentReasoning, stepsInfo, expanded, onToggle }: ThinkingSectionProps) {
  const runningStep = stepsInfo.steps.find(s => s.status === 'running');
  
  return (
    <div className="space-y-3">
      {/* Main thinking indicator - Modern minimalist */}
      <button 
        onClick={onToggle}
        className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors w-full text-left"
      >
        {isThinking ? (
          <>
            <div className="relative w-4 h-4 shrink-0">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {currentAction || 'Analyse en cours...'}
              </span>
            </div>
            {stepsInfo.total > 0 && (
              <span className="text-xs text-zinc-400 shrink-0">
                {stepsInfo.completed + 1}/{stepsInfo.total}
              </span>
            )}
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium">Analyse terminée</span>
            <span className="text-xs text-zinc-400">· {stepsInfo.completed} étapes</span>
            <ChevronDown className={cn(
              "w-4 h-4 ml-auto transition-transform",
              !expanded && "-rotate-90"
            )} />
          </>
        )}
      </button>
      
      {/* Real-time reasoning - Clean display */}
      {isThinking && currentReasoning && expanded && (
        <div className="pl-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed animate-in fade-in">
          <p>{currentReasoning}</p>
        </div>
      )}
      
      {/* Expanded steps - Minimalist bullet list */}
      {expanded && stepsInfo.steps.length > 0 && (
        <div className="space-y-2.5 pl-1">
          {stepsInfo.steps.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "flex items-start gap-2.5 text-sm",
                step.status === 'pending' && "opacity-40"
              )}
            >
              {/* Status bullet */}
              <span className="text-zinc-400 dark:text-zinc-600 mt-1 shrink-0">
                {step.status === 'running' && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
                {step.status === 'done' && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
                )}
                {step.status === 'failed' && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
                {(step.status === 'pending' || step.status === 'skipped') && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                )}
              </span>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "leading-relaxed break-words",
                  step.status === 'done' && "text-zinc-600 dark:text-zinc-400",
                  step.status === 'running' && "text-zinc-700 dark:text-zinc-300",
                  step.status === 'pending' && "text-zinc-400 dark:text-zinc-600",
                  step.status === 'failed' && "text-red-500"
                )}>
                  {step.description || step.title}
                  {step.status === 'running' && (
                    <span className="ml-1 animate-pulse">...</span>
                  )}
                </p>
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
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
      >
        <ChevronRight className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", expanded && "rotate-90")} />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {sources.length} source{sources.length > 1 ? 's' : ''}
        </span>
      </button>
      
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          {sources.map((source, i) => (
            <div key={i} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1">{source.title}</span>
                {source.url && (
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-500 hover:text-blue-600 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {source.snippet && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                  {source.snippet}
                </p>
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
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/30">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          {stats.total} action{stats.total > 1 ? 's' : ''}
        </span>
        {stats.executed > 0 && (
          <div className="flex items-center gap-2.5 text-xs">
            {stats.successful > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats.successful}
              </span>
            )}
            {stats.failed > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.failed}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {actions.map((action, i) => {
          const executed = executedActions?.find(e => e.action === action);
          return (
            <div 
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-colors",
                executed?.success && "bg-emerald-50 dark:bg-emerald-500/5",
                executed?.success === false && "bg-red-50 dark:bg-red-500/5"
              )}
            >
              {executed ? (
                executed.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                )
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-700 shrink-0" />
              )}
              <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                {formatActionLabel(action)}
              </span>
              {!executed && onActionClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
