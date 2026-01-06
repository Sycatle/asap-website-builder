/**
 * Boolean Field Renderer (Switch)
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { FieldRendererProps, BooleanFieldDef } from './types';

export function BooleanField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<BooleanFieldDef>) {
  const boolValue = Boolean(value);
  const fieldId = `field-${field.key}`;
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={fieldId} className="text-sm font-medium cursor-pointer">
          {field.label}
        </Label>
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      
      <Switch
        id={fieldId}
        checked={boolValue}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
