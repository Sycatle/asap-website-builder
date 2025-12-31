"use client"

import { useTranslation } from 'react-i18next';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

// Local imports
import { 
  usePagesPageData, 
  usePageForm, 
  usePageDialogs, 
  usePageMutations,
  useDragAndDrop,
  useSearchFilter,
} from "./hooks";
import { StatsCards } from "./components/stats-cards";
import { PageList } from "./components/page-list";
import { CreatePageDialog, EditPageDialog, DeletePageDialog } from "./components/page-dialogs";
import { PagesPageSkeleton } from "./components/pages-page-skeleton";

/**
 * Pages management page component
 * Allows creating, editing, deleting, and reordering website pages
 */
export function PagesPage() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { currentWebsite: website, currentWebsiteId, isLoading: contextLoading } = useWebsiteContext();
  
  // Data & state hooks
  const { pages, isLoading: pagesLoading, stats } = usePagesPageData(currentWebsiteId);
  const { formData, setFormData, resetForm, setFormFromPage } = usePageForm();
  const { searchQuery, setSearchQuery, filteredPages } = useSearchFilter(pages);
  const {
    createDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedPage,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
  } = usePageDialogs();

  // Mutations
  const {
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleVisibility,
    handleDuplicate,
    handleReorder,
  } = usePageMutations(currentWebsiteId);

  // Drag & drop
  const {
    draggedPageId,
    dragOverPageId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop(pages, handleReorder);

  // Handlers
  const handleOpenCreateDialog = () => {
    resetForm();
    openCreateDialog();
  };

  const handleOpenEditDialog = (page: typeof selectedPage) => {
    if (!page) return;
    setFormFromPage(page);
    openEditDialog(page);
  };

  const handleCreateSubmit = () => {
    handleCreate(formData, () => {
      closeCreateDialog();
      resetForm();
    });
  };

  const handleEditSubmit = () => {
    if (!selectedPage) return;
    handleEdit(selectedPage.id, formData, () => {
      closeEditDialog();
      resetForm();
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedPage) return;
    handleDelete(selectedPage, closeDeleteDialog);
  };

  // Loading state
  if (contextLoading || pagesLoading) {
    return <PagesPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:pages.title')}
        subtitle={t('dashboard:pages.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
        }
        backHref={currentWebsiteId ? `/${currentWebsiteId}` : '/'}
        actions={[
          {
            label: t('dashboard:pages.new'),
            icon: <Plus className="h-4 w-4" />,
            onClick: handleOpenCreateDialog,
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold">{t('dashboard:pages.title')}</p>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {t('dashboard:pages.count', { count: stats.total })}
                </Badge>
              </div>
            </div>
            <Button 
              size="sm" 
              className="h-8"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('dashboard:pages.new')}
            </Button>
          </div>
        }
      />

      {/* Statistics Cards */}
      <StatsCards stats={stats} />

      {/* Pages List */}
      <PageList
        pages={filteredPages}
        searchQuery={searchQuery}
        websiteSlug={website?.slug}
        draggedPageId={draggedPageId}
        dragOverPageId={dragOverPageId}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onEdit={handleOpenEditDialog}
        onDuplicate={handleDuplicate}
        onToggleVisibility={handleToggleVisibility}
        onDelete={openDeleteDialog}
        onCreateNew={handleOpenCreateDialog}
        onSearchChange={setSearchQuery}
      />

      {/* Dialogs */}
      <CreatePageDialog
        open={createDialogOpen}
        onOpenChange={(open) => !open && closeCreateDialog()}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleCreateSubmit}
      />

      <EditPageDialog
        open={editDialogOpen}
        onOpenChange={(open) => !open && closeEditDialog()}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleEditSubmit}
      />

      <DeletePageDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        selectedPage={selectedPage}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default PagesPage;
