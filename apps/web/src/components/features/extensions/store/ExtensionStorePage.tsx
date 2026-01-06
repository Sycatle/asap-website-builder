/**
 * Extension Store Page Component
 * 
 * Main page for browsing and installing extensions.
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Download,
  Sparkles,
  Package,
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
} from '@/lib/query/store';
import { ExtensionGrid, ExtensionGridSkeleton } from './ExtensionGrid';
import { ExtensionFilters } from './ExtensionFilters';
import { CategoryNav, CategoryNavHorizontal } from './CategoryNav';
import { ExtensionDetail, ExtensionDetailSkeleton } from './ExtensionDetail';
import { PermissionsReviewDialog } from './PermissionsReview';
import { InstalledExtensionsGrid } from './InstalledExtensionCard';

interface ExtensionStorePageProps {
  className?: string;
}

export function ExtensionStorePage({ className }: ExtensionStorePageProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
  
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
  const { data: installedData, isLoading: installedLoading } = useInstalledExtensionsQuery();
  const { data: categoriesData } = useStoreCategoriesQuery();
  const { data: extensionDetail, isLoading: detailLoading } = useStoreExtensionQuery(selectedSlug);

  // Mutations
  const installMutation = useInstallExtensionMutation();
  const uninstallMutation = useUninstallExtensionMutation();

  // Derived state
  const extensions = storeData?.extensions ?? [];
  const featuredExtensions = featuredData?.extensions ?? [];
  const categories = categoriesData?.categories ?? [];
  
  // Create set of installed slugs for quick lookup
  const installedSlugs = useMemo(() => {
    const installed = installedData?.extensions ?? [];
    return new Set(installed.map(e => e.slug));
  }, [installedData?.extensions]);
  
  // Installed extensions for the tab
  const installedExtensions = installedData?.extensions ?? [];

  const showFeatured = !filters.search && !filters.category && filters.page === 1;

  // Handlers
  const handleExtensionSelect = (slug: string) => {
    setSelectedSlug(slug);
  };

  const handleBackToStore = () => {
    setSelectedSlug(null);
  };

  const handleInstallClick = (extension: ExtensionStoreSummary) => {
    // Check if extension requires permission review
    // For now, install directly
    installMutation.mutate({ slug: extension.slug, permissions: [] });
  };

  const handleUninstall = (slug: string) => {
    uninstallMutation.mutate(slug);
  };

  const handleConfirmInstall = () => {
    if (reviewExtension) {
      installMutation.mutate({ slug: reviewExtension.slug, permissions: [] });
      setReviewExtension(null);
    }
  };

  const handleCategorySelect = (slug: string | undefined) => {
    setFilters({ ...filters, category: slug, page: 1 });
  };

  // Show detail view if extension selected
  if (selectedSlug && extensionDetail) {
    const isInstalled = installedSlugs.has(extensionDetail.slug);
    return (
      <div className={cn('container max-w-5xl py-6', className)}>
        <ExtensionDetail
          extension={extensionDetail}
          isInstalled={isInstalled}
          isInstalling={installMutation.isPending}
          onInstall={() => installMutation.mutate({ slug: extensionDetail.slug, permissions: [] })}
          onUninstall={() => uninstallMutation.mutate(extensionDetail.slug)}
          onBack={handleBackToStore}
        />
      </div>
    );
  }

  if (selectedSlug && detailLoading) {
    return (
      <div className={cn('container max-w-5xl py-6', className)}>
        <ExtensionDetailSkeleton />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col min-h-screen', className)}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Store className="w-6 h-6" />
                Extension Store
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover and install extensions to enhance your website
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'installed')}>
            <TabsList>
              <TabsTrigger value="browse" className="gap-2">
                <Store className="w-4 h-4" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="installed" className="gap-2">
                <Download className="w-4 h-4" />
                Installed
                {installedExtensions.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 rounded-full px-2">
                    {installedExtensions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'browse' ? (
          <div className="container py-6">
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
                      Featured Extensions
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
                      : 'All Extensions'
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
                        Previous
                      </Button>
                      <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {filters.page} of {Math.ceil(storeData.total / (filters.per_page ?? 20))}
                      </span>
                      <Button
                        variant="outline"
                        disabled={(filters.page ?? 1) >= Math.ceil(storeData.total / (filters.per_page ?? 20))}
                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </section>
              </main>
            </div>
          </div>
        ) : (
          <div className="container py-6">
            <h2 className="text-lg font-semibold mb-6">Installed Extensions</h2>
            {installedLoading ? (
              <ExtensionGridSkeleton count={6} />
            ) : (
              <InstalledExtensionsGrid
                extensions={installedExtensions}
                onToggle={(_slug, _enabled) => {
                  // Toggle would be handled by separate mutation
                }}
                onUninstall={handleUninstall}
                onOpenDetails={handleExtensionSelect}
              />
            )}
          </div>
        )}
      </div>

      {/* Permission review dialog */}
      <PermissionsReviewDialog
        open={!!reviewExtension}
        onOpenChange={(open) => !open && setReviewExtension(null)}
        extensionName={reviewExtension?.name ?? ''}
        permissions={[]}
        onConfirm={handleConfirmInstall}
        isLoading={installMutation.isPending}
      />
    </div>
  );
}
