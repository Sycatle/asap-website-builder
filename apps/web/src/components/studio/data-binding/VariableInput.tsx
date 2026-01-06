/**
 * Variable Input Component
 * 
 * A text input/textarea that supports variable interpolation.
 * Shows a preview of the interpolated text and provides a variable picker.
 */

'use client';

import * as React from 'react';
import { Variable, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VariablePicker } from './VariablePicker';
import type { WebsiteVariable } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface VariableInputProps {
  /** Current value (with variable placeholders) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available variables */
  variables: WebsiteVariable[];
  /** Quick lookup map for preview */
  variableValues: Record<string, unknown>;
  /** Label for the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to use textarea instead of input */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Variable Highlight
// ============================================

function highlightVariables(text: string): React.ReactNode {
  const parts = text.split(/(\{\{\w+\}\})/g);
  
  return parts.map((part, index) => {
    if (part.match(/^\{\{\w+\}\}$/)) {
      return (
        <span 
          key={index}
          className="bg-primary/10 text-primary rounded px-0.5 font-mono text-sm"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ============================================
// Main Component
// ============================================

export function VariableInput({
  value,
  onChange,
  variables,
  variableValues,
  label,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  className,
}: VariableInputProps) {
  const [showPreview, setShowPreview] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Interpolate variables for preview
  const interpolatedValue = React.useMemo(() => {
    if (!value) return '';
    
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = variableValues[key];
      if (val === undefined) return match;
      
      if (typeof val === 'number') {
        return new Intl.NumberFormat('fr-FR').format(val);
      }
      return String(val);
    });
  }, [value, variableValues]);

  // Check if value contains variables
  const hasVariables = /\{\{\w+\}\}/.test(value);

  // Handle variable selection from picker
  const handleVariableSelect = React.useCallback((variable: WebsiteVariable) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value + `{{${variable.key}}}`);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const variableText = `{{${variable.key}}}`;
    
    const newValue = value.slice(0, start) + variableText + value.slice(end);
    onChange(newValue);

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      input.focus();
      const newPosition = start + variableText.length;
      input.setSelectionRange(newPosition, newPosition);
    });
  }, [value, onChange]);

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <div className="flex items-center gap-1">
            {hasVariables && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-6 px-2 text-xs"
              >
                {showPreview ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                Aperçu
              </Button>
            )}
            <VariablePicker
              variables={variables}
              onSelect={handleVariableSelect}
              disabled={disabled}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                disabled={disabled}
              >
                <Variable className="h-3 w-3 mr-1" />
                <span className="text-xs">Variables</span>
              </Button>
            </VariablePicker>
          </div>
        </div>
      )}

      <div className="relative">
        <InputComponent
          ref={inputRef as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={multiline ? rows : undefined}
          className={cn(
            hasVariables && 'font-mono text-sm',
            showPreview && 'opacity-0'
          )}
        />
        
        {/* Preview overlay */}
        {showPreview && (
          <div
            className={cn(
              'absolute inset-0 p-3 rounded-md border bg-muted/50',
              'pointer-events-none overflow-hidden',
              multiline && 'whitespace-pre-wrap'
            )}
          >
            <span className="text-foreground">
              {interpolatedValue || (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Variable hint */}
      {hasVariables && !showPreview && (
        <p className="text-xs text-muted-foreground">
          💡 Variables détectées. Cliquez sur Aperçu pour voir le résultat.
        </p>
      )}
    </div>
  );
}

// ============================================
// Simple Variable Display (read-only)
// ============================================

export interface VariableDisplayProps {
  /** Text with variable placeholders */
  text: string;
  /** Variable values for interpolation */
  values: Record<string, unknown>;
  /** Custom class name */
  className?: string;
}

export function VariableDisplay({ text, values, className }: VariableDisplayProps) {
  const interpolated = React.useMemo(() => {
    if (!text) return '';
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = values[key];
      if (val === undefined) return match;
      
      if (typeof val === 'number') {
        return new Intl.NumberFormat('fr-FR').format(val);
      }
      return String(val);
    });
  }, [text, values]);

  return <span className={className}>{interpolated}</span>;
}

export default VariableInput;
