"use client";

/**
 * Variable Text Input Component
 * 
 * An enhanced text input that supports variable insertion via {{variable}} syntax.
 * Integrates with StudioDataContext for variables.
 */

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Variable, ChevronDown, Eye, EyeOff, Hash, Type, Calendar, ToggleLeft, Braces, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioVariables } from "../../data-binding";
import type { WebsiteVariable, VariableType } from "@asap/shared";

// ============================================
// Types
// ============================================

interface VariableTextInputProps {
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
  /** Error message */
  error?: string | null;
  /** Description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Variable Type Icons
// ============================================

const variableTypeIcons: Record<VariableType, React.ElementType> = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  datetime: Calendar,
  json: Braces,
};

// ============================================
// Variable Preview
// ============================================

function VariablePreview({ 
  value, 
  interpolate 
}: { 
  value: string; 
  interpolate: (v: string) => string;
}) {
  const interpolated = interpolate(value);
  const hasVariables = value.includes("{{");
  
  if (!hasVariables) return null;
  
  return (
    <div className="mt-1.5 px-2 py-1.5 bg-muted/50 rounded-md border border-dashed">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Eye className="h-3 w-3" />
        <span>Aperçu</span>
      </div>
      <p className="text-sm">{interpolated || <span className="text-muted-foreground italic">Vide</span>}</p>
    </div>
  );
}

// ============================================
// Variable Picker Popover
// ============================================

interface VariablePickerInlineProps {
  variables: WebsiteVariable[];
  onSelect: (variable: WebsiteVariable) => void;
  disabled?: boolean;
}

function VariablePickerInline({ 
  variables, 
  onSelect, 
  disabled 
}: VariablePickerInlineProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Filter variables
  const filtered = React.useMemo(() => {
    if (!search) return variables;
    const q = search.toLowerCase();
    return variables.filter(v => 
      v.key.toLowerCase().includes(q) ||
      (v.source_ref && v.source_ref.toLowerCase().includes(q))
    );
  }, [variables, search]);
  
  // Group by source
  const grouped = React.useMemo(() => {
    const groups = new Map<string, WebsiteVariable[]>();
    for (const v of filtered) {
      const source = v.source_ref || "manuel";
      const list = groups.get(source) || [];
      list.push(v);
      groups.set(source, list);
    }
    return groups;
  }, [filtered]);
  
  const handleSelect = (variable: WebsiteVariable) => {
    onSelect(variable);
    setOpen(false);
    setSearch("");
  };
  
  if (variables.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground"
        disabled
      >
        <Variable className="h-3.5 w-3.5" />
      </Button>
    );
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1"
          disabled={disabled}
        >
          <Variable className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une variable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        
        {/* Variables List */}
        <ScrollArea className="max-h-64">
          <div className="p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune variable trouvée
              </p>
            ) : (
              Array.from(grouped.entries()).map(([source, vars]) => (
                <div key={source} className="mb-3 last:mb-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {formatSourceName(source)}
                  </div>
                  <div className="space-y-0.5">
                    {vars.map((variable) => {
                      const Icon = variableTypeIcons[variable.value_type] || Variable;
                      return (
                        <button
                          key={variable.id}
                          type="button"
                          onClick={() => handleSelect(variable)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left",
                            "hover:bg-accent hover:text-accent-foreground",
                            "transition-colors"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono truncate block">
                              {variable.key}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {variable.value_type}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Helper */}
        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Syntaxe: <code className="bg-muted px-1 rounded">{"{{variable}}"}</code>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    manuel: "Manuelles",
    manual: "Manuelles",
    "github-sync": "GitHub",
    analytics: "Analytics",
    computed: "Calculées",
  };
  return names[source] || source;
}

// ============================================
// Main Component
// ============================================

export function VariableTextInput({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  error,
  description,
  required,
  className,
}: VariableTextInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value || "");
  const [showPreview, setShowPreview] = useState(false);
  
  // Get variables from context (with fallback)
  let variables: WebsiteVariable[] = [];
  let interpolate = (v: string) => v;
  
  try {
    const ctx = useStudioVariables();
    variables = ctx.variables;
    interpolate = ctx.interpolate;
  } catch {
    // Outside StudioDataProvider, use empty variables
  }
  
  // Sync external value
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);
  
  // Handle change with local state
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);
  
  // Insert variable at cursor position
  const handleInsertVariable = useCallback((variable: WebsiteVariable) => {
    const input = inputRef.current;
    const insertion = `{{${variable.key}}}`;
    
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = localValue.slice(0, start) + insertion + localValue.slice(end);
      handleChange(newValue);
      
      // Restore focus and cursor position
      setTimeout(() => {
        input.focus();
        const newPos = start + insertion.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      handleChange(localValue + insertion);
    }
  }, [localValue, handleChange]);
  
  const hasVariables = localValue.includes("{{");
  const InputComponent = multiline ? Textarea : Input;
  
  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label Row */}
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="flex items-center gap-1">
            {hasVariables && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            )}
            <VariablePickerInline
              variables={variables}
              onSelect={handleInsertVariable}
              disabled={disabled}
            />
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="relative">
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={multiline ? rows : undefined}
          className={cn(
            multiline ? "text-sm resize-none" : "h-8 text-sm",
            error && "border-destructive"
          )}
        />
      </div>
      
      {/* Preview */}
      {showPreview && hasVariables && (
        <VariablePreview value={localValue} interpolate={interpolate} />
      )}
      
      {/* Error or Description */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {!error && description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
