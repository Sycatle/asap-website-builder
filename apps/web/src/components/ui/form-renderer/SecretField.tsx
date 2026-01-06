/**
 * Secret Field Renderer
 * 
 * Password-like input with visibility toggle
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import type { FieldRendererProps, SecretFieldDef } from './types';

export function SecretField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<SecretFieldDef>) {
  const [showValue, setShowValue] = useState(false);
  const stringValue = (value as string) ?? '';
  const fieldId = `field-${field.key}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Mask the value if it looks like it came from the server
  const displayValue = stringValue.startsWith('•') ? stringValue : stringValue;
  const isServerMasked = stringValue.startsWith('•');

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={fieldId}
          type={showValue && !isServerMasked ? 'text' : 'password'}
          value={displayValue}
          onChange={handleChange}
          placeholder={field.placeholder || '••••••••'}
          disabled={disabled}
          className={cn('pr-10', error && 'border-destructive')}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowValue(!showValue)}
          disabled={isServerMasked}
        >
          {showValue ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
