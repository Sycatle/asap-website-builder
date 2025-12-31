/**
 * Section Wrapper Component
 * 
 * Base layout component for wrapping page sections with consistent spacing and styling.
 */

import React from 'react';
import { cn } from '../../utils';

export interface SectionWrapperProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  isSelected?: boolean;
  variant?: 'default' | 'muted' | 'primary' | 'gradient';
  padding?: 'default' | 'lg' | 'xl' | 'none';
}

const variants = {
  default: 'bg-background',
  muted: 'bg-muted/30',
  primary: 'bg-primary text-primary-foreground',
  gradient: 'bg-gradient-to-b from-background via-background to-muted/30',
};

const paddings = {
  none: '',
  default: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
  xl: 'py-24 md:py-40',
};

export function SectionWrapper({ 
  children, 
  id, 
  isSelected, 
  variant = 'default',
  padding = 'default',
  className, 
  ...props 
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-16 relative overflow-hidden',
        variants[variant],
        paddings[padding],
        isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
