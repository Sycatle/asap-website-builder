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
// Category Sidebar - Vertical sticky navigation
// ============================================================================

interface CategorySidebarProps {
  categories: { slug: string; name: string; count: number }[];
  activeCategory: CategoryFilter;
  installedCount: number;
  onSelect: (category: CategoryFilter) => void;
}

function CategorySidebar({ categories, activeCategory, installedCount, onSelect }: CategorySidebarProps) {
  return (
    <aside className="hidden lg:block w-52 shrink-0">
      <nav className="sticky top-4 space-y-1">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
            activeCategory === 'all' 
              ? "bg-primary text-primary-foreground font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Toutes
          </span>
        </button>
        <button
          onClick={() => onSelect('installed')}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
            activeCategory === 'installed' 
              ? "bg-primary text-primary-foreground font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Installées
          </span>
          {installedCount > 0 && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs tabular-nums",
              activeCategory === 'installed' 
                ? "bg-white/20" 
                : "bg-primary/10 text-primary"
            )}>
              {installedCount}
            </span>
          )}
        </button>
        
        <Separator className="my-2" />
        
        <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Catégories
        </p>
        
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
              activeCategory === cat.slug 
                ? "bg-primary text-primary-foreground font-medium" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{cat.name}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs tabular-nums",
              activeCategory === cat.slug 
                ? "bg-white/20" 
                : "bg-foreground/5"
            )}>
              {cat.count}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ============================================================================
// Mobile Category Nav - Horizontal scrollable for small screens
// ============================================================================

interface MobileCategoryNavProps {
  categories: { slug: string; name: string; count: number }[];
  activeCategory: CategoryFilter;
  installedCount: number;
  onSelect: (category: CategoryFilter) => void;
}

