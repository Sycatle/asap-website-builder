import React from 'react';
import { cn } from '@/lib/utils';
import { useSkipLink } from '@/hooks/useAccessibility';

/**
 * Skip link component for keyboard navigation
 * Allows users to skip to main content
 */
interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Aller au contenu principal',
  className,
}: SkipLinkProps) {
  const skipLinkProps = useSkipLink(targetId);

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:absolute focus:z-[9999] focus:top-4 focus:left-4',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
        'focus:shadow-lg',
        className
      )}
      {...skipLinkProps}
    >
      {children}
    </a>
  );
}

/**
 * Screen reader only text (visually hidden but accessible)
 */
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  /** Element type to render */
  as?: keyof JSX.IntrinsicElements;
  /** Additional class names */
  className?: string;
}

export function ScreenReaderOnly({
  children,
  as: Component = 'span',
  className,
}: ScreenReaderOnlyProps) {
  return (
    <Component className={cn('sr-only', className)}>
      {children}
    </Component>
  );
}

/**
 * Live region for dynamic announcements
 */
interface LiveRegionProps {
  /** Content to announce */
  children: React.ReactNode;
  /** Politeness level */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether to read the entire region */
  atomic?: boolean;
  /** Which changes to announce */
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
  /** Additional class names */
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
  className,
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

/**
 * Focus indicator wrapper
 * Adds visible focus ring to any element
 */
interface FocusRingProps {
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Focus ring offset */
  offset?: 'none' | 'sm' | 'md';
}

export function FocusRing({
  children,
  className,
  offset = 'sm',
}: FocusRingProps) {
  const offsetClasses = {
    none: 'focus-within:ring-0',
    sm: 'focus-within:ring-offset-2',
    md: 'focus-within:ring-offset-4',
  };

  return (
    <div
      className={cn(
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
        offsetClasses[offset],
        'rounded-md',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Heading with proper heading level
 * Ensures heading hierarchy is maintained
 */
interface AccessibleHeadingProps {
  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Visual appearance level (can differ from actual level) */
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function AccessibleHeading({
  level,
  visualLevel,
  children,
  className,
  id,
}: AccessibleHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const sizeClasses = {
    1: 'text-4xl font-bold tracking-tight',
    2: 'text-3xl font-semibold tracking-tight',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  };

  const visualSize = visualLevel || level;

  return (
    <Tag id={id} className={cn(sizeClasses[visualSize], className)}>
      {children}
    </Tag>
  );
}

/**
 * Icon with accessible label
 */
interface AccessibleIconProps {
  /** Icon component to render */
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Accessible label for the icon */
  label: string;
  /** Whether the icon is decorative (no label needed) */
  decorative?: boolean;
  /** Additional class names */
  className?: string;
}

export function AccessibleIcon({
  icon: Icon,
  label,
  decorative = false,
  className,
}: AccessibleIconProps) {
  if (decorative) {
    return <Icon className={className} aria-hidden={true} />;
  }

  return (
    <>
      <Icon className={className} aria-hidden={true} />
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </>
  );
}

/**
 * Loading indicator with accessible announcement
 */
interface AccessibleLoadingProps {
  /** Whether currently loading */
  isLoading: boolean;
  /** Loading message for screen readers */
  loadingMessage?: string;
  /** Children to show when not loading */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function AccessibleLoading({
  isLoading,
  loadingMessage = 'Chargement en cours...',
  children,
  className,
}: AccessibleLoadingProps) {
  return (
    <>
      {isLoading && (
        <LiveRegion politeness="polite" className={className}>
          {loadingMessage}
        </LiveRegion>
      )}
      {children}
    </>
  );
}

/**
 * Error message with proper accessibility attributes
 */
interface AccessibleErrorProps {
  /** Error ID (should match aria-describedby on the related input) */
  id: string;
  /** Error message */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function AccessibleError({
  id,
  children,
  className,
}: AccessibleErrorProps) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn('text-sm text-destructive', className)}
    >
      {children}
    </div>
  );
}
