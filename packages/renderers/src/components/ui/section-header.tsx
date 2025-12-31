/**
 * Section Header Component
 * 
 * Standardized header for page sections with badge, headline, and subheadline.
 */

import React from 'react';
import { cn } from '../../utils';
import { Badge } from './badge';

export interface SectionHeaderProps {
  badge?: string;
  headlineLine1: string;
  headlineLine2?: string;
  subheadline?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function SectionHeader({
  badge,
  headlineLine1,
  headlineLine2,
  subheadline,
  align = 'center',
  className,
}: SectionHeaderProps) {
  const alignments = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  };

  return (
    <div className={cn('max-w-3xl mb-16', alignments[align], className)}>
      {badge && (
        <Badge variant="outline" className="mb-4">
          {badge}
        </Badge>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
        {headlineLine1}
        {headlineLine2 && (
          <span className="text-primary"> {headlineLine2}</span>
        )}
      </h2>
      {subheadline && (
        <p className="text-lg text-muted-foreground">
          {subheadline}
        </p>
      )}
    </div>
  );
}
