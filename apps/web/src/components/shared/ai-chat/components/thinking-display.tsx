"use client"

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { ChainStep } from '../types';
import { TOOL_CONFIG } from '../constants';

interface ThinkingIndicatorProps {
  thought: string;
  step?: number;
}

export const ThinkingIndicator = React.memo(function ThinkingIndicator({ thought, step }: ThinkingIndicatorProps) {
  return (
    <div className="mb-3 flex items-start gap-2 text-muted-foreground animate-in fade-in-0 slide-in-from-left-2">
      <div className="shrink-0 mt-0.5">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {step && <span className="text-[10px] text-primary/60 mr-1.5">Step {step}</span>}
        <p className="text-xs italic text-muted-foreground/80">{thought}</p>
      </div>
    </div>
  );
});

interface ChainOfThoughtsDisplayProps {
  steps: ChainStep[];
  isStreaming?: boolean;
}

export const ChainOfThoughtsDisplay = React.memo(function ChainOfThoughtsDisplay({ steps, isStreaming }: ChainOfThoughtsDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const hasRunning = steps.some(s => s.status === 'running');
  
  if (steps.length === 0) return null;
  
  return (
    <div className="mb-4 animate-in fade-in-0 slide-in-from-left-2">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        <div className="flex items-center gap-1.5">
          {hasRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : completedCount === totalCount ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {hasRunning ? 'Processing...' : completedCount === totalCount ? 'Completed' : 'Thinking'}
          </span>
        </div>
        
        {/* Progress indicator */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{completedCount}/{totalCount}</span>
        </div>
        
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform",
          isCollapsed && "-rotate-90"
        )} />
      </button>
      
      {/* Steps list */}
      {!isCollapsed && (
        <div className="space-y-1.5 pl-1 border-l-2 border-muted ml-1.5">
          {steps.map((step, idx) => {
            const config = TOOL_CONFIG[step.tool || step.type] || TOOL_CONFIG['default'];
            const Icon = config.icon;
            const isRunning = step.status === 'running';
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isPending = step.status === 'pending';
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-start gap-2 pl-3 py-1.5 transition-all relative",
                  "animate-in fade-in-0 slide-in-from-left-1",
                  isRunning && "bg-primary/5 rounded-r-lg"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Connection dot on the border */}
                <div className={cn(
                  "absolute -left-[5px] top-3 w-2 h-2 rounded-full border-2 border-background",
                  isCompleted && "bg-green-500",
                  isRunning && "bg-primary animate-pulse",
                  isFailed && "bg-red-500",
                  isPending && "bg-muted"
                )} />
                
                {/* Step icon */}
                <div className={cn(
                  "shrink-0 h-6 w-6 rounded-md flex items-center justify-center",
                  config.bgColor
                )}>
                  {isRunning ? (
                    <Loader2 className={cn("h-3.5 w-3.5 animate-spin", config.color)} />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : isFailed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isPending ? "text-muted-foreground" : config.color)} />
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium",
                    isPending && "text-muted-foreground",
                    isFailed && "text-red-600"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  )}
                  {step.result?.message && (
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      step.result.success ? "text-green-600" : "text-red-600"
                    )}>
                      {step.result.message}
                    </p>
                  )}
                </div>
                
                {/* Status badge */}
                {isRunning && (
                  <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Running
                  </span>
                )}
              </div>
            );
          })}
          
          {/* Show "more steps coming" indicator when streaming */}
          {isStreaming && hasRunning && (
            <div className="flex items-center gap-2 pl-3 py-1.5 text-muted-foreground/60">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px]">More steps...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
