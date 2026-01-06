/**
 * Number Field Renderer
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldRendererProps, NumberFieldDef } from './types';

export function NumberField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<NumberFieldDef>) {
  const numberValue = value as number | undefined;
  const fieldId = `field-${field.key}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      <Input
        id={fieldId}
        type="number"
        value={numberValue ?? ''}
        onChange={handleChange}
        placeholder={field.placeholder}
        disabled={disabled}
        className={cn(error && 'border-destructive')}
        min={field.validation?.min}
        max={field.validation?.max}
        step={field.validation?.step}
      />
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
