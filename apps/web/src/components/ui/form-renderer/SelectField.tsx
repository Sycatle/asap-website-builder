/**
 * Select Field Renderer
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FieldRendererProps, SelectFieldDef } from './types';

export function SelectField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<SelectFieldDef>) {
  const stringValue = (value as string) ?? '';
  const fieldId = `field-${field.key}`;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      <Select
        value={stringValue}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id={fieldId} 
          className={cn(error && 'border-destructive')}
        >
          <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
