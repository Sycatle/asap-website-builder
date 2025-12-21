import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loggers } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Level determines the visual treatment and available actions */
  level?: 'page' | 'section' | 'component';
  /** Custom title for the error message */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors in child components.
 * 
 * Usage:
 * ```tsx
 * // Page-level boundary (shows full-page error with navigation)
 * <ErrorBoundary level="page">
 *   <PageContent />
 * </ErrorBoundary>
 * 
 * // Section-level boundary (shows card with retry)
 * <ErrorBoundary level="section" title="Extensions">
 *   <ExtensionsManager />
 * </ErrorBoundary>
 * 
 * // Component-level boundary (minimal inline error)
 * <ErrorBoundary level="component">
 *   <WidgetComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error with context
    loggers.errors.error('ErrorBoundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/app';
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'section', title } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback takes precedence
    if (fallback) {
      return fallback;
    }

    // Render based on error level
    switch (level) {
      case 'page':
        return <PageError error={error} onReload={this.handleReload} onGoHome={this.handleGoHome} />;
      case 'section':
        return <SectionError error={error} title={title} onRetry={this.handleReset} />;
      case 'component':
        return <ComponentError onRetry={this.handleReset} />;
      default:
        return <SectionError error={error} title={title} onRetry={this.handleReset} />;
    }
  }
}

// Page-level error fallback
interface PageErrorProps {
  error: Error | null;
  onReload: () => void;
  onGoHome: () => void;
}

function PageError({ error, onReload, onGoHome }: PageErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Une erreur est survenue</CardTitle>
          <CardDescription>
            La page n'a pas pu être chargée correctement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && import.meta.env.DEV && (
            <div className="rounded-md bg-muted p-3">
              <p className="font-mono text-xs text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={onReload} className="flex-1" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recharger
            </Button>
            <Button onClick={onGoHome} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Section-level error fallback
interface SectionErrorProps {
  error: Error | null;
  title?: string;
  onRetry: () => void;
}

function SectionError({ error, title, onRetry }: SectionErrorProps) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="py-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="mb-2 font-semibold">
            {title ? `Erreur dans ${title}` : 'Erreur de chargement'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Ce contenu n'a pas pu être affiché.
          </p>
          {error && import.meta.env.DEV && (
            <p className="mb-4 font-mono text-xs text-muted-foreground max-w-md break-all">
              {error.message}
            </p>
          )}
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component-level error fallback (minimal)
interface ComponentErrorProps {
  onRetry: () => void;
}

function ComponentError({ onRetry }: ComponentErrorProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <span>Erreur</span>
      <Button onClick={onRetry} variant="ghost" size="sm" className="h-6 px-2">
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Export types for external use
export type { ErrorBoundaryProps, ErrorBoundaryState };