function MobileCategoryNav({ categories, activeCategory, installedCount, onSelect }: MobileCategoryNavProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap lg:hidden">
      <div className="flex gap-1.5 pb-2">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeCategory === 'all' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Toutes
        </button>
        <button
          onClick={() => onSelect('installed')}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeCategory === 'installed' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Download className="w-3.5 h-3.5" />
          Installées
          {installedCount > 0 && (
            <span className={cn(
              "ml-0.5 px-1.5 py-0.5 rounded text-[10px]",
              activeCategory === 'installed' 
                ? "bg-white/20" 
                : "bg-primary/10 text-primary"
            )}>
              {installedCount}
            </span>
          )}
        </button>
        <Separator orientation="vertical" className="h-5 my-auto mx-1" />
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeCategory === cat.slug 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {cat.name}
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px]",
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
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="font-medium text-sm">En vedette</h2>
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
        <CarouselContent className="-ml-3">
          {extensions.map(ext => {
            const iconConfig = getExtensionIconConfig(ext.icon, ext.slug);
            const IconComponent = iconConfig.icon;
            const isInstalled = installedSlugs.has(ext.slug);
            const isActive = activeSlugs.has(ext.slug);

            return (
              <CarouselItem key={ext.slug} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-[260px]">
                <Link 
                  href={`/${websiteId}/extensions/${ext.slug}`}
                  className={cn(
                    "group flex flex-col h-full rounded-lg border bg-card overflow-hidden",
                    "transition-all duration-200 hover:shadow-md hover:border-primary/20",
                    isActive && "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  {/* Content */}
                  <div className="p-4 flex-1">
                    <div className="flex items-start gap-3">
                      <div 
                        className={cn(
                          "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                          `bg-gradient-to-br ${iconConfig.gradient}`,
                        )}
                      >
                        <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-sm truncate">{ext.name}</h3>
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{ext.author_name || 'ASAP Team'}</p>
                      </div>

                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-3">{ext.description}</p>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{ext.install_count} installs</span>
                    <div onClick={e => e.preventDefault()}>
                      {isInstalled ? (
                        isActive ? (
                          <span className="text-[11px] text-emerald-600 font-medium">Active</span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Activer
                          </Button>
                        )
                      ) : (
                        <Button size="sm" className="h-7 text-xs" onClick={() => onInstall(ext)}>
                          Installer
                        </Button>
                      )}
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-3 h-8 w-8 border shadow-sm" />
        <CarouselNext className="hidden sm:flex -right-3 h-8 w-8 border shadow-sm" />
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
          "group flex items-center gap-4 p-4 rounded-lg border bg-card",
          "transition-all duration-200 hover:shadow-md hover:border-primary/20",
          isActive && "border-emerald-500/30 bg-emerald-500/5",
        )}
      >
        <div 
          className={cn(
            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            `bg-gradient-to-br ${iconConfig.gradient}`,
          )}
        >
          <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{extension.name}</h3>
            {extension.featured && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{extension.description}</p>
        </div>

        <div className="flex items-center gap-3" onClick={e => e.preventDefault()}>
          <span className="text-xs text-muted-foreground hidden sm:block">{extension.install_count} installs</span>
          {isInstalled ? (
            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              className="h-8"
              onClick={onToggleActive}
            >
              <Power className="w-3.5 h-3.5 mr-1.5" />
              {isActive ? 'Désactiver' : 'Activer'}
            </Button>
          ) : (
            <Button size="sm" className="h-8" onClick={onInstall}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Installer
            </Button>
          )}
        </div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link 
      href={`/${websiteId}/extensions/${extension.slug}`}
      className={cn(
        "group relative flex flex-col rounded-lg border bg-card overflow-hidden",
        "transition-all duration-200 hover:shadow-md hover:border-primary/20",
        isActive && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div 
            className={cn(
              "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              `bg-gradient-to-br ${iconConfig.gradient}`,
            )}
          >
            <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm truncate">{extension.name}</h3>
              {extension.featured && (
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {extension.author_name || 'ASAP'}
            </p>
          </div>

          {isActive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mt-3 leading-relaxed flex-1">
          {extension.description}
        </p>

        {extension.tags && extension.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {extension.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{extension.install_count} installs</span>

        <div onClick={e => e.preventDefault()}>
          {isInstalled ? (
            isActive ? (
              <span className="text-[11px] text-emerald-600 font-medium">Active</span>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onToggleActive}>
                Activer
              </Button>
            )
          ) : (
            <Button size="sm" className="h-7 text-xs" onClick={onInstall}>
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

function SectionHeader({ title, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="font-medium text-sm">{title}</h2>
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
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

      {/* Mobile Category Navigation */}
      <MobileCategoryNav
        categories={categories}
        activeCategory={categoryFilter}
        installedCount={installedCount}
        onSelect={setCategoryFilter}
      />

      {/* Main Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Desktop Category Sidebar */}
        <CategorySidebar
          categories={categories}
          activeCategory={categoryFilter}
          installedCount={installedCount}
          onSelect={setCategoryFilter}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search Bar & View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une extension..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/40 border-transparent focus:border-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex rounded-lg border bg-muted/40 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                : "flex flex-col gap-2"
            )}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full mt-3" />
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
                      title={`Toutes les extensions (${displayedExtensions.length})`}
                      icon={<div className="p-1.5 rounded-lg bg-muted"><Layers className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                    />
                  )}
                  {categoryFilter === 'installed' && (
                    <SectionHeader
                      title={`Mes extensions (${displayedExtensions.length})`}
                      icon={<div className="p-1.5 rounded-lg bg-primary/10"><Download className="w-3.5 h-3.5 text-primary" /></div>}
                    />
                  )}
                  {searchQuery && (
                    <SectionHeader
                      title={`${displayedExtensions.length} résultat${displayedExtensions.length > 1 ? 's' : ''} pour "${searchQuery}"`}
                      icon={<div className="p-1.5 rounded-lg bg-muted"><Search className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                    />
                  )}
                  {categoryFilter !== 'all' && categoryFilter !== 'installed' && !searchQuery && (
                    <SectionHeader
                      title={`${categories.find(c => c.slug === categoryFilter)?.name || categoryFilter} (${displayedExtensions.length})`}
                      icon={<div className="p-1.5 rounded-lg bg-muted"><Package className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                    />
                  )}

              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "flex flex-col gap-2"
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
      </div>
    </div>
  );
}
