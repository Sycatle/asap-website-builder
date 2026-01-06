/**
 * Form Section Component
 * 
 * Groups fields into collapsible sections
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import type { SectionDef } from './types';

interface FormSectionProps {
  section: SectionDef;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ section, children, className }: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(!section.defaultCollapsed);

  if (!section.collapsible) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
        </div>
        <div className="space-y-4 pl-0">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn('space-y-2', className)}
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 -mx-2">
        <div className="space-y-0.5 text-left">
          <h3 className="text-sm font-semibold">{section.title}</h3>
          {section.description && (
            <p className="text-xs text-muted-foreground">{section.description}</p>
          )}
        </div>
        <ChevronDown 
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
