/**
 * Extension Marketplace
 * 
 * Premium App Store-like interface for browsing and discovering extensions.
 * Uses PageHeader for consistency with other pages.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
} from '@/components/ui/carousel';
import { PageHeader } from '@/components/shared/page-header';
import { PageIcon } from '@/lib/navigation-config';
import {
  Search,
  Sparkles,
  CheckCircle2,
  Power,
  Package,
  Grid3X3,
  LayoutList,
  Download,
  Layers,
  X,
  ChevronRight,
  Star,
  ArrowRight,
} from 'lucide-react';
import type { StoreListParams, ExtensionStoreSummary } from '@/lib/api/store';
import {
  useStoreExtensionsQuery,
  useFeaturedExtensionsQuery,
  useInstalledExtensionsQuery,
  useStoreCategoriesQuery,
  useInstallExtensionMutation,
  useWebsiteExtensionsV2Query,
  useActivateWebsiteExtensionMutation,
  useDeactivateWebsiteExtensionMutation,
} from '@/lib/query/store';
import { Link } from '@/components/app-router';
import { toast } from 'sonner';
import { getExtensionIconConfig } from '@/lib/extension-icons';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'grid' | 'list';
type CategoryFilter = 'installed' | 'all' | string;

// ============================================================================
// Category Nav - Horizontal scrollable category pills
// ============================================================================

interface CategoryNavProps {
  categories: { slug: string; name: string; count: number }[];
  activeCategory: CategoryFilter;
  installedCount: number;
  onSelect: (category: CategoryFilter) => void;
}

function CategoryNav({ categories, activeCategory, installedCount, onSelect }: CategoryNavProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeCategory === 'all' 
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Layers className="w-4 h-4" />
          Toutes
        </button>
        <button
          onClick={() => onSelect('installed')}
          className={cn(
            "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeCategory === 'installed' 
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Download className="w-4 h-4" />
          Installées
          {installedCount > 0 && (
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-xs",
              activeCategory === 'installed' 
                ? "bg-white/20" 
                : "bg-primary/10 text-primary"
            )}>
              {installedCount}
            </span>
          )}
        </button>
        <Separator orientation="vertical" className="h-6 my-auto mx-1" />
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === cat.slug 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {cat.name}
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-xs",
              activeCategory === cat.slug 
                ? "bg-white/20" 
                : "bg-foreground/5"
            )}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// ============================================================================
// Featured Carousel
// ============================================================================

interface FeaturedCarouselProps {
  extensions: ExtensionStoreSummary[];
  installedSlugs: Set<string>;
  activeSlugs: Set<string>;
  websiteId: string;
  onInstall: (ext: ExtensionStoreSummary) => void;
}

function FeaturedCarousel({ 
  extensions, 
  installedSlugs, 
  activeSlugs,
  websiteId,
  onInstall,
}: FeaturedCarouselProps) {
  if (extensions.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">En vedette</h2>
            <p className="text-xs text-muted-foreground">Extensions recommandées</p>
          </div>
        </div>
      </div>
      
      <Carousel
        opts={{
          align: "start",
          loop: extensions.length > 3,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {extensions.map(ext => {
            const iconConfig = getExtensionIconConfig(ext.icon, ext.slug);
            const IconComponent = iconConfig.icon;
            const isInstalled = installedSlugs.has(ext.slug);
            const isActive = activeSlugs.has(ext.slug);

            return (
              <CarouselItem key={ext.slug} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-[280px]">
                <Link 
                  href={`/${websiteId}/extensions/${ext.slug}`}
                  className={cn(
                    "group block h-full rounded-2xl border bg-card overflow-hidden",
                    "transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1",
                    isActive && "ring-2 ring-emerald-500/30",
                  )}
                >
                  {/* Gradient header */}
                  <div className={cn(
                    "h-20 relative flex items-end p-4",
                    `bg-gradient-to-br ${iconConfig.gradient}`,
                  )}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    
                    <Badge className="absolute top-3 right-3 bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured
                    </Badge>

                    {isActive && (
                      <Badge className="absolute top-3 left-3 bg-emerald-500 text-white border-0 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}

                    <div className="relative w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-1">{ext.name}</h3>
                      <p className="text-xs text-muted-foreground">{ext.author_name || 'ASAP Team'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ext.description}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">{ext.install_count} installs</span>
                      <div onClick={e => e.preventDefault()}>
                        {!isInstalled && (
                          <Button
                            size="sm"
                            className="h-7 text-xs rounded-full"
                            onClick={() => onInstall(ext)}
                          >
                            Installer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-4 bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background" />
        <CarouselNext className="hidden sm:flex -right-4 bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background" />
      </Carousel>
    </section>
  );
}

// ============================================================================
// Extension Card
// ============================================================================

interface ExtensionCardProps {
  extension: ExtensionStoreSummary;
  isInstalled: boolean;
  isActive: boolean;
  websiteId: string;
  viewMode: ViewMode;
  onInstall: () => void;
  onToggleActive: () => void;
}

function ExtensionCard({ 
  extension, 
  isInstalled, 
  isActive,
  websiteId,
  viewMode,
  onInstall,
  onToggleActive,
}: ExtensionCardProps) {
  const iconConfig = getExtensionIconConfig(extension.icon, extension.slug);
  const IconComponent = iconConfig.icon;

  if (viewMode === 'list') {
    return (
      <Link 
        href={`/${websiteId}/extensions/${extension.slug}`}
        className={cn(
          "group flex items-center gap-4 p-4 rounded-xl border bg-card",
          "transition-all duration-200 hover:bg-muted/30 hover:border-border",
          isActive && "bg-emerald-500/5 border-emerald-500/20",
        )}
      >
        <div 
          className={cn(
            "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            "shadow-lg shadow-black/5 transition-transform duration-200 group-hover:scale-105",
            `bg-gradient-to-br ${iconConfig.gradient}`,
          )}
        >
          <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{extension.name}</h3>
            {extension.featured && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {isActive && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-5">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{extension.description}</p>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
          {isInstalled ? (
            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              className="h-8 rounded-full"
              onClick={onToggleActive}
            >
              <Power className="w-3.5 h-3.5 mr-1" />
              {isActive ? 'Désactiver' : 'Activer'}
            </Button>
          ) : (
            <Button size="sm" className="h-8 rounded-full" onClick={onInstall}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Installer
            </Button>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link 
      href={`/${websiteId}/extensions/${extension.slug}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card overflow-hidden",
        "transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1",
        isActive && "ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]",
      )}
    >
      <div className={cn("h-1.5 w-full", `bg-gradient-to-r ${iconConfig.gradient}`)} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-4">
          <div 
            className={cn(
              "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center",
              "shadow-lg shadow-black/10 transition-transform duration-200 group-hover:scale-105",
              `bg-gradient-to-br ${iconConfig.gradient}`,
            )}
          >
            <IconComponent className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] truncate">{extension.name}</h3>
              {extension.featured && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {extension.author_name || 'ASAP'}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mt-4 leading-relaxed flex-1">
          {extension.description}
        </p>

        {extension.tags && extension.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {extension.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3.5 mt-auto bg-muted/30 border-t flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{extension.install_count} installs</span>
          <span>v{extension.version}</span>
        </div>

        <div onClick={e => e.preventDefault()}>
          {isInstalled ? (
            isActive ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Button size="sm" className="h-7 text-xs rounded-full" onClick={onToggleActive}>
                Activer
              </Button>
            )
          ) : (
            <Button size="sm" className="h-7 text-xs rounded-full" onClick={onInstall}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Installer
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Section Header
// ============================================================================

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// Main Marketplace Component
// ============================================================================

export default function ExtensionMarketplace() {
  const { currentWebsiteId } = useWebsiteContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const filters: StoreListParams = useMemo(() => ({
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' && categoryFilter !== 'installed' ? categoryFilter : undefined,
    sort: 'popular',
    page: 1,
    per_page: 50,
  }), [searchQuery, categoryFilter]);

  const { data: storeData, isLoading: storeLoading } = useStoreExtensionsQuery(filters);
  const { data: featuredData } = useFeaturedExtensionsQuery();
  const { data: installedData, isLoading: installedLoading } = useInstalledExtensionsQuery();
  const { data: categoriesData } = useStoreCategoriesQuery();
  const { data: websiteExtensionsData } = useWebsiteExtensionsV2Query(currentWebsiteId);

  const installMutation = useInstallExtensionMutation();
  const activateMutation = useActivateWebsiteExtensionMutation();
  const deactivateMutation = useDeactivateWebsiteExtensionMutation();

  const allExtensions = useMemo(() => storeData?.extensions ?? [], [storeData?.extensions]);
  const featuredExtensions = useMemo(() => featuredData?.extensions ?? [], [featuredData?.extensions]);
  const installedExtensions = useMemo(() => installedData?.extensions ?? [], [installedData?.extensions]);
  const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData?.categories]);
  
  const installedSlugs = useMemo(() => new Set(installedExtensions.map(e => e.slug)), [installedExtensions]);
  const activeSlugs = useMemo(() => 
    new Set((websiteExtensionsData?.extensions ?? []).filter(e => e.enabled).map(e => e.extension_slug)),
    [websiteExtensionsData?.extensions]
  );

  const displayedExtensions = useMemo(() => {
    if (categoryFilter === 'installed') {
      return allExtensions.filter(ext => installedSlugs.has(ext.slug));
    }
    return allExtensions;
  }, [allExtensions, categoryFilter, installedSlugs]);

  const installedCount = installedExtensions.length;
  const activeCount = activeSlugs.size;

  const handleInstall = useCallback((extension: ExtensionStoreSummary) => {
    installMutation.mutate({ slug: extension.slug, permissions: [] }, {
      onSuccess: () => toast.success(`${extension.name} installée !`),
      onError: () => toast.error(`Erreur lors de l'installation`),
    });
  }, [installMutation]);

  const handleToggleActive = useCallback(async (slug: string, currentlyActive: boolean) => {
    if (!currentWebsiteId) return;
    try {
      if (currentlyActive) {
        await deactivateMutation.mutateAsync({ websiteId: currentWebsiteId, slug });
        toast.success('Extension désactivée');
      } else {
        await activateMutation.mutateAsync({ websiteId: currentWebsiteId, slug });
        toast.success('Extension activée !');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [currentWebsiteId, activateMutation, deactivateMutation]);

  if (!currentWebsiteId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Aucun site sélectionné</p>
      </div>
    );
  }

  const isLoading = storeLoading || installedLoading;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Extensions"
        subtitle="Découvrez et gérez les extensions pour votre site"
        icon={<PageIcon page="extensions" />}
        badge={{
          label: activeCount > 0 ? `${activeCount} active${activeCount > 1 ? 's' : ''}` : 'Aucune active',
          variant: activeCount > 0 ? 'default' : 'outline',
        }}
        backHref={`/${currentWebsiteId}`}
      />

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une extension..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-muted/40 border-transparent focus:border-primary/30 rounded-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex rounded-full border bg-muted/40 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <CategoryNav
        categories={categories}
        activeCategory={categoryFilter}
        installedCount={installedCount}
        onSelect={setCategoryFilter}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            : "flex flex-col gap-3"
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <Skeleton className="h-1.5 w-full" />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Featured Section */}
          {categoryFilter === 'all' && !searchQuery && featuredExtensions.length > 0 && (
            <FeaturedCarousel
              extensions={featuredExtensions}
              installedSlugs={installedSlugs}
              activeSlugs={activeSlugs}
              websiteId={currentWebsiteId}
              onInstall={handleInstall}
            />
          )}

          {/* Extensions Grid */}
          {displayedExtensions.length > 0 ? (
            <section>
              {categoryFilter === 'all' && !searchQuery && (
                <SectionHeader
                  title="Toutes les extensions"
                  subtitle={`${displayedExtensions.length} disponibles`}
                  icon={<Layers className="w-4 h-4 text-muted-foreground" />}
                />
              )}
              {categoryFilter === 'installed' && (
                <SectionHeader
                  title="Mes extensions"
                  subtitle={`${displayedExtensions.length} installée${displayedExtensions.length > 1 ? 's' : ''}`}
                  icon={<Download className="w-4 h-4 text-muted-foreground" />}
                />
              )}
              {searchQuery && (
                <SectionHeader
                  title="Résultats"
                  subtitle={`${displayedExtensions.length} pour "${searchQuery}"`}
                  icon={<Search className="w-4 h-4 text-muted-foreground" />}
                />
              )}

              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "flex flex-col gap-3"
              )}>
                {displayedExtensions.map(ext => (
                  <ExtensionCard
                    key={ext.slug}
                    extension={ext}
                    isInstalled={installedSlugs.has(ext.slug)}
                    isActive={activeSlugs.has(ext.slug)}
                    websiteId={currentWebsiteId}
                    viewMode={viewMode}
                    onInstall={() => handleInstall(ext)}
                    onToggleActive={() => handleToggleActive(ext.slug, activeSlugs.has(ext.slug))}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Aucune extension trouvée</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {searchQuery 
                  ? `Aucun résultat pour "${searchQuery}"`
                  : categoryFilter === 'installed'
                    ? "Vous n'avez pas encore installé d'extensions"
                    : 'Aucune extension disponible'
                }
              </p>
              {(searchQuery || categoryFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Voir toutes les extensions
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
