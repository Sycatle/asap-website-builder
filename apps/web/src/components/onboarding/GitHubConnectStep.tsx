/**
 * V1 MVP: GitHub Connect Step
 * 
 * Step 1 of onboarding: Connect GitHub account to import repositories.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, ArrowRight, Sparkles, Shield, Zap, BookOpen } from 'lucide-react';

interface GitHubConnectStepProps {
  onConnect: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function GitHubConnectStep({ onConnect, onSkip, isLoading = false }: GitHubConnectStepProps) {
  return (
    <div className="space-y-8">
      {/* Main CTA Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Github className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connectez votre GitHub</CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            Importez automatiquement vos meilleurs projets pour créer un portfolio impressionnant en quelques clics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Import rapide</p>
                <p className="text-xs text-muted-foreground">Vos repos deviennent des projets en 1 clic</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Auto-détection</p>
                <p className="text-xs text-muted-foreground">Technologies et descriptions extraites</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Sécurisé</p>
                <p className="text-xs text-muted-foreground">Lecture seule, aucun accès en écriture</p>
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
                  Connexion...
                </>
              ) : (
                <>
                  <Github className="h-5 w-5" />
                  Connecter GitHub
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
              Je préfère ajouter manuellement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span>Nous utilisons l'API GitHub en lecture seule.</span>
        <a href="#" className="text-primary hover:underline">En savoir plus</a>
      </div>

      {/* Social Proof */}
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-2">
          Déjà utilisé par <span className="font-semibold text-foreground">500+</span> développeurs freelance
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
