/**
 * Smart Variable Input Component
 * 
 * A wrapper around VariableInput that automatically gets variables from 
 * the StudioDataContext. Use this in property editors instead of plain Input.
 */

'use client';

import * as React from 'react';
import { VariableInput } from './VariableInput';
import StudioDataContext from './StudioDataContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ============================================
// Types
// ============================================

export interface SmartVariableInputProps {
  /** Current value (with variable placeholders) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
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
  /** Fallback to regular input if no context (for use outside Studio) */
  fallbackToInput?: boolean;
}

// ============================================
// Fallback Component (no context)
// ============================================

function FallbackInput({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  className,
}: Omit<SmartVariableInputProps, 'fallbackToInput'>) {
  const InputComponent = multiline ? Textarea : Input;
  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <InputComponent
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={multiline ? rows : undefined}
      />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SmartVariableInput({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  className,
  fallbackToInput = true,
}: SmartVariableInputProps) {
  // Check if context is available without using the hook conditionally
  const context = React.useContext(StudioDataContext);

  // No context available
  if (!context) {
    if (fallbackToInput) {
      return (
        <FallbackInput
          value={value}
          onChange={onChange}
          label={label}
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          disabled={disabled}
          className={className}
        />
      );
    }
    throw new Error('SmartVariableInput must be used within a StudioDataProvider or with fallbackToInput=true');
  }

  // Context available - use VariableInput with variables
  return (
    <VariableInput
      value={value}
      onChange={onChange}
      variables={context.variables}
      variableValues={context.variableValues}
      label={label}
      placeholder={placeholder}
      multiline={multiline}
      rows={rows}
      disabled={disabled}
      className={className}
    />
  );
}

// ============================================
// Convenience components for common use cases
// ============================================

/**
 * SmartInput - Single line input with variable support
 */
export function SmartInput(props: Omit<SmartVariableInputProps, 'multiline' | 'rows'>) {
  return <SmartVariableInput {...props} multiline={false} />;
}

/**
 * SmartTextarea - Multi-line input with variable support
 */
export function SmartTextarea(props: Omit<SmartVariableInputProps, 'multiline'> & { rows?: number }) {
  return <SmartVariableInput {...props} multiline={true} />;
}

export default SmartVariableInput;
