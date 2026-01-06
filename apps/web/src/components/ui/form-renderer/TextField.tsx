/**
 * Text Field Renderer
 * 
 * Handles: text, textarea, email, url, password
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldRendererProps, TextFieldDef } from './types';

export function TextField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<TextFieldDef>) {
  const stringValue = (value as string) ?? '';
  const fieldId = `field-${field.key}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const inputType = field.type === 'email' ? 'email' 
    : field.type === 'url' ? 'url' 
    : field.type === 'password' ? 'password' 
    : 'text';

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      {field.type === 'textarea' ? (
        <Textarea
          id={fieldId}
          value={stringValue}
          onChange={handleChange}
          placeholder={field.placeholder}
          disabled={disabled}
          className={cn(error && 'border-destructive')}
          maxLength={field.validation?.max_length}
          rows={4}
        />
      ) : (
        <Input
          id={fieldId}
          type={inputType}
          value={stringValue}
          onChange={handleChange}
          placeholder={field.placeholder}
          disabled={disabled}
          className={cn(error && 'border-destructive')}
          maxLength={field.validation?.max_length}
          minLength={field.validation?.min_length}
        />
      )}
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
