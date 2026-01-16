"use client"

import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BrowserToolbarProps {
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onHome: () => void;
  onNavigate: (url: string) => void;
  isLoading?: boolean;
}

export function BrowserToolbar({
  currentUrl,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onHome,
  onNavigate,
  isLoading = false,
}: BrowserToolbarProps) {
  const [urlInput, setUrlInput] = React.useState(currentUrl);

  React.useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(urlInput);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border">
      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack}
          className="h-8 w-8 p-0"
          title="Retour (Alt+←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onForward}
          disabled={!canGoForward}
          className="h-8 w-8 p-0"
          title="Suivant (Alt+→)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 w-8 p-0"
          title="Actualiser (Ctrl+R)"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onHome}
          className="h-8 w-8 p-0"
          title="Accueil (Alt+Home)"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>

      {/* Address Bar */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="pl-9 h-8 text-sm font-mono"
            placeholder="/page-path"
            title="Appuyez sur Entrée pour naviguer"
          />
        </div>
      </form>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1 w-16 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
          </div>
          <span>Chargement...</span>
        </div>
      )}
    </div>
  );
}
