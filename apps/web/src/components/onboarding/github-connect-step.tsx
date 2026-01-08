/**
 * V1 MVP: GitHub Connect Step
 * 
 * Step 1 of onboarding: Connect GitHub account to import repositories.
 */

import * as React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, ArrowRight, Sparkles, Shield, Zap, BookOpen } from 'lucide-react';

interface GitHubConnectStepProps {
  onConnect: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function GitHubConnectStep({ onConnect, onSkip, isLoading = false }: GitHubConnectStepProps) {
  const { t } = useTranslation(['onboarding']);

  return (
    <div className="space-y-8">
      {/* Main CTA Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Github className="h-10 w-10 text-primary fill-primary" />
          </div>
          <CardTitle className="text-2xl">{t('github.title')}</CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            {t('github.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('github.benefits.quickImport.title')}</p>
                <p className="text-xs text-muted-foreground">{t('github.benefits.quickImport.description')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('github.benefits.autoDetect.title')}</p>
                <p className="text-xs text-muted-foreground">{t('github.benefits.autoDetect.description')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 fill-purple-600 dark:fill-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('github.benefits.secure.title')}</p>
                <p className="text-xs text-muted-foreground">{t('github.benefits.secure.description')}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={onConnect}
              disabled={isLoading}
              className="gap-2 min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('github.connecting')}
                </>
              ) : (
                <>
                  <Github className="h-5 w-5" />
                  {t('github.connectButton')}
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={onSkip}
              disabled={isLoading}
              className="gap-2 text-muted-foreground"
            >
              {t('github.skipButton')}
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4 fill-current" />
        <span>{t('github.readOnlyNote')}</span>
        <a href="#" className="text-primary hover:underline">{t('github.learnMore')}</a>
      </div>

      {/* Social Proof */}
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-2">
          <Trans i18nKey="github.socialProof" ns="onboarding" values={{ count: 500 }}>
            Already used by <strong>500+</strong> freelance developers
          </Trans>
        </p>
        <div className="flex items-center justify-center -space-x-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i}
              className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 ring-2 ring-background"
            />
          ))}
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
            +495
          </div>
        </div>
      </div>
    </div>
  );
}
