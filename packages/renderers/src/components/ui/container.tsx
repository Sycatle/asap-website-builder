/**
 * Container Component
 * 
 * Responsive container for consistent content width and padding.
 */

import React from 'react';
import { cn } from '../../utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'full';
}

const sizes = {
  sm: 'max-w-3xl',
  default: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({ 
  children, 
  size = 'default', 
  className, 
  ...props 
}: ContainerProps) {
  return (
    <div 
      className={cn(
        'container mx-auto px-4',
        sizes[size],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
