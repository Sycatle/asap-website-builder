/**
 * MultiSelect Field Renderer
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronDown, X } from 'lucide-react';
import type { FieldRendererProps, MultiSelectFieldDef } from './types';

export function MultiSelectField({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled 
}: FieldRendererProps<MultiSelectFieldDef>) {
  const arrayValue = (value as string[]) ?? [];
  const fieldId = `field-${field.key}`;
  
  const handleToggle = (optionValue: string) => {
    if (arrayValue.includes(optionValue)) {
      onChange(arrayValue.filter(v => v !== optionValue));
    } else {
      onChange([...arrayValue, optionValue]);
    }
  };
  
  const handleRemove = (optionValue: string) => {
    onChange(arrayValue.filter(v => v !== optionValue));
  };

  const selectedLabels = arrayValue
    .map(v => field.options.find(o => o.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={fieldId}
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              'w-full justify-between h-auto min-h-10',
              error && 'border-destructive',
              !arrayValue.length && 'text-muted-foreground'
            )}
          >
            {arrayValue.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map((label, i) => (
                  <Badge 
                    key={arrayValue[i]} 
                    variant="secondary" 
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(arrayValue[i]);
                    }}
                  >
                    {label}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                ))}
              </div>
            ) : (
              'Sélectionner...'
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2" align="start">
          <div className="space-y-1">
            {field.options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'flex items-center space-x-2 rounded-md p-2 cursor-pointer hover:bg-accent',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !option.disabled && handleToggle(option.value)}
              >
                <Checkbox
                  checked={arrayValue.includes(option.value)}
                  disabled={option.disabled}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
