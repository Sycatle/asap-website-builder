/**
 * Color Field Renderer
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FieldRendererProps, ColorFieldDef } from './types';

// Default color presets
const DEFAULT_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#000000', '#6b7280', '#ffffff',
];

export function ColorField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<ColorFieldDef>) {
  const colorValue = (value as string) ?? '#000000';
  const fieldId = `field-${field.key}`;
  const presets = field.presets ?? DEFAULT_PRESETS;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-10 h-10 p-0 border-2',
                error && 'border-destructive'
              )}
              style={{ backgroundColor: colorValue }}
            >
              <span className="sr-only">Choisir une couleur</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cn(
                      'w-6 h-6 rounded-md border-2 transition-transform hover:scale-110',
                      colorValue === preset ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => onChange(preset)}
                  />
                ))}
              </div>
              <input
                type="color"
                value={colorValue}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-8 cursor-pointer"
              />
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          id={fieldId}
          type="text"
          value={colorValue}
          onChange={handleChange}
          placeholder="#000000"
          disabled={disabled}
          className={cn('flex-1 font-mono', error && 'border-destructive')}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
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
