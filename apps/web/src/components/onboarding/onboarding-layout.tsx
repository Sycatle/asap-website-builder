/**
 * V1 MVP: Onboarding Layout
 * 
 * Provides the container and progress indicator for the onboarding flow.
 */

import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Check, Github, FolderOpen, User, Rocket } from 'lucide-react';
import type { OnboardingStep } from '@/lib/api/onboarding';
import { calculateProgress, getStepNumber } from '@/lib/api/onboarding';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: OnboardingStep;
}

const STEPS = [
  { id: 'github_connect' as const, label: 'GitHub', icon: Github },
  { id: 'import_projects' as const, label: 'Projets', icon: FolderOpen },
  { id: 'review_profile' as const, label: 'Profil', icon: User },
  { id: 'publish' as const, label: 'Publier', icon: Rocket },
];

export function OnboardingLayout({ children, currentStep }: OnboardingLayoutProps) {
  const progress = calculateProgress(currentStep);
  const currentStepNumber = getStepNumber(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-semibold text-lg">ASAP</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Créez votre portfolio en quelques minutes
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-background/50">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          {/* Mobile Progress */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{progress.stepLabel}</span>
              <span className="text-muted-foreground">
                Étape {progress.currentStep} sur {progress.totalSteps}
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>

          {/* Desktop Steps */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStepNumber > stepNumber;
                const isCurrent = currentStepNumber === stepNumber;
                const Icon = step.icon;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300',
                          isCompleted && 'bg-primary text-primary-foreground',
                          isCurrent && 'bg-primary/10 text-primary ring-2 ring-primary ring-offset-2',
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent && 'text-primary',
                          !isCurrent && !isCompleted && 'text-muted-foreground'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>

                    {index < STEPS.length - 1 && (
                      <div className="flex-1 mx-4">
                        <div
                          className={cn(
                            'h-0.5 transition-colors duration-300',
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            Besoin d'aide ? Contactez-nous à{' '}
            <a href="mailto:support@asap.cool" className="text-primary hover:underline">
              support@asap.cool
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
