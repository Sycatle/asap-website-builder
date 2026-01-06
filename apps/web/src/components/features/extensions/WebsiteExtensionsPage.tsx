/**
 * Unified Website Extensions Page
 * 
 * Single interface for managing extensions on a website:
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
import {
  Package,
  Store,
  Sparkles,
  CheckCircle,
  Circle,
  Settings,
  Power,
  Plus,
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
import { ExtensionGrid, ExtensionGridSkeleton } from './store/ExtensionGrid';
import { ExtensionFilters } from './store/ExtensionFilters';
import { CategoryNav, CategoryNavHorizontal } from './store/CategoryNav';
import { ExtensionDetail, ExtensionDetailSkeleton } from './store/ExtensionDetail';
import { PermissionsReviewDialog } from './store/PermissionsReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/components/app-router';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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
  
  const handleActivate = async (slug: string) => {
    try {
      await activateMutation.mutateAsync({ websiteId, slug });
      toast.success(t('dashboard:extensions.toast.activated', { name: slug }));
    } catch (error) {
      toast.error(t('dashboard:extensions.toast.activateError', { name: slug }));
    }
  };
  
  const handleDeactivate = async (slug: string) => {
    try {
      await deactivateMutation.mutateAsync({ websiteId, slug });
      toast.success(t('dashboard:extensions.toast.deactivated'));
    } catch (error) {
      toast.error(t('dashboard:extensions.toast.deactivateError'));
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Active Section Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (installedExtensions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
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
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Active Extensions */}
      {activeExtensions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-base sm:text-lg font-semibold">
              {t('dashboard:extensions.activeOnThisSite', 'Actives sur ce site')}
            </h2>
            <Badge variant="outline" className="ml-1">{activeExtensions.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeExtensions.map((ext) => (
              <ExtensionListCard
                key={ext.slug}
                extension={ext}
                isActive={true}
                websiteId={websiteId}
                onActivate={() => handleActivate(ext.slug)}
                onDeactivate={() => handleDeactivate(ext.slug)}
                isLoading={activateMutation.isPending || deactivateMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Inactive Extensions (Installed but not active on this site) */}
      {inactiveExtensions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold text-muted-foreground">
              {t('dashboard:extensions.installedButInactive', 'Installées mais inactives')}
            </h2>
            <Badge variant="secondary" className="ml-1">{inactiveExtensions.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveExtensions.map((ext) => (
              <ExtensionListCard
                key={ext.slug}
                extension={ext}
                isActive={false}
                websiteId={websiteId}
                onActivate={() => handleActivate(ext.slug)}
                onDeactivate={() => handleDeactivate(ext.slug)}
                isLoading={activateMutation.isPending || deactivateMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Extension List Card (for Installed tab)
// ============================================================================

interface ExtensionListCardProps {
  extension: {
    slug: string;
    name: string;
    icon?: string;
    category?: string;
    version?: string;
  };
  isActive: boolean;
  websiteId: string;
  onActivate: () => void;
  onDeactivate: () => void;
  isLoading?: boolean;
}

function ExtensionListCard({
  extension,
  isActive,
  websiteId,
  onActivate,
  onDeactivate,
  isLoading,
}: ExtensionListCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  return (
    <Card className={cn(
      'group transition-all duration-200',
      isActive ? 'border-green-500/30 bg-green-500/5' : 'opacity-75 hover:opacity-100'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
              isActive ? 'bg-green-500/10' : 'bg-muted'
            )}>
              {extension.icon || extension.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-sm">{extension.name}</CardTitle>
              <CardDescription className="text-xs">
                {extension.category} {extension.version && `• v${extension.version}`}
              </CardDescription>
            </div>
          </div>
          {isActive && (
            <Badge variant="default" className="bg-green-600 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('dashboard:extensions.status.active', 'Active')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          {isActive ? (
            <>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href={`/${websiteId}/extensions/${extension.slug}`}>
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  {t('dashboard:extensions.actions.configure', 'Configurer')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeactivate}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Power className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={onActivate}
              disabled={isLoading}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t('dashboard:extensions.actions.activate', 'Activer')}
            </Button>
          )}
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
