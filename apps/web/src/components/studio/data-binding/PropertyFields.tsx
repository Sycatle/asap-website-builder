/**
 * Property Field Components
 * 
 * Field components for use in property editors that optionally support
 * variable interpolation from extension data.
 */

'use client';

import * as React from 'react';
import { Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WebsiteVariable } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface PropertyFieldProps {
  /** Current value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Enable variable picker */
  enableVariables?: boolean;
  /** Available variables (if enableVariables is true) */
  variables?: WebsiteVariable[];
  /** Variable values for preview */
  variableValues?: Record<string, unknown>;
}

export interface PropertyTextAreaProps extends PropertyFieldProps {
  /** Number of rows */
  rows?: number;
}

// ============================================
// Variable Picker Button
// ============================================

interface VariablePickerButtonProps {
  variables: WebsiteVariable[];
  onSelect: (key: string) => void;
  disabled?: boolean;
}

function VariablePickerButton({ 
  variables, 
  onSelect, 
  disabled 
}: VariablePickerButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filteredVariables = React.useMemo(() => {
    if (!search) return variables;
    const query = search.toLowerCase();
    return variables.filter(v => 
      v.key.toLowerCase().includes(query) ||
      (v.source_ref && v.source_ref.toLowerCase().includes(query))
    );
  }, [variables, search]);

  // Group by source
  const grouped = React.useMemo(() => {
    const groups = new Map<string, WebsiteVariable[]>();
    for (const v of filteredVariables) {
      const source = v.source_ref || 'manual';
      const group = groups.get(source) || [];
      group.push(v);
      groups.set(source, group);
    }
    return groups;
  }, [filteredVariables]);

  const handleSelect = (key: string) => {
    onSelect(key);
    setOpen(false);
    setSearch('');
  };

  if (variables.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={disabled}
        >
          <Variable className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-2 border-b">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-3">
            {Array.from(grouped.entries()).map(([source, vars]) => (
              <div key={source}>
                <div className="text-xs font-medium text-muted-foreground uppercase px-2 mb-1">
                  {formatSourceName(source)}
                </div>
                {vars.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelect(v.key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                  >
                    <code className="text-xs bg-muted px-1 rounded font-mono">
                      {`{{${v.key}}}`}
                    </code>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {v.value_type}
                    </Badge>
                  </button>
                ))}
              </div>
            ))}
            {filteredVariables.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune variable trouvée
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function formatSourceName(source: string): string {
  if (source === 'manual') return 'Manuel';
  return source
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// Property Input
// ============================================

export function PropertyInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  enableVariables = false,
  variables = [],
}: PropertyFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleVariableSelect = (key: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value + `{{${key}}}`);
      return;
    }

    const start = input.selectionStart || value.length;
    const end = input.selectionEnd || value.length;
    const variableText = `{{${key}}}`;
    const newValue = value.slice(0, start) + variableText + value.slice(end);
    onChange(newValue);

    // Restore cursor
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + variableText.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  const hasVariables = /\{\{\w+\}\}/.test(value);

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("h-9 flex-1", hasVariables && "font-mono text-sm pr-8")}
      />
      {enableVariables && variables.length > 0 && (
        <VariablePickerButton
          variables={variables}
          onSelect={handleVariableSelect}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// ============================================
// Property TextArea
// ============================================

export function PropertyTextArea({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  rows = 3,
  enableVariables = false,
  variables = [],
}: PropertyTextAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleVariableSelect = (key: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + `{{${key}}}`);
      return;
    }

    const start = textarea.selectionStart || value.length;
    const end = textarea.selectionEnd || value.length;
    const variableText = `{{${key}}}`;
    const newValue = value.slice(0, start) + variableText + value.slice(end);
    onChange(newValue);

    // Restore cursor
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variableText.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const hasVariables = /\{\{\w+\}\}/.test(value);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn("resize-none", hasVariables && "font-mono text-sm")}
        />
      </div>
      {enableVariables && variables.length > 0 && (
        <div className="flex justify-end">
          <VariablePickerButton
            variables={variables}
            onSelect={handleVariableSelect}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export default PropertyInput;
