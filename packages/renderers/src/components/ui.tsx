/**
 * Shared UI Components for Section Renderers
 * 
 * These components provide a consistent design system across all renderers.
 * They use CSS variables for theming, making them work in both studio and public sites.
 */

import React from 'react';
import { cn } from '../utils';

// ============================================
// Button Component
// ============================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  href?: string;
}

export function Button({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className, 
  href,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 rounded-md px-3 text-xs',
    lg: 'h-12 rounded-md px-8 text-base',
    icon: 'h-10 w-10',
  };
  
  const classes = cn(baseStyles, variants[variant], sizes[size], className);
  
  if (href) {
    return <a href={href} className={classes}>{children}</a>;
  }
  
  return <button className={classes} {...props}>{children}</button>;
}

// ============================================
// Badge Component
// ============================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'text-foreground border-border',
    destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
  };
  
  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ============================================
// Card Components
// ============================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div 
      className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

// ============================================
// Separator Component
// ============================================

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <div 
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )} 
      {...props}
    />
  );
}

// ============================================
// Section Wrapper Component
// ============================================

export interface SectionWrapperProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  isSelected?: boolean;
  variant?: 'default' | 'muted' | 'primary';
}

export function SectionWrapper({ 
  children, 
  id, 
  isSelected, 
  variant = 'default',
  className, 
  ...props 
}: SectionWrapperProps) {
  const variants = {
    default: 'bg-background',
    muted: 'bg-muted/30',
    primary: 'bg-primary text-primary-foreground',
  };

  return (
    <section
      id={id}
      className={cn(
        'py-16 md:py-24 scroll-mt-16',
        variants[variant],
        isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

// ============================================
// Container Component
// ============================================

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'full';
}

export function Container({ children, size = 'default', className, ...props }: ContainerProps) {
  const sizes = {
    sm: 'max-w-2xl',
    default: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', sizes[size], className)} {...props}>
      {children}
    </div>
  );
}

// ============================================
// Section Header Component
// ============================================

export interface SectionHeaderProps {
  badge?: string;
  title: string;
  highlight?: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ 
  badge, 
  title, 
  highlight, 
  description, 
  centered = true,
  className 
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-12 md:mb-16', centered && 'text-center', className)}>
      {badge && (
        <Badge variant="outline" className="mb-4">
          {badge}
        </Badge>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
        {title}
        {highlight && <span className="text-primary"> {highlight}</span>}
      </h2>
      {description && (
        <p className={cn(
          'text-lg text-muted-foreground',
          centered && 'max-w-2xl mx-auto'
        )}>
          {description}
        </p>
      )}
    </div>
  );
}
