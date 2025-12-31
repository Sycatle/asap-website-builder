import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Extension, WebsiteExtension } from '@/lib/api/extensions';
import { useWebsitesQuery, useExtensionCatalogQuery, useWebsiteExtensionsQuery, useActivateExtensionMutation, useDeactivateExtensionMutation } from '@/lib/query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { loggers } from '@/lib/logger';

const extensionsLogger = loggers.extensions;
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  BookOpen, 
  Mail, 
  BarChart3, 
  Palette, 
  Puzzle,
  Link as LinkIcon,
  Star,
  Settings,
  Power,
  Play,
  Info
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  'integration': LinkIcon,
  'content': BookOpen,
  'engagement': Mail,
  'analytics': BarChart3,
  'appearance': Palette,
};

export default function ExtensionsManager() {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Get websiteId from context
  const { currentWebsiteId } = useWebsiteContext();
  
  // Use React Query hooks
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesQuery();
  const { data: catalogExtensions = [], isLoading: catalogLoading } = useExtensionCatalogQuery();
  
  const { 
    data: activeExtensions = [], 
    isLoading: extensionsLoading,
  } = useWebsiteExtensionsQuery(currentWebsiteId);
  
  const activateExtensionMutation = useActivateExtensionMutation();
  const deactivateExtensionMutation = useDeactivateExtensionMutation();
  
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
      toast.error(t('dashboard:extensions.noWebsite'));
    }
  }, [websitesLoading, websites.length, t]);

  const handleActivateExtension = async (extension: Extension) => {
    if (!currentWebsiteId) {
      toast.error(t('dashboard:extensions.noWebsiteSelected'));
      return;
    }

    setActivatingExtension(extension.id);

    const activatePromise = async () => {
      await activateExtensionMutation.mutateAsync({
        websiteId: currentWebsiteId,
        extensionId: extension.id,
        settings: extension.default_settings || {},
      });
      return extension.name;
    };

    try {
      await toast.promise(activatePromise(), {
        loading: t('dashboard:extensions.actions.activating'),
        success: (name) => t('dashboard:extensions.toast.activated', { name }),
        error: t('dashboard:extensions.toast.activateError', { name: extension.name }),
      });
    } catch (err) {
      extensionsLogger.error('Failed to activate extension:', err);
    } finally {
      setActivatingExtension(null);
    }
  };

  const handleDeactivateExtension = async (extensionId: string) => {
    if (!currentWebsiteId) {
      toast.error(t('dashboard:extensions.noWebsiteSelected'));
      return;
    }

    setActivatingExtension(extensionId);

    const deactivatePromise = async () => {
      await deactivateExtensionMutation.mutateAsync({
        websiteId: currentWebsiteId,
        extensionId,
      });
    };

    try {
      await toast.promise(deactivatePromise(), {
        loading: t('dashboard:extensions.actions.deactivating'),
        success: t('dashboard:extensions.toast.deactivated'),
        error: t('dashboard:extensions.toast.deactivateError'),
      });
    } catch (err) {
      extensionsLogger.error('Failed to deactivate extension:', err);
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
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:extensions.title')}
        subtitle={t('dashboard:extensions.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Puzzle className="h-5 w-5 text-white" />
          </div>
        }
        badge={{
          label: t('dashboard:extensions.available', { count: catalogExtensions.length }),
          variant: 'outline',
        }}
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Puzzle className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold">{t('dashboard:extensions.title')}</p>
                <p className="text-[11px] text-muted-foreground">{enabledActiveExtensions.length} {t('dashboard:extensions.activeCount', { count: enabledActiveExtensions.length })} {t('common:labels.on')} {catalogExtensions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {enabledActiveExtensions.length > 0 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                  {enabledActiveExtensions.length} {enabledActiveExtensions.length > 1 ? t('dashboard:extensions.activeCountPlural', { count: enabledActiveExtensions.length }) : t('dashboard:extensions.activeCount', { count: enabledActiveExtensions.length })}
                </Badge>
              )}
            </div>
          </div>
        }
      />

      {/* Active Extensions */}
      {enabledActiveExtensions.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {t('dashboard:extensions.active')} ({enabledActiveExtensions.length})
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{t('dashboard:extensions.status.active')}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('dashboard:extensions.status.activeTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        {t(`dashboard:extensions.categories.${catalogExtension.category}`) || catalogExtension.category}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">v{catalogExtension.version}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm" className="flex-1 h-8 sm:h-9 text-xs sm:text-sm group/btn">
                        <Link href={`/app/${currentWebsiteId}/extensions/${catalogExtension.slug}`}>
                          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 transition-transform group-hover/btn:rotate-90" />
                          {t('dashboard:extensions.actions.configure')}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateExtension(websiteExtension.id)}
                        disabled={activatingExtension === websiteExtension.id}
                        className="text-destructive hover:text-destructive h-8 sm:h-9 w-8 sm:w-9 p-0"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                {activatingExtension === websiteExtension.id ? (
                                  <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                ) : (
                                  <Power className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('dashboard:extensions.actions.deactivateTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem asChild>
                  <Link href={`/app/${currentWebsiteId}/extensions/${catalogExtension.slug}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('dashboard:extensions.actions.configure')}
                  </Link>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeactivateExtension(websiteExtension.id)}
                  disabled={activatingExtension === websiteExtension.id}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {t('dashboard:extensions.actions.deactivate')}
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
          {t('dashboard:extensions.suggested')} ({suggestedExtensions.length})
        </h2>
        {suggestedExtensions.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
              {t('dashboard:extensions.allActivated')}
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
                            {t(`dashboard:extensions.categories.${extension.category}`) || extension.category}
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
                              <Spinner className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              {t('dashboard:extensions.actions.activating')}
                            </>
                          ) : (
                            <>
                              <span className="transition-transform group-hover/activate:scale-105">{t('dashboard:extensions.actions.activate')}</span>
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
                      {t('dashboard:extensions.actions.activateExtension')}
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
