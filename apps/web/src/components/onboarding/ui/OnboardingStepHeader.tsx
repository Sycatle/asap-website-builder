/**
 * Onboarding Step Header Component
 * 
 * Consistent header for each onboarding step with icon, title, and description.
 * Accessible and responsive.
 */

"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingStepHeaderProps {
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Center alignment (default: true) */
  centered?: boolean;
  /** Additional className */
  className?: string;
}

export function OnboardingStepHeader({
  icon,
  title,
  description,
  centered = true,
  className,
}: OnboardingStepHeaderProps) {
  return (
    <div 
      className={cn(
        'space-y-3 sm:space-y-4 mb-6 sm:mb-8',
        centered && 'text-center',
        className
      )}
    >
      {icon && (
        <div 
          className={cn(
            'inline-flex items-center justify-center',
            'w-12 h-12 sm:w-14 sm:h-14',
            'rounded-xl sm:rounded-2xl',
            'bg-primary/10 text-primary',
            'transition-transform duration-300 hover:scale-105'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default OnboardingStepHeader;
