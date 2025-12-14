import { useEffect, useState } from 'react';
import { modulesAPI } from '../lib/api';
import type { Module, WebsiteModule } from '../lib/api/modules';
import { useWebsites, useModuleCatalog, useWebsiteModules, useCacheActions } from '../hooks/useCache';
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
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { 
  Github, 
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
  ExternalLink,
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

export default function ModulesManager() {
  // Use cached data
  const { websites } = useWebsites();
  const { modules: catalogModules, isLoading: catalogLoading } = useModuleCatalog();
  
  const currentWebsiteId = websites.length > 0 ? websites[0].id : null;
  
  const { 
    modules: activeModules, 
    isLoading: modulesLoading, 
    refetch: refetchModules 
  } = useWebsiteModules(currentWebsiteId);
  
  const { invalidateWebsiteData } = useCacheActions();
  
  const [activatingModule, setActivatingModule] = useState<string | null>(null);
  
  const isLoading = catalogLoading || modulesLoading;

  // Show error if no website
  useEffect(() => {
    if (!catalogLoading && !modulesLoading && websites.length === 0) {
      toast.error('Aucun site web trouvé. Créez un site pour gérer les modules.');
    }
  }, [catalogLoading, modulesLoading, websites.length]);

  const handleActivateModule = async (module: Module) => {
    if (!currentWebsiteId) {
      toast.error('Aucun site web sélectionné');
      return;
    }

    setActivatingModule(module.id);

    const activatePromise = async () => {
      await modulesAPI.activate(currentWebsiteId, {
        module_id: module.id,
        settings: module.default_settings || {},
      });
      // Refresh modules cache
      await refetchModules(true);
      return module.name;
    };

    toast.promise(activatePromise(), {
      loading: `Activation de ${module.name}...`,
      success: (name) => `Module ${name} activé !`,
      error: `Erreur lors de l'activation du module ${module.name}`,
    });

    try {
      await activatePromise();
    } catch (err) {
      console.error('Failed to activate module:', err);
    } finally {
      setActivatingModule(null);
    }
  };

  const handleDeactivateModule = async (moduleId: string) => {
    if (!currentWebsiteId) {
      toast.error('Aucun site web sélectionné');
      return;
    }

    setActivatingModule(moduleId);

    const deactivatePromise = async () => {
      await modulesAPI.deactivate(currentWebsiteId, moduleId);
      // Refresh modules cache
      await refetchModules(true);
    };

    toast.promise(deactivatePromise(), {
      loading: 'Désactivation en cours...',
      success: 'Module désactivé',
      error: 'Erreur lors de la désactivation du module',
    });

    try {
      await deactivatePromise();
    } catch (err) {
      console.error('Failed to deactivate module:', err);
    } finally {
      setActivatingModule(null);
    }
  };

  const getModuleIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || Puzzle;
    return <IconComponent className="h-5 w-5" />;
  };

  // Check if a module is active (compare by slug)
  const isModuleActive = (moduleIdOrSlug: string) => {
    return activeModules.some(m => 
      m.module_slug === moduleIdOrSlug && m.enabled
    );
  };

  // Get suggested modules (catalog modules that are not active)
  const suggestedModules = catalogModules.filter(m => 
    !isModuleActive(m.id) && !isModuleActive(m.slug)
  );

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
        
        {/* Active Modules Skeleton */}
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Modules</h1>
          <Badge variant="outline" className="text-xs">{catalogModules.length} disponibles</Badge>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Activez des modules pour débloquer de nouvelles fonctionnalités
        </p>
      </div>

      {/* Active Modules */}
      {activeModules.filter(m => m.enabled).length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Modules activés ({activeModules.filter(m => m.enabled).length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {activeModules.filter(m => m.enabled).map((websiteModule, index) => {
              const catalogModule = catalogModules.find(cm => cm.slug === websiteModule.module_slug);
              if (!catalogModule) return null;

              return (
                <ContextMenu key={websiteModule.id}>
                  <ContextMenuTrigger asChild>
                    <Card 
                      className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/20">
                            {getModuleIcon(catalogModule.category)}
                      </div>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs transition-transform duration-200 hover:scale-105">
                        Actif
                      </Badge>
                    </div>
                    <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{catalogModule.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                      {catalogModule.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {categoryLabels[catalogModule.category] || catalogModule.category}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">v{catalogModule.version}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm" className="flex-1 h-8 sm:h-9 text-xs sm:text-sm group/btn">
                        <a href={`/app/modules/${catalogModule.slug}`}>
                          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 transition-transform group-hover/btn:rotate-90" />
                          Configurer
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateModule(websiteModule.id)}
                        disabled={activatingModule === websiteModule.id}
                        className="text-destructive hover:text-destructive h-8 sm:h-9 w-8 sm:w-9 p-0"
                      >
                        {activatingModule === websiteModule.id ? (
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
                  <a href={`/app/modules/${catalogModule.slug}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurer
                  </a>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeactivateModule(websiteModule.id)}
                  disabled={activatingModule === websiteModule.id}
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

      {/* Suggested Modules */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-pulse-soft" />
          Modules suggérés ({suggestedModules.length})
        </h2>
        {suggestedModules.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
              Tous les modules disponibles sont déjà activés !
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {suggestedModules.map((module, index) => (
              <ContextMenu key={module.id}>
                <ContextMenuTrigger asChild>
                  <Card 
                    className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/10">
                        {getModuleIcon(module.category)}
                      </div>
                      <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{module.name}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Badge variant="outline" className="text-[10px] sm:text-xs transition-colors group-hover:bg-muted">
                          {categoryLabels[module.category] || module.category}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">v{module.version}</span>
                      </div>
                      <Button
                        onClick={() => handleActivateModule(module)}
                        disabled={activatingModule === module.id}
                        className="w-full h-8 sm:h-9 text-xs sm:text-sm group/activate"
                        size="sm"
                      >
                        {activatingModule === module.id ? (
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
                    onClick={() => handleActivateModule(module)}
                    disabled={activatingModule === module.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Activer le module
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>
                    <Info className="mr-2 h-4 w-4" />
                    {module.description}
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
