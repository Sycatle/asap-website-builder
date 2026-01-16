"use client"

import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  Database,
} from "lucide-react";
import { MarkdownContent } from "../../markdown-content";
import type { Message, ToolCallState } from '../types';
import { TOOL_CONFIG, AI_DATA_TOOL_CONFIG } from '../constants';
import { formatActionLabel } from '../utils';
import { ThinkingIndicator, ChainOfThoughtsDisplay } from './thinking-display';

interface MessageBubbleProps {
  message: Message;
  userAvatar?: string;
  userInitials: string;
  userName: string;
  onCopy: () => void;
  isCopied: boolean;
  onRetry?: () => void;
  animationDelay?: number;
}

export const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  userAvatar, 
  userInitials, 
  userName,
  onCopy,
  isCopied,
  onRetry,
  animationDelay = 0,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasError = message.error;
  
  // Memoize action status calculations
  const actionStats = useMemo(() => {
    if (!message.actions?.length) return null;
    const total = message.actions.length;
    const executed = message.executedActions?.length || 0;
    const successful = message.executedActions?.filter(e => e.success).length || 0;
    const failed = message.executedActions?.filter(e => !e.success).length || 0;
    return { total, executed, successful, failed };
  }, [message.actions, message.executedActions]);
  
  return (
    <div 
      className={cn(
        "flex items-end gap-2 group animate-in fade-in-0 slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Avatar */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md ring-2 ring-background">
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white">
            <Sparkles className={cn("h-4 w-4", message.isStreaming && "animate-pulse")} />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 shadow-md ring-2 ring-background">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Bubble */}
      <div className={cn("flex flex-col gap-1", isUser && "max-w-[80%]", !isUser && "w-full")}>
        <div className={cn(
          "transition-all",
          isUser 
            ? "px-4 py-2.5 shadow-sm bg-primary text-primary-foreground rounded-2xl rounded-br-md" 
            : "py-1",
          hasError && !isUser && "px-4 py-2.5 border border-red-500/50 bg-red-50 dark:bg-red-950/30 rounded-2xl",
          message.isStreaming && !isUser && "border-l-2 border-primary/50 pl-3"
        )}>
          {/* Error indicator */}
          {hasError && !isUser && (
            <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">Failed to generate response</span>
            </div>
          )}
          
          {/* Iteration indicator */}
          {!isUser && message.iteration && message.iteration.status !== 'finished' && (
            <div className="mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3 animate-spin" />
                  Iteration {message.iteration.current}/{message.iteration.max}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">{message.iteration.status}</span>
              </div>
              {message.iteration.description && (
                <p className="text-xs text-muted-foreground">{message.iteration.description}</p>
              )}
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${(message.iteration.current / message.iteration.max) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Chain of Thoughts - Visual step-by-step display */}
          {!isUser && message.chainSteps && message.chainSteps.length > 0 && (
            <ChainOfThoughtsDisplay steps={message.chainSteps} isStreaming={message.isStreaming} />
          )}
          
          {/* Simple thinking indicator when no chain steps */}
          {!isUser && message.thinking && (!message.chainSteps || message.chainSteps.length === 0) && (
            <ThinkingIndicator thought={message.thinking.thought} step={message.thinking.step} />
          )}
          
          {/* Tool calls display */}
          {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
            <ToolCallsDisplay toolCalls={message.toolCalls} />
          )}
          
          {/* Message content with markdown rendering */}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed">
              <MarkdownContent content={message.content} />
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
              )}
            </div>
          )}
          
          {/* AI Actions indicator */}
          {!isUser && message.actions && message.actions.length > 0 && (
            <ActionsDisplay 
              actions={message.actions} 
              executedActions={message.executedActions} 
              actionStats={actionStats} 
            />
          )}
          
          {/* Used tools/sources display */}
          {!isUser && !message.isStreaming && message.usedTools && message.usedTools.length > 0 && (
            <UsedToolsDisplay usedTools={message.usedTools} />
          )}
        </div>
        
        {/* Timestamp, Tokens & Actions */}
        <MessageFooter 
          message={message}
          isUser={isUser}
          hasError={hasError}
          onCopy={onCopy}
          isCopied={isCopied}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
});

// Sub-components for MessageBubble

