/**
 * Onboarding Shell Component
 * 
 * Provides the main layout structure for onboarding flows.
 * Mobile-first, accessible, with smooth transitions.
 */

"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';

// ============================================
// Shell Header
// ============================================

interface OnboardingHeaderProps {
  /** Current step number (1-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step labels for display */
  stepLabels?: string[];
  /** Whether to show back button */
  showBack?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Back button label */
  backLabel?: string;
  /** Additional className */
  className?: string;
}

export function OnboardingHeader({
  currentStep,
  totalSteps,
  stepLabels = [],
  showBack = false,
  onBack,
  backLabel = 'Back',
  className,
}: OnboardingHeaderProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <header 
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
      role="banner"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div 
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
              aria-hidden="true"
            >
              A
            </div>
            <span className="text-lg sm:text-xl font-semibold">ASAP</span>
          </div>

          {/* Step indicator - Desktop */}
          <nav 
            className="hidden md:flex items-center gap-2" 
            aria-label="Onboarding progress"
          >
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;
              
              return (
                <React.Fragment key={stepNumber}>
                  {index > 0 && (
                    <div 
                      className={cn(
                        'w-8 h-px transition-colors duration-200',
                        isCompleted ? 'bg-primary' : 'bg-border'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-sm transition-colors duration-200',
                      isActive && 'text-foreground font-medium',
                      isCompleted && 'text-primary',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span 
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all duration-200',
                        isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                        isCompleted && 'bg-primary text-primary-foreground',
                        !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? '✓' : stepNumber}
                    </span>
                    <span className="hidden lg:inline">{label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Step indicator - Mobile */}
          <div className="flex md:hidden items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currentStep}</span>
            <span>/</span>
            <span>{totalSteps}</span>
          </div>

          {/* Back button */}
          {showBack && onBack ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Button>
          ) : (
            <div className="w-20" /> // Spacer for alignment
          )}
        </div>
        
        {/* Progress bar */}
        <Progress 
          value={progress} 
          className="h-1 rounded-none" 
          aria-label={`Progress: step ${currentStep} of ${totalSteps}`}
        />
      </div>
    </header>
  );
}

// ============================================
// Shell Container
// ============================================

interface OnboardingContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Max width variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-full',
};

export function OnboardingContainer({ 
  children, 
  className,
  size = 'lg' 
}: OnboardingContainerProps) {
  return (
    <main className={cn('flex-1 container mx-auto px-4 py-6 sm:py-8 md:py-12', className)}>
      <div className={cn('mx-auto', sizeClasses[size])}>
        {children}
      </div>
    </main>
  );
}

// ============================================
// Shell Footer / Navigation
// ============================================

interface OnboardingNavigationProps {
  /** Show back button */
  showBack?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Back button label */
  backLabel?: string;
  /** Back button disabled state */
  backDisabled?: boolean;
  /** Primary action label */
  primaryLabel: string;
  /** Primary action click handler */
  onPrimary: () => void;
  /** Primary button disabled state */
  primaryDisabled?: boolean;
  /** Primary button loading state */
  primaryLoading?: boolean;
  /** Primary button loading label */
  primaryLoadingLabel?: string;
  /** Primary button icon */
  primaryIcon?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function OnboardingNavigation({
  showBack = true,
  onBack,
  backLabel = 'Back',
  backDisabled = false,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  primaryLoadingLabel,
  primaryIcon,
  className,
}: OnboardingNavigationProps) {
  return (
    <div 
      className={cn(
        'sticky bottom-0 z-40 -mx-4 px-4 py-4 sm:py-6',
        'bg-gradient-to-t from-background via-background to-transparent',
        'border-t border-border/50 backdrop-blur-sm',
        'sm:static sm:mx-0 sm:px-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {showBack && onBack ? (
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={backDisabled}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        ) : (
          <div /> // Spacer
        )}

        <Button
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
          size="lg"
          className="min-w-[140px] sm:min-w-[180px] gap-2"
        >
          {primaryLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              {primaryLoadingLabel || primaryLabel}
            </>
          ) : (
            <>
              {primaryLabel}
              {primaryIcon}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Main Shell
// ============================================

interface OnboardingShellProps {
  children: React.ReactNode;
  className?: string;
}

export function OnboardingShell({ children, className }: OnboardingShellProps) {
  return (
    <div 
      className={cn(
        'min-h-svh flex flex-col',
        'bg-gradient-to-b from-background via-background to-muted/20',
        className
      )}
    >
      {children}
    </div>
  );
}

export default OnboardingShell;
