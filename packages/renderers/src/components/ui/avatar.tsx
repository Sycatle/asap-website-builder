/**
 * Avatar Components
 * 
 * Avatar and AvatarGroup for displaying user images or initials.
 */

import React from 'react';
import { cn } from '../../utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  initials?: string;
  alt?: string;
  size?: 'sm' | 'default' | 'lg';
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  default: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ 
  src, 
  initials, 
  alt = 'Avatar', 
  size = 'default',
  className,
  ...props 
}: AvatarProps) {
  if (src) {
    return (
      <img 
        src={src} 
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'rounded-full object-cover border-2 border-background',
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold border-2 border-background',
        sizes[size],
        className
      )}
      {...props}
    >
      {initials || '?'}
    </div>
  );
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  size?: 'sm' | 'default' | 'lg';
  max?: number;
}

export function AvatarGroup({ 
  count = 5, 
  size = 'sm',
  max = 5,
  className,
  children,
  ...props 
}: AvatarGroupProps) {
  const displayCount = Math.min(count, max);
  
  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {children ? children : (
        Array.from({ length: displayCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-purple-500/60',
              sizes[size]
            )}
          />
        ))
      )}
    </div>
  );
}