function ToolCallsDisplay({ toolCalls }: { toolCalls: ToolCallState[] }) {
  return (
    <div className="mb-3 space-y-2">
      {toolCalls.map((toolCall) => {
        const config = TOOL_CONFIG[toolCall.tool] || TOOL_CONFIG['default'];
        const Icon = config.icon;
        const isRunning = toolCall.status === 'running' || toolCall.status === 'pending';
        const isCompleted = toolCall.status === 'completed';
        const isFailed = toolCall.status === 'failed';
        
        return (
          <div 
            key={toolCall.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all animate-in fade-in-0 slide-in-from-left-2",
              isRunning && "bg-primary/5 border-primary/30",
              isCompleted && "bg-green-500/5 border-green-500/30",
              isFailed && "bg-red-500/5 border-red-500/30"
            )}
          >
            <div className={cn(
              "shrink-0 h-6 w-6 rounded-md flex items-center justify-center",
              isRunning && "bg-primary/10",
              isCompleted && "bg-green-500/10",
              isFailed && "bg-red-500/10"
            )}>
              {isRunning ? (
                <Loader2 className={cn("h-3.5 w-3.5 animate-spin", config.color)} />
              ) : isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : isFailed ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{toolCall.description}</p>
              {toolCall.result?.message && (
                <p className={cn(
                  "text-[10px] truncate mt-0.5",
                  toolCall.result.success ? "text-green-600" : "text-red-600"
                )}>
                  {toolCall.result.message}
                </p>
              )}
            </div>
            {isRunning && (
              <span className="text-[10px] text-muted-foreground">Running...</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ActionsDisplayProps {
  actions: Message['actions'];
  executedActions: Message['executedActions'];
  actionStats: { total: number; executed: number; successful: number; failed: number } | null;
}

function ActionsDisplay({ actions, executedActions, actionStats }: ActionsDisplayProps) {
  if (!actions?.length) return null;
  
  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      {/* Summary bar */}
      {actionStats && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            {actionStats.total} action{actionStats.total > 1 ? 's' : ''}
          </span>
          {actionStats.executed > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {actionStats.successful > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {actionStats.successful}
                </span>
              )}
              {actionStats.failed > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {actionStats.failed}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Action list */}
      <div className="space-y-1.5">
        {actions.map((action, idx) => {
          const executed = executedActions?.find(e => e.action === action);
          return (
            <div 
              key={idx} 
              className={cn(
                "flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors",
                executed?.success && "bg-green-500/10",
                executed?.success === false && "bg-red-500/10",
                !executed && "bg-muted/50"
              )}
            >
              {executed ? (
                executed.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{executed.error || 'Action failed'}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              )}
              <span className={cn(
                "truncate flex-1",
                executed?.success === false && "text-red-600 dark:text-red-400"
              )}>
                {formatActionLabel(action)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsedToolsDisplay({ usedTools }: { usedTools: Message['usedTools'] }) {
  if (!usedTools?.length) return null;
  
  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center gap-1.5 mb-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Sources consultées
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {usedTools.map((tool) => {
          const config = AI_DATA_TOOL_CONFIG[tool.name];
          const Icon = config?.icon || Database;
          const label = config?.label || tool.name.replace(/_/g, ' ');
          
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                  tool.success 
                    ? "bg-muted/50 text-muted-foreground hover:bg-muted" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                  {tool.success ? (
                    <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-2.5 w-2.5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{tool.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

interface MessageFooterProps {
  message: Message;
  isUser: boolean;
  hasError?: boolean;
  onCopy: () => void;
  isCopied: boolean;
  onRetry?: () => void;
}

function MessageFooter({ message, isUser, hasError, onCopy, isCopied, onRetry }: MessageFooterProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-1",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <span className="text-[10px] text-muted-foreground">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      
      {/* Token usage for assistant messages */}
      {!isUser && message.usage && (
        <Tooltip>
          <TooltipTrigger>
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {message.usage.total_tokens} tokens
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs space-y-0.5">
              <p>Prompt: {message.usage.prompt_tokens}</p>
              <p>Completion: {message.usage.completion_tokens}</p>
              <p className="font-medium">Total: {message.usage.total_tokens}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Copy button */}
      {!isUser && !hasError && message.content && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isCopied ? 'Copied!' : 'Copy message'}</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Retry button for errors */}
      {hasError && onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Try again</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
