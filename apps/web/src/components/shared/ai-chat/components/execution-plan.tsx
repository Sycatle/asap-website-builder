"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle, Clock, SkipForward } from 'lucide-react';
import type { ExecutionPlan, ExecutionStep, StepStatus } from '../types';

const STATUS_CONFIG: Record<StepStatus, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  done: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground', bg: 'bg-muted/50' },
};

interface ExecutionPlanViewProps {
  plan: ExecutionPlan;
  compact?: boolean;
  onRetryStep?: (stepId: string) => void;
  onSkipStep?: (stepId: string) => void;
}

export function ExecutionPlanView({ plan, compact = true, onRetryStep, onSkipStep }: ExecutionPlanViewProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  const completedSteps = plan.steps.filter(s => s.status === 'done').length;
  const totalSteps = plan.steps.length;
  const hasRunning = plan.steps.some(s => s.status === 'running');
  const hasFailed = plan.steps.some(s => s.status === 'failed');
  
  return (
    <div className="rounded-xl border bg-card/50 overflow-hidden">
      {/* Header with progress */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          hasRunning ? "bg-blue-500/10" : hasFailed ? "bg-red-500/10" : "bg-emerald-500/10"
        )}>
          {hasRunning ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : hasFailed ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {hasRunning ? 'Exécution en cours' : hasFailed ? 'Erreur détectée' : 'Plan exécuté'}
            </span>
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{totalSteps} étapes
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                hasFailed ? "bg-red-500" : hasRunning ? "bg-blue-500" : "bg-emerald-500"
              )}
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {/* Expanded content */}
      {expanded && (
        <div className="border-t">
          {/* Hypothesis if any */}
          {plan.hypothesis && plan.hypothesis.length > 0 && (
            <div className="px-3 py-2 border-b bg-amber-500/5">
              <p className="text-xs font-medium text-amber-600 mb-1">Hypothèses</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {plan.hypothesis.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Steps */}
          <div className="divide-y">
            {plan.steps.map((step, index) => (
              <StepRow 
                key={step.id} 
                step={step} 
                index={index}
                onRetry={onRetryStep}
                onSkip={onSkipStep}
              />
            ))}
          </div>
          
          {/* Reasoning */}
          {plan.reasoning && (
            <div className="px-3 py-2 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Raisonnement :</span> {plan.reasoning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StepRowProps {
  step: ExecutionStep;
  index: number;
  onRetry?: (stepId: string) => void;
  onSkip?: (stepId: string) => void;
}

function StepRow({ step, index, onRetry, onSkip }: StepRowProps) {
  const config = STATUS_CONFIG[step.status];
  const Icon = config.icon;
  const isRunning = step.status === 'running';
  const isFailed = step.status === 'failed';
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 transition-colors",
      isRunning && "bg-blue-500/5"
    )}>
      {/* Step number + icon */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-4">{index + 1}.</span>
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", config.bg)}>
          <Icon className={cn("w-3.5 h-3.5", config.color, isRunning && "animate-spin")} />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          step.status === 'pending' && "text-muted-foreground",
          step.status === 'skipped' && "text-muted-foreground line-through"
        )}>
          {step.title}
        </p>
        
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
        
        {/* Error display */}
        {isFailed && step.error && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-medium text-red-600">{step.error.message}</p>
            {step.error.cause && (
              <p className="text-xs text-red-500/80 mt-0.5">Cause : {step.error.cause}</p>
            )}
            {step.error.recoverable && (onRetry || onSkip) && (
              <div className="flex gap-2 mt-2">
                {onRetry && (
                  <button 
                    onClick={() => onRetry(step.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Réessayer
                  </button>
                )}
                {onSkip && (
                  <button 
                    onClick={() => onSkip(step.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Passer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Confidence badge */}
      {step.confidence !== undefined && step.status === 'done' && (
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          step.confidence >= 80 ? "bg-emerald-500/10 text-emerald-600" :
          step.confidence >= 50 ? "bg-amber-500/10 text-amber-600" :
          "bg-red-500/10 text-red-600"
        )}>
          {step.confidence}%
        </span>
      )}
    </div>
  );
}
