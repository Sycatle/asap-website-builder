/**
 * IconBox Component
 * 
 * Container for icons with consistent styling and hover effects.
 */

import React from 'react';
import { cn } from '../../utils';

export interface IconBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'primary' | 'muted';
  rounded?: 'default' | 'full';
}

const sizes = {
  sm: 'w-10 h-10',
  default: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const variants = {
  default: 'bg-primary/10 group-hover:bg-primary/20',
  primary: 'bg-primary text-primary-foreground',
  muted: 'bg-muted group-hover:bg-muted/80',
};

const roundings = {
  default: 'rounded-lg',
  full: 'rounded-full',
};

export function IconBox({ 
  children, 
  size = 'default', 
  variant = 'default',
  rounded = 'default',
  className,
  ...props 
}: IconBoxProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-center transition-colors',
        sizes[size],
        variants[variant],
        roundings[rounded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
