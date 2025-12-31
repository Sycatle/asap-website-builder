/**
 * Button Component
 * 
 * A versatile button component supporting multiple variants and sizes.
 * Can render as a button or link depending on props.
 */

import React from 'react';
import { cn } from '../../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  href?: string;
  fullWidth?: boolean;
}

const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const variants = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
};

const sizes = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-12 rounded-md px-8 text-base',
  icon: 'h-10 w-10',
};

export function Button({ 
  children, 
  variant = 'default', 
  size = 'default', 
  fullWidth = false,
  className, 
  href,
  ...props 
}: ButtonProps) {
  const classes = cn(
    baseStyles, 
    variants[variant], 
    sizes[size], 
    fullWidth && 'w-full',
    className
  );
  
  if (href) {
    return <a href={href} className={classes}>{children}</a>;
  }
  
  return <button className={classes} {...props}>{children}</button>;
}
