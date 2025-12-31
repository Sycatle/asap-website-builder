/**
 * Badge Component
 * 
 * Small label component for tags, status indicators, and callouts.
 */

import React from 'react';
import { cn } from '../../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
}

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'text-foreground border-border',
  destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
};

const sizes = {
  default: 'px-2.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-[10px]',
  lg: 'px-4 py-2 text-sm',
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'default',
  className, 
  ...props 
}: BadgeProps) {
  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
