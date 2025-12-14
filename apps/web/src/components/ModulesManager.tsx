import { useEffect, useState } from 'react';
import { modulesAPI, websitesAPI } from '../lib/api';
import type { Module, WebsiteModule } from '../lib/api/modules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
  Power
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
  const [catalogModules, setCatalogModules] = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<WebsiteModule[]>([]);
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingModule, setActivatingModule] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const catalog = await modulesAPI.catalog();
      setCatalogModules(catalog);

      // Get current website
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        const websiteId = websites[0].id;
        setCurrentWebsiteId(websiteId);
        
        // Load modules for this website
        const websiteModules = await modulesAPI.listForWebsite(websiteId);
        setActiveModules(websiteModules);
      } else {
        toast.error('Aucun site web trouvé. Créez un site pour gérer les modules.');
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setIsLoading(false);
    }
  };

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
      await loadData();
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
      await loadData();
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
          <Badge variant="outline">{catalogModules.length} disponibles</Badge>
        </div>
        <p className="text-muted-foreground">
          Activez des modules pour débloquer de nouvelles fonctionnalités sur votre site
        </p>
      </div>

      {/* Active Modules */}
      {activeModules.filter(m => m.enabled).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Modules activés ({activeModules.filter(m => m.enabled).length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeModules.filter(m => m.enabled).map((websiteModule) => {
              const catalogModule = catalogModules.find(cm => cm.slug === websiteModule.module_slug);
              if (!catalogModule) return null;

              return (
                <Card key={websiteModule.id} className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        {getModuleIcon(catalogModule.category)}
                      </div>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Actif
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-3">{catalogModule.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {catalogModule.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[catalogModule.category] || catalogModule.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">v{catalogModule.version}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm" className="flex-1">
                        <a href={`/app/modules/${catalogModule.slug}`}>
                          <Settings className="h-4 w-4 mr-1" />
                          Configurer
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateModule(websiteModule.id)}
                        disabled={activatingModule === websiteModule.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {activatingModule === websiteModule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Modules suggérés ({suggestedModules.length})
        </h2>
        {suggestedModules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tous les modules disponibles sont déjà activés !
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suggestedModules.map((module) => (
              <Card key={module.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    {getModuleIcon(module.category)}
                  </div>
                  <CardTitle className="text-base mt-3">{module.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[module.category] || module.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{module.version}</span>
                  </div>
                  <Button
                    onClick={() => handleActivateModule(module)}
                    disabled={activatingModule === module.id}
                    className="w-full"
                    size="sm"
                  >
                    {activatingModule === module.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activation...
                      </>
                    ) : (
                      'Activer'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
