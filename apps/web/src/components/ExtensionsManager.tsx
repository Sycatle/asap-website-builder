import { useEffect, useState, useMemo, useRef } from 'react';
import { extensionsAPI } from '../lib/api';
import type { Extension, WebsiteExtension } from '../lib/api/extensions';
import { useWebsites, useExtensionCatalog, useWebsiteExtensions } from '../hooks/useCache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  BookOpen, 
  Mail, 
  BarChart3, 
  Palette, 
  Puzzle,
  Link,
  Star,
  Loader2,
  Settings,
  Power,
  Play,
  Info
} from "lucide-react";

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  'integration': Link,
  'content': BookOpen,
  'engagement': Mail,
  'analytics': BarChart3,
  'appearance': Palette,
};

// Category labels in French
const categoryLabels: Record<string, string> = {
  'integration': 'Intégration',
  'content': 'Contenu',
  'engagement': 'Engagement',
  'analytics': 'Analytics',
  'appearance': 'Apparence',
};

export default function ExtensionsManager() {
  // Use cached data
  const { websites, isLoading: websitesLoading } = useWebsites();
  const { extensions: catalogExtensions, isLoading: catalogLoading } = useExtensionCatalog();
  
  const currentWebsiteId = websites.length > 0 ? websites[0].id : null;
  
  const { 
    extensions: activeExtensions, 
    isLoading: extensionsLoading, 
    refetch: refetchExtensions 
  } = useWebsiteExtensions(currentWebsiteId);
  
  const [activatingExtension, setActivatingExtension] = useState<string | null>(null);
  
  const isLoading = websitesLoading || catalogLoading || extensionsLoading;

  // Filter active and suggested extensions
  const enabledActiveExtensions = useMemo(() => 
    activeExtensions.filter(m => m.enabled), [activeExtensions]
  );
  
  const suggestedExtensions = useMemo(() => 
    catalogExtensions.filter(m => 
      !activeExtensions.some(am => am.extension_slug === m.id || am.extension_slug === m.slug)
    ), [catalogExtensions, activeExtensions]
  );

  // Track if initial load has completed to avoid showing error toast prematurely
  const hasLoadedOnce = useRef(false);
  
  // Show error if no website (only after initial load completes)
  useEffect(() => {
    // Wait for loading to start at least once
    if (websitesLoading) {
      hasLoadedOnce.current = true;
    }
    
    // Only show error after we've loaded and confirmed no websites
    if (hasLoadedOnce.current && !websitesLoading && websites.length === 0) {
      toast.error('Aucun site web trouvé. Créez un site pour gérer les extensions.');
    }
  }, [websitesLoading, websites.length]);

  const handleActivateExtension = async (extension: Extension) => {
    if (!currentWebsiteId) {
      toast.error('Aucun site web sélectionné');
      return;
    }

    setActivatingExtension(extension.id);

    const activatePromise = async () => {
      await extensionsAPI.activate(currentWebsiteId, {
        extension_id: extension.id,
        settings: extension.default_settings || {},
      });
      // Refresh extensions cache
      await refetchExtensions(true);
      return extension.name;
    };

    try {
      await toast.promise(activatePromise(), {
        loading: `Activation de ${extension.name}...`,
        success: (name) => `Extension ${name} activée !`,
        error: `Erreur lors de l'activation de l'extension ${extension.name}`,
      });
    } catch (err) {
      console.error('Failed to activate extension:', err);
    } finally {
      setActivatingExtension(null);
    }
  };

  const handleDeactivateExtension = async (extensionId: string) => {
    if (!currentWebsiteId) {
      toast.error('Aucun site web sélectionné');
      return;
    }

    setActivatingExtension(extensionId);

    const deactivatePromise = async () => {
      await extensionsAPI.deactivate(currentWebsiteId, extensionId);
      // Refresh extensions cache
      await refetchExtensions(true);
    };

    try {
      await toast.promise(deactivatePromise(), {
        loading: 'Désactivation en cours...',
        success: 'Extension désactivée',
        error: "Erreur lors de la désactivation de l'extension",
      });
    } catch (err) {
      console.error('Failed to deactivate extension:', err);
    } finally {
      setActivatingExtension(null);
    }
  };

  const getExtensionIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || Puzzle;
    return <IconComponent className="h-5 w-5" />;
  };

  // Check if an extension is active (compare by slug)
  const isExtensionActive = (extensionIdOrSlug: string) => {
    return activeExtensions.some(m => 
      m.extension_slug === extensionIdOrSlug && m.enabled
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-5 w-96" />
        </div>
        
        {/* Active Extensions Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Catalog Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <div className="mt-4">
                  <Skeleton className="h-9 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 animate-fade-in-down">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Extensions</h1>
          <Badge variant="outline" className="text-xs">{catalogExtensions.length} disponibles</Badge>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Activez des extensions pour débloquer de nouvelles fonctionnalités
        </p>
      </div>

      {/* Active Extensions */}
      {enabledActiveExtensions.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Extensions activées ({enabledActiveExtensions.length})
          </h2>
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            {enabledActiveExtensions.map((websiteExtension, index) => {
              const catalogExtension = catalogExtensions.find(cm => cm.slug === websiteExtension.extension_slug);
              if (!catalogExtension) return null;

              return (
                <ContextMenu key={websiteExtension.id}>
                  <ContextMenuTrigger asChild>
                    <Card 
                      className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/20">
                            {getExtensionIcon(catalogExtension.category)}
                      </div>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs transition-transform duration-200 hover:scale-105">
                        Actif
                      </Badge>
                    </div>
                    <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{catalogExtension.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                      {catalogExtension.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {categoryLabels[catalogExtension.category] || catalogExtension.category}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">v{catalogExtension.version}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm" className="flex-1 h-8 sm:h-9 text-xs sm:text-sm group/btn">
                        <a href={`/app/extensions/${catalogExtension.slug}`}>
                          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 transition-transform group-hover/btn:rotate-90" />
                          Configurer
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateExtension(websiteExtension.id)}
                        disabled={activatingExtension === websiteExtension.id}
                        className="text-destructive hover:text-destructive h-8 sm:h-9 w-8 sm:w-9 p-0"
                      >
                        {activatingExtension === websiteExtension.id ? (
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem asChild>
                  <a href={`/app/extensions/${catalogExtension.slug}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurer
                  </a>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeactivateExtension(websiteExtension.id)}
                  disabled={activatingExtension === websiteExtension.id}
                >
                  <Power className="mr-2 h-4 w-4" />
                  Désactiver
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Extensions */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-pulse-soft" />
          Extensions suggérées ({suggestedExtensions.length})
        </h2>
        {suggestedExtensions.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
              Toutes les extensions disponibles sont déjà activées !
            </CardContent>
          </Card>
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            {suggestedExtensions.map((extension, index) => (
                <ContextMenu key={extension.id}>
                  <ContextMenuTrigger asChild>
                    <Card 
                      className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/10">
                          {getExtensionIcon(extension.category)}
                        </div>
                        <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{extension.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                          {extension.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2 px-3 sm:px-6 pb-3 sm:pb-6">
                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                          <Badge variant="outline" className="text-[10px] sm:text-xs transition-colors group-hover:bg-muted">
                            {categoryLabels[extension.category] || extension.category}
                          </Badge>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">v{extension.version}</span>
                        </div>
                        <Button
                          onClick={() => handleActivateExtension(extension)}
                          disabled={activatingExtension === extension.id}
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm group/activate"
                          size="sm"
                        >
                          {activatingExtension === extension.id ? (
                            <>
                              <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                              Activation...
                            </>
                          ) : (
                            <>
                              <span className="transition-transform group-hover/activate:scale-105">Activer</span>
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem
                      onClick={() => handleActivateExtension(extension)}
                      disabled={activatingExtension === extension.id}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Activer l'extension
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem disabled>
                      <Info className="mr-2 h-4 w-4" />
                      {extension.description}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
