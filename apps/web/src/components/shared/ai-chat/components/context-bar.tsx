"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { X, Pin, Globe, Wrench, FileText, AlertCircle } from 'lucide-react';
import type { ChatContext } from '../types';

interface ContextBarProps {
  context: ChatContext;
  onRemoveFile?: (name: string) => void;
  onRemovePin?: (label: string) => void;
  onToggleScope?: (scope: 'tools' | 'web') => void;
}

export function ContextBar({ context, onRemoveFile, onRemovePin, onToggleScope }: ContextBarProps) {
  const hasContent = (context.files?.length || 0) > 0 || 
                     (context.pins?.length || 0) > 0;
  
  if (!hasContent && !context.scopes) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 overflow-x-auto">
      {/* Files */}
      {context.files?.map(file => (
        <ContextChip
          key={file.name}
          icon={<FileText className="w-3 h-3" />}
          label={file.name}
          onRemove={onRemoveFile ? () => onRemoveFile(file.name) : undefined}
        />
      ))}
      
      {/* Pins */}
      {context.pins?.map(pin => (
        <ContextChip
          key={pin.label}
          icon={<Pin className="w-3 h-3" />}
          label={pin.label}
          value={pin.value}
          onRemove={onRemovePin ? () => onRemovePin(pin.label) : undefined}
        />
      ))}
      
      {/* Scopes */}
      {context.scopes && (
        <div className="flex items-center gap-1 ml-auto">
          <ScopeToggle
            icon={<Wrench className="w-3 h-3" />}
            label="Outils"
            active={context.scopes.tools}
            onClick={() => onToggleScope?.('tools')}
          />
          <ScopeToggle
            icon={<Globe className="w-3 h-3" />}
            label="Web"
            active={context.scopes.web}
            onClick={() => onToggleScope?.('web')}
          />
        </div>
      )}
    </div>
  );
}

function ContextChip({ 
  icon, 
  label, 
  value,
  onRemove 
}: { 
  icon: React.ReactNode; 
  label: string;
  value?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background border text-xs shrink-0">
      {icon}
      <span className="font-medium">{label}</span>
      {value && (
        <span className="text-muted-foreground truncate max-w-20">: {value}</span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0.5 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ScopeToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors",
        active 
          ? "bg-primary/10 text-primary border border-primary/30" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Alert component for context issues
interface ContextAlertProps {
  type: 'warning' | 'error' | 'info';
  message: string;
  onDismiss?: () => void;
}

export function ContextAlert({ type, message, onDismiss }: ContextAlertProps) {
  const styles = {
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    error: 'bg-red-500/10 border-red-500/30 text-red-600',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
  };
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 border rounded-lg text-xs",
      styles[type]
    )}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="p-0.5 hover:bg-background/50 rounded">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
