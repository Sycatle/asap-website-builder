/**
 * Variable Picker Component
 * 
 * A popover-based picker for inserting variables into text fields.
 * Displays available variables grouped by source extension.
 */

'use client';

import * as React from 'react';
import { Search, Variable, Hash, Type, Calendar, ToggleLeft, Braces } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { WebsiteVariable, VariableType } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface VariablePickerProps {
  /** Available variables */
  variables: WebsiteVariable[];
  /** Callback when a variable is selected */
  onSelect: (variable: WebsiteVariable) => void;
  /** Children (trigger element) */
  children?: React.ReactNode;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export interface VariableListProps {
  variables: WebsiteVariable[];
  searchQuery: string;
  onSelect: (variable: WebsiteVariable) => void;
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

function getVariableIcon(type: VariableType) {
  return variableTypeIcons[type] || Variable;
}

// ============================================
// Variable List Component
// ============================================

function VariableList({ variables, searchQuery, onSelect }: VariableListProps) {
  // Filter variables by search query
  const filteredVariables = React.useMemo(() => {
    if (!searchQuery) return variables;
    
    const query = searchQuery.toLowerCase();
    return variables.filter(
      v => 
        v.key.toLowerCase().includes(query) ||
        (v.source_ref && v.source_ref.toLowerCase().includes(query))
    );
  }, [variables, searchQuery]);

  // Group by source extension
  const groupedVariables = React.useMemo(() => {
    const groups = new Map<string, WebsiteVariable[]>();
    
    for (const variable of filteredVariables) {
      const source = variable.source_ref || 'manual';
      const group = groups.get(source) || [];
      group.push(variable);
      groups.set(source, group);
    }
    
    return groups;
  }, [filteredVariables]);

  if (filteredVariables.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {searchQuery ? 'Aucune variable trouvée' : 'Aucune variable disponible'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(groupedVariables.entries()).map(([source, vars]) => (
        <div key={source}>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {formatSourceName(source)}
          </div>
          <div className="space-y-1">
            {vars.map((variable) => (
              <VariableItem
                key={variable.id}
                variable={variable}
                onClick={() => onSelect(variable)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Variable Item Component
// ============================================

interface VariableItemProps {
  variable: WebsiteVariable;
  onClick: () => void;
}

function VariableItem({ variable, onClick }: VariableItemProps) {
  const Icon = getVariableIcon(variable.value_type);
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-md text-left',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:bg-accent focus:text-accent-foreground',
        'transition-colors'
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-foreground">
            {`{{${variable.key}}}`}
          </code>
          {variable.stale && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              Obsolète
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {formatVariableValue(variable.value, variable.value_type)}
        </div>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {formatVariableType(variable.value_type)}
      </Badge>
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function VariablePicker({
  variables,
  onSelect,
  children,
  disabled = false,
  className,
}: VariablePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSelect = React.useCallback((variable: WebsiteVariable) => {
    onSelect(variable);
    setOpen(false);
    setSearchQuery('');
  }, [onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
            disabled={disabled}
          >
            <Variable className="h-4 w-4" />
            Variables
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="bottom"
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une variable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            <VariableList
              variables={variables}
              searchQuery={searchQuery}
              onSelect={handleSelect}
            />
          </div>
        </ScrollArea>
        <div className="p-2 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Cliquez pour insérer • Format: {'{{variable}}'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    manual: 'Variables manuelles',
    'github-sync': 'GitHub',
    'blog-engine': 'Blog',
    'contact-form': 'Contact',
  };
  return names[source] || source;
}

function formatVariableType(type: VariableType): string {
  const types: Record<VariableType, string> = {
    string: 'Texte',
    number: 'Nombre',
    boolean: 'Booléen',
    date: 'Date',
    datetime: 'Date/Heure',
    json: 'JSON',
  };
  return types[type] || type;
}

function formatVariableValue(value: unknown, type: VariableType): string {
  if (value === null || value === undefined) return '—';
  
  switch (type) {
    case 'number':
      return new Intl.NumberFormat('fr-FR').format(value as number);
    case 'boolean':
      return value ? 'Vrai' : 'Faux';
    case 'date':
      return new Date(value as string).toLocaleDateString('fr-FR');
    case 'datetime':
      return new Date(value as string).toLocaleString('fr-FR');
    case 'json':
      return 'Object';
    default:
      const str = String(value);
      return str.length > 30 ? str.slice(0, 30) + '…' : str;
  }
}

export default VariablePicker;
