/**
 * Unified Website Extensions Page
 * 
 * Modern, unified interface for managing extensions on a website:
 * - Tab "Installed": Extensions installed on account + activation status for this website
 * - Tab "Discover": Browse and install new extensions from the store
 * 
 * Route: /{website_id}/extensions
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { PageHeader } from '@/components/shared/page-header';
import { PageIcon } from '@/lib/navigation-config';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Package,
  Store,
  Sparkles,
  CheckCircle,
  Settings,
  Power,
  Plus,
  ExternalLink,
  MoreHorizontal,
  Zap,
} from 'lucide-react';
import type { StoreListParams, ExtensionStoreSummary } from '@/lib/api/store';
import {
  useStoreExtensionsQuery,
  useFeaturedExtensionsQuery,
  useInstalledExtensionsQuery,
  useStoreCategoriesQuery,
  useStoreExtensionQuery,
  useInstallExtensionMutation,
  useUninstallExtensionMutation,
  useWebsiteExtensionsV2Query,
  useActivateWebsiteExtensionMutation,
  useDeactivateWebsiteExtensionMutation,
} from '@/lib/query/store';
import { ExtensionGrid, ExtensionGridSkeleton } from './store/extension-grid';
import { ExtensionFilters } from './store/extension-filters';
import { CategoryNav, CategoryNavHorizontal } from './store/category-nav';
import { ExtensionDetail, ExtensionDetailSkeleton } from './store/extension-detail';
import { PermissionsReviewDialog } from './store/permissions-review';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/components/app-router';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ExtensionIcon } from '@/lib/extension-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Installed Extensions Tab Content
// ============================================================================

interface InstalledTabContentProps {
  websiteId: string;
  onSwitchToDiscover: () => void;
}

function InstalledTabContent({ websiteId, onSwitchToDiscover }: InstalledTabContentProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Queries
  const { data: installedData, isLoading: installedLoading } = useInstalledExtensionsQuery();
  const { data: websiteExtensionsData, isLoading: websiteLoading } = useWebsiteExtensionsV2Query(websiteId);
  
  // Mutations
  const activateMutation = useActivateWebsiteExtensionMutation();
  const deactivateMutation = useDeactivateWebsiteExtensionMutation();
  
  // Memoize the extension arrays to avoid dependency issues
  const installedExtensions = useMemo(() => installedData?.extensions ?? [], [installedData?.extensions]);
  const websiteExtensions = useMemo(() => websiteExtensionsData?.extensions ?? [], [websiteExtensionsData?.extensions]);
  
  // Build set of active extension slugs for this website
  const activeSlugs = useMemo(() => {
    return new Set(websiteExtensions.filter(e => e.enabled).map(e => e.extension_slug));
  }, [websiteExtensions]);
  
  // Split into active and inactive
  const activeExtensions = useMemo(() => {
    return installedExtensions.filter(ext => activeSlugs.has(ext.slug));
  }, [installedExtensions, activeSlugs]);
  
  const inactiveExtensions = useMemo(() => {
    return installedExtensions.filter(ext => !activeSlugs.has(ext.slug));
  }, [installedExtensions, activeSlugs]);
  
  const isLoading = installedLoading || websiteLoading;
  
  const handleToggle = async (slug: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await deactivateMutation.mutateAsync({ websiteId, slug });
        toast.success(t('dashboard:extensions.toast.deactivated'));
      } else {
        await activateMutation.mutateAsync({ websiteId, slug });
        toast.success(t('dashboard:extensions.toast.activated', { name: slug }));
      }
    } catch (error) {
      toast.error(currentlyActive 
        ? t('dashboard:extensions.toast.deactivateError')
        : t('dashboard:extensions.toast.activateError', { name: slug })
      );
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Extensions skeleton */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (installedExtensions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('dashboard:extensions.noExtensionsInstalled', 'Aucune extension installée')}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('dashboard:extensions.noExtensionsDescription', 'Découvrez les extensions disponibles dans le store pour enrichir votre site.')}
          </p>
          <Button onClick={onSwitchToDiscover} className="gap-2">
            <Store className="w-4 h-4" />
            {t('dashboard:extensions.browseStore', 'Parcourir le store')}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeExtensions.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:extensions.stats.active', 'Actives')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{installedExtensions.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:extensions.stats.installed', 'Installées')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30 hidden sm:block">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Power className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveExtensions.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:extensions.stats.inactive', 'Inactives')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extensions List - Unified view */}
      <div className="space-y-3">
        {/* Active Extensions First */}
        {activeExtensions.map((ext) => (
          <ExtensionListCard
            key={ext.slug}
            extension={ext}
            isActive={true}
            websiteId={websiteId}
            onToggle={() => handleToggle(ext.slug, true)}
            isLoading={activateMutation.isPending || deactivateMutation.isPending}
          />
        ))}
        
        {/* Divider if both sections have items */}
        {activeExtensions.length > 0 && inactiveExtensions.length > 0 && (
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                {t('dashboard:extensions.availableToActivate', 'Disponibles pour activation')}
              </span>
            </div>
          </div>
        )}
        
        {/* Inactive Extensions */}
        {inactiveExtensions.map((ext) => (
          <ExtensionListCard
            key={ext.slug}
            extension={ext}
            isActive={false}
            websiteId={websiteId}
            onToggle={() => handleToggle(ext.slug, false)}
            isLoading={activateMutation.isPending || deactivateMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Extension List Card (Modern unified design)
// ============================================================================

interface ExtensionListCardProps {
  extension: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    version?: string;
  };
  isActive: boolean;
  websiteId: string;
  onToggle: () => void;
  isLoading?: boolean;
}

function ExtensionListCard({
  extension,
  isActive,
  websiteId,
  onToggle,
  isLoading,
}: ExtensionListCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  return (
    <Card className={cn(
      'group transition-all duration-200 hover:shadow-md',
      isActive 
        ? 'bg-gradient-to-r from-green-500/5 to-transparent border-green-500/20' 
        : 'bg-muted/20 hover:bg-muted/30'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <ExtensionIcon 
            icon={extension.icon} 
            slug={extension.slug} 
            category={extension.category}
            size="lg"
            className={cn(
              "transition-all duration-200",
              !isActive && "opacity-60 grayscale"
            )}
          />
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{extension.name}</h3>
              {isActive && (
                <Badge variant="default" className="bg-green-600 text-[10px] h-5">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('dashboard:extensions.status.active', 'Active')}
                </Badge>
              )}
            </div>
            {extension.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {extension.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/60">
              {extension.category && (
                <span className="capitalize">{extension.category}</span>
              )}
              {extension.version && (
                <>
                  <span>•</span>
                  <span>v{extension.version}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Toggle Switch */}
            <Switch
              checked={isActive}
              onCheckedChange={onToggle}
              disabled={isLoading}
              className={cn(
                "data-[state=checked]:bg-green-600",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            />
            
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isActive && (
                  <DropdownMenuItem asChild>
                    <Link href={`/${websiteId}/extensions/${extension.slug}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t('dashboard:extensions.actions.configure', 'Configurer')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('dashboard:extensions.actions.viewDetails', 'Voir les détails')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onToggle}
                  disabled={isLoading}
                  className={!isActive ? "text-green-600" : "text-destructive"}
                >
                  <Power className="w-4 h-4 mr-2" />
                  {isActive 
                    ? t('dashboard:extensions.actions.deactivate', 'Désactiver')
                    : t('dashboard:extensions.actions.activate', 'Activer')
                  }
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Discover Tab Content (Store)
// ============================================================================

interface DiscoverTabContentProps {
  websiteId: string;
}

function DiscoverTabContent({ websiteId: _websiteId }: DiscoverTabContentProps) {
  // Filter state
  const [filters, setFilters] = useState<StoreListParams>({
    sort: 'popular',
    page: 1,
    per_page: 20,
  });

  // Detail view state
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  
  // Permission review state
  const [reviewExtension, setReviewExtension] = useState<ExtensionStoreSummary | null>(null);

  // Queries
  const { data: storeData, isLoading: storeLoading } = useStoreExtensionsQuery(filters);
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedExtensionsQuery();
  const { data: installedData } = useInstalledExtensionsQuery();
  const { data: categoriesData } = useStoreCategoriesQuery();
  const { data: extensionDetail, isLoading: detailLoading } = useStoreExtensionQuery(selectedSlug);

  // Mutations
  const installMutation = useInstallExtensionMutation();
  const uninstallMutation = useUninstallExtensionMutation();

  // Derived state
  const extensions = storeData?.extensions ?? [];
  const featuredExtensions = featuredData?.extensions ?? [];
  const categories = categoriesData?.categories ?? [];
  
  // Create set of installed slugs
  const installedSlugs = useMemo(() => {
    const installed = installedData?.extensions ?? [];
    return new Set(installed.map(e => e.slug));
  }, [installedData?.extensions]);

  const showFeatured = !filters.search && !filters.category && filters.page === 1;

  // Handlers
  const handleExtensionSelect = (slug: string) => {
    setSelectedSlug(slug);
  };

  const handleBackToStore = () => {
    setSelectedSlug(null);
  };

  const handleInstallClick = (extension: ExtensionStoreSummary) => {
    // For now, install directly (can add permission review later)
    installMutation.mutate({ slug: extension.slug, permissions: [] });
  };

  const handleCategorySelect = (slug: string | undefined) => {
    setFilters({ ...filters, category: slug, page: 1 });
  };

  // Show detail view if extension selected
  if (selectedSlug && extensionDetail) {
    const isInstalled = installedSlugs.has(extensionDetail.slug);
    return (
      <ExtensionDetail
        extension={extensionDetail}
        isInstalled={isInstalled}
        isInstalling={installMutation.isPending}
        onInstall={() => installMutation.mutate({ slug: extensionDetail.slug, permissions: [] })}
        onUninstall={() => uninstallMutation.mutate(extensionDetail.slug)}
        onBack={handleBackToStore}
      />
    );
  }

  if (selectedSlug && detailLoading) {
    return <ExtensionDetailSkeleton />;
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar - Categories (hidden on mobile) */}
      <aside className="hidden lg:block w-56 shrink-0">
        <CategoryNav
          categories={categories}
          selected={filters.category}
          onSelect={handleCategorySelect}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* Mobile category nav */}
        <div className="lg:hidden">
          <CategoryNavHorizontal
            categories={categories}
            selected={filters.category}
            onSelect={handleCategorySelect}
          />
        </div>

        {/* Filters */}
        <ExtensionFilters
          filters={filters}
          onChange={setFilters}
          categories={categories}
        />

        {/* Featured section */}
        {showFeatured && !featuredLoading && featuredExtensions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              En vedette
            </h2>
            <ExtensionGrid
              extensions={featuredExtensions.slice(0, 4)}
              installedSlugs={installedSlugs}
              onSelect={handleExtensionSelect}
              onInstall={handleInstallClick}
              columns={4}
            />
          </section>
        )}

        {/* All extensions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            {filters.category 
              ? categories.find(c => c.slug === filters.category)?.name || 'Extensions'
              : 'Toutes les extensions'
            }
            {storeData?.total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({storeData.total})
              </span>
            )}
          </h2>
          
          {storeLoading ? (
            <ExtensionGridSkeleton count={8} />
          ) : (
            <ExtensionGrid
              extensions={extensions}
              installedSlugs={installedSlugs}
              onSelect={handleExtensionSelect}
              onInstall={handleInstallClick}
            />
          )}

          {/* Pagination */}
          {storeData && storeData.total > (filters.per_page ?? 20) && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              >
                Précédent
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {filters.page} sur {Math.ceil(storeData.total / (filters.per_page ?? 20))}
              </span>
              <Button
                variant="outline"
                disabled={(filters.page ?? 1) >= Math.ceil(storeData.total / (filters.per_page ?? 20))}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              >
                Suivant
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Permission review dialog */}
      <PermissionsReviewDialog
        open={!!reviewExtension}
        onOpenChange={(open) => !open && setReviewExtension(null)}
        extensionName={reviewExtension?.name ?? ''}
        permissions={[]}
        onConfirm={() => {
          if (reviewExtension) {
            installMutation.mutate({ slug: reviewExtension.slug, permissions: [] });
            setReviewExtension(null);
          }
        }}
        isLoading={installMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function WebsiteExtensionsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentWebsiteId } = useWebsiteContext();
  
  // Tab state from URL search params or default
  const [activeTab, setActiveTab] = useState<'installed' | 'discover'>('installed');
  
  // Queries for header info
  const { data: installedData } = useInstalledExtensionsQuery();
  const { data: websiteExtensionsData } = useWebsiteExtensionsV2Query(currentWebsiteId);
  
  const installedCount = installedData?.extensions?.length ?? 0;
  const activeCount = websiteExtensionsData?.extensions?.filter(e => e.enabled).length ?? 0;
  
  if (!currentWebsiteId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">
          {t('dashboard:extensions.noWebsiteSelected', 'Aucun site sélectionné')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:extensions.title', 'Extensions')}
        subtitle={t('dashboard:extensions.subtitle', 'Gérez les extensions de votre site')}
        icon={<PageIcon page="extensions" />}
        badge={{
          label: activeCount > 0 
            ? t('dashboard:extensions.activeCount', { count: activeCount, defaultValue: `${activeCount} active${activeCount > 1 ? 's' : ''}` })
            : t('dashboard:extensions.noneActive', 'Aucune active'),
          variant: activeCount > 0 ? 'default' : 'outline',
        }}
        backHref={`/${currentWebsiteId}`}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'installed' | 'discover')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="installed" className="gap-2 flex-1 sm:flex-none">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">{t('dashboard:extensions.tabs.installed', 'Installées')}</span>
            {installedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {installedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2 flex-1 sm:flex-none">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">{t('dashboard:extensions.tabs.discover', 'Découvrir')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          <InstalledTabContent
            websiteId={currentWebsiteId}
            onSwitchToDiscover={() => setActiveTab('discover')}
          />
        </TabsContent>

        <TabsContent value="discover" className="mt-6">
          <DiscoverTabContent websiteId={currentWebsiteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
