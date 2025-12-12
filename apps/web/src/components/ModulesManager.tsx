// NOTE: This component references tenant modules which no longer exist in the new architecture.
// Tenant modules have been removed - modules are now website-scoped only.
// This component needs to be refactored to work with website modules instead.
// The API calls to listForTenant(), activateForTenant(), etc. will fail.

import { useEffect, useState } from 'react';
import { modulesAPI } from '../lib/api';
import type { Module } from '../lib/api/modules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [activeModules, setActiveModules] = useState<any[]>([]);  // TODO: Use WebsiteModule type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingModule, setActivatingModule] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const catalog = await modulesAPI.catalog();
      setCatalogModules(catalog);

      // TODO: Replace with website-specific module loading
      // Need to get current website ID first, then call modulesAPI.listForWebsite(websiteId)
      setActiveModules([]);
    } catch (err) {
      console.error('Failed to load modules:', err);
      setError('Erreur lors du chargement des modules. Les modules sont maintenant liés aux sites.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModule = async (module: Module) => {
    setError('La gestion des modules a changé. Les modules sont maintenant liés aux sites web, pas aux comptes.');
    // TODO: Implement website module activation
    // Need to get current website ID, then call modulesAPI.activate(websiteId, ...)
  };

  const handleDeactivateModule = async (moduleSlug: string) => {
    setError('La gestion des modules a changé. Les modules sont maintenant liés aux sites web, pas aux comptes.');
    // TODO: Implement website module deactivation
  };

  const getModuleIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || Puzzle;
    return <IconComponent className="h-5 w-5" />;
  };

  // Check if a module is active (compare by slug)
  const isModuleActive = (moduleIdOrSlug: string) => {
    // TODO: Update to check website modules
    return false;
  };

  // Get suggested modules (catalog modules that are not active)
  const suggestedModules = catalogModules.filter(m => 
    !isModuleActive(m.id) && !isModuleActive(m.slug)
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
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

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setError(null)}
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Modules - TODO: Update to show website modules */}
      {activeModules.length > 0 && (
        <Alert>
          <AlertDescription>
            Les modules sont maintenant gérés au niveau des sites web. Sélectionnez un site pour gérer ses modules.
          </AlertDescription>
        </Alert>
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
